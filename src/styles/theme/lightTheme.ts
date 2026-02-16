export const lightTheme = {
  // Backgrounds
  background: {
    primary: '#FFFFFF',      // --bg-primary
    secondary: '#F5F5F7',    // --bg-secondary
    tertiary: '#FAFAFA',     // --bg-tertiary
    hover: 'rgba(120, 120, 128, 0.08)', // --fill-quaternary (approx)
    active: 'rgba(120, 120, 128, 0.16)', // --fill-secondary (approx)
  },

  // Texts
  text: {
    primary: '#1D1D1F',      // --text-primary
    secondary: '#6E6E73',    // --text-secondary
    tertiary: '#86868B',     // --text-tertiary
    disabled: '#C7C7CC',     // --text-quaternary
    inverse: '#FFFFFF',
  },

  // Borders
  border: {
    light: 'rgba(0, 0, 0, 0.1)', // --separator
    medium: '#E5E5EA',       // --separator-opaque
    strong: '#C7C7CC',       // Darker separator
    input: 'rgba(120, 120, 128, 0.2)', // Input border approx
  },

  // Surfaces
  surface: {
    card: '#FFFFFF',
    elevated: '#FFFFFF',
    input: 'rgba(120, 120, 128, 0.12)', // --fill-tertiary
    sidebar: 'rgba(248, 249, 250, 0.8)',
  },

  // Status
  status: {
    success: {
      bg: 'rgba(52, 199, 89, 0.12)',
      text: '#34C759',
      border: 'transparent',
    },
    warning: {
      bg: 'rgba(255, 149, 0, 0.12)',
      text: '#FF9500',
      border: 'transparent',
    },
    error: {
      bg: 'rgba(255, 59, 48, 0.12)',
      text: '#FF3B30',
      border: 'transparent',
    },
  },

  // Accent (Apple Blue)
  primary: {
    50: '#E3F2FD', // Keep as fallback
    100: '#BBDEFB',
    200: '#90CAF9',
    500: '#007AFF',          // Apple Blue
    600: '#0066CC',
    700: '#0051D5',
    800: '#0040A5',
  },

  // Shadows
  shadow: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.04), 0 1px 4px rgba(0, 0, 0, 0.02)',
    md: '0 4px 8px rgba(0, 0, 0, 0.04), 0 2px 4px rgba(0, 0, 0, 0.02)',
    lg: '0 12px 24px rgba(0, 0, 0, 0.06), 0 4px 8px rgba(0, 0, 0, 0.03)',
    card: '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
  }
};
