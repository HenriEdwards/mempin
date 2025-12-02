/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      sm: '480px',
      md: '768px',
    },
    colors: {
      'black': '#000000',
      'red': '#FF0000',
      'white': '#fff',
      'blue': '#1fb6ff',
      'purple': '#7e5bef',
      'pink': '#ff49db',
      'orange': '#ff7849',
      'green': '#13ce66',
    },
    fontFamily: {
      sans: ['Montserrat', 'sans-serif'],
    },
    extend: {
      fontSize: {
        // 
      },
      spacing: {
        // 
      },
      borderRadius: {
        // 
      }
    }
  },
  plugins: [
    // 
  ],
}