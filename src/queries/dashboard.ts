import { queryOptions } from '@tanstack/react-query'
import { fetchDashboard } from '../server/dashboard.functions'

/** The browser re-reads the server snapshot every minute; the server decides when sources are re-fetched. */
export const POLL_MS = 60_000
/** While the server is mid-refresh, check back sooner. */
export const POLL_REFRESHING_MS = 5_000

export const dashboardQuery = queryOptions({
  queryKey: ['dashboard'],
  queryFn: () => fetchDashboard(),
  staleTime: 30_000,
  refetchInterval: (query) => (query.state.data?.refreshing ? POLL_REFRESHING_MS : POLL_MS),
  refetchOnWindowFocus: true,
  // A failed poll keeps the last valid snapshot on screen.
  retry: 1,
})
