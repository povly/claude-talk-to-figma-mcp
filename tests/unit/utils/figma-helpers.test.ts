import { filterFigmaNode, rgbaToHex } from '../../../src/talk_to_figma_mcp/utils/figma-helpers';

const RED = { r: 1, g: 0, b: 0, a: 1 };
const GREEN = { r: 0, g: 1, b: 0, a: 1 };

describe('rgbaToHex', () => {
  it('converts an opaque rgba color to #RRGGBB', () => {
    expect(rgbaToHex(RED)).toBe('#ff0000');
    expect(rgbaToHex(GREEN)).toBe('#00ff00');
  });

  it('appends alpha when not fully opaque', () => {
    expect(rgbaToHex({ r: 1, g: 0, b: 0, a: 0.5 })).toBe('#ff000080');
  });
});

describe('filterFigmaNode', () => {
  describe('existing fields preservation', () => {
    it('preserves id, name, type, fills, strokes, cornerRadius, absoluteBoundingBox, localPosition, characters and style', () => {
      const node = {
        id: '1:2',
        name: 'Card',
        type: 'FRAME',
        fills: [{ type: 'SOLID', color: RED }],
        strokes: [{ type: 'SOLID', color: GREEN }],
        cornerRadius: 8,
        absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 50 },
        localPosition: { x: 10, y: 10 },
        characters: 'Hello',
        style: {
          fontFamily: 'Inter',
          fontStyle: 'Regular',
          fontWeight: 400,
          fontSize: 14,
          textAlignHorizontal: 'LEFT',
          letterSpacing: { value: 0, unit: 'PERCENT' },
          lineHeightPx: 20,
        },
      };

      const result = filterFigmaNode(node);

      expect(result.id).toBe('1:2');
      expect(result.name).toBe('Card');
      expect(result.type).toBe('FRAME');
      expect(result.fills).toEqual([{ type: 'SOLID', color: '#ff0000' }]);
      expect(result.strokes).toEqual([{ type: 'SOLID', color: '#00ff00' }]);
      expect(result.cornerRadius).toBe(8);
      expect(result.absoluteBoundingBox).toEqual({ x: 0, y: 0, width: 100, height: 50 });
      expect(result.localPosition).toEqual({ x: 10, y: 10 });
      expect(result.characters).toBe('Hello');
      expect(result.style.fontFamily).toBe('Inter');
      expect(result.style.fontStyle).toBe('Regular');
      expect(result.style.fontWeight).toBe(400);
      expect(result.style.fontSize).toBe(14);
      expect(result.style.textAlignHorizontal).toBe('LEFT');
      expect(result.style.lineHeightPx).toBe(20);
    });
  });

  describe('new auto-layout fields', () => {
    it('preserves layoutMode, axis sizing/align modes, spacing and padding', () => {
      const node = {
        id: '1:3',
        name: 'Row',
        type: 'FRAME',
        layoutMode: 'HORIZONTAL',
        primaryAxisSizingMode: 'AUTO',
        counterAxisSizingMode: 'FIXED',
        primaryAxisAlignItems: 'MIN',
        counterAxisAlignItems: 'CENTER',
        itemSpacing: 12,
        counterAxisSpacing: 8,
        paddingTop: 4,
        paddingRight: 4,
        paddingBottom: 4,
        paddingLeft: 4,
        layoutWrap: 'NO_WRAP',
        strokesIncludedInLayout: true,
        itemReverseZIndex: false,
        numberOfFixedChildren: 0,
      };

      const result = filterFigmaNode(node);

      expect(result.layoutMode).toBe('HORIZONTAL');
      expect(result.primaryAxisSizingMode).toBe('AUTO');
      expect(result.counterAxisSizingMode).toBe('FIXED');
      expect(result.primaryAxisAlignItems).toBe('MIN');
      expect(result.counterAxisAlignItems).toBe('CENTER');
      expect(result.itemSpacing).toBe(12);
      expect(result.counterAxisSpacing).toBe(8);
      expect(result.paddingTop).toBe(4);
      expect(result.paddingRight).toBe(4);
      expect(result.paddingBottom).toBe(4);
      expect(result.paddingLeft).toBe(4);
      expect(result.layoutWrap).toBe('NO_WRAP');
      expect(result.strokesIncludedInLayout).toBe(true);
      expect(result.itemReverseZIndex).toBe(false);
      expect(result.numberOfFixedChildren).toBe(0);
    });
  });

  describe('effects', () => {
    it('preserves the effects array and converts drop-shadow color to hex', () => {
      const node = {
        id: '1:4',
        name: 'Shadowed',
        type: 'FRAME',
        effects: [
          {
            type: 'DROP_SHADOW',
            color: { r: 0, g: 0, b: 0, a: 0.25 },
            offset: { x: 0, y: 4 },
            radius: 8,
            spread: 0,
            visible: true,
            blendMode: 'NORMAL',
            showShadowBehindNode: false,
            boundVariables: { radius: { type: 'VARIABLE_ALIAS', id: 'VarID' } },
          },
        ],
      };

      const result = filterFigmaNode(node);

      expect(result.effects).toHaveLength(1);
      expect(result.effects[0].color).toBe('#00000040');
      expect(result.effects[0].offset).toEqual({ x: 0, y: 4 });
      expect(result.effects[0].radius).toBe(8);
      expect(result.effects[0].boundVariables).toEqual({ radius: { type: 'VARIABLE_ALIAS', id: 'VarID' } });
    });
  });

  describe('visual properties', () => {
    it('preserves opacity, blendMode, visible, locked, rotation, clipsContent and isMask', () => {
      const node = {
        id: '1:5',
        name: 'Layer',
        type: 'FRAME',
        opacity: 0.8,
        blendMode: 'MULTIPLY',
        visible: false,
        locked: true,
        rotation: -90,
        clipsContent: true,
        isMask: true,
      };

      const result = filterFigmaNode(node);

      expect(result.opacity).toBe(0.8);
      expect(result.blendMode).toBe('MULTIPLY');
      expect(result.visible).toBe(false);
      expect(result.locked).toBe(true);
      expect(result.rotation).toBe(-90);
      expect(result.clipsContent).toBe(true);
      expect(result.isMask).toBe(true);
    });
  });

  describe('individual corner radii', () => {
    it('preserves topLeftRadius, topRightRadius, bottomLeftRadius, bottomRightRadius and cornerSmoothing', () => {
      const node = {
        id: '1:6',
        name: 'Rounded',
        type: 'RECTANGLE',
        topLeftRadius: 2,
        topRightRadius: 4,
        bottomLeftRadius: 6,
        bottomRightRadius: 8,
        cornerSmoothing: 0.5,
      };

      const result = filterFigmaNode(node);

      expect(result.topLeftRadius).toBe(2);
      expect(result.topRightRadius).toBe(4);
      expect(result.bottomLeftRadius).toBe(6);
      expect(result.bottomRightRadius).toBe(8);
      expect(result.cornerSmoothing).toBe(0.5);
    });
  });

  describe('component properties', () => {
    it('preserves componentId, componentProperties, componentPropertyDefinitions and componentPropertyReferences', () => {
      const propDefs = { Size: { type: 'VARIANT', defaultValue: 'Large', variantOptions: ['Large', 'Small'] } };
      const node = {
        id: '1:7',
        name: 'Button',
        type: 'COMPONENT',
        componentId: '0:1',
        componentProperties: { Size: 'Large' },
        componentPropertyDefinitions: propDefs,
        componentPropertyReferences: { mainComponent: '0:1' },
      };

      const result = filterFigmaNode(node);

      expect(result.componentId).toBe('0:1');
      expect(result.componentProperties).toEqual({ Size: 'Large' });
      expect(result.componentPropertyDefinitions).toEqual(propDefs);
      expect(result.componentPropertyReferences).toEqual({ mainComponent: '0:1' });
    });
  });

  describe('VECTOR node handling', () => {
    it('returns a stub (not null) with id, name, type and absoluteBoundingBox', () => {
      const node = {
        id: '2:1',
        name: 'Arrow',
        type: 'VECTOR',
        absoluteBoundingBox: { x: 5, y: 5, width: 40, height: 12 },
        fills: [{ type: 'SOLID', color: RED }],
        strokes: [{ type: 'SOLID', color: GREEN }],
        strokeWeight: 1,
        opacity: 0.9,
        visible: true,
        blendMode: 'NORMAL',
        rotation: 0,
      };

      const result = filterFigmaNode(node);

      expect(result).not.toBeNull();
      expect(result.id).toBe('2:1');
      expect(result.name).toBe('Arrow');
      expect(result.type).toBe('VECTOR');
      expect(result.absoluteBoundingBox).toEqual({ x: 5, y: 5, width: 40, height: 12 });
      expect(result.fills).toEqual([{ type: 'SOLID', color: '#ff0000' }]);
      expect(result.strokes).toEqual([{ type: 'SOLID', color: '#00ff00' }]);
      expect(result.strokeWeight).toBe(1);
      expect(result.opacity).toBe(0.9);
      expect(result.vectorNetwork).toBeUndefined();
      expect(result.vectorPaths).toBeUndefined();
    });

    it('includes VECTOR children in the children array instead of dropping them', () => {
      const node = {
        id: '1:9',
        name: 'Group',
        type: 'GROUP',
        children: [
          { id: '2:2', name: 'Line', type: 'VECTOR' },
          { id: '2:3', name: 'Box', type: 'RECTANGLE' },
        ],
      };

      const result = filterFigmaNode(node);

      expect(result.children).toHaveLength(2);
      expect(result.children[0].type).toBe('VECTOR');
      expect(result.children[0].id).toBe('2:2');
      expect(result.children[1].type).toBe('RECTANGLE');
    });
  });

  describe('fills / strokes — boundVariables & imageRef preservation', () => {
    it('keeps boundVariables on fills and strokes', () => {
      const node = {
        id: '1:10',
        name: 'Tokenized',
        type: 'RECTANGLE',
        fills: [{ type: 'SOLID', color: RED, boundVariables: { color: { type: 'VARIABLE_ALIAS', id: 'Var1' } } }],
        strokes: [{ type: 'SOLID', color: GREEN, boundVariables: { color: { type: 'VARIABLE_ALIAS', id: 'Var2' } } }],
      };

      const result = filterFigmaNode(node);

      expect(result.fills[0].boundVariables).toEqual({ color: { type: 'VARIABLE_ALIAS', id: 'Var1' } });
      expect(result.strokes[0].boundVariables).toEqual({ color: { type: 'VARIABLE_ALIAS', id: 'Var2' } });
    });

    it('keeps imageRef on image fills', () => {
      const node = {
        id: '1:11',
        name: 'Photo',
        type: 'RECTANGLE',
        fills: [{ type: 'IMAGE', imageRef: 'img-hash-123', scaleMode: 'FILL' }],
      };

      const result = filterFigmaNode(node);

      expect(result.fills[0].imageRef).toBe('img-hash-123');
      expect(result.fills[0].scaleMode).toBe('FILL');
    });

    it('preserves boundVariables on gradient stops', () => {
      const node = {
        id: '1:12',
        name: 'Gradient',
        type: 'RECTANGLE',
        fills: [{
          type: 'GRADIENT_LINEAR',
          gradientStops: [
            { position: 0, color: RED, boundVariables: { color: { type: 'VARIABLE_ALIAS', id: 'Var3' } } },
            { position: 1, color: GREEN },
          ],
        }],
      };

      const result = filterFigmaNode(node);

      expect(result.fills[0].gradientStops[0].color).toBe('#ff0000');
      expect(result.fills[0].gradientStops[0].boundVariables).toEqual({ color: { type: 'VARIABLE_ALIAS', id: 'Var3' } });
      expect(result.fills[0].gradientStops[1].color).toBe('#00ff00');
    });
  });

  describe('depth limit / truncation', () => {
    it('produces minimal child stubs with _childrenTruncated flag when maxDepth is 0', () => {
      const node = {
        id: '1:20',
        name: 'Root',
        type: 'FRAME',
        children: [
          { id: '2:10', name: 'Child A', type: 'FRAME', fills: [{ type: 'SOLID', color: RED }] },
          { id: '2:11', name: 'Vector Child', type: 'VECTOR' },
        ],
      };

      const result = filterFigmaNode(node, 0);

      expect(result._childrenTruncated).toBe(true);
      expect(result.children).toHaveLength(2);
      expect(result.children[0]).toEqual({ id: '2:10', name: 'Child A', type: 'FRAME' });
      expect(result.children[1]).toEqual({ id: '2:11', name: 'Vector Child', type: 'VECTOR' });
      expect(result.children[0].fills).toBeUndefined();
    });
  });

  describe('optional-field omission', () => {
    it('returns only id/name/type when no optional fields are present (no crash)', () => {
      const node = { id: '1:30', name: 'Bare', type: 'FRAME' };

      const result = filterFigmaNode(node);

      expect(result).toEqual({ id: '1:30', name: 'Bare', type: 'FRAME' });
    });

    it('preserves falsy-but-defined values (opacity 0, visible false, rotation 0)', () => {
      const node = {
        id: '1:31',
        name: 'Edge',
        type: 'FRAME',
        opacity: 0,
        visible: false,
        rotation: 0,
        locked: false,
        isMask: false,
      };

      const result = filterFigmaNode(node);

      expect(result.opacity).toBe(0);
      expect(result.visible).toBe(false);
      expect(result.rotation).toBe(0);
      expect(result.locked).toBe(false);
      expect(result.isMask).toBe(false);
    });
  });
});
