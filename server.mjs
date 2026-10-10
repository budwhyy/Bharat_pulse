// Production server: `npm run build && npm start`.
// Serves built assets from dist/client and hands every other request to the
// TanStack Start fetch handler. No dependencies beyond Node itself.
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'
import { Readable } from 'node:stream'
import { fileURLToPath } from 'node:url'
import app from './dist/server/server.js'

const root = fileURLToPath(new URL('./dist/client/', import.meta.url))
const port = Number(process.env.PORT ?? 3000)
// Local by default; set HOST=0.0.0.0 to expose deliberately.
const host = process.env.HOST ?? '127.0.0.1'

const TYPES = {
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
}

const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'DENY',
}

async function serveStatic(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false
  let file
  try {
    file = normalize(join(root, decodeURIComponent(pathname)))
  } catch {
    return false
  }
  if (!file.startsWith(root)) return false // path traversal
  try {
    const info = await stat(file)
    if (!info.isFile()) return false
    res.writeHead(200, {
      ...SECURITY_HEADERS,
      'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
      'content-length': info.size,
      'cache-control': pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
    })
    if (req.method === 'HEAD') res.end()
    else createReadStream(file).pipe(res)
    return true
  } catch {
    return false
  }
}

function toHeaders(nodeHeaders) {
  const headers = new Headers()
  for (const [key, value] of Object.entries(nodeHeaders)) {
    if (Array.isArray(value)) for (const v of value) headers.append(key, v)
    else if (value != null) headers.set(key, value)
  }
  return headers
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
  if (url.pathname !== '/' && (await serveStatic(req, res, url.pathname))) return

  const controller = new AbortController()
  res.on('close', () => controller.abort())
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
  try {
    const response = await app.fetch(
      new Request(url, {
        method: req.method,
        headers: toHeaders(req.headers),
        body: hasBody ? Readable.toWeb(req) : undefined,
        duplex: hasBody ? 'half' : undefined,
        signal: controller.signal,
      }),
    )
    const headers = { ...SECURITY_HEADERS }
    response.headers.forEach((value, key) => {
      if (key !== 'set-cookie') headers[key] = value
    })
    const cookies = response.headers.getSetCookie()
    if (cookies.length) headers['set-cookie'] = cookies
    res.writeHead(response.status, headers)
    if (response.body && req.method !== 'HEAD') Readable.fromWeb(response.body).pipe(res)
    else res.end()
  } catch (error) {
    if (controller.signal.aborted) return
    console.error(error)
    if (!res.headersSent) res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('Internal server error')
  }
}).listen(port, host, () => {
  console.log(`Bharat Pulse listening on http://${host}:${port}`)
})
