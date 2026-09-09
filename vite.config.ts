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
    /**
     * Fuso do runner fixado aqui, não herdado do ambiente. `formatDate` existe
     * porque `new Date('2026-01-05')` é lido em UTC e exibe o dia anterior em
     * fuso negativo; num runner UTC — o caso de praticamente todo CI — essa
     * regressão passa verde e o bug só aparece na tela do usuário.
     *
     * São Paulo é UTC-3 fixo desde 2019 (sem horário de verão), então o
     * deslocamento é estável e o teste é determinístico. Verificado que
     * `TZ=UTC pnpm test:run` continua vendo -180: este valor vence o ambiente.
     */
    env: { TZ: 'America/Sao_Paulo' },
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
