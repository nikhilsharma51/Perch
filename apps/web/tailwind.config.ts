import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Libre Caslon Display', 'Libre Caslon Text', 'Georgia', 'serif'],
        'display-text': ['Libre Caslon Text', 'Georgia', 'serif'],
        ui: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
