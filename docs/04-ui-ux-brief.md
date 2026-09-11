# UI/UX Design Brief

## 1. Experience Goal
- Desired feeling: Calm, clean, and satisfying to check things off in — encouraging, never guilt-inducing.
- Three visual adjectives: Soft, rounded, airy.
- What the design must avoid: Clutter, harsh alarm colors (especially red for missed items), anything that feels corporate/clinical, sharp/angular shapes.

## 2. Users and Context
- Primary user: The builder and a small circle of friends/classmates, checking in throughout the day, often on a phone browser.
- Device and environment: Mobile browser primarily, desktop secondarily.
- Accessibility needs: Sufficient contrast on the light blue/cyan palette; large enough tap targets for daily-use actions (check-ins, timer controls).

## 3. Visual Direction
- Color palette and roles: Background: very light blue-white (#F0F9FF). Primary accent (buttons, active states, "completed"): cyan/light blue (#22D3EE or #38BDF8). Secondary accent (success/streak highlights): soft teal/mint (#5EEAD4). Priority colors kept soft/muted (e.g. muted coral for high, soft amber for medium, soft blue for low) — never harsh alarm red. Text: dark slate (#1E293B), not pure black, to stay soft.
- Typography: Rounded-letterform sans-serif (e.g. "Inter," "Poppins," or "Nunito") throughout — headers slightly bolder, body text regular weight.
- Icon direction: Minimal, simple line or soft-filled icons only where they add clarity (checkmarks, streak flame, timer icon) — no decorative icon clutter.
- Image or illustration direction: None needed — this is a utility app; keep focus on data and interaction, not decoration.
- Surface and border treatment: Rounded cards (16-20px radius) with soft, subtle shadows or thin borders — no glassmorphism, no heavy drop shadows.

## 4. Layout System
- Content width: Mobile-first, single column; centers to a comfortable max-width (~500-600px) on desktop rather than stretching full-width.
- Grid: Vertical stacks of rounded cards on most screens; a simple table on Admin Panel; a 7-column grid for the habit history view.
- Spacing scale: 4px base unit (4/8/16/24/32).
- Section rhythm: Persistent nav -> page header -> primary content cards -> (where relevant) a floating "+" action button.
- Responsive breakpoints: One primary breakpoint (~768px) — mobile shows stacked single-column content and a bottom/hamburger nav; desktop shows the same content centered with a top or side nav.

## 5. Component Language

### Buttons
- Primary: large, pill-shaped (fully rounded), solid cyan fill, white text.
- Secondary: pill-shaped, outlined or text-only, muted grey/blue.
- States: default, hover (slightly darker fill), focus (visible ring), disabled (reduced opacity), loading (label changes to an in-progress phrase, e.g. "Saving...").

### Inputs
- Rounded pill or soft-rounded rectangle text fields, light border, cyan focus ring.
- Error state: soft red-tinted border and a small inline message below the field (muted, not alarming).

### Cards
- Rounded (16-20px radius), light background slightly lifted from the page background, generous internal padding.

### Checkboxes / Toggles
- Large, rounded/circular tap targets; fills with cyan/teal when checked, with a brief satisfying transition.

### Priority dots / badges
- Small rounded pills or dots, using the soft priority color palette (coral/amber/blue), always paired with text where priority matters (not color alone).

### Charts
- Pie charts: cyan/teal for "completed," light grey for "missed" — soft, no harsh outlines.
- Line/bar charts: single cyan/teal line or bars, rounded bar tops, minimal gridlines.

### Nav bar
- Persistent, rounded icons/labels for Dashboard, Habits, Todos, Timer, Journal, Leaderboard, (Admin if applicable), Logout — consistent placement across all logged-in screens.

## 6. Screen Direction
(See `08-ui-page-prompts.md` for full per-screen generation prompts — this section summarizes the shared direction those prompts follow.)
- Login / Create Account: centered minimal card, no distractions.
- Dashboard: the most information-dense screen, but organized into clearly separated rounded sections (habits, todos, leftovers) so it doesn't feel cluttered.
- Habit Detail: streak numbers most prominent (top), history grid and charts below.
- Timer: the most stripped-down screen — large countdown ring, minimal surrounding UI.
- Admin Panel: same rounded/light-blue language, but slightly more "data table" in feel — the one screen allowed to look a bit more utilitarian.

## 7. Interaction and Motion
- Purposeful transitions: A satisfying brief animation (scale/fade) when checking off a habit or todo — this is the core "reward" moment throughout the app.
- Feedback moments: Streak numbers ticking up; a small positive animation at milestone streaks (7, 30, 100 days) as a nice touch; the timer's countdown ring filling/draining smoothly.
- Reduced-motion behavior: Respect `prefers-reduced-motion`, falling back to instant state changes.

## 8. Accessibility
- Contrast: Verify all text and the cyan accent meet WCAG AA against the light backgrounds used throughout.
- Keyboard use: All buttons, toggles, and form fields reachable and operable via keyboard.
- Focus states: Visible cyan focus ring on all interactive elements.
- Tap targets: Minimum 44x44px for check-in toggles and timer controls (the most-used actions).
- Text sizing: Base 16px minimum for body text; larger for streak numbers and the timer countdown.

## 9. Consistency Rules

### Always use
- The same cyan/teal accent for every "completed" or "positive" state across habits, todos, charts, and streaks
- Rounded shapes everywhere — no sharp corners on any interactive element
- Text labels alongside any color-coded status (priority, leftover, missed)

### Never use
- Harsh red/alarm styling for missed or incomplete items
- Sharp-cornered cards, buttons, or inputs
- Color as the sole indicator of state
