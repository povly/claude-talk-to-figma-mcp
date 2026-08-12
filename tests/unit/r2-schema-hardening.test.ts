import { describe, it, expect } from '@jest/globals';
import {
  rgbaColorSchema,
  nodeIdSchema,
  parentIdSchema,
  blendModeSchema,
} from '../../src/talk_to_figma_mcp/utils/schema-helpers';
import { z } from 'zod';

describe('blendModeSchema', () => {
  describe('valid inputs', () => {
    it('accepts NORMAL', () => {
      expect(blendModeSchema.parse('NORMAL')).toBe('NORMAL');
    });

    it('accepts MULTIPLY', () => {
      expect(blendModeSchema.parse('MULTIPLY')).toBe('MULTIPLY');
    });

    it('accepts COLOR_DODGE', () => {
      expect(blendModeSchema.parse('COLOR_DODGE')).toBe('COLOR_DODGE');
    });

    it('accepts LUMINOSITY (last in enum)', () => {
      expect(blendModeSchema.parse('LUMINOSITY')).toBe('LUMINOSITY');
    });
  });

  describe('invalid inputs', () => {
    it('rejects lowercase "normal"', () => {
      expect(() => blendModeSchema.parse('normal')).toThrow();
    });

    it('rejects "pass_through" (not in enum)', () => {
      expect(() => blendModeSchema.parse('PASS_THROUGH')).toThrow();
    });

    it('rejects unknown value "FOO"', () => {
      expect(() => blendModeSchema.parse('FOO')).toThrow();
    });

    it('rejects empty string', () => {
      expect(() => blendModeSchema.parse('')).toThrow();
    });

    it('rejects number', () => {
      expect(() => blendModeSchema.parse(42 as any)).toThrow();
    });
  });
});

describe('string .max() bounds enforcement', () => {
  const textSchema = z.string().max(100_000);
  const imageSourceSchema = z.string().max(10_000_000);
  const nameSchema = z.string().max(500);
  const idSchema = z.string().max(200);
  const miscSchema = z.string().max(1_000);

  describe('text content (100_000 char limit)', () => {
    it('accepts empty string', () => {
      expect(textSchema.parse('')).toBe('');
    });

    it('accepts exactly 100_000 chars (boundary)', () => {
      const text = 'a'.repeat(100_000);
      expect(textSchema.parse(text).length).toBe(100_000);
    });

    it('rejects 100_001 chars (just over boundary)', () => {
      const text = 'a'.repeat(100_001);
      expect(() => textSchema.parse(text)).toThrow();
    });
  });

  describe('image source (10_000_000 char limit)', () => {
    it('accepts exactly 10_000_000 chars (boundary)', () => {
      const source = 'a'.repeat(10_000_000);
      expect(imageSourceSchema.parse(source).length).toBe(10_000_000);
    });

    it('rejects 10_000_001 chars', () => {
      const source = 'a'.repeat(10_000_001);
      expect(() => imageSourceSchema.parse(source)).toThrow();
    });
  });

  describe('names / labels (500 char limit)', () => {
    it('accepts exactly 500 chars', () => {
      expect(nameSchema.parse('n'.repeat(500)).length).toBe(500);
    });

    it('rejects 501 chars', () => {
      expect(() => nameSchema.parse('n'.repeat(501))).toThrow();
    });
  });

  describe('non-nodeId IDs (200 char limit)', () => {
    it('accepts exactly 200 chars', () => {
      expect(idSchema.parse('1'.repeat(200)).length).toBe(200);
    });

    it('rejects 201 chars', () => {
      expect(() => idSchema.parse('1'.repeat(201))).toThrow();
    });
  });

  describe('misc strings (1_000 char limit)', () => {
    it('accepts exactly 1_000 chars', () => {
      expect(miscSchema.parse('x'.repeat(1_000)).length).toBe(1_000);
    });

    it('rejects 1_001 chars', () => {
      expect(() => miscSchema.parse('x'.repeat(1_001))).toThrow();
    });
  });
});
