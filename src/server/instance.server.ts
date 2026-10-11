import { join } from 'node:path'
import { fileStore } from './cache'
import { httpFetcher } from './http'
import { DashboardService } from './service'

let service: DashboardService | null = null

/** One service per server process; the cache directory can be moved with BHARAT_PULSE_CACHE_DIR. */
export function getDashboardService(): DashboardService {
  service ??= new DashboardService({
    // Vercel functions can only write to /tmp, which lasts as long as a warm instance.
    store: fileStore(
      process.env.BHARAT_PULSE_CACHE_DIR ??
        (process.env.VERCEL ? join('/tmp', 'bharat-pulse') : join(process.cwd(), 'data', 'cache')),
    ),
    fetcher: httpFetcher,
    dataGovInApiKey: process.env.DATA_GOV_IN_API_KEY,
    cpcbConcentrationVerified: process.env.CPCB_CONCENTRATION_VERIFIED === 'true',
    log: (message) => console.warn(`[sources] ${message}`),
  })
  return service
}
