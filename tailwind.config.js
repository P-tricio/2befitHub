/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    green: '#57B590', // Exact color extracted from logo
                    dark: '#1a1a1a',  // Text color
                    light: '#f3f4f6', // Light gray for backgrounds
                    white: '#ffffff', // Main background
                }
            },
            fontFamily: {
                sans: ['Poppins', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
