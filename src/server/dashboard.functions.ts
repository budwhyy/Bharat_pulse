import { createServerFn } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'
import { getDashboardService } from './instance.server'

/**
 * Public, read-only dashboard snapshot. Source fetching happens only on the
 * server; the browser never contacts a feed or sees a credential.
 */
export const fetchDashboard = createServerFn({ method: 'GET' }).handler(async () => {
  setResponseHeader('cache-control', 'no-store')
  return getDashboardService().snapshot()
})

/** Manual refresh. Upstream hits are rate-limited per source inside the service. */
export const refreshDashboard = createServerFn({ method: 'POST' }).handler(async () => {
  setResponseHeader('cache-control', 'no-store')
  return getDashboardService().refreshNow()
})
