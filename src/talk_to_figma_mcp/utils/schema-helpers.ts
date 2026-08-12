import { z } from "zod";

/**
 * Wrap a Zod schema to auto-parse JSON strings from MCP/WebSocket serialization.
 * If the value is a string, attempts JSON.parse; on failure returns the original
 * value so Zod's own validation produces a proper ZodError.
 */
export const coerceJson = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((val) => {
    if (typeof val === "string") {
      try { return JSON.parse(val); } catch { return val; }
    }
    return val;
  }, schema);

/**
 * Coerce string "true"/"false" to boolean for MCP/WebSocket serialization.
 * Unlike z.coerce.boolean() which uses JS truthiness (dangerous: "false" → true),
 * this only converts the exact strings "true" and "false".
 */
export const coerceBoolean = z.preprocess(
  (val) => val === "true" ? true : val === "false" ? false : val,
  z.boolean()
);

/**
 * RGBA color schema. All components are coerced to numbers and constrained
 * to [0, 1]. Alpha is optional (downstream applyColorDefaults substitutes 1
 * when undefined). Replaces 23 inline duplicates across creation/modification/
 * figjam/style tool files.
 */
export const rgbaColorSchema = z.object({
  r: z.coerce.number().min(0).max(1),
  g: z.coerce.number().min(0).max(1),
  b: z.coerce.number().min(0).max(1),
  a: z.coerce.number().min(0).max(1).optional(),
});

/**
 * Figma node id. Current Figma ids look like "123:456:789" but plugin-side
 * getNodeByIdAsync tolerates other forms, so we stay permissive on characters
 * and cap length to catch abuse. Replaces 60 inline `z.string()` duplicates.
 * Call sites layer their own `.describe()` text.
 */
export const nodeIdSchema = z.string().min(1).max(200);

/**
 * Parent node id. Semantically required for creation/move operations
 * (multi-agent safety — server enforces this in socket.ts). Kept optional
 * at the schema layer so individual tools can require it via call-site
 * validation. Replaces 9 inline `z.string().optional()` duplicates.
 */
export const parentIdSchema = z.string().min(1).max(200).optional();

/**
 * Figma blend mode enum. Values match Figma's BlendMode API.
 * Used by set_effects, create_effect_style, and any field that controls
 * layer compositing. Replaces 2 inline `z.string()` duplicates.
 */
export const blendModeSchema = z.enum([
  "NORMAL",
  "DARKEN",
  "MULTIPLY",
  "COLOR_BURN",
  "LIGHTEN",
  "SCREEN",
  "COLOR_DODGE",
  "OVERLAY",
  "SOFT_LIGHT",
  "HARD_LIGHT",
  "DIFFERENCE",
  "EXCLUSION",
  "HUE",
  "SATURATION",
  "COLOR",
  "LUMINOSITY",
]);
