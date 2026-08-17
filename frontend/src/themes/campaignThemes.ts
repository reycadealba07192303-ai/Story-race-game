export interface CampaignTheme {
  id: string;
  name: string;
  emoji: string;
  preview: string;
  /** Full map background — gradients, patterns, optional image */
  mapBackground: string;
  /** Soft ambient glow colors */
  glow1: string;
  glow2: string;
  pathStop1: string;
  pathStop2: string;
  nodeCompleted: string;
  nodeActive: string;
  /** Wooden plank face + edge for level nodes */
  plankFace: string;
  plankEdge: string;
  numberColor: string;
  numberShadow: string;
  /** Decorative overlay tint */
  sceneOverlay?: string;
}

export const CAMPAIGN_TEMPLATES: CampaignTheme[] = [
  {
    id: 'space',
    name: 'Space Odyssey',
    emoji: '🚀',
    preview: 'linear-gradient(160deg, #0c0a1f 0%, #1e1b4b 45%, #312e81 100%)',
    mapBackground: `
      radial-gradient(1px 1px at 10% 20%, rgba(255,255,255,0.9) 0%, transparent 100%),
      radial-gradient(1px 1px at 25% 65%, rgba(255,255,255,0.7) 0%, transparent 100%),
      radial-gradient(1.5px 1.5px at 40% 15%, rgba(255,255,255,0.8) 0%, transparent 100%),
      radial-gradient(1px 1px at 55% 80%, rgba(255,255,255,0.6) 0%, transparent 100%),
      radial-gradient(1px 1px at 70% 35%, rgba(255,255,255,0.75) 0%, transparent 100%),
      radial-gradient(1.5px 1.5px at 85% 60%, rgba(255,255,255,0.85) 0%, transparent 100%),
      radial-gradient(1px 1px at 92% 18%, rgba(255,255,255,0.5) 0%, transparent 100%),
      radial-gradient(ellipse 120% 80% at 50% 100%, rgba(99,102,241,0.35) 0%, transparent 55%),
      linear-gradient(160deg, #07051a 0%, #1e1b4b 40%, #312e81 75%, #4c1d95 100%)
    `,
    glow1: '#6366F1',
    glow2: '#EC4899',
    pathStop1: 'rgba(255,255,255,0.35)',
    pathStop2: 'rgba(167,139,250,0.5)',
    nodeCompleted: 'linear-gradient(145deg, #FCD34D, #F59E0B)',
    nodeActive: 'linear-gradient(145deg, #818CF8, #4F46E5)',
    plankFace: 'linear-gradient(180deg, #7c6cf0 0%, #5b4fd9 45%, #4338ca 100%)',
    plankEdge: '#312e81',
    numberColor: '#ffffff',
    numberShadow: '0 2px 0 rgba(0,0,0,0.35)',
    sceneOverlay: 'rgba(15,10,40,0.15)',
  },
  {
    id: 'forest',
    name: 'Forest Adventure',
    emoji: '🌿',
    preview: 'linear-gradient(180deg, #fbbf24 0%, #f97316 35%, #166534 70%, #14532d 100%)',
    mapBackground: `
      radial-gradient(ellipse 90% 40% at 50% 0%, #fde68a 0%, #fbbf24 30%, transparent 70%),
      radial-gradient(ellipse 60% 25% at 75% 8%, rgba(255,255,255,0.35) 0%, transparent 60%),
      linear-gradient(180deg, transparent 28%, #92400e 38%, #78350f 42%, #166534 48%, #14532d 100%),
      linear-gradient(165deg, #fcd34d 0%, #fb923c 18%, #ea580c 32%, #c2410c 42%, #15803d 58%, #052e16 100%)
    `,
    glow1: '#fbbf24',
    glow2: '#22c55e',
    pathStop1: 'rgba(255,255,255,0.25)',
    pathStop2: 'rgba(253,224,71,0.4)',
    nodeCompleted: 'linear-gradient(145deg, #86efac, #16a34a)',
    nodeActive: 'linear-gradient(145deg, #fde047, #ca8a04)',
    plankFace: 'linear-gradient(180deg, #d4a574 0%, #b8895a 35%, #9a7048 70%, #7d5a3c 100%)',
    plankEdge: '#5c4033',
    numberColor: '#22d3ee',
    numberShadow: '0 2px 0 #1a1a1a, 0 0 0 2px rgba(0,0,0,0.25)',
    sceneOverlay: 'rgba(20,40,20,0.12)',
  },
  {
    id: 'ocean',
    name: 'Ocean Quest',
    emoji: '🌊',
    preview: 'linear-gradient(160deg, #0c4a6e 0%, #0369a1 50%, #06b6d4 100%)',
    mapBackground: `
      radial-gradient(ellipse 80% 30% at 50% 0%, rgba(125,211,252,0.4) 0%, transparent 60%),
      radial-gradient(circle at 20% 70%, rgba(6,182,212,0.2) 0%, transparent 40%),
      radial-gradient(circle at 80% 60%, rgba(14,165,233,0.15) 0%, transparent 35%),
      linear-gradient(180deg, transparent 55%, rgba(8,47,73,0.6) 75%, #042f3a 100%),
      linear-gradient(160deg, #082f49 0%, #0c4a6e 35%, #0369a1 65%, #0284c7 100%)
    `,
    glow1: '#06b6d4',
    glow2: '#0ea5e9',
    pathStop1: 'rgba(125,211,252,0.35)',
    pathStop2: 'rgba(6,182,212,0.5)',
    nodeCompleted: 'linear-gradient(145deg, #34d399, #059669)',
    nodeActive: 'linear-gradient(145deg, #38bdf8, #0284c7)',
    plankFace: 'linear-gradient(180deg, #67e8f9 0%, #22d3ee 40%, #0891b2 100%)',
    plankEdge: '#0e7490',
    numberColor: '#ffffff',
    numberShadow: '0 2px 0 rgba(0,0,0,0.3)',
    sceneOverlay: 'rgba(8,47,73,0.2)',
  },
  {
    id: 'fantasy',
    name: 'Fantasy Castle',
    emoji: '🏰',
    preview: 'linear-gradient(160deg, #3b0764 0%, #581c87 50%, #7e22ce 100%)',
    mapBackground: `
      radial-gradient(ellipse 70% 35% at 50% 0%, rgba(216,180,254,0.35) 0%, transparent 65%),
      radial-gradient(circle at 15% 50%, rgba(168,85,247,0.2) 0%, transparent 35%),
      radial-gradient(circle at 85% 45%, rgba(236,72,153,0.15) 0%, transparent 30%),
      linear-gradient(180deg, transparent 50%, rgba(59,7,100,0.5) 80%, #1e1b4b 100%),
      linear-gradient(160deg, #1e1b4b 0%, #3b0764 35%, #581c87 65%, #6b21a8 100%)
    `,
    glow1: '#a855f7',
    glow2: '#ec4899',
    pathStop1: 'rgba(216,180,254,0.35)',
    pathStop2: 'rgba(168,85,247,0.5)',
    nodeCompleted: 'linear-gradient(145deg, #e879f9, #a855f7)',
    nodeActive: 'linear-gradient(145deg, #c084fc, #7c3aed)',
    plankFace: 'linear-gradient(180deg, #c084fc 0%, #a855f7 45%, #7c3aed 100%)',
    plankEdge: '#4c1d95',
    numberColor: '#fef08a',
    numberShadow: '0 2px 0 rgba(0,0,0,0.35)',
    sceneOverlay: 'rgba(30,10,60,0.18)',
  },
  {
    id: 'desert',
    name: 'Desert Journey',
    emoji: '🏜️',
    preview: 'linear-gradient(160deg, #78350f 0%, #b45309 50%, #d97706 100%)',
    mapBackground: `
      radial-gradient(ellipse 90% 35% at 50% 0%, #fde68a 0%, #fbbf24 25%, transparent 65%),
      radial-gradient(ellipse 40% 15% at 60% 12%, rgba(255,255,255,0.25) 0%, transparent 70%),
      linear-gradient(180deg, transparent 40%, #b45309 55%, #92400e 65%, #78350f 100%),
      linear-gradient(165deg, #fcd34d 0%, #f59e0b 20%, #d97706 40%, #b45309 55%, #7c2d12 100%)
    `,
    glow1: '#f59e0b',
    glow2: '#ef4444',
    pathStop1: 'rgba(253,224,71,0.35)',
    pathStop2: 'rgba(249,115,22,0.45)',
    nodeCompleted: 'linear-gradient(145deg, #fcd34d, #d97706)',
    nodeActive: 'linear-gradient(145deg, #fb923c, #ea580c)',
    plankFace: 'linear-gradient(180deg, #e8b86d 0%, #c9956a 40%, #a67c52 100%)',
    plankEdge: '#6b4423',
    numberColor: '#fef3c7',
    numberShadow: '0 2px 0 #422006',
    sceneOverlay: 'rgba(67,20,7,0.15)',
  },
];

export function getCampaignTheme(templateId?: string | null): CampaignTheme {
  return CAMPAIGN_TEMPLATES.find((t) => t.id === templateId) ?? CAMPAIGN_TEMPLATES[0];
}

/** Winding scatter positions for up to 10 levels (story order 1 → n) */
const SCATTER_PATH: { x: number; y: number }[] = [
  { x: 14, y: 78 },
  { x: 38, y: 84 },
  { x: 10, y: 52 },
  { x: 32, y: 48 },
  { x: 58, y: 44 },
  { x: 84, y: 50 },
  { x: 16, y: 22 },
  { x: 44, y: 18 },
  { x: 72, y: 24 },
  { x: 88, y: 72 },
];

export function getLevelPositions(count: number): { x: number; y: number }[] {
  if (count <= 0) return [];
  if (count === 1) return [{ x: 50, y: 50 }];
  return SCATTER_PATH.slice(0, count);
}

export function buildScatterPath(positions: { x: number; y: number }[]): string {
  if (positions.length < 2) return '';
  const pts = positions.map((p) => ({ x: p.x * 10, y: p.y * 5.5 }));
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const cur = pts[i];
    const cx = (prev.x + cur.x) / 2;
    d += ` Q ${cx} ${prev.y} ${cur.x} ${cur.y}`;
  }
  return d;
}
