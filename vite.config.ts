import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'

export default defineConfig({
  server: { port: 3000 },
  // tanstackStart() must come before the React plugin.
  plugins: [tanstackStart(), viteReact()],
})
