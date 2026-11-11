# CareerPilot: Design Guide

Source of truth for the UI. If this file and any screenshot disagree, this file wins.

## 1. Principles

1. **Calm and practical.** It should feel like a tool people open every day (Linear, Notion, Cal.com), not a demo of AI.
2. **One accent.** Deep green is the only brand color. Everything else is neutral.
3. **Information first.** Tables, lists and inline tags beat decorative cards.
4. **Human in control.** Anything irreversible is clearly marked and needs an explicit click.
5. **Honest copy.** Short, plain, specific. State what the agent did and what it did not do.

## 2. Forbidden

Never use: gradients, glows, glassmorphism, neon colors, drop shadows, emoji, sparkle or robot icons, stock photos, illustrations of people, hero sections, oversized decorative cards, animated backgrounds.
Never write: "unlock", "supercharge", "AI-powered", "magic", "revolutionize", "seamless".

## 3. Color tokens

| Token | Hex | Use |
|---|---|---|
| `canvas` | `#FAF9F6` | App background |
| `surface` | `#FFFFFF` | Cards, tables, drawers, inputs |
| `line` | `#E7E5E0` | All 1px borders and dividers |
| `ink` | `#1A1A1A` | Primary text |
| `muted` | `#6B6860` | Secondary text, labels, placeholders |
| `accent` | `#1E5B4A` | Primary buttons, active nav, links, key highlights |
| `accent-soft` | `#E8F0ED` | Selected row, active nav background, changed lines in diff |
| `amber` | `#B7791F` | Deadline tags (closing soon) |
| `amber-soft` | `#FBF3E2` | Amber tag background |
| `red` | `#B42318` | Overdue tags, destructive actions, errors |
| `red-soft` | `#FDECEA` | Red tag background, removed text in diff |

Rules:
- Amber and red appear only as small tags, small text or the removed/changed diff highlight. Never as large fills.
- Text on `canvas` or `surface` must meet WCAG AA contrast.
- Do not hard-code hex values in components. Use the tokens.

## 4. Typography

| Role | Font | Size / weight |
|---|---|---|
| Page title | Newsreader (serif) | 28px / 500, tight tracking |
| Section title | Inter | 15px / 600 |
| Body | Inter | 14px / 400 |
| Table text | Inter | 13px / 400, `tabular-nums` |
| Label, caption | Inter | 12px / 500, `muted` |
| Tag | Inter | 12px / 500 |

Rules:
- Newsreader is used for page titles only. Never in buttons, tables or body text.
- Use `font-variant-numeric: tabular-nums` for dates, counts, scores and money.
- Line height 1.5 for body, 1.3 for titles.
- Load fonts from Google Fonts with `display=swap` and a system fallback.

## 5. Spacing, shape, layout

- Spacing scale: 4, 8, 12, 16, 24, 32, 48 px.
- Radius: 8px for cards, inputs, buttons and drawers. 999px only for tags.
- Borders: always 1px `line`. No shadows. Hover and focus use border or background changes only.
- App shell: left sidebar 208px, content max width 1120px, page padding 32px.
- Page header: serif title on the left, primary action on the right, 24px below to the content.
- Tables: row height 44px, header 12px `muted` uppercase-free text, 1px `line` between rows, no zebra stripes.

## 6. Components

**Sidebar.** Narrow, quiet. Items: Today, Jobs, Applications, Practice, Profile. Icons from `lucide-react`, 18px, stroke 1.5, monochrome (`muted`; `accent` when active). Active item gets `accent-soft` background and `accent` text. The product name "CareerPilot" in Inter 600 at the top, no logo mark.

**Buttons.**
- Primary: `accent` background, white text, 8px radius, 36px high. Hover: slightly darker green.
- Secondary: `surface` background, 1px `line` border, `ink` text.
- Destructive: secondary style with `red` text.
- Disabled: 50% opacity, no pointer.
- Max one primary button per view region.

**Tags.** Pill, 12px text, 1px border.
- Fit: Strong (`accent` text on `accent-soft`), Medium (`ink` on `canvas`), Weak (`muted` on `canvas`).
- Deadline: amber if closing within 3 days, red if overdue, otherwise plain `muted`.
- Status tags: Saved, Drafted, Awaiting approval (amber), Applied, Interview, Offer.

**Table.** Sortable headers where useful, row click opens the drawer, selected row uses `accent-soft`. Pagination at the bottom right: "Page 2 of 20", previous and next buttons.

**Drawer.** Right side, 440px wide, `surface`, 1px left border `line`, closes with Esc and a close icon. Content order: title, company and location, "Why it fits" (3 bullets), "Skills you're missing" (tags), actions at the bottom.

**Inputs.** 36px high, `surface`, 1px `line`, focus ring is a 2px `accent` outline. Labels above the field in 12px `muted`.

**Diff view.** Two equal columns. Added or changed lines get `accent-soft` background. Removed text is struck through in `muted` on `red-soft`. Monospace is not used; keep Inter 13px.

**Approval bar (sticky, bottom of Prepare application).** Full width, `surface`, 1px top border. Left text: "Nothing is sent until you approve." Right buttons: Approve and send (primary), Save draft, Discard. This bar is always visible on that screen.

**Steps list.** Collapsible "What the agent did" list under the draft. Each row: step number, tool name, one-line result, status. Plain text, no icons beyond a check or a cross.

**Empty states.** One plain sentence and one action. Example: "No applications yet. Open Jobs and prepare one."

**Loading.** Agent calls take seconds. Show an inline status line such as "Reading your resume..." and a thin `accent` progress line at the top of the panel. No spinners that spin forever without text.

**Errors.** Inline banner, `red-soft` background, 1px `red` border, plain message and a retry action. A database error shows a banner at the top of the app, and the app stays usable.

## 7. Screens

**Today**
- Title: today's real date, for example "Thursday, 12 Nov".
- Left: "Needs your attention" list. Rows: drafts to review, applications closing soon, follow-ups due, weakest interview skill. Each row has one action button.
- Right: "This week" with Applied, Interviews, Saved (plain numbers) and a 7-day strip with a dot on deadline days.

**Jobs**
- Table columns: Role, Company, Location, Closes, Fit.
- Left filter rail: role type, location, internship or full-time, closing soon.
- Search box above the table. Filters live in the URL.
- Row click opens the drawer. Buttons: Prepare application (primary), Save.
- Footer note: "Mock data."

**Prepare application**
- Two columns: "Your resume" and "Tailored for this role".
- Editable cover note below.
- Note: "Only facts from your profile are used."
- Collapsible "What the agent did".
- Sticky approval bar as defined above.

**Applications**
- Board columns: Saved, Drafted, Applied, Interview, Offer. "Awaiting approval" cards sit in Drafted with an amber tag.
- Compact cards: company, role, deadline tag.
- Top-right link "Activity log" opens a table: time, tool, action, status.

**Practice**
- Left: one question at a time, answer textarea, Submit button, Voice toggle (disabled, tooltip "Coming soon").
- Right: "Feedback" panel with 3 skills and one written line each, then "Next session will focus on: <weakest skill>".
- No charts or gauges.

**Profile**
- First run: resume upload with a short instruction.
- After parsing: sections for Education, Skills (plain tags), Projects, Experience, Target roles. An "Edit" link per section.
- Footer line: "Last parsed from <filename>."

## 8. Copy guidelines

- Use sentence case everywhere. No exclamation marks.
- Buttons are verbs: "Prepare application", "Approve and send", "Save draft".
- Say what happened: "Tailored resume for Backend Intern. 3 sections changed." not "Done!"
- Label demo content honestly: "Mock data", "Sample profile".
- Dates: "12 Nov 2026". Money: "₹25,000 / month" or "₹6 LPA".

## 9. Accessibility

- Every interactive element is keyboard reachable with a visible focus ring.
- Color is never the only signal: tags always include text.
- Drawers trap focus and close with Esc.
- Minimum click target 32px.
- Respect `prefers-reduced-motion`. Motion is limited to a 150ms fade on drawers and hover states.

## 10. Responsive

Desktop first (1280px and up). At under 1024px the sidebar collapses to icons. At under 768px show a notice: "CareerPilot works best on a larger screen." Do not spend time on mobile layouts.

## 11. Tailwind tokens

```js
// tailwind.config.ts (excerpt)
export default {
  theme: {
    extend: {
      colors: {
        canvas: '#FAF9F6',
        surface: '#FFFFFF',
        line: '#E7E5E0',
        ink: '#1A1A1A',
        muted: '#6B6860',
        accent: { DEFAULT: '#1E5B4A', soft: '#E8F0ED' },
        amber: { DEFAULT: '#B7791F', soft: '#FBF3E2' },
        red: { DEFAULT: '#B42318', soft: '#FDECEA' },
      },
      fontFamily: {
        serif: ['Newsreader', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: { DEFAULT: '8px' },
      boxShadow: { none: 'none' },
    },
  },
}
```

## 12. Definition of done for any screen

- Uses only the tokens above, no hard-coded colors.
- No forbidden styles or phrases.
- Has loading, empty and error states.
- All data comes from the API, nothing hard-coded.
- Keyboard navigable.
- Matches the layout described in section 7.