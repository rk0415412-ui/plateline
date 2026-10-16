/**
 * PlateLine Bohemian Theme Tokens
 * PROJECT_RULES.md - Rule 17
 * Warm, earthy, hand-crafted Bohemian palette and styling.
 */

export const theme = {
  colors: {
    // 10 Locked Bohemian Colors
    terracotta: '#C1553B',
    deepRust: '#9E3D2A',
    ochre: '#D9A441',
    cream: '#F6EFE3',
    sand: '#FBF6EA',
    ink: '#4E3728',
    taupe: '#8C7462',
    rose: '#C98F7E',
    olive: '#8A8B6C',
    plum: '#5A3E4E',

    // Specific chips & highlights
    readingChipBg: '#F7E7C8',    // Ochre tint
    mealChipBg: '#F5DED5',       // Terracotta tint
    medicineMarker: '#C98F7E',   // Dusty rose
    inputBorder: '#8A8B6C',      // 1px olive border
    inputFocusBorder: '#D9A441', // Ochre on focus

    // Semantic mappings
    background: '#F6EFE3',       // Cream
    card: '#FBF6EA',             // Sand
    surface: '#FBF6EA',          // Sand
    surfaceSubtle: '#F1E8D7',    // Layered cream
    border: '#8A8B6C',           // Olive border
    borderSubtle: '#E6DAC7',     // Soft earth outline

    primary: '#C1553B',          // Terracotta
    primaryDark: '#9E3D2A',      // Deep rust
    primaryLight: '#C98F7E',     // Dusty rose
    accent: '#D9A441',           // Ochre
    accentMint: '#8A8B6C',       // Olive
    accentSky: '#5A3E4E',        // Plum

    textPrimary: '#4E3728',      // Ink
    textSecondary: '#8C7462',    // Taupe
    textMuted: '#8C7462',        // Taupe

    tabInactive: '#8C7462',      // Taupe
    tabActive: '#C1553B',        // Terracotta
    tabBarBg: '#F6EFE3',         // Cream background
    footerBg: '#F6EFE3',         // Cream background
    footerText: '#8C7462',       // Taupe
    toastBg: '#8A8B6C',          // Olive
    toastText: '#4E3728',        // Ink
    modalBackdrop: 'rgba(90, 62, 78, 0.40)', // Plum-tinted 40% backdrop
  },

  radius: {
    cards: 18,
    buttons: 18,
    chips: 22,
    tiles: 20,
    modals: 20, // top corners
    full: 9999,
  },

  // Backward compatibility alias for borderRadius
  borderRadius: {
    sm: 10,
    md: 14,
    lg: 18,
    cards: 18,
    buttons: 18,
    chips: 22,
    tiles: 20,
    modals: 20,
    full: 9999,
  },

  shadow: {
    // Warm only: ink at 8-12% opacity, offset {0,3}, radius 10
    warm: {
      shadowColor: '#4E3728',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.10,
      shadowRadius: 10,
      elevation: 3,
    },
    // Soft ochre-tinted glow shadow for primary buttons
    ochreGlow: {
      shadowColor: '#D9A441',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 5,
    },
  },

  typography: {
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: '#4E3728',
    },
    sectionHeader: {
      fontSize: 16,
      fontWeight: '600',
      color: '#4E3728',
    },
    body: {
      fontSize: 15,
      color: '#4E3728',
    },
    caption: {
      fontSize: 13,
      color: '#8C7462',
    },
    statNumbers: {
      fontSize: 20,
      fontWeight: '700',
      color: '#C1553B',
    },
    // numeric shortcuts
    bodyLarge: 18,
    headingSmall: 20,
    headingMedium: 24,
    headingLarge: 28,
  },

  spacing: {
    screenPadding: 20,
    sectionGap: 16,
    listGap: 12,
    touchTargetMin: 48,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 20,
    xl: 24,
  },

  touchTarget: {
    minHeight: 48,
    largeButtonHeight: 52,
  },
};
