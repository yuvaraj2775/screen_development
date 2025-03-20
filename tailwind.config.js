/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#4361ee",
        success: "#28CD41",
        danger: "#dc3545",
        dark: "#2b2d42",
        gray: {
          100: "#f8f9fa",
          200: "#dee2e6",
          500: "#6c757d",
        },
      },
    },
  },
  plugins: [],
};
