# UI & Frontend Rules

When implementing or modifying any user interface, component, layout, or style in this workspace:

1. **Mandatory MCP Server Workflows**:
   - Always utilize the **Shadcn MCP server** (`list_items_in_registries`, `search_items_in_registries`, `view_items_in_registries`) for UI component architecture and patterns.
   - Always utilize the **Stitch MCP server** for visual design generation, screen specs, and design system synchronization.

2. **Design Language ("Obsidian & Zinc Core")**:
   - Carbon scanline background (`#060608` with subtle 2px horizontal striping).
   - 1px crisp borders (`#27272a` / `#18191e`).
   - Sharp geometries (`rounded-none` to `rounded-xs`).
   - Monospace typography for metrics, tags, and status readouts.
   - Standardize on **"Watchlist"** and **"+ Add to Watchlist"**.

3. **Performance & Responsiveness**:
   - Full mobile responsiveness with `.responsive-media-grid` (2-column layout on phones) and `.responsive-detail-grid`.
   - Collapsible mobile drawer navigation.
   - Pure CSS `:hover` states to maintain 60fps interaction during scrolling.
