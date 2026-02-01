import cron from "node-cron";
import { scrapeAll } from "@/actions/admin";

/**
 * 定期実行タスク（Cron ジョブ）を初期化する．
 */
export function initCronJobs() {
  // 多重起動を防止するためのフラグチェック（開発環境の HMR 対策）
  // biome-ignore lint/suspicious/noExplicitAny: Node.js の global オブジェクトを使用するため any を許容する．
  if ((global as any).__cron_initialized) {
    return;
  }
  // biome-ignore lint/suspicious/noExplicitAny: Node.js の global オブジェクトを使用するため any を許容する．
  (global as any).__cron_initialized = true;

  console.log("⏰ Setting up cron jobs...");

  // サーバー起動時に初回のスクレイピングを実行する
  console.log("🚀 Running initial scrape on startup...");
  scrapeAll()
    // biome-ignore lint/suspicious/noExplicitAny: 動的プロパティのため any を許容する．
    .then((result: any) => console.log("✅ Initial scrape finished:", result))
    .catch((err: unknown) => console.error("❌ Initial scrape failed:", err));

  // 1 時間ごと（毎時 0 分）に定期実行をスケジュールする
  cron.schedule("0 * * * *", async () => {
    console.log("⏰ Running hourly scheduled scrape...");
    try {
      const result = await scrapeAll();
      console.log("✅ Scheduled scrape finished:", result);
    } catch (error) {
      console.error("❌ Scheduled scrape failed:", error);
    }
  });

  console.log("✨ Cron jobs initialized.");
}
