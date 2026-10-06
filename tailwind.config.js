/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Legacy dark theme
        dark: {
          bg: '#0f172a',
          surface: '#1e293b',
          border: '#334155',
        },
        // Novo fluxo — paleta principal
        nf: {
          bg:        '#131313', // fundo global
          surface:   '#1B1B1B', // cards / painéis
          sidebar:   '#1C1C1C', // sidebar
          border:    'rgba(255,255,255,0.08)',
          muted:     '#8F8F8F', // texto secundário
          green:     '#63D16B',
          'green-bar': '#33AA3B',
          pink:      '#FF8FBE',
          blue:      '#7987FF',
          yellow:    '#FFD95A',
          purple:    '#C084FC',
        },
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
      },
    },
  },
  plugins: [],
}
