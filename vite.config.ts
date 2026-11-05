import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relatívne cesty – hra funguje na GitHub Pages (/Hra/) aj lokálne
export default defineConfig({
  base: './',
  plugins: [react()],
})
