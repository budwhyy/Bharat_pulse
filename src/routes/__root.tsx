import type { QueryClient } from '@tanstack/react-query'
import { HeadContent, Link, Outlet, Scripts, createRootRouteWithContext } from '@tanstack/react-router'
import { PreferencesProvider } from '../preferences/PreferencesProvider'
import { THEME_BOOT_SCRIPT } from '../preferences/storage'
import appCss from '../styles/app.css?url'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { name: 'color-scheme', content: 'light dark' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
    ],
    scripts: [{ children: THEME_BOOT_SCRIPT }],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
})

function RootComponent() {
  return (
    // The boot script may set data-theme before hydration; React does not own that attribute.
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        {/* Rendered directly: head() dedupes meta by name, which would drop one of the pair. */}
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0d0d0d" media="(prefers-color-scheme: dark)" />
      </head>
      <body>
        <PreferencesProvider>
          <Outlet />
        </PreferencesProvider>
        <Scripts />
      </body>
    </html>
  )
}

function NotFound() {
  return (
    <main id="main" className="main" style={{ margin: '0 auto' }}>
      <div className="section-head">
        <h1>Page not found</h1>
        <p>
          Bharat Pulse lives on a single page. <Link to="/">Go to the dashboard</Link>.
        </p>
      </div>
    </main>
  )
}
