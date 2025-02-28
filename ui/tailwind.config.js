/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
  	extend: {
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
        'retro-green': 'rgba(128, 144, 20, 1)',
        'retro-green-dark': 'rgba(177, 185, 122, 1)',
        'retro-green-darker': 'rgba(177, 185, 122, 1)',
        'retro-grey': 'rgba(34, 34, 34, 1)',
      },
      fontFamily: {
        'astronaut': ['AstroNaut', 'sans-serif']
      }
  	}
  },
  plugins: [require("tailwindcss-animate")],
}

