import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'

// Vercel sets VERCEL=1 during builds: emit Vercel functions via Nitro there;
// everywhere else build plain dist/ for serve.mjs.
const onVercel = Boolean(process.env.VERCEL)

export default defineConfig({
  server: { port: 3000 },
  // tanstackStart() must come before the React plugin.
  plugins: [tanstackStart(), ...(onVercel ? [nitro({ preset: 'vercel' })] : []), viteReact()],
})
