import { describe, it, expect } from 'vitest';
import { pruneTreeAtDepth } from '../code';

describe('pruneTreeAtDepth', () => {
  it('returns input as-is for non-object input', () => {
    expect(pruneTreeAtDepth(null, 1)).toBeNull();
    expect(pruneTreeAtDepth(undefined, 1)).toBeUndefined();
  });

  it('returns node unchanged when it has no children', () => {
    const leaf = { id: '1', name: 'leaf', type: 'RECTANGLE' };
    expect(pruneTreeAtDepth(leaf, 5)).toEqual(leaf);
  });

  it('prunes children into stubs at maxDepth=0', () => {
    const tree = {
      id: '0',
      name: 'root',
      type: 'FRAME',
      children: [
        { id: '1', name: 'child-a', type: 'RECTANGLE', children: [{ id: '2', name: 'grandchild', type: 'TEXT' }] },
        { id: '3', name: 'child-b', type: 'FRAME' },
      ],
    };

    const result = pruneTreeAtDepth(tree, 0);

    expect(result._childrenTruncated).toBe(true);
    expect(result.children).toHaveLength(2);
    expect(result.children[0]).toEqual({ id: '1', name: 'child-a', type: 'RECTANGLE', _childrenTruncated: true });
    expect(result.children[1]).toEqual({ id: '3', name: 'child-b', type: 'FRAME', _childrenTruncated: true });
  });

  it('keeps full children at depth 1, stubs at depth 2 (maxDepth=1)', () => {
    const tree = {
      id: '0',
      name: 'root',
      type: 'FRAME',
      fills: [{ type: 'SOLID' }],
      children: [
        {
          id: '1',
          name: 'child',
          type: 'FRAME',
          fills: [{ type: 'SOLID' }],
          children: [{ id: '2', name: 'grandchild', type: 'TEXT', characters: 'hi' }],
        },
      ],
    };

    const result = pruneTreeAtDepth(tree, 1);

    expect(result._childrenTruncated).toBeUndefined();
    expect(result.fills).toEqual([{ type: 'SOLID' }]);
    expect(result.children[0].fills).toEqual([{ type: 'SOLID' }]);
    expect(result.children[0]._childrenTruncated).toBe(true);
    expect(result.children[0].children[0]).toEqual({
      id: '2',
      name: 'grandchild',
      type: 'TEXT',
      _childrenTruncated: true,
    });
  });

  it('does not mutate siblings unrelated to pruning path', () => {
    const tree = {
      id: '0',
      type: 'FRAME',
      children: [{ id: '1', type: 'RECTANGLE' }],
    };

    const result = pruneTreeAtDepth(tree, 5);

    expect(result.children[0]).toEqual({ id: '1', type: 'RECTANGLE' });
    expect(result._childrenTruncated).toBeUndefined();
  });
});
