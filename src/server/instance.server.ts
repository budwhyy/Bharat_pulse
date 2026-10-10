import { join } from 'node:path'
import { fileStore } from './cache'
import { httpFetcher } from './http'
import { DashboardService } from './service'

let service: DashboardService | null = null

/** One service per server process; the cache directory can be moved with BHARAT_PULSE_CACHE_DIR. */
export function getDashboardService(): DashboardService {
  service ??= new DashboardService({
    store: fileStore(process.env.BHARAT_PULSE_CACHE_DIR ?? join(process.cwd(), 'data', 'cache')),
    fetcher: httpFetcher,
    log: (message) => console.warn(`[sources] ${message}`),
  })
  return service
}
