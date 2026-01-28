import cron from "node-cron";
import { scrapeAll } from "@/actions/admin";

export function initCronJobs() {
  // 多重起動防止を行う（HMR などで再実行されるのを防ぐ）．
  // biome-ignore lint/suspicious/noExplicitAny: グローバル変数へのアクセスのため any を許容する．
  if ((global as any).__cron_initialized) {
    return;
  }
  // biome-ignore lint/suspicious/noExplicitAny: グローバル変数へのアクセスのため any を許容する．
  (global as any).__cron_initialized = true;

  console.log("⏰ Setting up cron jobs...");

  // 起動時に実行する．
  console.log("🚀 Running initial scrape on startup...");
  scrapeAll()
    // biome-ignore lint/suspicious/noExplicitAny: 戻り値の型推論が困難なため any を許容する．
    .then((result: any) => console.log("✅ Initial scrape completed:", result))
    .catch((err: unknown) => console.error("❌ Initial scrape failed:", err));

  // 毎時 0 分に実行する．
  cron.schedule("0 * * * *", async () => {
    console.log("⏰ Running scheduled scrape (hourly)...");
    try {
      const result = await scrapeAll();
      console.log("✅ Scheduled scrape completed:", result);
    } catch (error) {
      console.error("❌ Scheduled scrape failed:", error);
    }
  });

  console.log("✨ Cron jobs initialized.");
}
