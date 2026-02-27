import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import viteSingleFile from 'vite-plugin-singlefile';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    viteSingleFile()
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    }
  }
});