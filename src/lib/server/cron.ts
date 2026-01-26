import cron, { type ScheduledTask } from 'node-cron'
import { scrapeAll } from '@/actions/admin'

const CRON_SCHEDULE = '0 * * * *' // 毎時0分

// HMRによる多重起動防止のためのグローバル変数
const globalForCron = globalThis as unknown as {
  cronJob: ScheduledTask | undefined
}

export function startCron() {
  // 既に実行中なら何もしない（開発環境のHMR対策）
  if (globalForCron.cronJob) {
    return
  }

  console.log('[Cron] Scheduler initialized')

  const job = cron.schedule(CRON_SCHEDULE, async () => {
    console.log('[Cron] Running scheduled scraping...')
    try {
      // API経由ではなくServer Actionを直接実行
      const result = await scrapeAll()
      console.log('[Cron] Scraping completed:', result)
    } catch (e) {
      console.error('[Cron] Execution error:', e)
    }
  })

  globalForCron.cronJob = job
}
