# VEO OS Design Manifesto

## Authority and Phase Protocol

This document is a mandatory product and implementation authority for VEO OS. It exists alongside `VEO_OS_MASTER_PLAN.md`.

Before starting any phase, read both root authority documents in full:

1. `VEO_OS_MASTER_PLAN.md`
2. `VEO_OS_DESIGN_MANIFESTO.md`

The master plan governs architecture, schema, feature behavior, and phase boundaries. This manifesto governs product character, visual language, interaction behavior, accessibility, and the translation of visual references into reusable application code.

VEO OS must not look like a generic SaaS dashboard. It must feel like a premium, high-technology operating environment tailored for elite music producers: the restraint and precision of macOS combined with the spatial depth of visionOS, without copying either product.

---

## 1. Brand and Product Character

VEO OS is a futuristic, high-performance music production environment. It should communicate:

- Professional precision
- Cinematic atmosphere
- Technical confidence
- Spatial depth
- Tactile interaction
- Long-session comfort
- A sense of focused creative momentum

The interface is technical yet ethereal. Complex audio data, waveforms, MIDI grids, task boards, files, and comments should feel suspended in a coherent spatial system rather than pinned to flat opaque cards.

Every visual choice must serve production work. Decorative effects must never reduce readability, obscure controls, introduce motion fatigue, or compete with critical audio information.

---

## 2. Theme and Color Authority

### Brand accent

The core accent is **PANTONE 2735 C**:

```text
#2E008B
```

Use `#2E008B` for active states, playback positions, selected production data, focus radiance, and core brand moments. Do not flood large portions of the interface with solid purple. Purple is an energetic thread, not the background of every component.

### Theme support

Both dark and light themes are mandatory and must use standard Tailwind/Shadcn semantic CSS variables.

- Dark mode is the default.
- Dark base background: `#000000`.
- Light base background: `#FAFAFA`.
- Theme switching must be class-based and compatible with Shadcn conventions.
- Components consume semantic variables such as `--background`, `--foreground`, `--card`, `--primary`, and `--border`; they must not embed theme-specific colors throughout JSX.

### Dark ambient background

Dark mode uses a pure-black base with restrained fixed radial glows derived from PANTONE 2735 C. The intended visual direction is:

```css
background-color: #000000;
background-image:
  radial-gradient(circle at 15% 50%, rgba(46, 0, 139, 0.15) 0%, transparent 50%),
  radial-gradient(circle at 85% 30%, rgba(98, 74, 191, 0.10) 0%, transparent 50%);
background-attachment: fixed;
```

The glows must remain subtle. They provide spatial depth behind glass surfaces and must not resemble neon wallpaper.

### Light ambient background

Light mode uses `#FAFAFA` with very restrained cool-lavender illumination. Glass surfaces become translucent white with darker low-alpha borders and shadows. The light theme must remain calm, premium, and legible rather than becoming a plain white admin dashboard.

### Approved dark token palette

| Token | Value |
|---|---:|
| `surface` | `#14121A` |
| `surface-dim` | `#14121A` |
| `surface-bright` | `#3A3840` |
| `surface-container-lowest` | `#0F0D14` |
| `surface-container-low` | `#1C1B22` |
| `surface-container` | `#201F26` |
| `surface-container-high` | `#2B2931` |
| `surface-container-highest` | `#36343C` |
| `on-surface` | `#E6E0EB` |
| `on-surface-variant` | `#CAC4D5` |
| `inverse-surface` | `#E6E0EB` |
| `inverse-on-surface` | `#312F37` |
| `outline` | `#938E9E` |
| `outline-variant` | `#484553` |
| `surface-tint` | `#CBBEFF` |
| `primary` | `#CBBEFF` |
| `on-primary` | `#330D90` |
| `primary-container` | `#2E008B` |
| `on-primary-container` | `#9880F9` |
| `inverse-primary` | `#624ABF` |
| `secondary` | `#C6C6C6` |
| `on-secondary` | `#303030` |
| `secondary-container` | `#474747` |
| `on-secondary-container` | `#B5B5B5` |
| `tertiary` | `#C6C6C7` |
| `on-tertiary` | `#2F3131` |
| `tertiary-container` | `#2A2C2C` |
| `on-tertiary-container` | `#929393` |
| `error` | `#FFB4AB` |
| `on-error` | `#690005` |
| `error-container` | `#93000A` |
| `on-error-container` | `#FFDAD6` |
| `primary-fixed` | `#E7DEFF` |
| `primary-fixed-dim` | `#CBBEFF` |
| `on-primary-fixed` | `#1D0061` |
| `on-primary-fixed-variant` | `#4A2FA6` |
| `secondary-fixed` | `#E2E2E2` |
| `secondary-fixed-dim` | `#C6C6C6` |
| `on-secondary-fixed` | `#1B1B1B` |
| `on-secondary-fixed-variant` | `#474747` |
| `tertiary-fixed` | `#E2E2E2` |
| `tertiary-fixed-dim` | `#C6C6C7` |
| `on-tertiary-fixed` | `#1A1C1C` |
| `on-tertiary-fixed-variant` | `#454747` |
| `background` | `#000000` |
| `on-background` | `#E6E0EB` |
| `surface-variant` | `#36343C` |

### Approved light semantic counterparts

| Semantic role | Value |
|---|---:|
| `background` | `#FAFAFA` |
| `foreground` | `#17131F` |
| `card` | `rgba(255, 255, 255, 0.72)` |
| `card-foreground` | `#17131F` |
| `popover` | `rgba(255, 255, 255, 0.88)` |
| `popover-foreground` | `#17131F` |
| `primary` | `#2E008B` |
| `primary-foreground` | `#FFFFFF` |
| `secondary` | `#EEEAF7` |
| `secondary-foreground` | `#2A2433` |
| `muted` | `#F1EFF4` |
| `muted-foreground` | `#686170` |
| `accent` | `#EAE4FA` |
| `accent-foreground` | `#2E008B` |
| `destructive` | `#B42318` |
| `destructive-foreground` | `#FFFFFF` |
| `border` | `rgba(35, 27, 48, 0.12)` |
| `input` | `rgba(35, 27, 48, 0.14)` |
| `ring` | `#624ABF` |

Functional success, warning, and error colors should use high-saturation indicators, thin borders, or controlled glows rather than large opaque blocks.

---

## 3. Glassmorphism: The Core Structural Language

All main cards, sidebars, docks, and panels use frosted glass. Do not use solid opaque backgrounds for primary containers.

### Canonical dark glass treatment

```text
bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl
```

This is a starting point, not permission to make every surface identical. Hierarchy is created by changing optical density, blur, border brightness, and radiance.

### Glass levels

1. **Level 0 — Base:** Pure black `#000000` or light `#FAFAFA` ambient field.
2. **Level 1 — Structural panels:** Approximately 24px backdrop blur, low-opacity fill, and a 1px low-alpha border. Use for sidebars, workspace regions, and persistent docks.
3. **Level 2 — Cards/modules:** Slightly denser glass with restrained purple radiance on active or hovered states.
4. **Level 3 — Popovers/modals:** Maximum practical blur, stronger separation, and a controlled top-left edge highlight that suggests a coherent light source.

### Surface rules

- Main structural panels: `rounded-3xl`.
- Smaller modules and cards: `rounded-2xl`.
- Buttons: `rounded-[10px]` or `rounded-full` according to role.
- Inputs may use recessed glass with an inner shadow.
- Hover glow uses `#2E008B` or `#CBBEFF` at low opacity.
- Glows are reserved for active, selected, playing, focused, or high-importance elements.
- Do not apply strong glow to every card.
- Backdrop blur must degrade gracefully where browser support or performance is limited.

---

## 4. Typography

Fonts must be loaded through `next/font/google`.

### Display and headings

Use **Space Grotesk** for headings, major numerals, BPM, timecodes, meters, and other prominent production data.

| Style | Size | Weight | Line height | Tracking |
|---|---:|---:|---:|---:|
| `display-lg` | `48px` | `700` | `56px` | `-0.02em` |
| `headline-lg` | `32px` | `600` | `40px` | `-0.01em` |
| `headline-md` | `24px` | `500` | `32px` | normal |
| `headline-sm` | `20px` | `500` | `28px` | normal |

### Body and interface

Use **Inter** for body text and functional interface copy. Geist Sans may replace Inter only if its availability and compatibility are verified for the pinned Next.js foundation.

| Style | Size | Weight | Line height | Tracking |
|---|---:|---:|---:|---:|
| `body-lg` | `18px` | `400` | `28px` | normal |
| `body-md` | `16px` | `400` | `24px` | normal |
| `body-sm` | `14px` | `400` | `20px` | normal |
| `label-md` | `12px` | `600` | `16px` | `0.05em` |
| `label-sm` | `10px` | `500` | `12px` | `0.08em` |

Labels should use slightly increased tracking and sufficient weight so they remain readable over blurred surfaces.

---

## 5. Iconography

Install and use `@phosphor-icons/react` for custom VEO OS interface work.

- Use Phosphor Regular, Light, Thin, or Duotone weights according to hierarchy.
- Main custom layouts must not use Font Awesome or Material Symbols.
- `lucide-react` may remain only where Shadcn internal components require it.
- Icons should usually render in white or foreground color at approximately 80% opacity, reaching full opacity and controlled purple radiance on active or hover states.
- Icon buttons must have accessible names and keyboard-visible focus states.

---

## 6. Motion and Tactility

Install and use `framer-motion` for product interactions.

Linear/ease transitions are forbidden as the primary interaction model for modals, dropdowns, page transitions, active states, and tactile controls. Use spring physics.

### Baseline spring

```tsx
transition={{ type: "spring", stiffness: 400, damping: 30 }}
```

### Button press

```tsx
whileTap={{ scale: 0.95 }}
```

### Motion rules

- Use spring layout transitions for active tabs, selected cards, menus, overlays, and shared indicators.
- Motion must communicate state and hierarchy; it must not exist only to decorate.
- Keep travel distances short and avoid slow floating effects during production work.
- Respect `prefers-reduced-motion` through Framer Motion's reduced-motion facilities and CSS fallbacks.
- Reduced-motion mode must preserve all state communication without requiring animation.

---

## 7. Layout and Spacing

The layout follows a fluid-spatial model. Elements are floating containers in a coherent environment rather than rigid boxes in a generic admin grid.

### Core measurements

| Token | Value |
|---|---:|
| Baseline unit | `4px` |
| Gutter | `16px` |
| Mobile safe margin | `16px` |
| Desktop safe margin | `32px` |
| Sidebar width | `260px` |
| Card gap | `20px` |

### Layout rules

- Desktop uses a fixed `260px` translucent left sidebar.
- The central workspace remains fluid and supports dashboard, Kanban, waveform, sequencing, calendar, and moodboard compositions.
- Maintain a `32px` desktop safe area so the ambient OS background remains visible around glass panels.
- Mobile uses a `16px` safe margin and may replace the sidebar with a compact dock or sheet.
- Persistent audio controls should read as a floating glass dock and remain mounted at the dashboard layout level so navigation does not interrupt playback.
- Dense production screens must preserve clear visual grouping, keyboard navigation, and usable hit targets.

---

## 8. Shapes and Depth

The shape language is sophisticated and fluid, reflecting sound waves while retaining operating-system precision.

- Primary workspace panels: 24px radius (`rounded-3xl`).
- Cards and interactive modules: 16px radius (`rounded-2xl`).
- Compact buttons: 10px radius (`rounded-[10px]`).
- Icon controls, status badges, toggles, and playback handles: fully rounded (`rounded-full`).
- Use thin, tactile fader tracks and 16px glass handles with purple centers for sliders.
- Use optical density and chromatic radiance rather than generic heavy drop shadows.

---

## 9. Component Direction

### Glass cards

- Use approximately 24px backdrop blur and a 1px low-alpha border.
- Cards should float above their parent field.
- Hover and drag states may increase border brightness and introduce a restrained purple glow.
- Kanban columns should not become large opaque boxes; individual cards carry the primary surface treatment.

### Waveform display

- Render waveforms in the purple family, anchored by `#2E008B`.
- Use a darker semi-transparent local field to preserve peak contrast.
- Playback position and timestamp markers may use brighter lavender radiance.
- Waveform interactions must remain precise and accessible.

### Buttons

- Primary: `#2E008B`, white text, and a subtle external purple glow.
- Secondary/ghost: glass fill with a low-alpha border.
- Icon buttons: minimal Phosphor icons with visible hover, active, and focus states.
- Interactive custom buttons use Framer Motion spring behavior and `whileTap={{ scale: 0.95 }}`.

### Inputs and sliders

- Inputs use recessed glass rather than an opaque field.
- Focus uses a controlled purple border/ring and must remain visible in both themes.
- Sliders use thin tracks with large tactile handles suitable for precise studio interaction.

### Sidebar items

- Active items use a brighter glass layer and a `4px` purple indicator approximately `16px` tall on the left edge.
- Navigation motion uses spring-based active indicators rather than padding jumps or generic ease transitions.

### Global audio player

- Present the persistent player as a floating glass dock.
- Separate track identity, transport controls, time, and volume into readable groups.
- The player must remain mounted in the dashboard layout so music does not stop during route changes.

---

## 10. Stitch Reference Translation Rules

The supplied Stitch HTML exports are visual references for:

- Dashboard composition
- Fixed glass sidebar
- Floating global player dock
- Track waveform and timestamp comments
- Kanban task layouts
- Operations and weekly planning
- Moodboard masonry
- VEO AI side panel
- Spatial depth and controlled purple radiance

The Stitch HTML is non-executable reference material. Do not copy, paste, import, or translate it line-for-line.

Production code must not inherit:

- CDN Tailwind scripts
- Inline configuration scripts
- Inline style blocks
- Material Symbols
- Randomly generated waveform scripts
- Remote placeholder imagery without approval
- Monolithic page markup
- Outdated generated utility patterns
- Generic CSS ease/linear interaction transitions

Translate visual intent into:

- Next.js App Router components
- Typed reusable React modules
- Tailwind CSS utilities
- Shadcn primitives and semantic CSS variables
- `@phosphor-icons/react`
- `framer-motion` spring interactions
- Accessible labels, focus states, contrast, and keyboard behavior
- Responsive desktop, tablet, and mobile layouts
- `prefers-reduced-motion` support

---

## 11. Quality Bar

A VEO OS screen is acceptable only when it:

- Feels specific to music production rather than interchangeable with a CRM or project-management template.
- Uses glass hierarchy consistently without sacrificing contrast.
- Applies purple radiance selectively and purposefully.
- Uses Space Grotesk and Inter according to the type hierarchy.
- Uses Phosphor icons in custom layouts.
- Uses spring-based interaction motion with reduced-motion support.
- Remains accessible by keyboard and usable during long studio sessions.
- Preserves responsive behavior and avoids horizontal overflow except where a deliberate timeline, Kanban board, or waveform requires it.
- Uses reusable components and semantic tokens instead of duplicating reference markup.
