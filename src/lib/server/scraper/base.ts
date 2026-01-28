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
      throw new Error(`政党 '${this.partyName}' がデータベースに存在しません`);
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
      console.log(`新しい候補者を作成: ${name} (${this.partyName})`);
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

      // 重複チェック (候補者と日時のみで判定)
      const existing = await prisma.speech.findFirst({
        where: {
          candidateId: candidate.id,
          startAt: data.start_at,
        },
      });

      if (existing) {
        // 既存データのspeakersと新しいspeakersをマージ（重複排除）
        const newSpeakers = Array.from(
          new Set([...(existing.speakers || []), ...(data.speakers || [])]),
        );

        // speakersに変更があれば更新
        if (newSpeakers.length !== existing.speakers.length) {
          const updated = await prisma.speech.update({
            where: { id: existing.id },
            data: {
              speakers: newSpeakers,
              updatedAt: new Date(),
            },
          });
          console.log(
            `演説データを更新 (弁士追加): ${data.candidate_name} - ${data.location_name} (弁士: ${newSpeakers.join(", ")})`,
          );
          return updated;
        }

        return existing;
      }

      // ジオコーディング
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
          address: location?.address || data.address, // API結果優先、なければスクレイピング結果
          speakers: data.speakers || [], // 配列として保存
        },
      });

      console.log(
        `演説データを保存: ${data.candidate_name} - ${data.location_name} (弁士: ${(data.speakers || []).join(", ")})`,
      );
      return speech;
    } catch (error) {
      console.error(`保存エラー (${this.partyName}):`, error);
      return null;
    }
  }

  protected parseDateTime(text: string): Date | null {
    // 簡易的なパース処理
    const match = text.match(/20\d{2}/);
    if (!match) {
      // 年が含まれていない場合は今年とみなす等の補正が必要だが
      // Python版も正規表現でマッチさせていた。
      // パターン: "(\d{4})年(\d{1,2})月(\d{1,2})日\s*(\d{1,2}):(\d{2})"
      // 等
    }

    // YYYY年MM月DD日 HH:mm
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
    console.log(`スクレイピング開始: ${this.partyName}`);
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
        `スクレイピング完了: ${this.partyName} - ${savedCount}件保存`,
      );
      return savedCount;
    } catch (error) {
      console.error(`スクレイピング実行エラー (${this.partyName}):`, error);
      throw error;
    }
  }
}
