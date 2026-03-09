import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Aumentiamo il limite per evitare avvisi fastidiosi
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Questa è la magia: separa le librerie pesanti in file distinti
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase')) return 'vendor-firebase';
            if (id.includes('lucide-react')) return 'vendor-icons';
            return 'vendor'; // Altre librerie (React, ecc.)
          }
        },
      },
    },
  },
  // Ottimizzazione per evitare che il browser faccia troppe richieste in dev
  optimizeDeps: {
    include: ['lucide-react', 'firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
  },
})