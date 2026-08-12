import { defineConfig } from 'vite';
import { resolve } from 'path';

/**
 * Plugin Code Build — bundles src/claude_mcp_plugin/code.ts → dist/code.js
 * as a single IIFE. Figma sandbox requires all deps inlined (no imports at runtime).
 */
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/claude_mcp_plugin/code.ts'),
      name: 'ClaudeTalkToFigmaCode',
      formats: ['iife'],
      fileName: () => 'code.js',
    },
    outDir: 'dist-plugin',
    emptyOutDir: true,
    minify: 'es',
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
});
