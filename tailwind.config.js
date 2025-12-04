module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/layouts/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // bitsofco.de color palette
        'bits-yellow': '#feda4c',
        'bits-dark': '#111111',
        'bits-gray': '#666666',
        'bits-light-gray': '#f5f5f5',
        'bits-white': '#ffffff',
        // Theta logo colors
        'theta-green': '#0EA974',
        'theta-navy': '#1E355E',
        'theta-purple': '#84286B',
        // Theta navy variations (for backgrounds and subtle elements)
        'theta-navy-50': '#F0F2F5',
        'theta-navy-100': '#D9DEE6',
        'theta-navy-200': '#B3BFCD',
        'theta-navy-300': '#8DA0B4',
        'theta-navy-400': '#67819B',
        'theta-navy-500': '#4A6480',
        'theta-navy-600': '#3A4F66',
        'theta-navy-700': '#2A3A4D',
        'theta-navy-800': '#1E2B3A',
        'theta-navy-900': '#1E355E',
      },
      fontFamily: {
        sans: [
          'IBM Plex Sans',
          '-apple-system',
          'BlinkMacSystemFont',
          'Avenir Next',
          'Avenir',
          'Segoe UI',
          'Helvetica Neue',
          'Helvetica',
          'Ubuntu',
          'Roboto',
          'Noto',
          'Arial',
          'sans-serif',
        ],
        mono: ['Consolas', 'Monaco', 'Andale Mono', 'Ubuntu Mono', 'monospace'],
      },
      spacing: {
        18: '4.5rem',
        88: '22rem',
      },
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
        '4xl': '2.5rem',
      },
    },
  },
  plugins: [],
};
