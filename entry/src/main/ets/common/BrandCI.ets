export class BrandBadge {
  static readonly GREEN_BG: string = '#0D2D22';
  static readonly GREEN_TEXT: string = '#00E5A0';
  static readonly RED_BG: string = '#2D0D16';
  static readonly RED_TEXT: string = '#FF3D71';
  static readonly PURPLE_BG: string = '#1D0D2D';
  static readonly PURPLE_TEXT: string = '#8B5CF6';
  static readonly GOLD_BG: string = '#2D2A0D';
  static readonly GOLD_TEXT: string = '#F0B90B';
  static readonly BLUE_BG: string = '#0D1A2D';
  static readonly BLUE_TEXT: string = '#00D4FF';
  static readonly CYAN_BG: string = '#0D2D2D';
  static readonly CYAN_TEXT: string = '#00B4D8';
}

export class BrandPalette {
  static readonly PRIMARY: string = '#00E5A0';
  static readonly PRIMARY_DARK: string = '#00C98A';
  static readonly PRIMARY_LIGHT: string = '#33FFBE';
  static readonly SECONDARY: string = '#00B4D8';
  static readonly ACCENT: string = '#8B5CF6';
  static readonly GOLD: string = '#F0B90B';
  static readonly GOLD_LIGHT: string = '#FFD54F';
  static readonly CYBER_RED: string = '#FF3D71';
  static readonly NEON_BLUE: string = '#00D4FF';
  static readonly DEEP_BG: string = '#0A0E1A';
  static readonly CARD_BG: string = '#131929';
  static readonly CARD_BG_HOVER: string = '#1A2340';
  static readonly SURFACE: string = '#1E2A4A';
  static readonly DIVIDER: string = '#1C2E4A';
  static readonly TEXT_PRIMARY: string = '#E8ECF1';
  static readonly TEXT_SECONDARY: string = '#8899AA';
  static readonly TEXT_MUTED: string = '#5A6B7F';
  static readonly SHADOW_COLOR: string = '#0A0E1A';
  static readonly SEAL_RED: string = '#C94040';
  static readonly SEAL_RED_DARK: string = '#8B2020';
  static readonly JADE: string = '#2D8B56';
  static readonly JADE_DARK: string = '#1A5E38';
}

export class BrandSeal {
  static readonly SEAL_BG: string = '#C9404020';
  static readonly SEAL_BORDER: string = '#C9404066';
  static readonly SEAL_TEXT: string = '#C94040';
  static readonly SEAL_INNER_BG: string = '#C9404010';
  static readonly KNOB_COLOR: string = '#8B6B3E';
  static readonly KNOB_HIGHLIGHT: string = '#C9A86C';
  static readonly KNOB_SHADOW: string = '#5A4428';
  static readonly STAMP_SIZE: number = 64;
  static readonly STAMP_BORDER_WIDTH: number = 2;
  static readonly STAMP_INNER_PADDING: number = 4;
  static readonly STAMP_LETTER_SPACING: number = 4;
}

export class BrandGradient {
  static readonly HERO_COLORS: string[][] = [['#0A0E1A', 0.0], ['#0D1B3E', 0.4], ['#131929', 1.0]];
  static readonly HERO_DIRECTION: GradientDirection = GradientDirection.Bottom;
  static readonly VALUE_COLORS: string[][] = [['#8B5CF6', 0.0], ['#6366F1', 0.5], ['#00B4D8', 1.0]];
  static readonly VALUE_DIRECTION: GradientDirection = GradientDirection.Right;
  static readonly WALLET_COLORS: string[][] = [['#00E5A0', 0.0], ['#00B4D8', 1.0]];
  static readonly WALLET_DIRECTION: GradientDirection = GradientDirection.Right;
  static readonly SEAL_COLORS: string[][] = [['#C94040', 0.0], ['#8B2020', 0.6], ['#5A1010', 1.0]];
  static readonly SEAL_DIRECTION: GradientDirection = GradientDirection.Right;
  static readonly JADE_COLORS: string[][] = [['#2D8B56', 0.0], ['#1A5E38', 1.0]];
  static readonly JADE_DIRECTION: GradientDirection = GradientDirection.Right;
  static readonly KNOB_GLOW_RADIUS: number = 16;
  static readonly KNOB_GLOW_COLOR: string = '#C9A86C44';
  static readonly PRIMARY_GLOW_RADIUS: number = 20;
  static readonly PRIMARY_GLOW_COLOR: string = '#00E5A044';
  static readonly ACCENT_GLOW_RADIUS: number = 16;
  static readonly ACCENT_GLOW_COLOR: string = '#8B5CF633';
  static readonly GOLD_GLOW_RADIUS: number = 16;
  static readonly GOLD_GLOW_COLOR: string = '#F0B90B33';
}

export class BrandTypography {
  static readonly HERO_TITLE: number = 36;
  static readonly PAGE_TITLE: number = 24;
  static readonly SECTION_TITLE: number = 18;
  static readonly CARD_TITLE: number = 16;
  static readonly BODY: number = 14;
  static readonly CAPTION: number = 12;
  static readonly MICRO: number = 10;
  static readonly LETTER_SPACING_HERO: number = 6;
  static readonly LETTER_SPACING_TITLE: number = 2;
  static readonly SEAL_TITLE: number = 28;
  static readonly SEAL_SUBTITLE: number = 14;
}

export class BrandRadius {
  static readonly SM: number = 6;
  static readonly MD: number = 10;
  static readonly CARD: number = 14;
  static readonly LG: number = 16;
  static readonly PILL: number = 999;
  static readonly SEAL: number = 12;
  static readonly KNOB: number = 8;
}

export class BrandSpacing {
  static readonly XS: number = 4;
  static readonly SM: number = 8;
  static readonly MD: number = 12;
  static readonly LG: number = 16;
  static readonly XL: number = 24;
  static readonly XXL: number = 32;
  static readonly PAGE_H: number = 16;
}

export class BrandAnimation {
  static readonly DURATION_FAST: number = 150;
  static readonly DURATION_NORMAL: number = 300;
  static readonly DURATION_SLOW: number = 500;
  static readonly CURVE_SPRING: string = 'spring(1, 1, 0.5, 1)';
  static readonly CURVE_EASE: string = 'ease-in-out';
  static readonly PULSE_SCALE: number = 1.05;
  static readonly PRESSED_SCALE: number = 0.97;
  static readonly GLOW_REPEAT: number = -1;
  static readonly GLOW_DURATION: number = 2000;
}

export class BrandIcon {
  static readonly SEAL_GLYPH: string = '\u9F9F';
  static readonly KNOB_SYMBOL: string = '\u5370';
  static readonly STAMP_VERIFIED: string = '\u2713';
  static readonly CHAIN_LINK: string = '\u26D3';
  static readonly WALLET_SYMBOL: string = '\u00A5';
  static readonly AI_SYMBOL: string = '\u2728';
  static readonly TASK_SYMBOL: string = '\u2611';
}

export class BrandPattern {
  static readonly GRID_OPACITY: number = 0.03;
  static readonly GRID_SIZE: number = 20;
  static readonly SCAN_LINE_SPEED: number = 3000;
  static readonly PARTICLE_COUNT: number = 6;
  static readonly PARTICLE_SIZE_MIN: number = 2;
  static readonly PARTICLE_SIZE_MAX: number = 6;
}

export class BrandSlogan {
  static readonly PRIMARY: string = '龟钮铸规 · 自驭成道';
  static readonly SECONDARY: string = '汽车资讯AI · 自主价值引擎';
  static readonly EN: string = 'GUINIU ZIYU AUTO AGENT';
  static readonly VERSION: string = 'v3.6.0';
}
