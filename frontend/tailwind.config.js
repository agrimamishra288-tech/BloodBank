/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#04060D',
          900: '#080B14',
          800: '#0D1117',
          700: '#0F1629',
          600: '#161B2E',
          500: '#1E2744',
          400: '#2A3556',
        },
        blood: {
          900: '#5C0A18',
          800: '#7B0D1E',
          700: '#9B1B30',
          600: '#C0392B',
          500: '#E63946',
          400: '#FF6B7A',
          300: '#FF9AA2',
        },
        gold: {
          600: '#D4870A',
          500: '#F4A261',
          400: '#FBBF24',
          300: '#FDE68A',
        },
        emerald: { 500: '#2ECC71', 400: '#6EE7B7' },
        muted: '#8892B0',
        surface: '#0F1629',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #080B14 0%, #0D1117 50%, #130A14 100%)',
        'card-gradient': 'linear-gradient(135deg, #0F1629 0%, #161B2E 100%)',
        'blood-gradient': 'linear-gradient(135deg, #9B1B30 0%, #E63946 100%)',
        'glow-radial': 'radial-gradient(ellipse at center, rgba(230,57,70,0.15) 0%, transparent 70%)',
      },
      boxShadow: {
        blood:    '0 0 20px rgba(230, 57, 70, 0.25)',
        'blood-lg': '0 0 50px rgba(230, 57, 70, 0.4)',
        card:     '0 4px 24px rgba(0, 0, 0, 0.5)',
        glow:     '0 0 15px rgba(230, 57, 70, 0.3), 0 4px 24px rgba(0,0,0,0.5)',
      },
      animation: {
        'pulse-slow':  'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float':       'float 6s ease-in-out infinite',
        'glow-pulse':  'glowPulse 2s ease-in-out infinite alternate',
        'slide-up':    'slideUp 0.4s ease-out',
        'fade-in':     'fadeIn 0.3s ease-out',
        'spin-slow':   'spin 8s linear infinite',
      },
      keyframes: {
        float:     { '0%,100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-12px)' } },
        glowPulse: { from: { boxShadow: '0 0 10px rgba(230,57,70,0.2)' }, to: { boxShadow: '0 0 30px rgba(230,57,70,0.6)' } },
        slideUp:   { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        fadeIn:    { from: { opacity: '0' }, to: { opacity: '1' } },
      },
      borderRadius: { xl2: '1.25rem' },
    },
  },
  plugins: [],
}
