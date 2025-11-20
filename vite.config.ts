import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  // Fix: cast process to any to avoid TS error about cwd() missing on Process interface
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // This creates a global variable `process.env.API_KEY` that the code uses
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
    server: {
      host: true, // Expose to network for cloud IDEs
      port: 3000
    },
    build: {
      outDir: 'build', // Changed from default 'dist' to 'build' for Vercel compatibility
    }
  };
});