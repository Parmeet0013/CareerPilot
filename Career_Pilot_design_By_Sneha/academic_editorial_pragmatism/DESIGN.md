---
name: Academic Editorial Pragmatism
colors:
  surface: '#fef9ee'
  surface-dim: '#dfd9d0'
  surface-bright: '#fef9ee'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f9f3e9'
  surface-container: '#f3ede3'
  surface-container-high: '#ede8dd'
  surface-container-highest: '#e7e2d8'
  on-surface: '#1d1c16'
  on-surface-variant: '#404945'
  inverse-surface: '#32302a'
  inverse-on-surface: '#f6f0e6'
  outline: '#707975'
  outline-variant: '#bfc9c3'
  surface-tint: '#2d6857'
  primary: '#004334'
  on-primary: '#ffffff'
  primary-container: '#1e5b4a'
  on-primary-container: '#94d1bb'
  inverse-primary: '#96d3bd'
  secondary: '#855300'
  on-secondary: '#ffffff'
  secondary-container: '#feb557'
  on-secondary-container: '#734700'
  tertiary: '#7b0001'
  on-tertiary: '#ffffff'
  tertiary-container: '#a2140c'
  on-tertiary-container: '#ffb0a4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b2efd9'
  primary-fixed-dim: '#96d3bd'
  on-primary-fixed: '#002118'
  on-primary-fixed-variant: '#0f5040'
  secondary-fixed: '#ffddb8'
  secondary-fixed-dim: '#ffb95f'
  on-secondary-fixed: '#2a1700'
  on-secondary-fixed-variant: '#653e00'
  tertiary-fixed: '#ffdad5'
  tertiary-fixed-dim: '#ffb4a8'
  on-tertiary-fixed: '#410000'
  on-tertiary-fixed-variant: '#930303'
  background: '#fef9ee'
  on-background: '#1d1c16'
  surface-variant: '#e7e2d8'
typography:
  headline-lg:
    fontFamily: Newsreader
    fontSize: 36px
    fontWeight: '400'
    lineHeight: 44px
  headline-lg-mobile:
    fontFamily: Newsreader
    fontSize: 28px
    fontWeight: '400'
    lineHeight: 36px
  headline-md:
    fontFamily: Newsreader
    fontSize: 28px
    fontWeight: '400'
    lineHeight: 36px
  headline-md-mobile:
    fontFamily: Newsreader
    fontSize: 22px
    fontWeight: '400'
    lineHeight: 28px
  headline-sm:
    fontFamily: Newsreader
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
  title-md:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
  title-sm:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  body-lg:
    fontFamily: Geist
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-md:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  body-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.03em
  tabular-mono:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style
The design system establishes a quiet, studious, and hyper-structured environment for college students navigating placement seasons and competitive recruitment drives in India. Moving decisively away from gamified student software or hyper-saturated tech portals, the aesthetic draws inspiration from literary journals, reference manuals, and utilitarian digital workbenches like Notion and Linear.

### Emotional Target
- **Composed & Grounded:** Mitigates career-related anxiety through calm visual rhythms, predictable geometry, and quiet negative space.
- **Dignified & Scholarly:** Bridges high-utility SaaS execution with the credibility of an academic press.
- **High Information Utility:** Respects user agency through high data density, legible tables, and purposeful visual hierarchy.

### Style Directives
- **Zero Illusion of Depth:** Strictly no drop shadows, no directional elevation blurs, no ambient glows, and no translucent glassmorphism.
- **Structural Integrity:** Spatial relationships are dictated by continuous 1px hairline rules, flat planar shifts, and disciplined grid alignments.
- **Restraint:** No decorative emojis, no AI sparkles or anthropomorphic indicators. Dynamic or assistive states are signaled through clear, unadorned typography, structural badges, or tabular metrics.

## Colors
The palette operates with a deliberate editorial economy. Every color has an unambiguous functional assignment, leaning on warm, tactile tones that prevent screen fatigue during long application cycles.

### Color Architecture
- **Base Canvas (`#FAF9F6`):** Warm off-white parchment tint for page canvases, global wrappers, and low-priority backgrounds.
- **Surface Layer (`#FFFFFF`):** Pure white used exclusively for discrete content surfaces, data tables, modals, and interactive inputs.
- **Hairline Border (`#E7E5E0`):** Soft, structural neutral for all element boundaries, card separations, table cells, and rules.
- **Primary Ink (`#1A1A1A`):** Deep near-black for high-contrast reading, headlines, and data values.
- **Secondary Ink (`#6B6860`):** Balanced warm grey for meta-labels, secondary attributes, timestamps, and column headers.
- **Primary Accent (`#1E5B4A`):** Deep forest green reserved for primary calls to action, committed stages, active navigation states, and confirmed records.
- **Status & Urgency:**
  - **Attention Amber (`#B7791F`):** Used at 100% value for high-urgency deadlines and pending stages; used at 8% tint for warning cell fills.
  - **Critical Crimson (`#B42318`):** Restricted to overdue submission deadlines, rejected application logs, and destructive flows.

## Typography
The typographic hierarchy unifies editorial classicism with modular software precision.

### Type Pairings
- **Display & Headings (Newsreader):** Used for view titles, broad section announcements, and primary application headings. Its literary serif presence instills gravity, patience, and dignity.
- **Interface, Controls, & Meta (Geist):** Handles all forms, tables, operational lists, micro-labels, and buttons. Chosen for its cold geometric clarity, optical sharpness at small sizes, and integrated tabular numerals.

### Typographic Principles
- Always enable OpenType tabular figures (`font-variant-numeric: tabular-nums`) across table rows, CTC (Cost to Company) figures, dates, and application timeline counters.
- Sub-headings beneath Newsreader page titles must switch cleanly to muted Geist medium weights (`title-sm` or `body-md`) to clearly delineate editorial copy from interactive software chrome.

## Layout & Spacing
The layout relies on a tight, purposeful compact grid optimized for data density and continuous horizontal tracking.

### Grid Architecture
- **Desktop (>= 1200px):** 12-column layout with a fixed sidebar (240px wide). Margins are set to `2.5rem` (`margin-desktop`) with a persistent `1.5rem` (`gutter-desktop`) between master-detail panes or spreadsheet-view splits.
- **Tablet (768px - 1199px):** Collapsible icon rail (64px) with flexible 8-column layout using `1.5rem` gutters and margins.
- **Mobile (< 768px):** Single-column stacked flow using `1rem` margins and gutters. Multi-column tracking sheets collapse gracefully into vertical card stacks.

### Density and Rhythms
- Interface components operate under a 4px/8px incremental base.
- Vertical table cell padding is locked to `0.5rem` (`space-sm`) top and bottom to maximize the visible row volume above the fold, supporting high-throughput scanning.

## Elevation & Depth
Depth is produced exclusively through physical plane layering and structural borders. This system rejects skeuomorphic shadows, soft drop-shadows, and layered blurs.

### Planar Tiers
1. **Canvas Layer (`#FAF9F6`):** The structural floor of the viewport. Houses the application frame, peripheral metrics, and secondary contextual zones.
2. **Sheet Layer (`#FFFFFF`):** High-priority focus areas, document cards, application spreadsheets, input containers, and sidebar surfaces. Always circumscribed by a 1px solid border of `#E7E5E0`.
3. **Overlays & Drawers (`#FFFFFF`):** Flyout side-panels, filter dialogs, and contextual dropdowns. Bordered cleanly on all sides by 1px solid `#E7E5E0`. No drop shadows; isolation is achieved through a flat, matte backdrop curtain: `rgba(26, 26, 26, 0.2)`.

### Border Strictness
- Never employ border widths greater than 1px.
- Use horizontal divider lines (`#E7E5E0`) rather than vertical spacers to segment dense information.

## Shapes
Geometry is disciplined, architectural, and restrained. Surfaces maintain an 8px radius (`0.5rem`), avoiding both harsh brutalist points and playful, bulbous pill geometries.

### Corner Rules
- **Standard Enclosures (8px):** Cards, primary containers, input fields, modal shells, and action buttons.
- **Micro Enclosures (4px):** Status badges, inline code tags, table filter chips, and checkboxes.
- **Edge Alignments:** Nested components strictly nest their curves (`R_inner = R_outer - padding`) to ensure structural harmony without odd gap halos.

## Components

### Buttons
- **Primary:** Solid `#1E5B4A` background, `#FFFFFF` text, 1px solid transparent, 8px border-radius. Height: 36px. Hover: `#164639`. Active: `#0E3228`.
- **Secondary / Outline:** Pure `#FFFFFF` surface, 1px solid `#E7E5E0`, `#1A1A1A` text. Hover: `#FAF9F6` background, border shifts to `#D6D3CC`.
- **Ghost:** Transparent background, `#6B6860` text. Hover: `#FAF9F6` background with `#1A1A1A` text.

### Form Inputs & Selectors
- Background: `#FFFFFF`. Border: 1px solid `#E7E5E0`. Text: `#1A1A1A`. Placeholder: `#6B6860`.
- Height: 36px. Corner radius: 8px.
- Focus state: Border shifts cleanly to `#1E5B4A` with zero ring glow. Error state: Border shifts to `#B42318`.

### Status Badges & Chips
- Flat background fills with an opacity of 10% overlaid with a matching solid typographic label.
- **Applied / Under Review:** Background `rgba(30, 91, 74, 0.08)`, text `#1E5B4A`, border `1px solid rgba(30, 91, 74, 0.2)`.
- **Deadline Nearing / Action Required:** Background `rgba(183, 121, 31, 0.08)`, text `#B7791F`, border `1px solid rgba(183, 121, 31, 0.2)`.
- **Rejected / Offer Closed:** Background `rgba(180, 35, 24, 0.08)`, text `#B42318`, border `1px solid rgba(180, 35, 24, 0.2)`.
- Shape: 4px border radius. Padding: 2px 6px. Font: `label-sm` with tabular numerals.

### Data Tables (The Application Ledger)
- Wrapper: Background `#FFFFFF`, 1px solid `#E7E5E0`, 8px corner radius, overflowing content contained.
- Header: Height 32px, background `#FAF9F6`, border-bottom 1px solid `#E7E5E0`. Typography: `label-sm`, text `#6B6860`, uppercase tracking.
- Row: Height 40px, border-bottom 1px solid `#E7E5E0`. Text: `body-md` in `#1A1A1A`. Hover: `#FAF9F6`.
- CTC/Stipend & Date Columns: Right-aligned, formatted with `tabular-mono`.

### Cards & Panels
- Canvas: `#FFFFFF`, 8px radius, 1px hairline border `#E7E5E0`.
- Padding: `1.25rem` (`space-lg`).
- Titles use `headline-sm` (Newsreader) or `title-md` (Geist). Metadata ribbons sit below with a 1px solid `#E7E5E0` top dividing rule.

### Checkboxes & Radios
- Size: 16px × 16px square (radios: 16px circle).
- Base: 1px solid `#D6D3CC`, background `#FFFFFF`.
- Checked: Background `#1E5B4A`, border `#1E5B4A`, with crisp white 1.5px checkmark vector.