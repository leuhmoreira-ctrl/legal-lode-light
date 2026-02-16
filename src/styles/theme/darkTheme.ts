export const darkTheme = {
  // Backgrounds
  background: {
    primary: '#000000',      // --bg-primary
    secondary: '#1C1C1E',    // --bg-secondary
    tertiary: '#2C2C2E',     // --bg-tertiary
    hover: 'rgba(120, 120, 128, 0.24)', // --fill-tertiary
    active: 'rgba(120, 120, 128, 0.32)', // --fill-secondary
  },

  // Texts
  text: {
    primary: '#FFFFFF',      // --text-primary
    secondary: '#EBEBF5',    // --text-secondary
    tertiary: 'rgba(235, 235, 245, 0.6)', // --text-tertiary
    disabled: 'rgba(235, 235, 245, 0.3)', // --text-quaternary
    inverse: '#000000',
  },

  // Borders
  border: {
    light: 'rgba(255, 255, 255, 0.1)', // --separator
    medium: '#38383A',       // --separator-opaque
    strong: 'rgba(235, 235, 245, 0.3)', // Darker separator
    input: 'rgba(120, 120, 128, 0.24)', // Input border approx
  },

  // Surfaces
  surface: {
    card: '#1C1C1E',
    elevated: '#2C2C2E',     // --bg-tertiary
    input: 'rgba(120, 120, 128, 0.24)', // --fill-tertiary
    sidebar: 'rgba(30, 30, 30, 0.8)',
  },

  // Status
  status: {
    success: {
      bg: 'rgba(48, 209, 88, 0.2)',
      text: '#30D158',
      border: 'transparent',
    },
    warning: {
      bg: 'rgba(255, 159, 10, 0.2)',
      text: '#FF9F0A',
      border: 'transparent',
    },
    error: {
      bg: 'rgba(255, 69, 58, 0.2)',
      text: '#FF453A',
      border: 'transparent',
    },
  },

  // Accent (Apple Blue Dark)
  primary: {
    50: '#1e3a8a',
    100: '#1d4ed8',
    200: '#2563eb',
    500: '#0A84FF',          // Apple Blue Dark
    600: '#64D2FF',
    700: '#0066CC',
    800: '#0040A5',
  },

  // Shadows
  shadow: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 4px rgba(0, 0, 0, 0.2)',
    md: '0 4px 8px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3)',
    lg: '0 12px 24px rgba(0, 0, 0, 0.6), 0 4px 8px rgba(0, 0, 0, 0.4)',
    card: '0 2px 8px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)',
  }
};
