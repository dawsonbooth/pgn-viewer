import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

// GitHub Pages serves project sites under /<repo>/; BASE_PATH comes from actions/configure-pages.
const base = process.env.BASE_PATH ? `/${process.env.BASE_PATH.replace(/^\/|\/$/g, '')}/` : '/'

export default defineConfig({
  base,
  plugins: [solid(), tailwindcss()],
  build: { target: 'es2022' },
})
