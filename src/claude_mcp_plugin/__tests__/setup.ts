/**
 * Minimal figma global mock for unit-testing plugin code in Node/Vitest.
 * Covers only the surface area touched at module-load time:
 *   - figma.skipInvisibleInstanceChildren (settable property)
 *   - figma.showUI / figma.notify (no-ops)
 *   - figma.ui.postMessage / figma.ui.onmessage (no-ops)
 *   - figma.clientStorage.getAsync / setAsync (in-memory Map)
 *   - figma.loadFontAsync (no-op)
 *   - figma.getNodeByIdAsync (returns null — override per-test if needed)
 *
 * Per-test files can override any method via `globalThis.figma.x = ...`.
 */
const store = new Map<string, unknown>();

const figma = {
  skipInvisibleInstanceChildren: false,
  showUI: () => {},
  notify: () => {},
  closePlugin: () => {},
  loadFontAsync: async () => {},
  loadAllPagesAsync: async () => {},
  getNodeByIdAsync: async () => null,
  currentPage: { selection: [], children: [] },
  root: { children: [] },
  clientStorage: {
    getAsync: async (key: string) => store.get(key),
    setAsync: async (key: string, value: unknown) => {
      store.set(key, value);
    },
  },
  ui: {
    postMessage: () => {},
    onmessage: null as ((msg: unknown) => void) | null,
    resize: () => {},
  },
  on: () => {},
  off: () => {},
};

// Expose as global, matching Figma sandbox runtime.
(globalThis as unknown as { figma: typeof figma }).figma = figma;

// Figma sandbox injects __html__ (the bundled ui.html content) and a few other
// globals at runtime. Provide minimal stubs so module-load doesn't crash.
(globalThis as unknown as { __html__: string }).__html__ = '<div>mock-ui</div>';
(globalThis as unknown as { __uiHostname__: string }).__uiHostname__ = 'mock-ui-host';

export {};
