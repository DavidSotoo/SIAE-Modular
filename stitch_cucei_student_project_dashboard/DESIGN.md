---
name: Academic Precision
colors:
  surface: '#f8f9ff'
  surface-dim: '#ccdbf3'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e6eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d5e3fc'
  on-surface: '#0d1c2e'
  on-surface-variant: '#43474f'
  inverse-surface: '#233144'
  inverse-on-surface: '#eaf1ff'
  outline: '#737780'
  outline-variant: '#c3c6d1'
  surface-tint: '#3a5f94'
  primary: '#001e40'
  on-primary: '#ffffff'
  primary-container: '#003366'
  on-primary-container: '#799dd6'
  inverse-primary: '#a7c8ff'
  secondary: '#566068'
  on-secondary: '#ffffff'
  secondary-container: '#dae4ee'
  on-secondary-container: '#5c666e'
  tertiary: '#1c1f20'
  on-tertiary: '#ffffff'
  tertiary-container: '#313435'
  on-tertiary-container: '#9a9c9d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d5e3ff'
  primary-fixed-dim: '#a7c8ff'
  on-primary-fixed: '#001b3c'
  on-primary-fixed-variant: '#1f477b'
  secondary-fixed: '#dae4ee'
  secondary-fixed-dim: '#bec8d1'
  on-secondary-fixed: '#131d24'
  on-secondary-fixed-variant: '#3e4850'
  tertiary-fixed: '#e1e3e4'
  tertiary-fixed-dim: '#c5c7c8'
  on-tertiary-fixed: '#191c1d'
  on-tertiary-fixed-variant: '#454748'
  background: '#f8f9ff'
  on-background: '#0d1c2e'
  surface-variant: '#d5e3fc'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 64px
  container-max: 1280px
  gutter: 24px
---

## Brand & Style

The design system is engineered for a university institutional environment, prioritizing clarity, authority, and accessibility. The brand personality is academic and established, yet forward-looking, avoiding the cold sterility of corporate design or the density of traditional government portals.

The visual style follows a **Modern Institutional** approach:
- **Clarity over Decoration:** Whitespace is used as a functional tool to reduce cognitive load during complex administrative tasks.
- **Subtle Depth:** The interface uses soft layering and light-sourced shadows to define hierarchy, moving away from flat design into a more tactile, trustworthy space.
- **Human-Centric:** While professional, the UI maintains an approachable feel through soft geometry and legible, high-contrast typography.

## Colors

The palette is anchored by an **Institutional Blue (#003366)**, representing stability and academic rigor. This is the primary color for navigation, key actions, and headings.

- **Primary:** Used for high-emphasis buttons, active states, and structural headers.
- **Secondary:** A tinted blue used for background highlights, subtle banners, and soft button states.
- **Accents:** Soft Green (#D1FAE5 background with #065F46 text) and Soft Orange (#FFEDD5 background with #9A3412 text) are reserved for feedback loops like successful submissions or pending alerts.
- **Neutrals:** A range of Slate grays provides legibility for body text and subtle borders.

## Typography

This design system utilizes **Inter** across all roles to ensure maximum legibility and a systematic, modern feel. 

- **Headlines:** Use tighter letter-spacing and semi-bold weights to create a strong visual anchor.
- **Body:** Standardized at 16px for optimal readability in long-form academic content.
- **Labels:** Utilized for data visualization, table headers, and small UI hints, often employing medium or semi-bold weights to differentiate from body text.
- **Responsive Scaling:** Headline sizes drop significantly on mobile to maintain layout integrity without excessive wrapping.

## Layout & Spacing

The layout is based on a **12-column fluid grid** for desktop, transitioning to a **4-column grid** for mobile devices.

- **Desktop (1280px+):** Centered container with 40px outer margins and 24px gutters.
- **Tablet (768px - 1279px):** Content expands to 90% width with 24px margins.
- **Mobile (< 767px):** Single column flow with 16px margins to maximize screen real estate.

Spacing follows an 8px rhythm (base-2). Use `lg` (40px) and `xl` (64px) for vertical section spacing to ensure the "generous whitespace" required for an institutional feel.

## Elevation & Depth

Visual hierarchy is established through a combination of **Tonal Layering** and **Ambient Shadows**.

- **Level 0 (Base):** The main background uses the tertiary color (#F8F9FA) to reduce glare.
- **Level 1 (Cards/Surface):** White (#FFFFFF) surfaces used for content containers. These use a very soft, diffused shadow: `0px 4px 12px rgba(0, 51, 102, 0.05)`.
- **Level 2 (Dropdowns/Modals):** Floating elements that require more focus. These use a deeper shadow: `0px 12px 32px rgba(0, 51, 102, 0.12)`.
- **Interactions:** Hover states on interactive cards should subtly lift by increasing the shadow spread and shifting 2px upward on the Y-axis.

## Shapes

The design system employs a **Rounded** shape language to soften the institutional nature of the interface.

- **Small Components (Buttons, Inputs):** Use `rounded` (0.5rem / 8px).
- **Medium Components (Cards, Modals):** Use `rounded-lg` (1rem / 16px).
- **Large Sections (Hero banners, Sidebars):** Use `rounded-xl` (1.5rem / 24px).
- **Icons:** Should be housed in circular or soft-square frames to maintain consistency with the rounded geometry.

## Components

### Buttons
- **Primary:** Solid Institutional Blue with white text. 12px vertical padding, 24px horizontal.
- **Secondary:** Secondary Blue background with Primary Blue text. No border.
- **Ghost:** Transparent background with Primary Blue text and a 1px border.

### Input Fields
- **Default:** White background, 1px border in Slate-200. Focus state uses a 2px Primary Blue border and a soft blue outer glow.
- **Labels:** Always positioned above the field in `label-md` style.

### Cards
- Used for course modules, student profiles, and news items.
- White background, 16px corner radius, Level 1 shadow.
- Padding should be generous (24px - 32px).

### Chips & Badges
- Used for status indicators (e.g., "Enrolled", "Pending").
- Soft-colored backgrounds (Success Green or Warning Orange) with high-contrast text.
- Fully rounded (pill-shaped) to distinguish them from buttons.

### Navigation
- **Sidebar:** For administrative SPAs, a persistent left-hand navigation in Primary Blue or very light Gray.
- **Top Bar:** Simple, clean breadcrumbs and user profile access.

### Iconography
- Use **Linear, consistent-weight icons** (e.g., Lucide or Phosphor). Avoid filled icons unless used for an active state in the navigation.