export type StoryBlockType = 'text' | 'image' | 'video';

export type ImageObjectFit = 'contain' | 'cover' | 'fill';

export interface StoryPageBackground {
  /** none = transparent / no fill */
  type: 'none' | 'preset' | 'color' | 'image';
  /** preset id, hex color, or image data URL / http URL */
  value: string;
}

export interface StoryBlock {
  id: string;
  type: StoryBlockType;
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex: number;
  content: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  fontWeight?: number | string;
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline';
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  /**
   * Soft fill behind a text block.
   * Use '' | 'transparent' | 'none' for no background.
   */
  blockBg?: string;
  /** How images fill their frame — default contain so art is not cropped */
  objectFit?: ImageObjectFit;
  /** Image/video frame fill behind the media */
  frameBg?: string;
  /** When false, image has no frame/background (transparent) */
  showFrameBg?: boolean;
}

export interface StoryPage {
  id: string;
  blocks: StoryBlock[];
  background?: StoryPageBackground;
}

export interface StoryLayout {
  /** Multi-page storybook (Canva-style). Always preferred. */
  pages: StoryPage[];
  /** @deprecated legacy single-page fields — migrated via normalizeStoryLayout */
  blocks?: StoryBlock[];
  background?: StoryPageBackground;
}

export interface VocabEntry {
  word: string;
  definition: string;
  example?: string;
}

export const STORY_FONT_OPTIONS = [
  { id: 'Fredoka, sans-serif', label: 'Fredoka (playful)' },
  { id: 'Nunito, sans-serif', label: 'Nunito (rounded)' },
  { id: '"Comic Neue", Comic Sans MS, cursive', label: 'Comic Neue' },
  { id: 'Outfit, sans-serif', label: 'Outfit' },
  { id: 'Georgia, "Times New Roman", serif', label: 'Georgia (classic)' },
] as const;

export const STORY_PAGE_PRESETS: { id: string; label: string; css: string }[] = [
  {
    id: 'sunny',
    label: 'Sunny Meadow',
    css: 'radial-gradient(ellipse 80% 60% at 20% 0%, #fef08a 0%, transparent 55%), radial-gradient(ellipse 70% 50% at 90% 10%, #fdba74 0%, transparent 50%), linear-gradient(180deg, #fff7ed 0%, #ffedd5 40%, #bbf7d0 100%)',
  },
  {
    id: 'sky',
    label: 'Soft Sky',
    css: 'radial-gradient(ellipse 90% 50% at 50% 0%, #ffffff 0%, transparent 55%), linear-gradient(180deg, #bae6fd 0%, #e0f2fe 45%, #fef9c3 100%)',
  },
  {
    id: 'candy',
    label: 'Candy Pastel',
    css: 'radial-gradient(circle at 15% 20%, #fbcfe8 0%, transparent 40%), radial-gradient(circle at 85% 15%, #c4b5fd 0%, transparent 42%), linear-gradient(160deg, #fce7f3 0%, #ede9fe 50%, #dbeafe 100%)',
  },
  {
    id: 'ocean',
    label: 'Ocean Foam',
    css: 'radial-gradient(ellipse 100% 40% at 50% 100%, #67e8f9 0%, transparent 55%), linear-gradient(180deg, #ecfeff 0%, #a5f3fc 50%, #67e8f9 100%)',
  },
  {
    id: 'night',
    label: 'Story Night',
    css: 'radial-gradient(1.5px 1.5px at 20% 30%, #fff 0%, transparent 100%), radial-gradient(1px 1px at 70% 20%, #fff 0%, transparent 100%), radial-gradient(1px 1px at 40% 70%, rgba(255,255,255,0.8) 0%, transparent 100%), linear-gradient(180deg, #1e1b4b 0%, #312e81 55%, #4c1d95 100%)',
  },
  {
    id: 'paper',
    label: 'Warm Paper',
    css: 'linear-gradient(180deg, #fffbeb 0%, #fef3c7 45%, #fde68a 100%)',
  },
];

export function createBlockId() {
  return `blk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function createPageId() {
  return `pg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function isTransparentFill(value?: string | null) {
  if (value == null) return true;
  const v = String(value).trim().toLowerCase();
  return v === '' || v === 'none' || v === 'transparent';
}

export function resolvePageBackground(bg?: StoryPageBackground): string {
  if (!bg || bg.type === 'none' || !bg.value) {
    return 'transparent';
  }
  if (bg.type === 'preset') {
    return STORY_PAGE_PRESETS.find((p) => p.id === bg.value)?.css || STORY_PAGE_PRESETS[0].css;
  }
  if (bg.type === 'color') {
    return bg.value;
  }
  if (bg.type === 'image') {
    return `center / cover no-repeat url("${bg.value.replace(/"/g, '\\"')}")`;
  }
  return 'transparent';
}

export function createDefaultBlock(type: StoryBlockType, content = ''): StoryBlock {
  const defaults: Record<StoryBlockType, Partial<StoryBlock>> = {
    text: {
      w: 46,
      h: 42,
      content: content || 'Once upon a time…',
      fontSize: 18,
      fontFamily: 'Fredoka, sans-serif',
      color: '#3b2f2f',
      fontWeight: 600,
      textAlign: 'left',
      blockBg: 'rgba(255,255,255,0.72)',
    },
    image: {
      w: 40,
      h: 42,
      content: '',
      objectFit: 'contain',
      showFrameBg: true,
      frameBg: 'rgba(255,255,255,0.55)',
    },
    video: { w: 45, h: 32, content: '', showFrameBg: true, frameBg: 'rgba(255,255,255,0.45)' },
  };
  const d = defaults[type];
  return {
    id: createBlockId(),
    type,
    x: type === 'image' ? 52 : 6,
    y: 18,
    w: d.w!,
    h: d.h!,
    zIndex: 1,
    content: d.content || '',
    fontSize: d.fontSize,
    fontFamily: d.fontFamily,
    color: d.color,
    fontWeight: d.fontWeight,
    textAlign: d.textAlign,
    blockBg: d.blockBg,
    objectFit: d.objectFit,
    showFrameBg: d.showFrameBg,
    frameBg: d.frameBg,
  };
}

export function createBlankPage(partial?: Partial<StoryPage>): StoryPage {
  return {
    id: createPageId(),
    blocks: [createDefaultBlock('text'), createDefaultBlock('image')],
    background: { type: 'preset', value: 'sunny' },
    ...partial,
  };
}

/** Migrate legacy single-page layouts → pages[]. */
export function normalizeStoryLayout(layout?: StoryLayout | null): StoryLayout {
  if (!layout) {
    return { pages: [createBlankPage({ blocks: [createDefaultBlock('text')] })] };
  }

  if (Array.isArray(layout.pages) && layout.pages.length > 0) {
    return {
      pages: layout.pages.map((p) => ({
        id: p.id || createPageId(),
        blocks: Array.isArray(p.blocks) ? p.blocks : [],
        background: p.background || { type: 'preset', value: 'sunny' },
      })),
    };
  }

  // Legacy: top-level blocks
  if (Array.isArray(layout.blocks) && layout.blocks.length > 0) {
    return {
      pages: [{
        id: createPageId(),
        blocks: layout.blocks,
        background: layout.background || { type: 'preset', value: 'sunny' },
      }],
    };
  }

  return { pages: [createBlankPage({ blocks: [createDefaultBlock('text')] })] };
}

export function getActivePage(layout: StoryLayout, pageIndex = 0): StoryPage {
  const normalized = normalizeStoryLayout(layout);
  return normalized.pages[Math.min(Math.max(pageIndex, 0), normalized.pages.length - 1)];
}

/**
 * ══════════════════════════════════════════════════════════
 * Creative Storybook Auto-Layout
 * 6 distinct, visually designed page templates that rotate:
 *   Cover  — Full bleed image + dramatic title overlay
 *   Hero   — Giant image fills 70%, caption bar at bottom
 *   Split  — Magazine: 55% text + 42% image, chapter badge
 *   Flip   — Reversed: 42% image left + 55% text right
 *   Cinema — Text overlay centered on full-bleed image (dark bg)
 *   Video  — Text left + video spotlight slot right
 * ══════════════════════════════════════════════════════════
 */
export function layoutFromStoryContent(content: string, title?: string): StoryLayout {
  const PRESETS = ['candy', 'sunny', 'sky', 'ocean', 'paper', 'night'] as const;
  type PresetId = typeof PRESETS[number];
  const pages: StoryPage[] = [];

  const isDark = (p: PresetId) => p === 'night';
  const tc  = (p: PresetId) => isDark(p) ? '#e8e3ff' : '#2d1a4a';        // text color
  const tBg = (p: PresetId) => isDark(p) ? 'rgba(15,10,40,0.72)' : 'rgba(255,255,255,0.82)'; // text bg
  const iFg = (p: PresetId) => isDark(p) ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.45)'; // img frame

  const paragraphs = (content || '')
    .split(/\n+/).map(p => p.trim()).filter(Boolean);

  // ══════════════════════════════════════════════════════════
  // COVER — full-bleed image + dramatic title + decorative strip
  // ══════════════════════════════════════════════════════════
  const coverBg: StoryPageBackground = { type: 'preset', value: 'candy' };
  const coverBlocks: StoryBlock[] = [
    // Full bleed image behind everything
    { ...createDefaultBlock('image'), x: 0, y: 0, w: 100, h: 100, zIndex: 1, showFrameBg: false, objectFit: 'cover' },
    // Dark gradient overlay strip at bottom
    { ...createDefaultBlock('text', ''), x: 0, y: 60, w: 100, h: 40, zIndex: 2, blockBg: 'linear-gradient(to top, rgba(15,5,30,0.88) 0%, transparent 100%)', color: 'transparent', fontSize: 1, content: '' },
    // Main title — big and dramatic
    { ...createDefaultBlock('text', title || 'Story'), x: 5, y: 62, w: 90, h: 22, fontSize: 32, fontWeight: 900, textAlign: 'center', color: '#fff', blockBg: 'transparent', fontFamily: 'Fredoka, sans-serif', zIndex: 4 },
    // Decorative subtitle tag
    { ...createDefaultBlock('text', '✨ A Story Adventure ✨'), x: 20, y: 85, w: 60, h: 10, fontSize: 13, fontWeight: 700, textAlign: 'center', color: '#fde68a', blockBg: 'transparent', fontFamily: 'Fredoka, sans-serif', zIndex: 4 },
  ];
  pages.push({ id: createPageId(), blocks: coverBlocks, background: coverBg });

  // ══════════════════════════════════════════════════════════
  // Content pages — 6 rotating creative templates
  // ══════════════════════════════════════════════════════════
  const PER_PAGE = 2;
  let ci = 0; // content page index

  for (let i = 0; i < paragraphs.length; i += PER_PAGE) {
    const chunk = paragraphs.slice(i, i + PER_PAGE).join('\n\n');
    const preset: PresetId = PRESETS[(ci + 1) % PRESETS.length];
    const tmpl = ci % 6;
    ci++;

    let blocks: StoryBlock[] = [];
    const pageNum = ci;

    // ── TEMPLATE 0: HERO — giant image, text caption bar below ──
    if (tmpl === 0) {
      blocks = [
        { ...createDefaultBlock('image'), x: 2, y: 2, w: 96, h: 60, showFrameBg: true, frameBg: iFg(preset), objectFit: 'cover', zIndex: 2 },
        { ...createDefaultBlock('text', `Ch. ${pageNum}`), x: 3, y: 64, w: 12, h: 8, fontSize: 11, fontWeight: 900, textAlign: 'center', color: '#7c3aed', blockBg: 'rgba(237,233,254,0.9)', fontFamily: 'Fredoka, sans-serif', zIndex: 3 },
        { ...createDefaultBlock('text', chunk), x: 2, y: 64, w: 96, h: 33, fontSize: 16, fontWeight: 600, textAlign: 'left', color: tc(preset), blockBg: tBg(preset), fontFamily: 'Fredoka, sans-serif', zIndex: 3 },
      ];

    // ── TEMPLATE 1: MAGAZINE SPLIT — text 55% left + image 42% right + badge ──
    } else if (tmpl === 1) {
      blocks = [
        // Chapter badge decorative
        { ...createDefaultBlock('text', `📖 Chapter ${pageNum}`), x: 3, y: 3, w: 26, h: 7, fontSize: 11, fontWeight: 800, textAlign: 'center', color: isDark(preset) ? '#c4b5fd' : '#6d28d9', blockBg: isDark(preset) ? 'rgba(109,40,217,0.3)' : 'rgba(237,233,254,0.95)', fontFamily: 'Fredoka, sans-serif', zIndex: 4 },
        { ...createDefaultBlock('text', chunk), x: 3, y: 12, w: 53, h: 84, fontSize: 17, fontWeight: 600, textAlign: 'left', color: tc(preset), blockBg: tBg(preset), fontFamily: 'Fredoka, sans-serif', zIndex: 3 },
        { ...createDefaultBlock('image'), x: 58, y: 4, w: 40, h: 92, showFrameBg: true, frameBg: iFg(preset), objectFit: 'cover', zIndex: 3 },
      ];

    // ── TEMPLATE 2: FLIP — image 42% left + text 53% right + decorative quote mark ──
    } else if (tmpl === 2) {
      blocks = [
        { ...createDefaultBlock('image'), x: 2, y: 4, w: 40, h: 92, showFrameBg: true, frameBg: iFg(preset), objectFit: 'cover', zIndex: 3 },
        { ...createDefaultBlock('text', '"'), x: 44, y: 4, w: 10, h: 12, fontSize: 52, fontWeight: 900, textAlign: 'left', color: isDark(preset) ? 'rgba(196,181,253,0.5)' : 'rgba(109,40,217,0.2)', blockBg: 'transparent', fontFamily: 'Fredoka, sans-serif', zIndex: 2 },
        { ...createDefaultBlock('text', chunk), x: 44, y: 14, w: 53, h: 82, fontSize: 17, fontWeight: 600, textAlign: 'left', color: tc(preset), blockBg: tBg(preset), fontFamily: 'Fredoka, sans-serif', zIndex: 3 },
      ];

    // ── TEMPLATE 3: PANORAMA — wide image on top, text strips below ──
    } else if (tmpl === 3) {
      const [p1, p2] = chunk.split('\n\n');
      blocks = [
        { ...createDefaultBlock('image'), x: 2, y: 2, w: 96, h: 50, showFrameBg: true, frameBg: iFg(preset), objectFit: 'cover', zIndex: 2 },
        { ...createDefaultBlock('text', p1 || chunk), x: 2, y: 54, w: 58, h: 42, fontSize: 16, fontWeight: 600, textAlign: 'left', color: tc(preset), blockBg: tBg(preset), fontFamily: 'Fredoka, sans-serif', zIndex: 3 },
        { ...createDefaultBlock('text', p2 ? `💬 ${p2}` : `🌟 Page ${pageNum}`), x: 62, y: 54, w: 36, h: 42, fontSize: 15, fontWeight: 700, textAlign: 'center', fontStyle: 'italic', color: isDark(preset) ? '#c4b5fd' : '#5b21b6', blockBg: isDark(preset) ? 'rgba(91,33,182,0.35)' : 'rgba(237,233,254,0.92)', fontFamily: 'Fredoka, sans-serif', zIndex: 3 },
      ];

    // ── TEMPLATE 4: CINEMA — full-bleed image, text overlay with glass card ──
    } else if (tmpl === 4) {
      blocks = [
        { ...createDefaultBlock('image'), x: 0, y: 0, w: 100, h: 100, showFrameBg: false, objectFit: 'cover', zIndex: 1 },
        // Dark scrim
        { ...createDefaultBlock('text', ''), x: 0, y: 45, w: 100, h: 55, blockBg: 'rgba(5,3,20,0.65)', color: 'transparent', fontSize: 1, content: '', zIndex: 2 },
        { ...createDefaultBlock('text', chunk), x: 5, y: 48, w: 90, h: 47, fontSize: 17, fontWeight: 700, textAlign: 'center', color: '#f0ebff', blockBg: 'rgba(15,10,40,0.55)', fontFamily: 'Fredoka, sans-serif', zIndex: 4 },
        { ...createDefaultBlock('text', `✦ Scene ${pageNum} ✦`), x: 30, y: 92, w: 40, h: 7, fontSize: 11, fontWeight: 800, textAlign: 'center', color: '#fde68a', blockBg: 'transparent', fontFamily: 'Fredoka, sans-serif', zIndex: 4 },
      ];

    // ── TEMPLATE 5: VIDEO SPOTLIGHT — text left + video slot right ──
    } else {
      blocks = [
        { ...createDefaultBlock('text', `🎬 Watch & Read`), x: 55, y: 3, w: 42, h: 8, fontSize: 12, fontWeight: 800, textAlign: 'center', color: isDark(preset) ? '#fde68a' : '#92400e', blockBg: isDark(preset) ? 'rgba(180,120,0,0.3)' : 'rgba(254,243,199,0.95)', fontFamily: 'Fredoka, sans-serif', zIndex: 4 },
        { ...createDefaultBlock('text', chunk), x: 2, y: 4, w: 51, h: 92, fontSize: 17, fontWeight: 600, textAlign: 'left', color: tc(preset), blockBg: tBg(preset), fontFamily: 'Fredoka, sans-serif', zIndex: 3 },
        { ...createDefaultBlock('video'), x: 55, y: 13, w: 43, h: 83, showFrameBg: true, frameBg: isDark(preset) ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)', zIndex: 3, content: '' },
      ];
    }

    pages.push({ id: createPageId(), blocks, background: { type: 'preset', value: preset } });
  }

  // Fallback
  if (pages.length === 1) {
    pages.push({
      id: createPageId(),
      blocks: [
        { ...createDefaultBlock('text'), x: 3, y: 6, w: 52, h: 86 },
        { ...createDefaultBlock('image'), x: 57, y: 6, w: 40, h: 86, showFrameBg: true },
      ],
      background: { type: 'preset', value: 'sky' },
    });
  }

  return { pages };
}


export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Split text into plain + vocabulary matches (longest words first). */
export function splitTextByVocabulary(text: string, vocabulary: VocabEntry[]) {
  const words = vocabulary
    .map((v) => v.word?.trim())
    .filter(Boolean)
    .sort((a, b) => (b?.length || 0) - (a?.length || 0)) as string[];

  if (!text || words.length === 0) {
    return [{ type: 'text' as const, value: text || '' }];
  }

  const pattern = new RegExp(`(${words.map(escapeRegExp).join('|')})`, 'gi');
  const parts = text.split(pattern);
  return parts.filter((p) => p !== undefined && p !== '').map((part) => {
    const vocab = vocabulary.find((v) => v.word?.trim().toLowerCase() === part.toLowerCase());
    if (vocab) return { type: 'vocab' as const, value: part, entry: vocab };
    return { type: 'text' as const, value: part };
  });
}

export function getVideoEmbedUrl(url: string): string | null {
  if (!url?.trim()) return null;
  const u = url.trim();
  const yt = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = u.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  if (u.startsWith('http') && (u.includes('.mp4') || u.includes('.webm'))) return u;
  return null;
}

/** Flatten all text across pages for search / content sync */
export function flattenLayoutText(layout?: StoryLayout | null): string {
  const pages = normalizeStoryLayout(layout).pages;
  return pages
    .flatMap((p) => p.blocks.filter((b) => b.type === 'text').map((b) => b.content))
    .join('\n\n');
}
