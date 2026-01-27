export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startCron } = await import("@/lib/server/cron");
    startCron();
  }
}
