---
name: Calm Progress
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#3f4850'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#707881'
  outline-variant: '#bfc7d2'
  surface-tint: '#006398'
  primary: '#006194'
  on-primary: '#ffffff'
  primary-container: '#007bb9'
  on-primary-container: '#fdfcff'
  inverse-primary: '#93ccff'
  secondary: '#006a61'
  on-secondary: '#ffffff'
  secondary-container: '#86f2e4'
  on-secondary-container: '#006f66'
  tertiary: '#545d62'
  on-tertiary: '#ffffff'
  tertiary-container: '#6d767b'
  on-tertiary-container: '#fbfdff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cce5ff'
  primary-fixed-dim: '#93ccff'
  on-primary-fixed: '#001d31'
  on-primary-fixed-variant: '#004b73'
  secondary-fixed: '#89f5e7'
  secondary-fixed-dim: '#6bd8cb'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#005049'
  tertiary-fixed: '#dbe4ea'
  tertiary-fixed-dim: '#bfc8ce'
  on-tertiary-fixed: '#141d21'
  on-tertiary-fixed-variant: '#3f484d'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
typography:
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.03em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.25rem
  space-xl: 1.75rem
---

## Brand & Style

This design system delivers an encouraging, clutter-free environment designed to make personal growth feel effortless and calm. Targeted primarily at everyday mobile web users looking to cultivate healthy daily routines, the interface prioritizes psychological comfort, eliminating anxiety and visual noise from task tracking. 

The aesthetic is clean, modern, and gentle—blending tactile softness with functional minimalism. Visual weight is kept airy and breathable through generous negative space, gentle pastel backgrounds, ultra-rounded forms, and quiet interactions that celebrate incremental success with subtle, uplifting feedback.

## Colors

The palette is engineered around refreshing atmospheric blues and positive botanical teals to foster motivation without urgency:

- **Primary Accent (`#0284C7`)**: Anchors critical active states, active tab navigation, and primary CTAs, with `#38BDF8` used for high-visibility highlights and `#E0F2FE` for primary tonal fills.
- **Secondary / Success (`#0D9488`)**: Dedicated to habit completion, checkmarks, streak counts, and progress confirmations. Accompanied by `#2DD4BF` for vibrant badges and `#CCFBF1` for soft completion rings.
- **Surfaces & Canvases**: Canvas background sits at `#F0F9FF` (sky-tinted white), with cards and elevated elements floating on `#FFFFFF`. Subdued inner containers employ `#F8FAFC`.
- **Text & Hierarchy**: Primary typography is rendered in `#1E293B` (deep slate) to preserve contrast without the harshness of `#000000`. Secondary metadata, streak timestamps, and placeholders use `#64748B`. Subtle structural dividers utilize `#E2E8F0`.

## Typography

Typography relies uniformly on **Plus Jakarta Sans** for its humanist clarity, rounded geometric aperture, and welcoming rhythm. 

- **Display & Headlines**: Generous weights (`600` and `700`) paired with subtle negative tracking ground page headers and numerical habit stats with a friendly, modern presence.
- **Body & Captions**: Regular weight (`400`) handles descriptions, notes, and checklist items with relaxed line heights for effortless scanning.
- **Microcopy & Indicators**: Semi-bold labels (`600`) ensure small metadata, frequency tags, and progress chips remain legible against colored badges and tinted backgrounds.

## Layout & Spacing

Designed primarily for mobile web experiences, the layout operates on a flexible vertical stack model constrained to a maximum content width of 480px on larger viewports.

- **Canvas Boundaries**: A standard outer gutter and margin of `1rem` (16px) cushions all screen edges, providing clean separation between cards and the browser viewport.
- **Rhythm**: Vertical content stacks use `space-md` (16px) between sequential habit items and `space-xl` (28px) between daily sections or completion categories.
- **Bottom Clearance**: Habit lists incorporate an extended bottom offset of at least `80px` to clear mobile navigation bars and floating quick-add triggers.

## Elevation & Depth

Hierarchy is established predominantly through soft surface contrast rather than intense physical drop shadows:

- **Flat Elevated Level**: Default habit cards sit flat on pure white (`#FFFFFF`) against the `#F0F9FF` background, bounded by a featherweight border (`1px solid #E0F2FE`).
- **Floating Surfaces & Modals**: Active floating elements (bottom sheets, primary action bars) utilize an ambient tinted shadow: `0 8px 24px -4px rgba(2, 132, 199, 0.08), 0 2px 6px -1px rgba(30, 41, 59, 0.04)`.
- **Completed Depth**: Marked-complete habits collapse their elevation slightly, shifting from white backgrounds to soft translucent mint/teal tint (`#F0FDFA`) with zero shadow, providing visual calmness.

## Shapes

The design system enforces an ultra-curved silhouette across all touchpoints to convey warmth and low-friction ergonomics:

- **Cards & Containers**: Habit cards, statistic summaries, and modal sheets carry a curvature of `1.25rem` (20px) to `1.5rem` (24px).
- **Buttons, Pills & Toggles**: Interactive triggers, day selectors, state filters, and text inputs employ fully pill-shaped perimeters (`rounded-full`, 9999px).
- **Check Targets**: Completion hit targets use circular or squircle frames (`rounded-full`) to reward tapping with an organic, satisfying visual snap.

## Components

- **Buttons**: Rendered in full pill-shape (`rounded-full`). Primary buttons feature a `#0284C7` fill with white text and active depression feedback. Secondary buttons use a `#E0F2FE` soft sky tint with `#0284C7` typography.
- **Habit Cards**: Enclosed in pure white surfaces with `20px` corner radii and a `1px` border of `#E0F2FE`. Each card houses habit metadata on the left and a prominent circular completion target on the right.
- **Checkboxes / Completion Targets**: Circular touch targets (minimum 44x44px). Unchecked state features an empty circle with a light slate boundary (`#CBD5E1`). Completed state animates into a solid `#0D9488` fill with a crisp white checkmark.
- **Chips & Day Selectors**: Pill-shaped status tags (`rounded-full`). Unselected days present as small muted bubbles (`#F1F5F9`); active/streak days populate in bright `#E0F2FE` or `#CCFBF1` with corresponding primary or secondary text.
- **Input Fields**: Habit creation fields feature pill-shaped styling (`rounded-full`) with a soft `#F8FAFC` fill, `1px solid #E2E8F0`, and text inset by `1.25rem`. Focused fields shift their border to `#38BDF8` with an ambient cyan glow.
- **Progress Trackers & Streaks**: Continuous progress bars feature full-radius ends with a light cyan track and a vibrant teal fill. Habit streak badges combine a subtle flame or lightning glyph with numeric count inside a `#CCFBF1` pill container.