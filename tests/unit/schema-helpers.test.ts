import { describe, it, expect } from '@jest/globals';
import {
  rgbaColorSchema,
  nodeIdSchema,
  parentIdSchema,
  coerceJson,
  coerceBoolean,
} from '../../src/talk_to_figma_mcp/utils/schema-helpers';

describe('shared schema exports', () => {
  it('exports all five helpers', () => {
    expect(typeof coerceJson).toBe('function');
    expect(typeof coerceBoolean).toBeDefined();
    expect(rgbaColorSchema).toBeDefined();
    expect(nodeIdSchema).toBeDefined();
    expect(parentIdSchema).toBeDefined();
  });
});

describe('rgbaColorSchema', () => {
  describe('valid inputs', () => {
    it('accepts a full RGBA object in [0,1]', () => {
      const result = rgbaColorSchema.parse({ r: 0.5, g: 0.25, b: 0.75, a: 1 });
      expect(result).toEqual({ r: 0.5, g: 0.25, b: 0.75, a: 1 });
    });

    it('accepts RGB without alpha (alpha optional)', () => {
      const result = rgbaColorSchema.parse({ r: 0, g: 0.5, b: 1 });
      expect(result).toEqual({ r: 0, g: 0.5, b: 1, a: undefined });
    });

    it('accepts pure black {0,0,0}', () => {
      expect(rgbaColorSchema.parse({ r: 0, g: 0, b: 0 })).toBeTruthy();
    });

    it('accepts pure white {1,1,1}', () => {
      expect(rgbaColorSchema.parse({ r: 1, g: 1, b: 1 })).toBeTruthy();
    });

    it('accepts boundary value 1 for all components', () => {
      const result = rgbaColorSchema.parse({ r: 1, g: 1, b: 1, a: 1 });
      expect(result).toEqual({ r: 1, g: 1, b: 1, a: 1 });
    });

    it('accepts decimal values', () => {
      const result = rgbaColorSchema.parse({ r: 0.123, g: 0.456, b: 0.789 });
      expect(result.r).toBeCloseTo(0.123);
    });
  });

  describe('string coercion (via z.coerce.number())', () => {
    it('coerces string "0.5" to number 0.5', () => {
      const result = rgbaColorSchema.parse({ r: '0.5', g: '0.5', b: '0.5' });
      expect(result).toEqual({ r: 0.5, g: 0.5, b: 0.5, a: undefined });
    });

    it('coerces string "1" to number 1', () => {
      const result = rgbaColorSchema.parse({ r: '1', g: '1', b: '1' });
      expect(result).toEqual({ r: 1, g: 1, b: 1, a: undefined });
    });
  });

  describe('invalid inputs', () => {
    it('rejects r > 1', () => {
      expect(() => rgbaColorSchema.parse({ r: 1.5, g: 0, b: 0 })).toThrow();
    });

    it('rejects negative g', () => {
      expect(() => rgbaColorSchema.parse({ r: 0, g: -0.1, b: 0 })).toThrow();
    });

    it('rejects a > 1', () => {
      expect(() => rgbaColorSchema.parse({ r: 0, g: 0, b: 0, a: 2 })).toThrow();
    });

    it('rejects missing r', () => {
      expect(() => rgbaColorSchema.parse({ g: 0, b: 0 } as any)).toThrow();
    });

    it('rejects missing g', () => {
      expect(() => rgbaColorSchema.parse({ r: 0, b: 0 } as any)).toThrow();
    });

    it('rejects missing b', () => {
      expect(() => rgbaColorSchema.parse({ r: 0, g: 0 } as any)).toThrow();
    });

    it('rejects non-numeric r', () => {
      expect(() => rgbaColorSchema.parse({ r: 'red', g: 0, b: 0 })).toThrow();
    });

    it('rejects array input', () => {
      expect(() => rgbaColorSchema.parse([0.5, 0.5, 0.5] as any)).toThrow();
    });

    it('rejects null', () => {
      expect(() => rgbaColorSchema.parse(null)).toThrow();
    });
  });
});

describe('nodeIdSchema', () => {
  describe('valid inputs', () => {
    it('accepts typical Figma id "123:456:789"', () => {
      expect(nodeIdSchema.parse('123:456:789')).toBe('123:456:789');
    });

    it('accepts single-segment id "0"', () => {
      expect(nodeIdSchema.parse('0')).toBe('0');
    });

    it('accepts short numeric id "42"', () => {
      expect(nodeIdSchema.parse('42')).toBe('42');
    });

    it('accepts 200-char id (boundary)', () => {
      const id = '1'.repeat(200);
      expect(nodeIdSchema.parse(id)).toBe(id);
    });
  });

  describe('invalid inputs', () => {
    it('rejects empty string', () => {
      expect(() => nodeIdSchema.parse('')).toThrow();
    });

    it('rejects 201-char id (just over boundary)', () => {
      const id = '1'.repeat(201);
      expect(() => nodeIdSchema.parse(id)).toThrow();
    });

    it('rejects null', () => {
      expect(() => nodeIdSchema.parse(null)).toThrow();
    });

    it('rejects number', () => {
      expect(() => nodeIdSchema.parse(42 as any)).toThrow();
    });
  });
});

describe('parentIdSchema', () => {
  describe('valid inputs', () => {
    it('accepts a valid parent id', () => {
      expect(parentIdSchema.parse('0:1')).toBe('0:1');
    });

    it('accepts undefined (optional)', () => {
      expect(parentIdSchema.parse(undefined)).toBeUndefined();
    });

    it('accepts "not provided" via omit', () => {
      expect(parentIdSchema.parse(undefined)).toBeUndefined();
    });

    it('accepts 200-char id (boundary)', () => {
      const id = '1'.repeat(200);
      expect(parentIdSchema.parse(id)).toBe(id);
    });
  });

  describe('invalid inputs', () => {
    it('rejects empty string', () => {
      expect(() => parentIdSchema.parse('')).toThrow();
    });

    it('rejects 201-char id', () => {
      const id = '1'.repeat(201);
      expect(() => parentIdSchema.parse(id)).toThrow();
    });

    it('rejects null', () => {
      expect(() => parentIdSchema.parse(null)).toThrow();
    });
  });
});
