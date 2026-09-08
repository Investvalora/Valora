/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // `include` restrito a `src` mantém `supabase/functions` fora do runner:
    // são Edge Functions Deno, com imports por URL que o Vite não resolve.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules/**', 'dist/**', 'supabase/**', 'scripts/**'],
    // Sem globais: `describe`/`it`/`expect` são importados de 'vitest', o que
    // dispensa configurar globals no ESLint e no tsconfig dos testes.
    globals: false,
    restoreMocks: true,
  },
})
