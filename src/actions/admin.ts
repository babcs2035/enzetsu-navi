"use server";

import type { BaseScraper } from "@/lib/server/scraper/base";
import { IshinScraper } from "@/lib/server/scraper/parties/ishin";
import { JCPScraper } from "@/lib/server/scraper/parties/jcp";
import { KokuminScraper } from "@/lib/server/scraper/parties/kokumin";
import { LDPScraper } from "@/lib/server/scraper/parties/ldp";
import { TeamMiraiScraper } from "@/lib/server/scraper/parties/team_mirai";

/**
 * 利用可能なスクレイパーのリスト定義．
 */
const SCRAPERS: Record<string, new () => BaseScraper> = {
  LDP: LDPScraper,
  Ishin: IshinScraper,
  Kokumin: KokuminScraper,
  JCP: JCPScraper,
  TeamMirai: TeamMiraiScraper,
};

/**
 * 全ての政党の最新演説データを一括で取得し，データベースを更新する．
 */
export async function scrapeAll() {
  const results = [];
  const scrapers = Object.values(SCRAPERS).map(
    ScraperClass => new ScraperClass(),
  );

  for (const scraper of scrapers) {
    try {
      const count = await scraper.run();
      results.push({ party: scraper.partyName, status: "success", count });
    } catch (error) {
      console.error(`💥 Failed to scrape ${scraper.partyName}:`, error);
      results.push({
        party: scraper.partyName,
        status: "failed",
        error: String(error),
      });
    }
  }

  await runCleanup();

  return JSON.parse(JSON.stringify({ message: "Scraping completed", results }));
}

/**
 * 指定された特定の政党についてのみ最新演説データを取得する．
 */
export async function scrapeParty(partyName: string) {
  const decodedName = decodeURIComponent(partyName);
  const ScraperClass = SCRAPERS[decodedName];

  if (!ScraperClass) {
    throw new Error(`Scraper for '${decodedName}' not implemented`);
  }

  const scraper = new ScraperClass();
  const count = await scraper.run();

  await runCleanup();

  return JSON.parse(
    JSON.stringify({
      message: "Scraping completed",
      party: decodedName,
      count,
    }),
  );
}

import { exec } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";

const execAsync = promisify(exec);

/**
 * DBクリーンアップ処理を実行する．
 */
async function runCleanup() {
  console.log("🧹 Running DB cleanup...");
  try {
    const jsPath = join(process.cwd(), "prisma/cleanup-db.js");
    let command = "pnpx tsx prisma/cleanup-db.ts";
    if (existsSync(jsPath)) {
      command = "node prisma/cleanup-db.js";
    }

    const { stdout, stderr } = await execAsync(command, {
      cwd: process.cwd(),
    });
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
  }
}
