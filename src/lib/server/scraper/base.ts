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
        // 既存データの speakers と新しい speakers をマージする（重複排除）．
        const newSpeakers = Array.from(
          new Set([...(existing.speakers || []), ...(data.speakers || [])]),
        );

        // speakers に変更があれば更新する．
        if (newSpeakers.length !== existing.speakers.length) {
          const updated = await prisma.speech.update({
            where: { id: existing.id },
            data: {
              speakers: newSpeakers,
              updatedAt: new Date(),
            },
          });
          console.log(
            `🔄 Updated speech (speakers added): ${data.candidate_name} - ${data.location_name} (Speakers: ${newSpeakers.join(", ")})`,
          );
          return updated;
        }

        return existing;
      }

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
