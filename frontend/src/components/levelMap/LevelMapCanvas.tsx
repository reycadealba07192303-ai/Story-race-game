import React, { useState } from 'react';
import { Gift, Lock, Star, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { getCampaignTheme, type CampaignTheme } from '../../themes/campaignThemes';

export type LevelStatus = 'locked' | 'available' | 'completed';

export interface LevelMapLevel {
  levelNumber: number;
  stars: number;
  status: LevelStatus;
}

interface LevelMapCanvasProps {
  templateId?: string | null;
  levels: LevelMapLevel[];
  qualifiesForReward: boolean;
  onLevelClick: (levelNumber: number) => void;
  onRewardClick: () => void;
}

const COLS = 5;
const PER_PAGE = 15;

export default function LevelMapCanvas({
  templateId,
  levels,
  qualifiesForReward,
  onLevelClick,
  onRewardClick,
}: LevelMapCanvasProps) {
  const theme = getCampaignTheme(templateId);
  const totalPages = Math.max(1, Math.ceil(levels.length / PER_PAGE));
  const [page, setPage] = useState(0);

  const pageLevels = levels.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const rows: LevelMapLevel[][] = [];
  for (let i = 0; i < pageLevels.length; i += COLS) {
    rows.push(pageLevels.slice(i, i + COLS));
  }

  const isLastPage = page === totalPages - 1;

  return (
    <div className="lm-canvas" style={{ background: theme.mapBackground }}>
      {/* ── Ambient glows ── */}
      <div className="lm-glow lm-glow--1" style={{ background: theme.glow1 }} />
      <div className="lm-glow lm-glow--2" style={{ background: theme.glow2 }} />

      {/* ── Sky / scene overlay ── */}
      {theme.sceneOverlay && (
        <div style={{ position: 'absolute', inset: 0, background: theme.sceneOverlay, pointerEvents: 'none', zIndex: 1 }} />
      )}

      {/* ── Decorative floating orbs ── */}
      <div className="lm-orb lm-orb--a" style={{ background: theme.glow1 }} />
      <div className="lm-orb lm-orb--b" style={{ background: theme.glow2 }} />

      {/* ── Header ── */}
      <div className="lm-header">
        <div className="lm-header-badge">
          <Sparkles size={13} />
          <span>Adventure Map</span>
        </div>
        <h2 className="lm-title">SELECT LEVEL</h2>
        {totalPages > 1 && (
          <div className="lm-page-dots">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                className={`lm-page-dot${i === page ? ' active' : ''}`}
                onClick={() => setPage(i)}
                aria-label={`Page ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Level grid ── */}
      <div className="lm-grid">
        {rows.map((row, ri) => (
          <div key={ri} className="lm-row">
            {row.map((lvl, ci) => (
              <LevelTile
                key={lvl.levelNumber}
                level={lvl}
                theme={theme}
                animDelay={ri * 60 + ci * 40}
                onClick={() => onLevelClick(lvl.levelNumber)}
              />
            ))}
          </div>
        ))}

        {/* ── Reward node ── */}
        {isLastPage && (
          <div className="lm-row lm-row--reward">
            <RewardTile qualifies={qualifiesForReward} onClick={() => qualifiesForReward && onRewardClick()} />
          </div>
        )}
      </div>

      {/* ── Page nav arrows ── */}
      {totalPages > 1 && (
        <>
          <button
            className={`lm-nav-btn lm-nav-btn--prev${page === 0 ? ' disabled' : ''}`}
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            aria-label="Previous page"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            className={`lm-nav-btn lm-nav-btn--next${page === totalPages - 1 ? ' disabled' : ''}`}
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            aria-label="Next page"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}

      {/* ── Star counter badge (top-right) ── */}
      <div className="lm-star-badge" title="Stars earned">
        <Star size={16} fill="#fde047" color="#eab308" />
        <span>{levels.filter(l => l.status === 'completed').reduce((s, l) => s + l.stars, 0)}</span>
      </div>
    </div>
  );
}

// ── Level Tile ────────────────────────────────────────────────────────────────
function LevelTile({
  level,
  theme,
  animDelay,
  onClick,
}: {
  level: LevelMapLevel;
  theme: CampaignTheme;
  animDelay: number;
  onClick: () => void;
}) {
  const { status, levelNumber, stars } = level;
  const isLocked = status === 'locked';
  const isCompleted = status === 'completed';

  // Pick tile face color based on theme + status
  const tileFace = isLocked
    ? 'linear-gradient(160deg, rgba(100,116,139,0.55) 0%, rgba(71,85,105,0.55) 100%)'
    : isCompleted
      ? theme.nodeCompleted
      : theme.nodeActive;

  const tileEdge = isLocked
    ? 'rgba(30,41,59,0.8)'
    : isCompleted
      ? (theme.plankEdge ?? '#1d4ed8')
      : (theme.plankEdge ?? '#1d4ed8');

  const tileBorder = isLocked
    ? 'rgba(100,116,139,0.3)'
    : isCompleted
      ? 'rgba(255,255,255,0.35)'
      : 'rgba(255,255,255,0.45)';

  return (
    <div
      className={`lm-tile${isLocked ? ' locked' : ''}${isCompleted ? ' completed' : ''}`}
      style={{ animationDelay: `${animDelay}ms` }}
    >
      {/* Stars row */}
      <div className="lm-tile-stars">
        {(status !== 'locked') && [1, 2, 3].map(s => (
          <Star
            key={s}
            size={11}
            fill={s <= stars ? '#FDE047' : 'rgba(255,255,255,0.18)'}
            color={s <= stars ? '#EAB308' : 'rgba(255,255,255,0.2)'}
            style={{ filter: s <= stars ? 'drop-shadow(0 0 4px rgba(234,179,8,0.85))' : 'none' }}
          />
        ))}
      </div>

      {/* Main button */}
      <button
        className="lm-tile-btn"
        onClick={() => !isLocked && onClick()}
        disabled={isLocked}
        style={{
          background: tileFace,
          borderColor: tileBorder,
          boxShadow: `0 5px 0 ${tileEdge}, 0 10px 28px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.3)`,
        }}
        onMouseEnter={e => {
          if (!isLocked) {
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px) scale(1.06)';
            (e.currentTarget as HTMLElement).style.boxShadow = `0 9px 0 ${tileEdge}, 0 18px 36px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3)`;
          }
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.transform = '';
          (e.currentTarget as HTMLElement).style.boxShadow = `0 5px 0 ${tileEdge}, 0 10px 28px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.3)`;
        }}
      >
        {/* Shine gloss overlay */}
        <div className="lm-tile-gloss" />

        {isLocked ? (
          <Lock size={22} color="rgba(255,255,255,0.38)" strokeWidth={2.5} />
        ) : (
          <span className="lm-tile-num">
            {levelNumber}
          </span>
        )}

        {/* Completed checkmark badge */}
        {isCompleted && (
          <div className="lm-tile-check">✓</div>
        )}
      </button>
    </div>
  );
}

// ── Reward Tile ───────────────────────────────────────────────────────────────
function RewardTile({ qualifies, onClick }: { qualifies: boolean; onClick: () => void }) {
  return (
    <div
      className={`lm-reward-tile${qualifies ? ' active' : ''}`}
      onClick={onClick}
      title={qualifies ? 'Claim your reward!' : 'Complete more levels to unlock'}
    >
      <div className="lm-reward-btn">
        <div className="lm-reward-gloss" />
        <Gift size={26} color="#fff" strokeWidth={2} />
        {qualifies && <div className="lm-reward-pulse" />}
      </div>
      <span className="lm-reward-label">
        {qualifies ? '🎉 REWARD' : 'REWARD'}
      </span>
    </div>
  );
}
