import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
const apiKey = process.env.GEMINI_KEY || '';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.API_KEY': JSON.stringify(apiKey)
  }
});