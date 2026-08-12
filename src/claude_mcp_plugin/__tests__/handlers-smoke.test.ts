import { describe, it, expect, vi, beforeEach } from 'vitest';

declare const figma: {
  skipInvisibleInstanceChildren: boolean;
  ui: { onmessage: Function | null };
};

// Module-load smoke test: code.ts executes side effects on import.
// Verify the figma globals are wired up correctly by setup.ts mock.
describe('plugin code.ts module load', () => {
  it('loads without crashing', async () => {
    // Importing code.ts triggers top-level side effects:
    //   - figma.skipInvisibleInstanceChildren = true
    //   - figma.showUI(__html__, { width: 300, height: 220 })
    //   - figma.ui.onmessage = async (msg) => { ... }
    // If any of these fail, the import itself will throw.
    await import('../code');
    // If we got here, the module loaded successfully.
    expect(true).toBe(true);
  });

  it('sets figma.skipInvisibleInstanceChildren = true', async () => {
    await import('../code');
    expect(figma.skipInvisibleInstanceChildren).toBe(true);
  });

  it('registers figma.ui.onmessage handler', async () => {
    await import('../code');
    expect(typeof figma.ui.onmessage).toBe('function');
  });
});

// Handler smoke tests — skipped until handlers are exported (S1a typing phase).
// These serve as documentation of critical handler behavior to lock during migration.
describe('handler smoke (S1a — pending export)', () => {
  it.skip('getDocumentInfo returns document structure', async () => {
    // TODO S1a: export handleCommand or getDocumentInfo, then test:
    //   import { handleCommand } from '../code';
    //   const result = await handleCommand('get_document_info', {});
    //   expect(result).toHaveProperty('status', 'success');
    //   expect(result.data).toHaveProperty('name');
    //   expect(result.data).toHaveProperty('children');
  });

  it.skip('findNodes returns array of matches', async () => {
    // TODO S1a: export handleCommand or findNodes, then test with mocked
    // figma.currentPage.findAllWithCriteria / figma.root.findAll
  });

  it.skip('setFillColor returns success for valid node', async () => {
    // TODO S1a: export handleCommand or setFillColor, then test with
    // mocked figma.getNodeByIdAsync returning a GeometryMixin node.
  });
});
