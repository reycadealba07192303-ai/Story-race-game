import React, { useEffect, useState } from 'react';
import type { StoryBlock, StoryLayout, VocabEntry } from '../../types/storyLayout';
import {
  getVideoEmbedUrl,
  isTransparentFill,
  normalizeStoryLayout,
  resolvePageBackground,
  splitTextByVocabulary,
} from '../../types/storyLayout';

interface Props {
  title: string;
  levelNumber: number;
  layout: StoryLayout;
  vocabulary?: VocabEntry[];
  showQuizButton?: boolean;
  onTakeQuiz?: () => void;
  paper?: boolean;
  /** Controlled page index (optional) */
  pageIndex?: number;
  onPageIndexChange?: (index: number) => void;
}

function VocabText({
  text,
  vocabulary,
  interactive,
  onPick,
}: {
  text: string;
  vocabulary: VocabEntry[];
  interactive: boolean;
  onPick: (entry: VocabEntry) => void;
}) {
  const parts = splitTextByVocabulary(text, vocabulary);
  return (
    <>
      {parts.map((part, i) => {
        if (part.type === 'vocab' && part.entry) {
          return (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (interactive) onPick(part.entry!);
              }}
              style={{
                display: 'inline',
                padding: '0 3px',
                margin: '0 1px',
                border: 'none',
                borderRadius: 8,
                cursor: interactive ? 'pointer' : 'default',
                background: 'linear-gradient(180deg, #fde68a, #fbbf24)',
                color: '#7c2d12',
                font: 'inherit',
                fontWeight: 800,
                boxShadow: '0 2px 0 #d97706',
                lineHeight: 'inherit',
              }}
              title={interactive ? 'Tap for meaning' : part.entry.word}
            >
              {part.value}
            </button>
          );
        }
        return <span key={i}>{part.value}</span>;
      })}
    </>
  );
}

function BlockView({
  block,
  vocabulary,
  interactive,
  onPickVocab,
}: {
  block: StoryBlock;
  vocabulary: VocabEntry[];
  interactive: boolean;
  onPickVocab: (entry: VocabEntry) => void;
}) {
  const fit = block.objectFit || 'contain';

  if (block.type === 'text') {
    const noBg = isTransparentFill(block.blockBg);
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          overflow: 'auto',
          color: block.color || '#3b2f2f',
          fontFamily: block.fontFamily || 'Fredoka, sans-serif',
          lineHeight: 1.7,
          fontSize: block.fontSize || 17,
          fontWeight: block.fontWeight || 600,
          fontStyle: block.fontStyle || 'normal',
          textDecoration: block.textDecoration || 'none',
          textAlign: block.textAlign || 'left',
          whiteSpace: 'pre-wrap',
          background: noBg ? 'transparent' : (block.blockBg || 'rgba(255,255,255,0.7)'),
          borderRadius: noBg ? 0 : 18,
          padding: noBg ? 4 : '12px 14px',
          boxSizing: 'border-box',
          boxShadow: noBg ? 'none' : '0 8px 20px rgba(60, 40, 20, 0.08)',
          border: noBg ? 'none' : '2px solid rgba(255,255,255,0.65)',
        }}
      >
        <VocabText
          text={block.content || ''}
          vocabulary={vocabulary}
          interactive={interactive}
          onPick={onPickVocab}
        />
      </div>
    );
  }

  if (block.type === 'image') {
    const showFrame = block.showFrameBg !== false;
    const frameBg = showFrame ? (block.frameBg || 'rgba(255,255,255,0.55)') : 'transparent';
    if (!block.content) {
      return (
        <div style={{
          width: '100%', height: '100%', borderRadius: 18,
          background: showFrame ? frameBg : 'transparent',
          border: showFrame ? '2px dashed rgba(120,80,40,0.25)' : '2px dashed rgba(120,80,40,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#9a7b4f', fontSize: 13, fontFamily: 'Fredoka, sans-serif', fontWeight: 700,
        }}>
          Picture
        </div>
      );
    }
    return (
      <div style={{
        width: '100%', height: '100%', borderRadius: showFrame ? 18 : 0, overflow: 'hidden',
        background: frameBg,
        border: showFrame ? '3px solid rgba(255,255,255,0.85)' : 'none',
        boxShadow: showFrame ? '0 10px 24px rgba(60,40,20,0.12)' : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxSizing: 'border-box',
      }}>
        <img
          src={block.content}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: fit,
            objectPosition: 'center',
            display: 'block',
            background: 'transparent',
          }}
        />
      </div>
    );
  }

  const embed = getVideoEmbedUrl(block.content);
  if (!embed) {
    return (
      <div style={{
        width: '100%', height: '100%', borderRadius: 18,
        background: block.showFrameBg === false ? 'transparent' : 'rgba(255,255,255,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#9a7b4f', fontSize: 12, padding: 8, textAlign: 'center',
        fontFamily: 'Fredoka, sans-serif', fontWeight: 700,
      }}>
        Add video URL
      </div>
    );
  }
  if (embed.endsWith('.mp4') || embed.endsWith('.webm')) {
    return <video src={embed} controls style={{ width: '100%', height: '100%', borderRadius: 18, objectFit: fit }} />;
  }
  return (
    <iframe
      src={embed}
      title="Story video"
      style={{ width: '100%', height: '100%', border: 'none', borderRadius: 18 }}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  );
}

export default function StoryPageRenderer({
  title, levelNumber, layout, vocabulary = [], showQuizButton, onTakeQuiz, paper = true,
  pageIndex: controlledIndex, onPageIndexChange,
}: Props) {
  const pages = normalizeStoryLayout(layout).pages;
  const [internalIndex, setInternalIndex] = useState(0);
  const pageIndex = controlledIndex ?? internalIndex;
  const setPageIndex = (i: number) => {
    const next = Math.min(Math.max(i, 0), pages.length - 1);
    if (onPageIndexChange) onPageIndexChange(next);
    else setInternalIndex(next);
  };

  useEffect(() => {
    if (pageIndex > pages.length - 1) setPageIndex(pages.length - 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages.length]);

  const [activeVocab, setActiveVocab] = useState<VocabEntry | null>(null);
  const page = pages[pageIndex] || pages[0];
  const sorted = [...(page?.blocks || [])].sort((a, b) => a.zIndex - b.zIndex);
  const bgCss = resolvePageBackground(page?.background);
  const isTransparentPage = !page?.background || page.background.type === 'none' || bgCss === 'transparent';
  const isLastPage = pageIndex >= pages.length - 1;
  const night = page?.background?.type === 'preset' && page.background.value === 'night';

  const goNextPage = () => {
    setActiveVocab(null);
    setPageIndex(pageIndex + 1);
  };

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      background: paper
        ? (isTransparentPage
          ? 'repeating-conic-gradient(#e5e7eb 0% 25%, #f3f4f6 0% 50%) 50% / 16px 16px'
          : bgCss)
        : 'transparent',
      position: 'relative', overflow: 'hidden',
      fontFamily: 'Fredoka, Nunito, sans-serif',
    }}>
      {!isTransparentPage && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: night
            ? 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.35) 100%)'
            : 'radial-gradient(ellipse at center, transparent 50%, rgba(255,255,255,0.2) 100%)',
        }} />
      )}

      <div style={{ position: 'relative', zIndex: 1, flex: 1, minHeight: 0 }}>
        {/* Compact badge — does not reserve side space for content */}
        <div
          title={title}
          style={{
          position: 'absolute', top: 10, left: 12, zIndex: 4, pointerEvents: 'none',
          padding: '5px 10px', borderRadius: 999,
          background: night ? 'rgba(167,139,250,0.28)' : 'rgba(251,191,36,0.92)',
          color: night ? '#ede9fe' : '#78350f',
          fontSize: 10, fontWeight: 800, letterSpacing: 0.5,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}>
          Ch. {levelNumber} · {pageIndex + 1}/{pages.length}
        </div>

        {/* Full page canvas — sides included for text/images */}
        <div style={{ position: 'absolute', inset: 0 }}>
          {sorted.map((block) => (
            <div
              key={block.id}
              style={{
                position: 'absolute',
                left: `${block.x}%`,
                top: `${block.y}%`,
                width: `${block.w}%`,
                height: `${block.h}%`,
                zIndex: block.zIndex,
                padding: 2,
                boxSizing: 'border-box',
              }}
            >
              <BlockView
                block={block}
                vocabulary={vocabulary}
                interactive
                onPickVocab={setActiveVocab}
              />
            </div>
          ))}
        </div>
      </div>

      {activeVocab && (
        <div style={{
          position: 'absolute', left: 16, right: 16, bottom: showQuizButton ? 72 : 16, zIndex: 20,
          padding: '14px 16px', borderRadius: 18,
          background: 'linear-gradient(180deg, #fffbeb, #fef3c7)',
          border: '2px solid #f59e0b',
          boxShadow: '0 16px 36px rgba(120, 53, 15, 0.2)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#b45309', textTransform: 'uppercase', letterSpacing: 0.8 }}>Vocabulary</div>
              <div style={{ fontWeight: 900, color: '#7c2d12', fontSize: 20, marginTop: 2 }}>{activeVocab.word}</div>
              <div style={{ color: '#92400e', fontSize: 14, marginTop: 6, lineHeight: 1.5 }}>{activeVocab.definition}</div>
              {activeVocab.example && (
                <div style={{ color: '#a16207', fontSize: 12, fontStyle: 'italic', marginTop: 8 }}>
                  “{activeVocab.example}”
                </div>
              )}
            </div>
            <button type="button" onClick={() => setActiveVocab(null)}
              style={{ border: 'none', background: 'rgba(180,83,9,0.12)', color: '#92400e', width: 32, height: 32, borderRadius: 10, cursor: 'pointer', fontWeight: 800 }}>
              ✕
            </button>
          </div>
        </div>
      )}

      {showQuizButton && (
        <div style={{ padding: '0 16px 12px', position: 'relative', zIndex: 2, display: 'flex', gap: 10 }}>
          {pageIndex > 0 && (
            <button
              type="button"
              onClick={() => { setActiveVocab(null); setPageIndex(pageIndex - 1); }}
              style={{
                padding: '14px 18px', borderRadius: 16, border: '2px solid rgba(124,45,18,0.2)',
                background: 'rgba(255,255,255,0.85)', color: '#7c2d12',
                fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: 'Fredoka, sans-serif',
              }}
            >
              ← Back
            </button>
          )}
          {!isLastPage ? (
            <button
              type="button"
              onClick={goNextPage}
              style={{
                flex: 1, padding: '14px', borderRadius: 16, border: 'none',
                background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: '#fff',
                fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: 'Fredoka, sans-serif',
                boxShadow: '0 8px 18px rgba(14,165,233,0.35)',
              }}
            >
              Next page →
            </button>
          ) : (
            <button
              type="button"
              onClick={onTakeQuiz}
              style={{
                flex: 1, padding: '14px', borderRadius: 16, border: 'none',
                background: 'linear-gradient(135deg, #f59e0b, #ea580c)', color: '#fffbeb',
                fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: 'Fredoka, sans-serif',
                boxShadow: '0 8px 18px rgba(234,88,12,0.35)',
              }}
            >
              Take Quiz →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
