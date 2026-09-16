import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages（https://hamburg1106-collab.github.io/tokushima-ikoka/）で公開するため
  base: '/tokushima-ikoka/',
  plugins: [react()],
})
