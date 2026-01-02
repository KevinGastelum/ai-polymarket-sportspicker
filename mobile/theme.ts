/**
 * PolyPick Mobile - Design System Theme
 * Matches the web app's GeoSales-inspired dark mode aesthetic
 */

export const theme = {
  // Base Palette (Deep Dark Mode)
  colors: {
    bgApp: '#0f1115',
    bgCard: '#1c1f26',
    bgCardHover: '#232730',
    
    // Neon Accents
    neonLime: '#ccff00',
    neonPink: '#ff00ff',
    neonCyan: '#00ffff',
    neonPurple: '#9d4edd',
    
    // Functional Colors
    textPrimary: '#ffffff',
    textSecondary: '#8b92a5',
    textTertiary: '#5d6474',
    
    // Borders
    borderSubtle: 'rgba(255, 255, 255, 0.06)',
    borderActive: 'rgba(255, 255, 255, 0.12)',
    
    // Status
    success: '#22c55e',
    error: '#ef4444',
    warning: '#f59e0b',
  },
  
  // Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  
  // Border Radius
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  
  // Typography
  fonts: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
    mono: 'Courier',
  },
  
  fontSize: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 20,
    xxl: 28,
    huge: 36,
  },
};

// Sport emoji helper
export const getSportEmoji = (sport: string): string => {
  const emojis: Record<string, string> = {
    nfl: '🏈',
    nba: '🏀',
    nhl: '🏒',
    mlb: '⚾',
    mma: '🥊',
    soccer: '⚽',
    other: '🎯',
  };
  return emojis[sport] || '🎯';
};

// Format confidence percentage
export const formatConfidence = (price: number): string => {
  return `${(price * 100).toFixed(1)}%`;
};
