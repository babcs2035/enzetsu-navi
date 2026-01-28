export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // サーバーサイド（Node.jsランタイム）でのみ実行
    const { initCronJobs } = await import("@/lib/scheduler");
    initCronJobs();
  }
}
