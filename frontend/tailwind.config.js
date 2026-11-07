/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vynk: {
          bg: '#080a14',
          surface: '#0f1325',
          card: '#141a33',
          cardHover: '#1a2244',
          border: 'rgba(255, 255, 255, 0.08)',
          glow: 'rgba(168, 85, 247, 0.3)',
          purple: '#8b5cf6',
          pink: '#ec4899',
          cyan: '#06b6d4',
          indigo: '#6366f1'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glow-sm': '0 0 15px rgba(168, 85, 247, 0.25)',
        'glow-md': '0 0 25px rgba(168, 85, 247, 0.4)',
        'glow-lg': '0 0 40px rgba(168, 85, 247, 0.5)',
        'glow-cyan': '0 0 25px rgba(6, 182, 212, 0.4)',
      },
      backgroundImage: {
        'vynk-gradient': 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
        'vynk-glow': 'radial-gradient(circle at 50% 0%, rgba(139, 92, 246, 0.15) 0%, transparent 75%)',
        'card-gradient': 'linear-gradient(180deg, rgba(22, 28, 54, 0.7) 0%, rgba(13, 17, 34, 0.85) 100%)',
      }
    },
  },
  plugins: [],
}
