import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,      // Paksa jalan di 5173
    strictPort: true // Biar gak lari ke 5174 atau 5175 kalau 5173 lagi dipake
  },
})