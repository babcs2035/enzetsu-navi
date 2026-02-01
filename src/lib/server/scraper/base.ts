import { type Browser, chromium, type Page } from "playwright";
import { prisma } from "@/lib/prisma";
import { geocodeLocation } from "@/lib/server/geocoding";

/**
 * スクレイピングで取得した演説データの構造定義．
 */
export interface SpeechData {
  candidate_name: string;
  start_at: Date;
  location_name: string;
  source_url?: string;
  speakers?: string[];
  address?: string;
}

/**
 * 各政党用スクレイパーの基底クラス．
 */
export abstract class BaseScraper {
  abstract partyName: string;
  abstract baseUrl: string;

  /**
   * Playwright のブラウザインスタンスを起動する．
   */
  protected async getBrowser(): Promise<Browser> {
    return await chromium.launch({ headless: true });
  }

  /**
   * ブラウザコンテキストを作成し，新しいページを開く．
   */
  protected async getPage(browser: Browser): Promise<Page> {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    });
    return await context.newPage();
  }

  /**
   * データベースから政党情報を取得する．
   */
  protected async getParty() {
    const party = await prisma.party.findUnique({
      where: { name: this.partyName },
    });
    if (!party) {
      throw new Error(`Party '${this.partyName}' not found.`);
    }
    return party;
  }

  /**
   * 候補者を取得するか，存在しない場合は新規作成する．
   */
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
      console.log(`👤 Created candidate: ${name} (${this.partyName})`);
    }
    return candidate;
  }

  /**
   * 取得した演説データをデータベースに保存する．既存データがある場合は更新を試みる．
   */
  protected async saveSpeech(data: SpeechData) {
    try {
      const party = await this.getParty();
      const candidate = await this.getOrCreateCandidate(
        data.candidate_name,
        party.id,
      );

      // 同一候補者かつ同一開始時刻のデータがあるかを確認する
      const existing = await prisma.speech.findFirst({
        where: {
          candidateId: candidate.id,
          startAt: data.start_at,
        },
      });

      if (existing) {
        // 既存データの更新処理
        // biome-ignore lint/suspicious/noExplicitAny: 動的更新用オブジェクト
        const updates: any = {};

        // 弁士情報のマージ
        const currentSpeakers = existing.speakers || [];
        const newSpeakersInput = data.speakers || [];
        const mergedSpeakers = Array.from(
          new Set([...currentSpeakers, ...newSpeakersInput]),
        ).sort();

        // 弁士情報の変更確認
        const isSpeakersChanged =
          currentSpeakers.length !== mergedSpeakers.length ||
          JSON.stringify(currentSpeakers.sort()) !==
            JSON.stringify(mergedSpeakers);

        if (isSpeakersChanged) {
          updates.speakers = mergedSpeakers;
        }

        // 基本情報の変更確認
        if (
          data.location_name &&
          data.location_name !== existing.locationName
        ) {
          updates.locationName = data.location_name;
        }
        if (data.source_url && data.source_url !== existing.sourceUrl) {
          updates.sourceUrl = data.source_url;
        }

        // ジオコーディングの再実行が必要か判断する
        let shouldGeocode = false;
        let searchAddr = data.address || data.location_name;

        if (data.address && data.address !== existing.address) {
          shouldGeocode = true;
          searchAddr = data.address;
        } else if (
          !data.address &&
          data.location_name !== existing.locationName
        ) {
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

        // 変更がある場合のみデータベースを更新する
        if (Object.keys(updates).length > 0) {
          updates.updatedAt = new Date();
          const updated = await prisma.speech.update({
            where: { id: existing.id },
            data: updates,
          });
          console.log(
            `🔄 Updated speech: ${data.candidate_name} @ ${data.location_name}`,
          );
          return updated;
        }

        return existing;
      }

      // 新規データの保存処理
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
          address: location?.address || data.address,
          speakers: data.speakers || [],
        },
      });

      console.log(
        `✅ Saved speech: ${data.candidate_name} @ ${data.location_name}`,
      );
      return speech;
    } catch (error) {
      console.error(`❌ Error saving speech (${this.partyName}):`, error);
      return null;
    }
  }

  /**
   * 文字列から日付と時刻を解析する補助関数．
   */
  protected parseDateTime(text: string): Date | null {
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

  /**
   * 各政党のウェブサイトをスクレイピングする抽象メソッド．
   */
  abstract scrape(): Promise<SpeechData[]>;

  /**
   * スクレイピングタスクを実行し，結果をデータベースに反映させる．
   */
  async run(): Promise<number> {
    console.log(`🚀 Starting scraper: ${this.partyName}`);
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
        `🎉 Scraping finished: ${this.partyName} (${savedCount} speeches)`,
      );
      return savedCount;
    } catch (error) {
      console.error(`💥 Execution error (${this.partyName}):`, error);
      throw error;
    }
  }
}
