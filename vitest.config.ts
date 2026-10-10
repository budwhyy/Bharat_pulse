import { defineConfig } from 'vitest/config'
import viteReact from '@vitejs/plugin-react'

// Tests run without the Start plugin: domain and adapter modules are plain
// TypeScript, and component tests opt into jsdom per file.
export default defineConfig({
  plugins: [viteReact()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
  },
})
