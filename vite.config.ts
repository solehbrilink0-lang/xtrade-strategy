import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// Plugin sederhana untuk menyalin file statis penting ke dist
const copyStaticFiles = () => {
  return {
    name: 'copy-static-files',
    closeBundle: () => {
      const filesToCopy = ['sw.js', 'manifest.json'];
      filesToCopy.forEach(file => {
        const srcPath = path.resolve(file);
        const destPath = path.resolve('dist', file);
        
        // Pastikan folder dist ada
        if (!fs.existsSync(path.resolve('dist'))) {
           return;
        }

        if (fs.existsSync(srcPath)) {
          fs.copyFileSync(srcPath, destPath);
          console.log(`[Vite] Copied ${file} to dist/`);
        } else {
          console.warn(`[Vite] Warning: ${file} not found in root.`);
        }
      });
    }
  };
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), copyStaticFiles()],
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'recharts', '@supabase/supabase-js'],
        },
      },
    },
  },
});