# Typewright — guide for Claude

A Next.js 14 (App Router) font editor. Users create or import typefaces, edit glyphs in a pen-tool canvas, define ligatures and kerning, and export to WOFF2/TTF/OTF. All project state lives **client-side** in IndexedDB; there is no backend database.

## Stack

- **Framework:** Next.js 14 App Router, React, TypeScript
- **Styling:** Tailwind CSS + a small set of CSS variables in `app/globals.css` (the design tokens). **Do not introduce a UI library.**
- **State:** Zustand store at `lib/store.ts` (single source of truth for project + families + styles + glyph overrides). Persisted to IndexedDB via the store's own logic; raw font binaries go through `lib/db.ts`.
- **Fonts:** parsing/decoding via `opentype.js` in `lib/font-parser.ts`; export logic ships in `components/ExportModal.tsx`.

## Project layout

```
app/
  page.tsx                           dashboard (hero CTA + library + Discover)
  layout.tsx                         root layout — mounts Sidebar + ToastProvider
  globals.css                        ALL design tokens live here (CSS vars)
  family/[id]/page.tsx               family detail with tabs
  family/[id]/glyph/[unicode]/...    glyph editor route
  family/[id]/ligature/[sequence]/.. ligature editor route
  library/page.tsx                   font library (Upload + Google Fonts tabs)
  api/google-fonts/route.ts          server proxy for Google Fonts API (keeps API key server-side)

components/
  ui/                                primitives — see "UI primitives" below
  dashboard/                         FamilyCard, FontRecommendations
  family/                            tabs (Style, Metrics, Glyphs, Kerning, Ligatures)
  glyph-editor/                      GlyphCanvas (pen tool), GlyphSidePanel
  library/                           UploadTab, GoogleFontsTab
  CreateFontModal.tsx                "+ Create New Font" wizard
  ExportModal.tsx                    export dialog
  Sidebar.tsx                        global left nav
  Toast.tsx                          ToastProvider + useToast hook

lib/
  store.ts                           Zustand store (project shape + actions)
  types.ts                           FontFamily, FontStyle, FontMetrics, GoogleFontResult, …
  db.ts                              IndexedDB helpers for font binaries (idb)
  font-parser.ts                     opentype.js wrapper
  hooks/                             custom hooks (useFontData, etc.)
```

## UI primitives — use these, do not reinvent

Located in `components/ui/`. They exist so that a single visual change is one edit, not 47.

- **`Button`** — variants: `primary` | `ghost` | `subtle` | `danger` | `pill` (with `selected`). Sizes: `sm` | `md` | `lg`. Hover/focus/disabled is baked in.
- **`Card`** — variants: `surface` | `dashed`. Props: `interactive` (clickable hover ring), `active` (drop-zone highlight on dashed).
- **`Badge`** — small label pills. Variants: `accent` | `muted`.

**Rules:**
1. Never write `onMouseEnter`/`onMouseLeave` to toggle colors. Use Tailwind `hover:` classes with CSS variables (e.g. `hover:bg-[var(--accent2)]`).
2. Never inline `style={{ background: 'rgba(212,196,168,…)' }}`. Use a CSS var from `globals.css`. If the alpha you need isn't there, **add a new var** rather than inlining.
3. Never write a one-off button — use `<Button>` with the closest variant. If no variant fits, extend `Button`, don't create a new component.
4. SVG canvas drawing (in `glyph-editor/` and `family/MetricsTab.tsx` for metric guides) is exempt — those `rgba()` values are visualization-tuned and not part of the UI token system.

## Design tokens (in `app/globals.css`)

```
--bg, --surface, --surface2          dark surfaces (background → modal)
--border, --border2                  divider strokes (subtle → emphasized)
--text, --muted                      foreground text (primary → secondary)
--accent, --accent2                  primary brand color + hover
--accent-soft, --accent-soft2        accent-tinted backgrounds (chips/badges)
--accent-border, --accent-border2    accent-tinted borders (rest → hover)
--accent-glow, --accent-glow-strong  box-shadow glows for primary buttons
--danger, --danger-text, --danger-soft, --danger-soft2,
--danger-border, --danger-border2    destructive action palette
--overlay                            modal scrim
```

Always reach for an existing token first.

## Conventions

- **`'use client'`** — every interactive component needs it. Server components are fine for layout/metadata only.
- **Routing** — App Router. Dynamic segments: `[id]`, `[unicode]` (uppercase hex), `[sequence]` (ligature characters). Toasts on navigation are handled at the call site (`showToast(...)` then `router.push(...)`).
- **State writes** — everything goes through store actions (`addFamily`, `addStyle`, `setGlyphOverride`, etc.). Don't mutate the project tree directly.
- **Font binaries** — never store an `ArrayBuffer` in the Zustand store. Save it via `saveFontBinary(id, buffer)` and reference it by `sourceFontId` on the style.
- **Errors** — surface to the user via `useToast()`. Don't `console.error` in production paths.

## Deployment

- Vercel project is linked (`.vercel/project.json`); pushing to `main` auto-deploys.
- Production: `https://typewright.vercel.app`.
- The Google Fonts API key is a **server-only** env var (`GOOGLE_FONTS_API_KEY`), accessed only in `app/api/google-fonts/route.ts`. Never expose it client-side or prefix it with `NEXT_PUBLIC_`.
