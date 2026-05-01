/** @type {import('tailwindcss').Config} */
export default {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        paper: '#f7f3ec',
        'paper-2': '#f1ece3',
        'paper-3': '#e8e2d6',
        ink: '#1f1d1a',
        'ink-2': '#4a463f',
        'ink-3': '#7a7468',
        'ink-4': '#a8a294',
        rule: '#e0d9c8',
        'rule-soft': '#ebe5d6',
        accent: '#c4623a',
        'accent-soft': '#f0d8cb',
        'accent-ink': '#8b3e1d',
        highlight: '#f5e4a8',
        link: '#4f6b8f',
        tag: '#5a7b56',
        'tag-soft': '#dde6d8',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        serif: ['"Source Serif 4"', '"Source Serif Pro"', '"Iowan Old Style"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      maxWidth: {
        prose: '64ch',
      },
    },
  },
  plugins: [],
};
