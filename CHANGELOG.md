# Changelog

📖 [**Commands**](COMMANDS.md) | 🚀 [**Installation**](INSTALLATION.md) | 🛠️ [**Contributing**](CONTRIBUTING.md) | 🆘 [**Troubleshooting**](TROUBLESHOOTING.md) | 📜 [**Changelog**](CHANGELOG.md)

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] — R2 Schema Hardening

### Cleanup (post-review)
- **`PASS_THROUGH` added to `blendModeSchema`** — schema теперь полностью соответствует Figma BlendMode API (17 values). PASS_THROUGH — default для groups/frames; до этого fix'а caller'ы получали Zod error при попытке установить его.
- **`.max()` bounds на 10 оставшихся unbounded string полей** — 8 `name` полей в creation-tools + document-tools (`.max(500)`), `destinationId` в set_reactions (`.max(200)`), `nameContains` в find_nodes (`.max(200)`). Все unbounded `z.string().optional().describe` в tools/ теперь = 0.
- **figjam parentId migrated к `parentIdSchema`** — 4 inline `z.string().max(200).optional()` заменены на shared `parentIdSchema` из `utils/schema-helpers.ts`. R1 consistency достигнута: все parentId во всех tool files используют shared schema.

### Hardened
- **`.max()` bounds on user-supplied strings** — все 63 оставшихся unbounded `z.string()` для user-supplied content получили explicit length caps. Text content: 100K chars. Image source (base64/URL): 10MB. Names/labels: 500. Non-nodeId IDs: 200. Misc strings: 1000. Closes DoS surface где LLM мог сгенерировать multi-MB payload через WS relay.

- **`z.enum()` для known enum fields** — 7 полей раньше принимали arbitrary strings, теперь валидируются как enums:
  - `blendMode` (set_effects, create_effect_style): 16 Figma blend modes
  - `trigger.type` (set_reactions): 9 trigger types (ON_CLICK, ON_HOVER, ON_PRESS, ON_DRAG, AFTER_TIMEOUT, MOUSE_ENTER/LEAVE/UP/DOWN)
  - `action.type`: NODE/BACK/CLOSE/URL
  - `action.navigation`: NAVIGATE/SWAP/OVERLAY/SCROLL_TO/CHANGE_TO
  - `transition.type`: DISSOLVE/SMART_ANIMATE/MOVE_IN/MOVE_OUT/PUSH/SLIDE_IN/SLIDE_OUT
  - `transition.easing.type`: EASE_IN/EASE_OUT/EASE_IN_AND_OUT/LINEAR

- **Discriminated union для `set_variable`** — `value: z.any()` заменён на `z.union([rgbaColorSchema, z.number(), z.string().max(10_000), z.boolean()])`. Дополнительно, handler-level typeCheck валидирует что `typeof value` соответствует `resolvedType` (COLOR→object, FLOAT→number, STRING→string, BOOLEAN→boolean). Invalid combinations отклоняются до отправки в plugin, с clear error message.

### Added (Tests)
- `tests/unit/r2-schema-hardening.test.ts` — 20 cases: blendModeSchema accepts/rejects + boundary tests для .max() bounds.
- `tests/integration/r2-schema-hardening.test.ts` — 6 cases: set_variable success paths (STRING/FLOAT/BOOLEAN/COLOR) + type-mismatch rejection paths.

### Operational Notes
- All bounds выбраны generous чтобы не сломать existing MCP clients.
- Enum values соответствуют Figma plugin API contract — если Figma добавит новые blendMode, потребуется schema update.
- `set_variable` handler typeCheck message "value type X does not match resolvedType Y (expected Z)" помогает LLM self-correct.
- Cross-field `.refine()` не использован потому что MCP SDK `server.tool()` принимает `ZodRawShapeCompat` (plain shape), не `ZodEffects`.

## [Unreleased] — R1 Refactor: Shared Schemas + isError Standardization

### Refactored
- **Shared Zod schemas extracted** (`src/talk_to_figma_mcp/utils/schema-helpers.ts`): three new named exports — `rgbaColorSchema`, `nodeIdSchema`, `parentIdSchema`. Replaced 23 inline RGBA object definitions, 63 inline `nodeId: z.string()` definitions, and 10 inline `parentId: z.string().optional()` definitions across all 10 tool files. Net change: −234 lines of duplicated schema literals. No behavior change — Zod validation semantics preserved (RGBA coercion + [0,1] bounds; nodeId/parentId non-empty, ≤200 chars).
- **`isError: true` standardised** across all MCP tool error responses. Previously only 9 of 100 catch blocks set the `isError` flag, so MCP clients (Claude Desktop, Cursor, etc.) could not reliably distinguish error responses from success on 91 of the tool handlers. Now every tool handler error path returns `{ content, isError: true }`.

### Added (Tests)
- `tests/unit/schema-helpers.test.ts` — 33 cases covering `rgbaColorSchema` (valid/invalid/coercion/alpha-optional/boundaries), `nodeIdSchema` (length/format permissiveness), `parentIdSchema` (optional semantics).
- `tests/integration/iserror-standardization.test.ts` — 4 cases verifying `isError: true` appears on error responses across 3 tool categories (document/creation/text) and is absent on success path.

### Operational Notes
- The `parentIdSchema` is intentionally optional at the schema layer — server-side enforcement (socket.ts blocks stateful commands without parentId during P2 hardening) is the real contract; the schema is a UX hint for MCP clients.
- MCP JSON Schema output for color fields now carries one object-level description instead of per-field (r/g/b/a) descriptions. The information lost is redundant with field names + numeric type.
- MCP clients that previously special-cased the ABSENCE of `isError` as a success signal continue to work — `isError` is only set on error paths, never on success.

## [Unreleased] — P2 Relay Security Hardening

### Security
- **Origin allowlist on WS-upgrade** (`src/socket.ts`): WebSocket upgrade requests from browser clients are now gated on an `ALLOWED_ORIGINS` allowlist (`null`, `file://`, `localhost`, `127.0.0.1`). Non-browser clients (curl, Figma plugin, MCP server) are always allowed. Blocks cross-origin WS hijack from arbitrary websites.
- **CORS cleanup** (`src/socket.ts`): removed `Access-Control-Allow-Origin: *` from four response paths (OPTIONS preflight, `/status`, WS-upgrade response, default text response). Browser tabs on arbitrary websites can no longer probe the relay's `/status` endpoint for active channel names.
- **Connection limit** (`src/socket.ts`): `MAX_CONNECTIONS` cap (default 16, override via env `MAX_CONNECTIONS`). New connections past the cap are rejected with close code 1008. Prevents OOM via connection flood (128 MB payload × N sockets).
- **Channel name validation** (`src/socket.ts`): join channel names must match `^[a-zA-Z0-9_-]{1,64}$`. Blocks prototype-pollution tricks (`__proto__`, `constructor`), megabyte names, control characters, and XSS payloads.
- **Generic error responses** (`src/socket.ts`): the message-dispatcher catch block now returns "Invalid message format" instead of leaking `err.message` (which could expose internal paths, stack frames, or library versions). Full error still logged server-side.
- **Server-generated sessionId** (`src/socket.ts` + `src/talk_to_figma_mcp/utils/websocket.ts`): the relay now issues cryptographically random session IDs (`mcp_<32hex>`, 128 bits from `crypto.randomBytes`) for clients that don't supply a secure-format ID. Legacy predictable IDs (`mcp_<pid>_<timestamp>`) are no longer accepted as authoritative — closes session-hijack via PID/timestamp guessing.
- **Opt-in shared-secret handshake** (env var `FIGMA_RELAY_TOKEN`): when set on the relay, every join must include the matching token or be rejected with close code 1008. The MCP client reads the same env var and includes the token automatically. The Figma plugin UI prompts the operator for the token on auth failure. Default (unset) preserves open-relay behaviour for backwards compatibility and local development.

### Changed
- **`FigmaResponse` type** (`src/talk_to_figma_mcp/types/index.ts`): added optional `sessionId?: string` field. Replaces an `as any` access that violated the project's no-type-suppression rule.
- **`SESSION_ID` const → mutable `let sessionId`** (`src/talk_to_figma_mcp/utils/websocket.ts`): the MCP client now adopts the server-issued secure sessionId from the join response for use on reconnect.

### Operational Notes
- All security hardening is **opt-in or non-breaking by default**:
  - Origin allowlist permits the Figma plugin iframe (`file://`) and localhost dev tools.
  - `MAX_CONNECTIONS=16` covers 1 plugin + 8 agents + 7 headroom; override via env.
  - `FIGMA_RELAY_TOKEN` unset = open relay (dev mode); set = required auth.
  - Legacy session IDs continue to work (server regenerates and returns the secure ID).
- New observability: `stats.blockedCommands` counter incremented on every rejection (invalid origin, invalid channel, connection limit, auth failure).

## [Unreleased] — Figma Fidelity Improvements

### Added
- **filterFigmaNode** extended: now returns 50+ additional properties per node (auto-layout, constraints, effects, opacity, blendMode, component properties, geometry, Dev Mode metadata, and more)
- **VECTOR nodes** now return a minimal stub instead of null (id, name, type, fills, strokes, opacity, visible, etc.)
- **get_document_info** fixed: now calls loadAllPagesAsync() and returns all pages with metadata
- **get_component_properties** tool: read componentPropertyDefinitions and currentValues for components/instances
- **get_bound_variables** tool: read boundVariables, resolvedModes, and variable details
- **get_variable_defs** tool: design tokens in CSS var(--name, value) format, grouped by type
- **get_css** tool: wrapper over node.getCSSAsync() for direct CSS extraction
- **set_constraints** tool: set horizontal/vertical constraints for responsive behavior
- **find_nodes** tool: search nodes by name, type, or substring without knowing IDs
- **get_image_bytes** tool: restored and fixed using exportAsync instead of getImageByHash
- **create_grid_style** tool: create reusable grid style configurations
- **read_design_strategy** prompt: rewritten with multi-step fidelity workflow and Auto Layout→CSS mapping table
- **verify_design_fidelity** prompt: closed-loop verification workflow (generate → screenshot → compare → fix)
- 8 missing commands added to FigmaCommand type union (set_text_align, set_reactions, get_reactions, detach_instance, create_text_style, create_paint_style, create_effect_style, get_nodes_info)
- jest.config.cjs: added moduleNameMapper for .js→.ts ESM resolution
- 63 new tests (9 integration test files + 1 unit test file)

### Changed
- **get_styles** enriched: returns full paint arrays (not just paints[0]), complete text properties, effects array, layoutGrids array, remote/description flags
- **image-tools.ts** error handling unified: all throw statements replaced with return-error pattern (isError: true)
- boundVariables and imageRef no longer stripped from fills/strokes in filterFigmaNode

### Fixed
- **WebSocket payload limit**: `Bun.serve()` default `maxPayloadLength` (16 MB) was exceeded by `get_node_info` responses on complex frames, force-closing the socket with code 1006 ("Received too big message"). Raised to 128 MB and enabled `perMessageDeflate` for compression.
- **Plugin WebSocket auto-reconnect**: plugin's WS client now retries with exponential backoff (1s → 2s → 4s → 8s → 16s, capped at 30s, max 5 attempts) when the relay disconnects unexpectedly. Previously, any relay restart left the plugin permanently disconnected until the user clicked Connect manually.
- **Plugin-side export timeouts**: `get_image_bytes` and `get_svg` now wrap `node.exportAsync` in a 60-second `Promise.race` matching `export_node_as_image`. Previously they could hang silently on large nodes until the relay's 120s safety-net timeout fired.

### Performance
- **`figma.skipInvisibleInstanceChildren = true`**: plugin now skips invisible component instance subtrees during `findAll`/`exportAsync`. Hundreds of times faster on large documents with hidden component states. Borrowed from style-scan reference.
- **Plugin-side depth pruning in `get_node_info`**: `getNodeInfo(nodeId, depth)` now prunes the JSON_REST_V1 tree before sending it over WebSocket. Children beyond `depth` become `{id, name, type, _childrenTruncated: true}` stubs. Previously the full subtree crossed the wire even when `depth=1` was requested (filterFigmaNode ran after the WS hop). Reduces typical payload 5-10×.
- **`maxPayloadSeen` metric**: relay `/status` endpoint now exposes the largest WS message observed (bytes), with INFO-level log on each new record. Validates depth-pruning effect and warns before payload-limit regressions.

### Changed
- **Manifest security hardening**: `enableProposedApi: false` (stability guarantee), `networkAccess.allowedDomains: "none"` (was `https://google.com` — unexplained artifact), removed `permissions: ["teamlibrary"]` and deprecated `enablePrivatePluginApi`. Aligns with style-scan plugin posture.

## [1.0.0] - 2026-04-18

### Added
- **🤖 Multi-Agent / Parallel Execution**: Added a server-side FIFO command queue to the WebSocket relay. This allows multiple AI agents (e.g. Claude Code sub-agents or Cursor parallel processes) to work on the same Figma file simultaneously without blocking the single-threaded Figma plugin or causing timeouts. Achieves up to ~1.87x speedup for complex generation tasks. (Thanks to [mmabas77](https://github.com/mmabas77) - [PR #77](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/77))
- **🛡️ Node Info Depth Control**: Added `depth` parameter to `get_node_info` and `get_nodes_info` (default 1) to prevent token overflow in giant documents. Children beyond the depth limit return as minimal stubs with a `_childrenTruncated: true` flag, allowing for progressive disclosure. (Thanks to [mmabas77](https://github.com/mmabas77) - [PR #90](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/90))
- **✨ Plugin Quality Improvements**: Enhanced stability and usability across core tools. (Thanks to [mmabas77](https://github.com/mmabas77) - [PR #87](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/87))
  - Robust layout grids (properly handling STRETCH vs fixed-pixel modes).
  - Enhanced `clone_node` with `parentId` support for direct container injection.
  - Smart text wrapping and numeric font weight mapping (mapping 100-900 to Figma styles).
  - Unified styling (fill/stroke) for all basic shape creation tools.
  - Automatic column grids for top-level frames for better alignment.
  - Safe color utilities to prevent accidental black-fills on malformed input data.
- **🎯 Unicast Response Routing**: Responses from Figma are now exclusively routed to the exact agent that requested them via session tracking, eliminating broadcast noise across multiple connected clients.
- **🧱 Component Detaching**: Added `detach_instance` tool to convert component instances back into regular frames. (Thanks to [hoxinzhen](https://github.com/hoxinzhen) - [PR #85](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/85))
- **🎨 Local Style Creation**: New tools to create and manage reusable styles in Figma's local library. (Thanks to [Kejsaren](https://github.com/hello-amed) - [PR #83](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/83))
  - `create_text_style` – Create typography styles (font, size, spacing, etc).
  - `create_paint_style` – Create reusable SOLID color styles.
  - `create_effect_style` – Create reusable shadow and blur styles.
- **✨ Prototype Interaction Tools**: Added two new tools for managing Figma prototype logic. (Thanks to [ravszmig](https://github.com/ravszmig) - [PR #82](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/82))
  - `set_reactions` – Programmatically configure triggers (CLICK, HOVER, etc.), actions (NAVIGATE, OVERLAY, BACK), and transitions. Includes smart logic to handle overlay position and background behavior.
  - `get_reactions` – Inspect and debug existing interactions on any node.
- **🛡️ Robust Type Coercion**: Implementation of Zod-based coercion helpers (`coerce.number()`, `coerceBoolean`, `coerceJson`) to guarantee that all tools correctly handle parameters sent as strings (common in MCP/WebSocket environments). (Thanks to [ehs208](https://github.com/ehs208) - [PR #79](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/79))
- **🛠️ Integration & DX Fixes**:
  - **Fixed `get_pages`**: Added automatic `figma.loadAllPagesAsync()` to prevent "unloaded page" runtime errors.
  - **`parentId` in Components**: Added `parentId` support to `create_component_from_node` for deterministic container injection via the relay server.
  - **Plugin Compatibility**: Fixed syntax errors in `code.js` to ensure support for diverse Figma plugin execution environments.


### Changed
- **⚠️ Breaking Changes for State Independence**: To guarantee race-condition-free parallel execution, implicit page caching has been completely ripped out:
  - `set_current_page` is now completely **blocked** and deprecated by the server.
  - State-altering creation tools (e.g. `create_frame`, `create_rectangle`, `create_text`) now strictly require the `parentId` argument explicitly to declare where elements should be instantiated.
  - Updated tool descriptions to explicitly guide LLMs towards using the `parentId`.

## [0.9.2] - 2026-02-28

### Fixed
- **🔧 Zod compatibility**: Updated `zod` dependency from `^3.24.0` to `^3.25.0` to align with `@modelcontextprotocol/sdk@latest` (v1.27.1+) which requires `zod: "^3.25 || ^4.0"`. This resolves the `Cannot read properties of undefined (reading '_zod')` error that caused `tools/list` to fail and prevented all 54 tools from loading in Claude Desktop and Cursor ([#80](https://github.com/arinspunk/claude-talk-to-figma-mcp/issues/80), [#81](https://github.com/arinspunk/claude-talk-to-figma-mcp/issues/81)).

## [0.9.1] - 2026-02-28

### Added
- **🗒️ FigJam Support**: Six new tools for reading and writing FigJam boards (Thanks to [Rob Dearborn](https://github.com/rfdearborn))
  - `get_figjam_elements` – read all stickies, connectors, shapes-with-text, sections, and stamps on the current page
  - `create_sticky` – create a sticky note with text and colour (yellow, pink, green, blue, purple, red, orange, teal, gray, white)
  - `set_sticky_text` – update the text on an existing sticky note
  - `create_shape_with_text` – create a labelled FigJam shape (SQUARE, ELLIPSE, ROUNDED_RECTANGLE, DIAMOND, TRIANGLE_UP, TRIANGLE_DOWN, PARALLELOGRAM_RIGHT, PARALLELOGRAM_LEFT)
  - `create_connector` – draw an arrow or line between two nodes (by ID) or between canvas positions, with configurable line style and arrowheads
  - `create_section` – create a labelled colour region for grouping board content
- **🖼️ Image Manipulation Tools**: Complete image handling support for Figma nodes (Thanks to [ehs208](https://github.com/ehs208) - [PR #61](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/61))
  - `set_image_fill`: Apply images from URL or base64 data with scaleMode options (FILL, FIT, CROP, TILE).
  - `get_image_from_node`: Extract image metadata (hash, scaleMode, rotation, filters).
  - `replace_image_fill`: Replace existing images while preserving transforms and filters.
  - `apply_image_transform`: Adjust image position, scale, rotation (90° increments), and scaleMode.
  - `set_image_filters`: Apply 7 types of color/light adjustments (exposure, contrast, saturation, temperature, tint, highlights, shadows).
- **📐 Coordinate Consistency**: Added `localPosition` support to `get_node_info` and `get_nodes_info` (batch) for full parity with local coordinate transforms (Thanks to [ehs208](https://github.com/ehs208) - [PR #57](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/57)).
- **📝 Fixed-Width Text**: Added `width` parameter to `create_text` tool for better layout control and wrapping (Thanks to [leeyc09](https://github.com/leeyc09) - [PR #59](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/59)).

### Fixed
- **🔄 Image Features**: 
  - Image rotation properly implemented (90-degree increments) inside node fills (#61).
  - Image filters are now preserved when replacing images using `replace_image_fill` (#61).
- **🎯 Coordinate System**: Fixed mismatch between `get_node_info` and `move_node` by clarifying and unifying local vs global coordinate usage across all tools (Thanks to [ehs208](https://github.com/ehs208) - [PR #57](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/57)).
- **⚡ Performance & Stability**:
  - Optimized `get_nodes_info` using a high-performance native batch implementation in the plugin.
  - Fixed plugin race condition by awaiting `setCharacters` in text node creation (#59).
  - Pinned `zod` dependency to `^3.24.0` to resolve installation failures in containerized/fresh environments (#59).
- **🐳 Docker**: Fixed Dockerfile to run as a network bridge (WebSocket server) and added comprehensive setup documentation (Thanks to [ehs208](https://github.com/ehs208) - [PR #56](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/56)).

### Notes
- **Image Handling**: `apply_image_transform` rotates the image fill inside the node boundary; to rotate the entire node, use `rotate_node`. External URLs are subject to the `allowedDomains` list in `manifest.json`.
- **API Parity**: Standardized `x`/`y` descriptions across all creation and modification tools to explicitly reference local coordinates.

## [0.9.0] - 2026-02-20

### Added
- **🛠️ 20 New Tools**: Massive expansion of Figma capabilities including:
  - **Transformation**: `rotate_node`, `reorder_node`, `convert_to_frame`.
  - **Properties**: `set_node_properties` (visibility, lock, opacity).
  - **Visuals**: `set_gradient`, `boolean_operation`, `set_svg`, `get_svg`, `set_image`.
  - **Layout & Guides**: `set_grid`, `get_grid`, `set_guide`, `get_guide`.
  - **Documentation**: `set_annotation`, `get_annotation`.
  - **Variables**: `get_variables`, `set_variable`, `apply_variable_to_node`, `switch_variable_mode`.
  - **Pages**: `duplicate_page`.
  (Thanks to [mmabas77](https://github.com/mmabas77) - [PR #76](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/76))
- **🌓 Dark Mode**: Added a dark and light mode toggle to the plugin UI for better integration with Figma's themes.
- **📋 Enhanced Clipboard**: The plugin now copies the full connection instruction instead of just the channel name, making it easier to paste into Claude.

### Fixed
- **⚡ Error propagation**: Error responses from Figma now resolve immediately instead of waiting for the 60s timeout. The WebSocket message handler in `websocket.ts` now robustly checks for errors at both the root level (`myResponse.error`) and nested inside the result (`myResponse.result.error`).
- **🎨 UI Refinement**: Adjusted plugin dimensions and mode selector opacity for a cleaner look. Structured the UI script into a class for better maintainability.

## [0.8.2] - 2026-02-15

### Added
- **🔄 Component Variants**: New `set_instance_variant` tool to change variant properties without recreating the instance. Preserves instance overrides like text and colors. (Thanks to [ehs208](https://github.com/ehs208) - [PR #50](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/50))
- **📁 Custom Installation Path**: The launcher now supports an optional second argument to specify a custom installation directory (e.g., `npx claude-talk-to-figma-mcp ./my-folder`).
- **🇰🇷 Korean Localization**: Added UX/UI specialist prompt in Korean (`prompts/prompt-ux-ui-specialist-ko.md`). (Thanks to [ehs208](https://github.com/ehs208) - [PR #54](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/54))

### Fixed
- **📡 Channel Reliability**: Added verification via ping when joining a channel to prevent false success messages and ensure the Figma plugin is active. (Thanks to [ehs208](https://github.com/ehs208) - [PR #52](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/52))
- **🔗 Channel Verification**: Fixed `join_channel` accepting invalid channel codes. Now verifies connection by sending a ping after join, providing fast feedback (12s timeout) instead of waiting for first command to timeout (60s). Added internal `ping` command for connection verification.

## [0.8.1] - 2026-02-11

### Added
- **🎨 Selection Colors**: New `set_selection_colors` tool to recursively change colors of all vector nodes within the current selection. Ideal for coloring icon sets. (Thanks to [mmabas77](https://github.com/mmabas77) - [PR #49](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/49))
- **📝 Enhanced Text Alignment**: Added full support for horizontal and vertical text alignment (Top/Middle/Bottom and Left/Center/Right/Justified). (Thanks to [mmabas77](https://github.com/mmabas77) - [PR #49](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/49))
- **🌍 RTL Support**: Improved text alignment handling for Right-to-Left languages like Arabic. (Thanks to [mmabas77](https://github.com/mmabas77) - [PR #49](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/49))

### Fixed
- **🚀 Setup Command**: Fixed incorrect MCP server command in `configure-claude.js` and `README.md` that was causing connection failures. (Thanks to [ehs208](https://github.com/ehs208) - [PR #47](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/47))
- **🛡️ Type Safety**: Added missing `set_selection_colors` to `FigmaCommand` union type to resolve TypeScript compilation errors.

## [0.8.0] - 2026-02-01

### Added
- **🚀 Unified Launcher**: New `npx claude-talk-to-figma-mcp` command that handles repository setup, dependencies, and execution in a single step.
- **🛠️ Smart Bootstrapping**: Automated Bun detection and installation prompts for an optimized experience.

### Fixed
- **🛡️ Type Safety**: Updated `FigmaCommand` union types to include all new tools, resolving TypeScript compilation errors during CI/CD.
- **🏗️ CI/CD Permissions**: Fixed 403 errors in GitHub Actions by granting explicit write permissions for DXT package releases.

## [0.7.0] - 2026-01-31

### Added
- **🎨 Text Styles**: New `set_text_style_id` tool to apply local text styles to nodes (Thanks to [Rob Dearborn](https://github.com/rfdearborn) - [PR #43](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/43))
- **🏷️ Rename Node**: New `rename_node` tool for better document organization (Thanks to [Beomsu Koh](https://github.com/GoBeromsu) - [PR #36](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/36))
- **📑 Page Management**: Comprehensive suite of tools for managing document pages: `create_page`, `delete_page`, `rename_page`, `get_pages`, and `set_current_page` (Thanks to [sk (kovalevsky)](https://github.com/kovalevsky) - [PR #32](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/32))

### Fixed
- **🚀 Performance**: Optimized component lookup using `findAllWithCriteria` to resolve initialization timeouts (Thanks to [Rob Dearborn](https://github.com/rfdearborn) - [PR #42](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/42))
- **📸 SVG Export**: Corrected format parameter handling for SVG exports and increased timeouts for large exports (Thanks to [sk (kovalevsky)](https://github.com/kovalevsky) - [PR #32](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/32))
- **🛡️ Validation**: Improved Zod validation for `join_channel` by making the channel parameter strictly mandatory (Thanks to [Timur](https://github.com/Mirsmog) - [PR #29](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/29))

## [0.6.1] - 2025-08-02

### Fixed
- **`set_stroke_color` Tool**: Corrected a validation rule that incorrectly rejected a `strokeWeight` of `0`. This change allows for the creation of invisible strokes, aligning the tool's behavior with Figma's capabilities. (Thanks to [Taylor Smits](https://github.com/smitstay) - [PR #16](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/16))

## [0.6.0] - 2025-07-15

### Added
- **🚀 DXT Package Support**: Complete implementation of Anthropic's Desktop Extensions format for Claude Desktop
- **📦 Automated CI/CD Pipeline**: GitHub Actions workflow for automatic DXT package generation and release distribution
- **🔧 DXT Build Scripts**: New npm scripts for DXT packaging (`pack`, `build:dxt`, `sync-version`)
- **📋 .dxtignore Configuration**: Optimized package exclusions for minimal DXT file size (11.6MB compressed)
- **🎯 Dual Distribution Strategy**: NPM registry for developers + DXT packages for end users

### Changed
- **⚡ Installation Experience**: Reduced setup time from 15-30 minutes to 2-5 minutes via one-click DXT installation
- **📖 Documentation**: Enhanced README with comprehensive DXT installation instructions and troubleshooting
- **🏗️ Build Process**: Improved version synchronization between package.json and manifest.json
- **🔄 Release Workflow**: Automated DXT package attachment to GitHub releases

### Technical Details
- Added `@anthropic-ai/dxt@^0.2.0` development dependency for DXT packaging
- Implemented robust error handling and validation in CI/CD pipeline
- Enhanced build artifacts with 90-day retention for testing and rollback capabilities
- Established quality gates ensuring DXT packages only build after successful test suites

### Credits
- **DXT Implementation**: [Taylor Smits](https://github.com/smitstay) - [PR #17](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/17)

## [0.5.3] - 2025-06-20

### Added
- Added Windows-specific build command (`build:win`: `tsup`) for improved cross-platform compatibility
- Enhanced build process to support development on Windows systems without chmod dependency

### Fixed
- Resolved Windows build compatibility issues where `chmod` command would fail on Windows systems
- Improved developer experience for Windows users by providing dedicated build script

### Changed
- Separated Unix/Linux build process (with executable permissions) from Windows build process
- Updated installation documentation to reflect platform-specific build commands

## [0.5.2] - 2025-06-19

### Fixed
- Fixed critical opacity handling bug in `set_stroke_color` where `a: 0` (transparent) was incorrectly converted to `a: 1` (opaque)
- Fixed stroke weight handling where `strokeWeight: 0` (no border) was incorrectly converted to `strokeWeight: 1`
- Resolved problematic `||` operator usage that affected falsy values in color and stroke operations

### Added
- Extended `applyDefault()` utility function to handle stroke weight defaults safely
- Added `FIGMA_DEFAULTS.stroke.weight` constant for centralized stroke configuration
- Comprehensive test suite for `set_stroke_color` covering edge cases and integration scenarios
- Enhanced validation for RGB components in stroke operations

### Changed
- Improved architectural consistency by applying the same safe defaults pattern from `set_fill_color` to `set_stroke_color`
- Enhanced separation of concerns between MCP layer (business logic) and Figma plugin (pure translator)
- Renamed `weight` parameter to `strokeWeight` for better clarity and consistency
- Updated Figma plugin to expect complete data from MCP layer instead of handling defaults internally

### Technical Details
- Replaced `strokeWeight: strokeWeight || 1` with `applyDefault(strokeWeight, FIGMA_DEFAULTS.stroke.weight)`
- Enhanced type safety with proper `Color` and `ColorWithDefaults` interface usage
- Improved error messages and validation for better debugging experience

## [0.5.1] - 2025-06-15

### Fixed
- Fixed opacity handling in `set_fill_color` to properly respect alpha values
- Added `applyColorDefaults` function to ensure appropriate default values for colors

### Added
- Added automated tests for color functions and node manipulation

### Changed
- Improved TypeScript typing for colors and related properties
- General code cleanup and better utility organization

## [0.5.0] - 2025-05-28

### Changed
- Implemented modular tool structure for better maintainability
- Enhanced handling of complex operations with timeouts and chunking
- Improved error handling and recovery for all tools
- Improved TypeScript typing and standardized error handling

### Fixed
- Fixed channel connection issues with improved state management
- Resolved timeout problems in `flatten_node`, `create_component_instance`, and `set_effect_style_id`
- Enhanced remote component access with better error handling

### Added
- Comprehensive documentation of tool categories and capabilities

## [0.4.0] - 2025-04-15

### Added
- New tools for creating advanced shapes:
  - `create_ellipse`: Creation of ellipses and circles
  - `create_polygon`: Creation of polygons with customizable sides
  - `create_star`: Creation of stars with customizable points and inner radius
  - `create_vector`: Creation of complex vector shapes
  - `create_line`: Creation of straight lines
- Advanced text and font manipulation capabilities
- New commands for controlling typography: font styles, spacing, text case, and more
- Support for accessing team library components
- Improved error handling and timeout management
- Enhanced text scanning capabilities

### Changed
- Improvements in documentation and usage examples

## [0.3.0] - 2025-03-10

### Added
- Added `set_auto_layout` command to configure auto layout properties for frames and groups
- Support for settings for layout direction, padding, item spacing, alignment and more

## [0.2.0] - 2025-02-01

### Added
- Initial public release with Claude Desktop support
