export const darkTheme = {
  // Backgrounds
  background: {
    primary: '#0f172a',      // Main background (cards, modals) - derived from --card
    secondary: '#0f172a',    // Page background - derived from --background
    tertiary: '#1e293b',     // Sidebar, headers - approximated (slate-800)
    hover: '#1e293b',        // Hover states
    active: '#334155',       // Active states
  },

  // Texts
  text: {
    primary: '#f8fafc',      // Titles, main text - derived from --foreground
    secondary: '#cbd5e1',    // Subtitles, labels - approximated (slate-300)
    tertiary: '#94a3b8',     // Auxiliary text - approximated (slate-400)
    disabled: '#64748b',     // Disabled text - approximated (slate-500)
    inverse: '#0f172a',      // Text on light backgrounds
  },

  // Borders
  border: {
    light: '#1e293b',        // Subtle borders - derived from --border
    medium: '#334155',       // Standard borders
    strong: '#475569',       // Highlighted borders
    input: '#1e293b',        // Input borders - derived from --input
  },

  // Surfaces
  surface: {
    card: '#0f172a',         // Cards
    elevated: '#1e293b',     // Elevated elements
    input: '#0f172a',        // Inputs
    sidebar: '#0f172a',      // Sidebar - derived from --sidebar-background
  },

  // Status (using dark mode equivalents from urgency classes)
  status: {
    success: {
      bg: 'rgba(20, 83, 45, 0.3)',   // Success - background (green-900/30)
      text: '#4ade80',               // Success - text (green-400)
      border: 'rgba(20, 83, 45, 0.5)', // Success - border
    },
    warning: {
      bg: 'rgba(113, 63, 18, 0.3)',  // Warning - background (yellow-900/30)
      text: '#facc15',               // Warning - text (yellow-400)
      border: 'rgba(113, 63, 18, 0.5)', // Warning - border
    },
    error: {
      bg: 'rgba(127, 29, 29, 0.3)',  // Error - background (red-900/30)
      text: '#f87171',               // Error - text (red-400)
      border: 'rgba(127, 29, 29, 0.5)', // Error - border
    },
  },

  // Accent (System Blue - adjust for dark mode visibility if needed)
  primary: {
    50: '#1e3a8a',
    100: '#1d4ed8',
    200: '#2563eb',
    500: '#3b82f6',          // Primary - derived from --primary
    600: '#60a5fa',
    700: '#93c5fd',
    800: '#bfdbfe',
  },

  // Shadows (usually subtle or none in dark mode)
  shadow: {
    sm: 'none',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
    card: 'none',
  }
};
