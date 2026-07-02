/** @type {import('tailwindcss').Config} */
export default {
  content: ["./app/renderer/**/*.{html,js,ts,jsx,tsx}"],
  darkMode: ["class", "[data-theme='dark']"],
  theme: {
    extend: {
      colors: {
        graphite: "#0c1116",
        rail: "#10171d",
        panel: "#151e25",
        stroke: "#27333c",
        signal: "#62b7a5",
        amber: "#d8a24a"
      },
      fontFamily: {
        display: ["Bahnschrift", "Arial Narrow", "sans-serif"],
        sans: ["Segoe UI Variable", "Segoe UI", "sans-serif"],
        mono: ["Cascadia Mono", "Consolas", "monospace"]
      }
    }
  },
  plugins: []
};
