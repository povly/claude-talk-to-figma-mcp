/**
 * This module contains all the prompts used by the Figma MCP server.
 * Prompts provide guidance to Claude on how to work with Figma designs effectively.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Register all prompts with the MCP server
 * @param server - The MCP server instance
 */
export function registerPrompts(server: McpServer): void {
  // Design Strategy Prompt
  server.prompt(
    "design_strategy",
    "Best practices for working with Figma designs",
    (extra) => {
      return {
        messages: [
          {
            role: "assistant",
            content: {
              type: "text",
              text: `When working with Figma designs, follow these best practices:

1. Start with Document Structure:
   - First use get_document_info() to understand the current document
   - Plan your layout hierarchy before creating elements
   - Create a main container frame for each screen/section

2. Naming Conventions:
   - Use descriptive, semantic names for all elements
   - Follow a consistent naming pattern (e.g., "Login Screen", "Logo Container", "Email Input")
   - Group related elements with meaningful names

3. Layout Hierarchy:
   - Create parent frames first, then add child elements
   - For forms/login screens:
     * Start with the main screen container frame
     * Create a logo container at the top
     * Group input fields in their own containers
     * Place action buttons (login, submit) after inputs
     * Add secondary elements (forgot password, signup links) last

4. Input Fields Structure:
   - Create a container frame for each input field
   - Include a label text above or inside the input
   - Group related inputs (e.g., username/password) together

5. Element Creation:
   - Use create_frame() for containers and input fields
   - Use create_text() for labels, buttons text, and links
   - Set appropriate colors and styles:
     * Use fillColor for backgrounds
     * Use strokeColor for borders
     * Set proper fontWeight for different text elements

6. Mofifying existing elements:
  - use set_text_content() to modify text content.

7. Visual Hierarchy:
   - Position elements in logical reading order (top to bottom)
   - Maintain consistent spacing between elements
   - Use appropriate font sizes for different text types:
     * Larger for headings/welcome text
     * Medium for input labels
     * Standard for button text
     * Smaller for helper text/links

8. Best Practices:
   - Verify each creation with get_node_info()
   - Use parentId to maintain proper hierarchy
   - Group related elements together in frames
   - Keep consistent spacing and alignment

Example Login Screen Structure:
- Login Screen (main frame)
  - Logo Container (frame)
    - Logo (image/text)
  - Welcome Text (text)
  - Input Container (frame)
    - Email Input (frame)
      - Email Label (text)
      - Email Field (frame)
    - Password Input (frame)
      - Password Label (text)
      - Password Field (frame)
  - Login Button (frame)
    - Button Text (text)
  - Helper Links (frame)
    - Forgot Password (text)
    - Don't have account (text)`,
            },
          },
        ],
        description: "Best practices for working with Figma designs",
      };
    }
  );

  // Read Design Strategy Prompt
  server.prompt(
    "read_design_strategy",
    "Comprehensive multi-step workflow for pixel-perfect reading and reproducing Figma designs",
    (extra) => {
      return {
        messages: [
          {
            role: "assistant",
            content: {
              type: "text",
              text: `# Comprehensive Figma Design Reading Strategy

A multi-step workflow to extract maximum fidelity from a Figma design before reproducing it in code. Use every relevant tool to capture layout, tokens, components, and vector data.

## 1. Multi-Step Reading Workflow

1. Identify the selection:
   - Call get_selection() to see what's currently selected
   - If nothing is selected, ask the user to select a node

2. Read full node structure:
   - Call get_node_info(nodeId) with the depth parameter for the tree structure
   - This returns auto-layout, constraints, effects, opacity, blendMode,
     component properties, and 50+ other properties per node

3. Read design tokens (if the design uses variables):
   - Call get_bound_variables(nodeId) to see which properties are tokenized
   - Call get_variable_defs(nodeId) to get tokens in var(--name, value) format

4. Read component properties (for components/instances):
   - Call get_component_properties(nodeId) to see variant definitions and current values

5. Get visual reference:
   - Call export_node_as_image(nodeId, format: "PNG", scale: 2) for a high-res reference

6. For vector content (icons, illustrations):
   - Call get_svg(nodeId) to get path data for precise vector reproduction

## 2. Auto Layout to CSS Mapping

When converting Auto Layout to CSS, use this mapping:

| Figma Property               | CSS Property                              |
|------------------------------|-------------------------------------------|
| layoutMode: HORIZONTAL       | flex-direction: row                       |
| layoutMode: VERTICAL         | flex-direction: column                    |
| primaryAxisAlignItems        | justify-content                           |
|   MIN / MAX / CENTER         | flex-start / flex-end / center            |
| counterAxisAlignItems        | align-items                               |
|   MIN / MAX / CENTER         | flex-start / flex-end / center            |
| itemSpacing                  | gap                                       |
| paddingTop/Right/Bottom/Left | padding-top/right/bottom/left             |
| layoutSizingHorizontal: FILL | flex-grow: 1 / width: 100%                |
| layoutSizingHorizontal: HUG  | width: fit-content / width: auto          |
| layoutSizingVertical: FILL   | align-self: stretch                       |
| layoutWrap: WRAP             | flex-wrap: wrap                           |
| layoutPositioning: ABSOLUTE  | position: absolute                        |
| layoutPositioning: AUTO      | position: relative (default)              |
| constraints.horizontal       | left/right or flex rules                  |
| constraints.vertical         | top/bottom or flex rules                  |

## 3. Property Source Priority

When determining the final value for a property, check sources in this order:

1. Code Connect / documentation links (most authoritative)
2. Component property definitions (for instances)
3. Design tokens (bound variables, semantic and maintainable)
4. Raw property values (explicit colors, sizes)
5. Visual screenshot (fallback for context)

## 4. Critical Fidelity Checklist

Before generating code, verify you have captured:

- [ ] Layout structure (auto-layout params, nesting)
- [ ] Colors (fills, strokes, check for bound variables/tokens)
- [ ] Typography (font family, size, weight, line-height, letter-spacing)
- [ ] Spacing (padding, item-spacing, absolute positions)
- [ ] Effects (shadows, blurs: type, offset, radius, color)
- [ ] Corner radii (individual corners if asymmetric)
- [ ] Opacity and blend modes
- [ ] Constraints (for non-auto-layout positioning)
- [ ] Component properties (variants, boolean props)
- [ ] Design tokens (var(--name, value) format)

Capturing all of these ensures the reproduced code matches the Figma source at pixel fidelity.`,
            },
          },
        ],
        description: "Comprehensive multi-step workflow for pixel-perfect reading and reproducing Figma designs",
      };
    }
  );

  // Text Replacement Strategy Prompt
  server.prompt(
    "text_replacement_strategy",
    "Systematic approach for replacing text in Figma designs",
    (extra) => {
      return {
        messages: [
          {
            role: "assistant",
            content: {
              type: "text",
              text: `# Intelligent Text Replacement Strategy

## 1. Analyze Design & Identify Structure
- Scan text nodes to understand the overall structure of the design
- Use AI pattern recognition to identify logical groupings:
  * Tables (rows, columns, headers, cells)
  * Lists (items, headers, nested lists)
  * Card groups (similar cards with recurring text fields)
  * Forms (labels, input fields, validation text)
  * Navigation (menu items, breadcrumbs)
\`\`\`
scan_text_nodes(nodeId: "node-id")
get_node_info(nodeId: "node-id")  // optional
\`\`\`

## 2. Strategic Chunking for Complex Designs
- Divide replacement tasks into logical content chunks based on design structure
- Use one of these chunking strategies that best fits the design:
  * **Structural Chunking**: Table rows/columns, list sections, card groups
  * **Spatial Chunking**: Top-to-bottom, left-to-right in screen areas
  * **Semantic Chunking**: Content related to the same topic or functionality
  * **Component-Based Chunking**: Process similar component instances together

## 3. Progressive Replacement with Verification
- Create a safe copy of the node for text replacement
- Replace text chunk by chunk with continuous progress updates
- After each chunk is processed:
  * Export that section as a small, manageable image
  * Verify text fits properly and maintain design integrity
  * Fix issues before proceeding to the next chunk

\`\`\`
// Clone the node to create a safe copy
clone_node(nodeId: "selected-node-id", x: [new-x], y: [new-y])

// Replace text chunk by chunk
set_multiple_text_contents(
  nodeId: "parent-node-id", 
  text: [
    { nodeId: "node-id-1", text: "New text 1" },
    // More nodes in this chunk...
  ]
)

// Verify chunk with small, targeted image exports
export_node_as_image(nodeId: "chunk-node-id", format: "PNG", scale: 0.5)
\`\`\`

## 4. Intelligent Handling for Table Data
- For tabular content:
  * Process one row or column at a time
  * Maintain alignment and spacing between cells
  * Consider conditional formatting based on cell content
  * Preserve header/data relationships

## 5. Smart Text Adaptation
- Adaptively handle text based on container constraints:
  * Auto-detect space constraints and adjust text length
  * Apply line breaks at appropriate linguistic points
  * Maintain text hierarchy and emphasis
  * Consider font scaling for critical content that must fit

## 6. Progressive Feedback Loop
- Establish a continuous feedback loop during replacement:
  * Real-time progress updates (0-100%)
  * Small image exports after each chunk for verification
  * Issues identified early and resolved incrementally
  * Quick adjustments applied to subsequent chunks

## 7. Final Verification & Context-Aware QA
- After all chunks are processed:
  * Export the entire design at reduced scale for final verification
  * Check for cross-chunk consistency issues
  * Verify proper text flow between different sections
  * Ensure design harmony across the full composition

## 8. Chunk-Specific Export Scale Guidelines
- Scale exports appropriately based on chunk size:
  * Small chunks (1-5 elements): scale 1.0
  * Medium chunks (6-20 elements): scale 0.7
  * Large chunks (21-50 elements): scale 0.5
  * Very large chunks (50+ elements): scale 0.3
  * Full design verification: scale 0.2

## Sample Chunking Strategy for Common Design Types

### Tables
- Process by logical rows (5-10 rows per chunk)
- Alternative: Process by column for columnar analysis
- Tip: Always include header row in first chunk for reference

### Card Lists
- Group 3-5 similar cards per chunk
- Process entire cards to maintain internal consistency
- Verify text-to-image ratio within cards after each chunk

### Forms
- Group related fields (e.g., "Personal Information", "Payment Details")
- Process labels and input fields together
- Ensure validation messages and hints are updated with their fields

### Navigation & Menus
- Process hierarchical levels together (main menu, submenu)
- Respect information architecture relationships
- Verify menu fit and alignment after replacement

## Best Practices
- **Preserve Design Intent**: Always prioritize design integrity
- **Structural Consistency**: Maintain alignment, spacing, and hierarchy
- **Visual Feedback**: Verify each chunk visually before proceeding
- **Incremental Improvement**: Learn from each chunk to improve subsequent ones
- **Balance Automation & Control**: Let AI handle repetitive replacements but maintain oversight
- **Respect Content Relationships**: Keep related content consistent across chunks

Remember that text is never just text—it's a core design element that must work harmoniously with the overall composition. This chunk-based strategy allows you to methodically transform text while maintaining design integrity.`,
            },
          },
        ],
        description: "Systematic approach for replacing text in Figma designs",
      };
    }
  );

  // Verify Design Fidelity Prompt
  server.prompt(
    "verify_design_fidelity",
    "Closed-loop verification workflow for matching generated code to Figma design. Guides through screenshot comparison, property checking, and iterative correction.",
    (extra) => {
      return {
        messages: [
          {
            role: "assistant",
            content: {
              type: "text",
              text: `# Design Fidelity Verification Loop

This workflow ensures generated code or Figma modifications match the original design at pixel fidelity. Run this loop after ANY design creation or modification to catch and fix discrepancies.

## Workflow Overview
1. Capture reference screenshot
2. Read all properties from the modified node
3. Compare against the original design
4. Fix discrepancies
5. Re-export and verify
6. Repeat until all checks pass

## Step 1: Capture Reference
- After modifying or creating a node in Figma:
  export_node_as_image(nodeId, format: "PNG", scale: 2)
- This gives you the current state as a high-resolution image
- If reproducing from an external design, also export the original for side-by-side comparison

## Step 2: Read All Properties
- Call get_node_info(nodeId) to get the full property tree
- For tokens: get_bound_variables(nodeId) and get_variable_defs(nodeId)
- For components: get_component_properties(nodeId)
- For CSS: get_css(nodeId)

## Step 3: Compare Properties
Check each category against the design source:

### Layout Verification
- [ ] Auto Layout mode (HORIZONTAL/VERTICAL) matches
- [ ] Axis alignment (primaryAxisAlignItems, counterAxisAlignItems) matches
- [ ] Spacing (itemSpacing, paddingTop/Right/Bottom/Left) matches
- [ ] Sizing mode (FILL/HUG/FIXED) matches
- [ ] Wrap behavior matches

### Color Verification
- [ ] Fill colors match (check hex values)
- [ ] Fill opacity matches
- [ ] Gradient stops match (position, color, opacity)
- [ ] Stroke color and weight match
- [ ] Design tokens are correctly bound (if applicable)

### Typography Verification
- [ ] Font family matches
- [ ] Font size matches
- [ ] Font weight matches
- [ ] Line height matches (value and unit)
- [ ] Letter spacing matches (value and unit)
- [ ] Text alignment matches (horizontal and vertical)
- [ ] Text case matches (uppercase, lowercase, title, etc.)
- [ ] Text decoration matches (underline, strikethrough)

### Spacing and Dimensions
- [ ] Width and height match (or sizing mode is correct)
- [ ] Position (x, y) matches
- [ ] Padding matches on all sides
- [ ] Gap/spacing between children matches
- [ ] Min/max dimensions match

### Effects Verification
- [ ] Drop shadows match (offset, radius, spread, color, opacity)
- [ ] Inner shadows match
- [ ] Layer blur matches
- [ ] Background blur matches

### Visual Details
- [ ] Corner radius matches (including individual corners)
- [ ] Corner smoothing matches
- [ ] Opacity matches
- [ ] Blend mode matches
- [ ] Clip content flag matches

## Step 4: Fix Discrepancies
For each mismatch found:
1. Identify the correct value from the design
2. Apply the fix using the appropriate modification tool:
   - Colors: set_fill_color, set_stroke_color
   - Text: set_font_size, set_font_weight, set_line_height, etc.
   - Layout: set_auto_layout
   - Effects: set_effects
   - Corners: set_corner_radius
   - Size/position: resize_node, move_node
3. Re-export the node to verify the fix:
   export_node_as_image(nodeId, format: "PNG", scale: 2)

## Step 5: Final Verification
After all fixes:
1. Export the final state at scale 2
2. Visually compare with the original design
3. If discrepancies remain, return to Step 3
4. When satisfied, run get_node_info one final time to confirm all properties

## Iteration Guidelines
- Maximum 3 iterations: if significant discrepancies remain after 3 rounds, the issue may be structural (wrong layout approach, wrong component structure)
- Focus on the most visible discrepancies first (layout, colors, typography) before minor details (corner smoothing, blend modes)
- When in doubt, trust the screenshot comparison over property-by-property checking, as some rendering differences are subtle
- Common pitfalls:
  * Auto Layout not matching because padding is applied on wrong sides
  * Text not matching because line-height unit differs (PIXELS vs AUTO vs PERCENT)
  * Colors not matching because of opacity/blend-mode interaction
  * Spacing not matching because of constraints vs Auto Layout conflict`,
            },
          },
        ],
        description: "Closed-loop verification workflow for matching generated code to Figma design.",
      };
    }
  );
}

// Export individual prompt registration functions
export function registerDesignStrategyPrompt(server: McpServer): void {
  server.prompt(
    "design_strategy",
    "Best practices for working with Figma designs",
    (extra) => {
      // Implementation is the same as above
      // This function is exported for individual usage if needed
    }
  );
}

export function registerReadDesignStrategyPrompt(server: McpServer): void {
  server.prompt(
    "read_design_strategy",
    "Comprehensive multi-step workflow for pixel-perfect reading and reproducing Figma designs",
    (extra) => {
      // Implementation is the same as above
      // This function is exported for individual usage if needed
    }
  );
}

export function registerTextReplacementStrategyPrompt(server: McpServer): void {
  server.prompt(
    "text_replacement_strategy",
    "Systematic approach for replacing text in Figma designs",
    (extra) => {
      // Implementation is the same as above
      // This function is exported for individual usage if needed
    }
  );
}

export function registerVerifyDesignFidelityPrompt(server: McpServer): void {
  server.prompt(
    "verify_design_fidelity",
    "Closed-loop verification workflow for matching generated code to Figma design. Guides through screenshot comparison, property checking, and iterative correction.",
    (extra) => {
      // Implementation is the same as above
      // This function is exported for individual usage if needed
    }
  );
}