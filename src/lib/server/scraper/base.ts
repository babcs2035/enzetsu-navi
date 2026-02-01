import { type Browser, chromium, type Page } from "playwright";
import { prisma } from "@/lib/prisma";
import { geocodeLocation } from "@/lib/server/geocoding";

export interface SpeechData {
  candidate_name: string;
  start_at: Date;
  location_name: string;
  source_url?: string;
  speakers?: string[];
  address?: string; // 住所が分かる場合は設定
}

export abstract class BaseScraper {
  abstract partyName: string;
  abstract baseUrl: string;

  protected async getBrowser(): Promise<Browser> {
    return await chromium.launch({ headless: true });
  }

  protected async getPage(browser: Browser): Promise<Page> {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    });
    return await context.newPage();
  }

  protected async getParty() {
    const party = await prisma.party.findUnique({
      where: { name: this.partyName },
    });
    if (!party) {
      throw new Error(`Party '${this.partyName}' not found in database`);
    }
    return party;
  }

  protected async getOrCreateCandidate(name: string, partyId: number) {
    let candidate = await prisma.candidate.findFirst({
      where: {
        name,
        partyId,
      },
    });

    if (!candidate) {
      candidate = await prisma.candidate.create({
        data: {
          name,
          partyId,
        },
      });
      console.log(`👤 Created new candidate: ${name} (${this.partyName})`);
    }
    return candidate;
  }

  protected async saveSpeech(data: SpeechData) {
    try {
      const party = await this.getParty();
      const candidate = await this.getOrCreateCandidate(
        data.candidate_name,
        party.id,
      );

      // 重複チェック（候補者と日時のみで判定）を行う．
      const existing = await prisma.speech.findFirst({
        where: {
          candidateId: candidate.id,
          startAt: data.start_at,
        },
      });

      if (existing) {
        // biome-ignore lint/suspicious/noExplicitAny: Dynamic update object
        const updates: any = {};

        // speakers のマージと変更チェック
        const currentSpeakers = existing.speakers || [];
        const newSpeakersInput = data.speakers || [];
        // Set でユニーク化してマージ
        const mergedSpeakers = Array.from(
          new Set([...currentSpeakers, ...newSpeakersInput]),
        ).sort();

        // 配列の内容比較（簡易的）
        const isSpeakersChanged =
          currentSpeakers.length !== mergedSpeakers.length ||
          JSON.stringify(currentSpeakers.sort()) !==
            JSON.stringify(mergedSpeakers);

        if (isSpeakersChanged) {
          updates.speakers = mergedSpeakers;
        }

        // 基本情報の変更チェック
        if (
          data.location_name &&
          data.location_name !== existing.locationName
        ) {
          updates.locationName = data.location_name;
        }
        if (data.source_url && data.source_url !== existing.sourceUrl) {
          updates.sourceUrl = data.source_url;
        }

        // ジオコーディング再実行の判定
        // 新しい住所が指定されており、かつ既存と異なる場合、または
        // 住所指定はなく場所名が変更された場合
        let shouldGeocode = false;
        let searchAddr = data.address || data.location_name;

        // data.address があり、既存の保存済み住所 (existing.address) と異なれば再検索
        // (注: existing.address はジオコーディング後の住所かもしれないので完全一致しないこともあるが、
        //  data.address が明示的に渡された場合はそれを正として再取得を試みるのが安全)
        if (data.address && data.address !== existing.address) {
          shouldGeocode = true;
          searchAddr = data.address;
        } else if (
          !data.address &&
          data.location_name !== existing.locationName
        ) {
          // 住所指定がない場合でも場所名が変わっていれば再検索
          shouldGeocode = true;
          searchAddr = data.location_name;
        }

        if (shouldGeocode) {
          const location = await geocodeLocation(searchAddr);
          if (location) {
            updates.lat = location.lat;
            updates.lng = location.lng;
            updates.address = location.address || data.address;
          }
        }

        // 更新がある場合のみ実行
        if (Object.keys(updates).length > 0) {
          updates.updatedAt = new Date();
          const updated = await prisma.speech.update({
            where: { id: existing.id },
            data: updates,
          });
          console.log(
            `🔄 Updated speech: ${data.candidate_name} - ${data.location_name} (Updated fields: ${Object.keys(updates).join(", ")})`,
          );
          return updated;
        }

        return existing;
      }

      // 新規作成
      // ジオコーディングを実行する．
      const searchAddr = data.address || data.location_name;
      const location = await geocodeLocation(searchAddr);

      const speech = await prisma.speech.create({
        data: {
          candidateId: candidate.id,
          startAt: data.start_at,
          locationName: data.location_name,
          sourceUrl: data.source_url,
          lat: location?.lat,
          lng: location?.lng,
          address: location?.address || data.address, // API 結果優先，なければスクレイピング結果を使用する．
          speakers: data.speakers || [], // 配列として保存する．
        },
      });

      console.log(
        `✅ Saved speech: ${data.candidate_name} - ${data.location_name} (Speakers: ${(data.speakers || []).join(", ")})`,
      );
      return speech;
    } catch (error) {
      console.error(`❌ Save error (${this.partyName}):`, error);
      return null;
    }
  }

  protected parseDateTime(text: string): Date | null {
    // 簡易的なパース処理を行う．
    // YYYY年MM月DD日 HH:mm または YYYY/MM/DD HH:mm 形式に対応する．
    const jpPattern = /(\d{4})年(\d{1,2})月(\d{1,2})日\s*(\d{1,2}):(\d{2})/;
    const slashPattern = /(\d{4})\/(\d{1,2})\/(\d{1,2})\s*(\d{1,2}):(\d{2})/;

    const m = text.match(jpPattern) || text.match(slashPattern);
    if (m) {
      const [_, year, month, day, hour, minute] = m;
      return new Date(
        parseInt(year, 10),
        parseInt(month, 10) - 1,
        parseInt(day, 10),
        parseInt(hour, 10),
        parseInt(minute, 10),
      );
    }
    return null;
  }

  abstract scrape(): Promise<SpeechData[]>;

  async run(): Promise<number> {
    console.log(`🚀 Scraping started: ${this.partyName}`);
    try {
      const speechesData = await this.scrape();
      let savedCount = 0;

      for (const data of speechesData) {
        const speech = await this.saveSpeech(data);
        if (speech) {
          savedCount++;
        }
      }
      console.log(
        `🎉 Scraping completed: ${this.partyName} - ${savedCount} saved`,
      );
      return savedCount;
    } catch (error) {
      console.error(`💥 Scraping execution error (${this.partyName}):`, error);
      throw error;
    }
  }
}
