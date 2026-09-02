<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# UI/UX & MCP Workflow Guidelines
- **Always use the Shadcn MCP Server or Stitch MCP Server** when performing any UI/UX or frontend changes, component styling, or layout redesigns.
- **Design System ("Obsidian & Zinc Core")**: True dark canvas with dark scanlines (`repeating-linear-gradient`), crisp 1px zinc borders (`#27272a`), razor-sharp corners (`rounded-none` / `rounded-xs`), and `JetBrains Mono` for badges and metadata.
- **Terminology**: Use **"Watchlist"** and **"+ Add to Watchlist"** consistently across all components.
- **Responsiveness**: Always ensure layouts use `.responsive-media-grid` and `.responsive-detail-grid` with full mobile drawer navigation.
