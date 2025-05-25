// Consistent spacing system for the application
export const spacing = {
  // Base spacing units (in rem)
  xs: "0.25rem",    // 4px
  sm: "0.5rem",     // 8px
  md: "1rem",       // 16px
  lg: "1.5rem",     // 24px
  xl: "2rem",       // 32px
  "2xl": "3rem",    // 48px
  "3xl": "4rem",    // 64px
  "4xl": "6rem",    // 96px
  "5xl": "8rem",    // 128px
} as const

// Component spacing presets
export const componentSpacing = {
  // Card spacing
  card: {
    padding: "1.5rem",      // 24px
    gap: "1rem",            // 16px
    marginBottom: "1.5rem", // 24px
  },
  
  // Form spacing
  form: {
    fieldGap: "1.5rem",     // 24px
    labelGap: "0.5rem",     // 8px
    buttonMargin: "2rem",   // 32px
  },
  
  // Layout spacing
  layout: {
    sectionGap: "4rem",     // 64px
    containerPadding: "2rem", // 32px
    headerHeight: "4rem",   // 64px
    footerPadding: "3rem",  // 48px
  },
  
  // Dashboard spacing
  dashboard: {
    widgetGap: "1.5rem",    // 24px
    sectionGap: "2rem",     // 32px
    chartPadding: "1rem",   // 16px
  },
  
  // Navigation spacing
  nav: {
    itemGap: "1rem",        // 16px
    padding: "0.75rem",     // 12px
    margin: "0.5rem",       // 8px
  },
} as const

// Responsive spacing utilities
export const responsiveSpacing = {
  // Mobile-first responsive spacing
  mobile: {
    container: "1rem",      // 16px
    section: "2rem",        // 32px
    component: "1rem",      // 16px
  },
  
  // Tablet spacing
  tablet: {
    container: "1.5rem",    // 24px
    section: "3rem",        // 48px
    component: "1.5rem",    // 24px
  },
  
  // Desktop spacing
  desktop: {
    container: "2rem",      // 32px
    section: "4rem",        // 64px
    component: "2rem",      // 32px
  },
} as const

// Typography spacing
export const typographySpacing = {
  // Line heights
  lineHeight: {
    tight: "1.25",
    normal: "1.5",
    relaxed: "1.75",
    loose: "2",
  },
  
  // Letter spacing
  letterSpacing: {
    tight: "-0.025em",
    normal: "0",
    wide: "0.025em",
    wider: "0.05em",
    widest: "0.1em",
  },
  
  // Paragraph spacing
  paragraph: {
    marginBottom: "1rem",   // 16px
    firstChild: "0",        // No margin for first paragraph
  },
  
  // Heading spacing
  heading: {
    marginTop: "2rem",      // 32px
    marginBottom: "1rem",   // 16px
    firstChild: "0",        // No top margin for first heading
  },
} as const

// Animation spacing (timing and delays)
export const animationSpacing = {
  // Durations
  duration: {
    fast: "0.15s",
    normal: "0.3s",
    slow: "0.5s",
    slower: "0.8s",
  },
  
  // Delays for staggered animations
  stagger: {
    fast: "0.05s",
    normal: "0.1s",
    slow: "0.2s",
  },
  
  // Easing functions
  easing: {
    ease: "ease",
    easeIn: "ease-in",
    easeOut: "ease-out",
    easeInOut: "ease-in-out",
    bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
    smooth: "cubic-bezier(0.25, 0.25, 0.25, 0.75)",
  },
} as const

// Utility functions for consistent spacing
export const getSpacing = (size: keyof typeof spacing) => spacing[size]

export const getComponentSpacing = (component: keyof typeof componentSpacing) => 
  componentSpacing[component]

export const getResponsiveSpacing = (breakpoint: keyof typeof responsiveSpacing) => 
  responsiveSpacing[breakpoint]

// CSS custom properties for spacing
export const spacingCSSVars = {
  "--spacing-xs": spacing.xs,
  "--spacing-sm": spacing.sm,
  "--spacing-md": spacing.md,
  "--spacing-lg": spacing.lg,
  "--spacing-xl": spacing.xl,
  "--spacing-2xl": spacing["2xl"],
  "--spacing-3xl": spacing["3xl"],
  "--spacing-4xl": spacing["4xl"],
  "--spacing-5xl": spacing["5xl"],
} as const

// Tailwind spacing classes for consistency
export const spacingClasses = {
  // Padding classes
  padding: {
    xs: "p-1",      // 4px
    sm: "p-2",      // 8px
    md: "p-4",      // 16px
    lg: "p-6",      // 24px
    xl: "p-8",      // 32px
    "2xl": "p-12",  // 48px
    "3xl": "p-16",  // 64px
  },
  
  // Margin classes
  margin: {
    xs: "m-1",      // 4px
    sm: "m-2",      // 8px
    md: "m-4",      // 16px
    lg: "m-6",      // 24px
    xl: "m-8",      // 32px
    "2xl": "m-12",  // 48px
    "3xl": "m-16",  // 64px
  },
  
  // Gap classes for flexbox/grid
  gap: {
    xs: "gap-1",    // 4px
    sm: "gap-2",    // 8px
    md: "gap-4",    // 16px
    lg: "gap-6",    // 24px
    xl: "gap-8",    // 32px
    "2xl": "gap-12", // 48px
    "3xl": "gap-16", // 64px
  },
} as const
