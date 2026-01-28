"use server";

import type { BaseScraper } from "@/lib/server/scraper/base";
import { LDPScraper } from "@/lib/server/scraper/parties/ldp";

const SCRAPERS: Record<string, new () => BaseScraper> = {
  LDP: LDPScraper,
};

export async function scrapeAll() {
  const results = [];
  // 全スクレイパー実行
  const scrapers = [new LDPScraper()];

  for (const scraper of scrapers) {
    try {
      const count = await scraper.run();
      results.push({ party: scraper.partyName, status: "success", count });
    } catch (error) {
      console.error(error);
      results.push({
        party: scraper.partyName,
        status: "failed",
        error: String(error),
      });
    }
  }

  return JSON.parse(JSON.stringify({ message: "Scraping completed", results }));
}

export async function scrapeParty(partyName: string) {
  const decodedName = decodeURIComponent(partyName);
  const ScraperClass = SCRAPERS[decodedName];

  if (!ScraperClass) {
    throw new Error(`Scraper for '${decodedName}' not implemented`);
  }

  const scraper = new ScraperClass();
  const count = await scraper.run();

  return JSON.parse(
    JSON.stringify({
      message: "Scraping completed",
      party: decodedName,
      count,
    }),
  );
}
