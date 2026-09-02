---
name: ui-development
description: Mandatory workflow for all frontend, UI/UX, styling, and layout changes. Enforces querying the Shadcn MCP server and Stitch MCP server, strict minimal developer aesthetics (Obsidian/Zinc, high density, sharp geometries), and mobile responsiveness.
---

# UI & UX Development Workflows with Shadcn & Stitch MCP

When performing any task that involves modifying, creating, or revamping user interfaces, components, styling, or layouts in this project:

## 1. Mandatory MCP Tool Usage
Whenever UI changes are requested:
1. **Shadcn MCP Server**:
   - Query available components using `list_items_in_registries` or `search_items_in_registries`.
   - Inspect schemas and examples using `view_items_in_registries` and `get_item_examples_from_registries`.
   - Always adhere to standardized Shadcn component structures and composition models.
2. **Stitch MCP Server**:
   - For visual design system syncing, design uploads, and screen generations, utilize Stitch MCP tools (`create_design_system`, `upload_design_md`, `generate_screen_from_text`, `edit_screens`).

## 2. Design System & Aesthetics ("Obsidian & Zinc Core")
- **True Dark / Obsidian Background**: `#060608` background with subtle horizontal scanlines (`repeating-linear-gradient`).
- **Crisp Low-Contrast Borders**: Sharp 1px borders (`#27272a` / `#18191e`).
- **Razor-Sharp Geometries**: `rounded-none` or `rounded-xs` (2px–4px). Avoid bubbly cards, generic gradients, or floating blurry shadows.
- **Monospace Details**: Use `JetBrains Mono` for badges, tags, metrics, IDs, and server health readouts.
- **Terminology**: Use **"Watchlist"** and **"+ Add to Watchlist"** (not "Queue").

## 3. Mobile Responsiveness & 60fps Performance
- **Fluid Grids**: Use `.responsive-media-grid` with `minmax(135px, 1fr)` for mobile (guaranteeing 2-column mobile cards) and `minmax(185px, 1fr)` for desktop.
- **Adaptive Detail Bento**: Use `.responsive-detail-grid` with single column stacked viewports on `< 768px` and two-column Bento layouts on desktop.
- **Mobile Navigation**: Ensure all routes and search are accessible via the mobile collapsible drawer menu.
- **GPU Compositing**: Use pure CSS `:hover` states instead of JavaScript `onMouseEnter` React style mutations to avoid frame drops during scrolling.
