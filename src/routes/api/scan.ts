import { createFileRoute } from '@tanstack/react-router'
import { getDashboardService } from '../../server/instance.server'

/**
 * GET /api/scan — lets a free external scheduler (e.g. an hourly cron ping)
 * keep sources fresh and run the discovery scan on hosts that sleep between
 * requests, such as Vercel. Safe to expose: it only does work that is already
 * due (sources on their cadence, discovery once an hour), so repeated calls
 * cost nothing extra and cannot hammer publishers.
 */
export const Route = createFileRoute('/api/scan')({
  server: {
    handlers: {
      GET: async () => {
        const service = getDashboardService()
        const snapshot = await service.snapshot()
        const discovery = await service.discover()
        return Response.json(
          {
            generatedAt: snapshot.generatedAt,
            sources: snapshot.sources.length,
            healthy: snapshot.sources.filter((s) => s.health === 'ok').length,
            discovery,
          },
          { headers: { 'cache-control': 'no-store' } },
        )
      },
    },
  },
})
