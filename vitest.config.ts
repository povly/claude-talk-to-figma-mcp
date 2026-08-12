import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/claude_mcp_plugin/**/__tests__/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['src/claude_mcp_plugin/__tests__/setup.ts'],
  },
});
