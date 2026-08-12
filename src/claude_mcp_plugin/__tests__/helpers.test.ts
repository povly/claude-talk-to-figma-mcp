import { describe, it, expect } from 'vitest';
import { safeChannel, safePaint, sanitizeSvg } from '../code';

// ─── safeChannel: returns a valid 0-1 number or NaN ───
// CRITICAL: NaN is part of the contract — NOT a silent fallback to 0.
// See code.ts L5-7: "Unlike parseFloat(x) || 0, this does NOT silently fall back to 0 (black)."
describe('safeChannel', () => {
  it('returns NaN for undefined', () => {
    expect(safeChannel(undefined)).toBeNaN();
  });

  it('returns NaN for null', () => {
    expect(safeChannel(null)).toBeNaN();
  });

  it('returns the number as-is for valid 0-1 range', () => {
    expect(safeChannel(0)).toBe(0);
    expect(safeChannel(0.5)).toBe(0.5);
    expect(safeChannel(1)).toBe(1);
  });

  it('parses numeric strings', () => {
    expect(safeChannel('0')).toBe(0);
    expect(safeChannel('0.5')).toBe(0.5);
    expect(safeChannel('1')).toBe(1);
  });

  it('clamps to 0-1 range', () => {
    expect(safeChannel(1.5)).toBe(1);
    expect(safeChannel(-0.5)).toBe(0);
    expect(safeChannel(100)).toBe(1);
  });

  it('returns NaN for non-numeric strings', () => {
    expect(safeChannel('abc')).toBeNaN();
    expect(safeChannel('')).toBeNaN();
  });

  it('returns NaN for NaN input', () => {
    expect(safeChannel(NaN)).toBeNaN();
  });
});

// ─── safePaint: builds a Figma SOLID paint from {r,g,b,a?} ───
describe('safePaint', () => {
  it('returns null for null/undefined', () => {
    expect(safePaint(null)).toBeNull();
    expect(safePaint(undefined)).toBeNull();
  });

  it('returns null for non-object input', () => {
    expect(safePaint('red')).toBeNull();
    expect(safePaint(42)).toBeNull();
  });

  it('returns null when any required channel is NaN', () => {
    expect(safePaint({ r: 'not', g: 0.5, b: 0.5 })).toBeNull();
    expect(safePaint({ r: 0.5, g: null, b: 0.5 })).toBeNull();
    expect(safePaint({ r: 0.5, g: 0.5, b: undefined })).toBeNull();
  });

  it('builds paint with opacity 1 when alpha omitted', () => {
    const result = safePaint({ r: 0.5, g: 0.3, b: 0.1 });
    expect(result).toEqual({
      type: 'SOLID',
      color: { r: 0.5, g: 0.3, b: 0.1 },
      opacity: 1,
    });
  });

  it('builds paint with explicit alpha', () => {
    const result = safePaint({ r: 0.5, g: 0.3, b: 0.1, a: 0.8 });
    expect(result).toEqual({
      type: 'SOLID',
      color: { r: 0.5, g: 0.3, b: 0.1 },
      opacity: 0.8,
    });
  });

  it('parses string color channels', () => {
    const result = safePaint({ r: '0.5', g: '0.3', b: '0.1' });
    expect(result).toEqual({
      type: 'SOLID',
      color: { r: 0.5, g: 0.3, b: 0.1 },
      opacity: 1,
    });
  });

  it('clamps out-of-range channels', () => {
    const result = safePaint({ r: 2, g: -1, b: 0.5 });
    expect(result).toEqual({
      type: 'SOLID',
      color: { r: 1, g: 0, b: 0.5 },
      opacity: 1,
    });
  });

  it('returns null when color is an empty object', () => {
    expect(safePaint({})).toBeNull();
  });
});

// ─── sanitizeSvg: strips dangerous SVG content ───
describe('sanitizeSvg', () => {
  it('strips <script> tags', () => {
    const input = '<svg><script>alert("xss")</script><rect/></svg>';
    expect(sanitizeSvg(input)).toBe('<svg><rect/></svg>');
  });

  it('strips onclick event handler (double quotes)', () => {
    const input = '<svg><rect onclick="alert(1)"/></svg>';
    expect(sanitizeSvg(input)).toBe('<svg><rect /></svg>');
  });

  it('strips onload event handler (single quotes)', () => {
    const input = '<svg onload=\'alert(1)\'><rect/></svg>';
    // regex removes attribute but leaves trailing space (harmless)
    expect(sanitizeSvg(input)).toBe('<svg ><rect/></svg>');
  });

  it('strips external xlink:href', () => {
    const input = '<svg><use xlink:href="https://evil.com/payload"/></svg>';
    expect(sanitizeSvg(input)).toBe('<svg><use /></svg>');
  });

  it('strips external href', () => {
    const input = '<svg><a href="https://evil.com">link</a></svg>';
    expect(sanitizeSvg(input)).toBe('<svg><a >link</a></svg>');
  });

  it('strips data:text/html href injection', () => {
    const input = '<svg><a href="data:text/html,<script>alert(1)</script>">x</a></svg>';
    expect(sanitizeSvg(input)).toBe('<svg><a >x</a></svg>');
  });

  it('preserves clean SVG unchanged', () => {
    const clean = '<svg viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" fill="blue"/></svg>';
    expect(sanitizeSvg(clean)).toBe(clean);
  });
});
