---
name: Academic Administrative Interface
colors:
  surface: '#f9f9fe'
  surface-dim: '#dad9de'
  surface-bright: '#f9f9fe'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f8'
  surface-container: '#eeedf2'
  surface-container-high: '#e8e8ed'
  surface-container-highest: '#e2e2e7'
  on-surface: '#1a1c1f'
  on-surface-variant: '#43474f'
  inverse-surface: '#2f3034'
  inverse-on-surface: '#f1f0f5'
  outline: '#737780'
  outline-variant: '#c3c6d1'
  surface-tint: '#3a5f94'
  primary: '#001e40'
  on-primary: '#ffffff'
  primary-container: '#003366'
  on-primary-container: '#799dd6'
  inverse-primary: '#a7c8ff'
  secondary: '#1b6b51'
  on-secondary: '#ffffff'
  secondary-container: '#a6f2d1'
  on-secondary-container: '#237157'
  tertiary: '#120071'
  on-tertiary: '#ffffff'
  tertiary-container: '#2100ad'
  on-tertiary-container: '#938fff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d5e3ff'
  primary-fixed-dim: '#a7c8ff'
  on-primary-fixed: '#001b3c'
  on-primary-fixed-variant: '#1f477b'
  secondary-fixed: '#a6f2d1'
  secondary-fixed-dim: '#8bd6b6'
  on-secondary-fixed: '#002116'
  on-secondary-fixed-variant: '#00513b'
  tertiary-fixed: '#e3dfff'
  tertiary-fixed-dim: '#c3c0ff'
  on-tertiary-fixed: '#100069'
  on-tertiary-fixed-variant: '#372abf'
  background: '#f9f9fe'
  on-background: '#1a1c1f'
  surface-variant: '#e2e2e7'
typography:
  section-title:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-main:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  button-text:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-padding: 40px
  gutter: 24px
---

## Brand & Style
This design system focuses on the "Safe" visual identity, delivering a highly legible and structured environment tailored for academic and administrative excellence. The brand personality is authoritative yet accessible, instilling confidence through systematic organization and adherence to institutional standards.

The design style is **Corporate / Modern**, leaning heavily into traditional academic structures while utilizing contemporary whitespace management. It prioritizes clarity, reliability, and functional utility, ensuring that complex data entry tasks—such as university profile management—feel manageable and dignified.

## Colors
The color palette is anchored by **Institutional Blue (#003366)**, serving as the primary driver for navigation, key actions, and branding elements. 

- **Primary:** Used for main buttons, active states, and structural headers.
- **Secondary (Emerald):** Dedicated specifically to "Soft Skills" sections to provide clear semantic categorization. Use the background tint for chip containers.
- **Tertiary (Indigo):** Reserved for "Areas of Interest," creating a distinct visual lane for academic preferences.
- **Neutral/Background:** A cool-toned off-white (`#f8f9ff`) provides enough contrast to make white surface cards (`#ffffff`) appear crisp and elevated.

## Typography
The system utilizes **Inter** exclusively to maintain a utilitarian and professional aesthetic. 

- **Section Titles:** Set at 20px with a semi-bold weight to anchor the user's eye at the start of new form groups.
- **Labels:** Positioned strictly above input fields at 14px with medium weight for immediate scanning.
- **Body Text:** Used for instructional microcopy and descriptions, optimized for long-form readability.
- **Text Contrast:** Ensure all text on white surfaces meets WCAG AA standards, using Primary Blue for headers and a dark slate for body text.

## Layout & Spacing
This design system follows a **Fixed Grid** approach for desktop, centering the form within a 1200px container to prevent excessive line lengths. 

- **Vertical Rhythm:** Use 32px (`xl`) spacing between major sections and 16px (`md`) between individual form fields.
- **Padding:** Form cards should utilize 32px of internal padding to create the requested "plenty of whitespace" feel.
- **Responsibility:** On mobile (below 768px), margins reduce to 16px and all grid-based columns collapse into a single-column stack.

## Elevation & Depth
The system uses **Tonal Layers** combined with **Ambient Shadows** to define hierarchy. 

- **Background:** Level 0 (`#f8f9ff`).
- **Cards/Surfaces:** Level 1 elevation uses a white background with a very soft, diffused shadow (`0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)`). 
- **Interactive Elements:** Buttons and active inputs may use a slightly more pronounced shadow on hover to indicate tactility, but generally remain flat to adhere to the academic "Safe" style.
- **Overlays:** Modals or dropdown menus use a higher elevation (Level 3) with a more significant blur radius to distinguish them from the underlying form.

## Shapes
The shape language is strictly defined to balance modern aesthetics with structural rigidity.

- **Standard Containers:** Cards, input fields, and text areas utilize a **0.5rem (8px)** corner radius.
- **Interactive Small Elements:** Chips and badges use a **Pill-shaped (999px)** radius to differentiate them from functional inputs.
- **Consistency:** All borders should be 1px in their default state, increasing to 2px for focus states to ensure high visibility and accessibility.

## Components

### Buttons
- **Primary:** Solid `#003366` fill with white text. 8px border radius.
- **Secondary:** Outline in `#003366` with a transparent background.

### Inputs & Selects
- Use a white background with a light grey border (`#e2e8f0`).
- Labels must be persistent above the field.
- Focused state: 2px border in `#003366` with a soft blue outer glow.

### Profile Chips
- **Unselected:** Transparent background with a 1px border matching the category primary color (Emerald for skills, Indigo for interests).
- **Selected:** Solid fill of the category primary color with white text.
- **Integrated Selectors:** For selected "Skill" chips, include a small dropdown or segmented control inside the chip (or immediately adjacent) to select "Basic, Intermediate, Advanced" levels.

### Cards
- White background, 8px radius, Elevation-1 shadow. 
- Use cards to group logical sections of the university profile (e.g., Personal Info, Academic History, Skills).

### Checkboxes & Radios
- Institutional Blue (`#003366`) for the checked state.
- Square with 4px radius for checkboxes; circular for radios.