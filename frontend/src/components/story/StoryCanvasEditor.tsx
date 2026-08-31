import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image as ImageIcon, Type, Video, Trash2, Upload, Palette, Highlighter,
  Plus, Copy, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
} from 'lucide-react';
import type { StoryBlock, StoryBlockType, StoryLayout, StoryPage, VocabEntry } from '../../types/storyLayout';
import {
  createBlankPage,
  createDefaultBlock,
  createPageId,
  flattenLayoutText,
  isTransparentFill,
  normalizeStoryLayout,
  resolvePageBackground,
  STORY_FONT_OPTIONS,
  STORY_PAGE_PRESETS,
  splitTextByVocabulary,
} from '../../types/storyLayout';
import StoryPageRenderer from './StoryPageRenderer';
import { useDialog } from '../DialogProvider';
import { compressImageFile } from '../../utils/storyImageOptimizer';

interface Props {
  title: string;
  levelNumber: number;
  layout: StoryLayout;
  onChange: (layout: StoryLayout) => void;
  vocabulary?: VocabEntry[];
  onVocabularyChange?: (vocabulary: VocabEntry[]) => void;
}

type DragMode = 'move' | 'resize';

const fieldStyle: React.CSSProperties = {
  width: '100%', marginTop: 6, marginBottom: 10, borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
  color: '#f8fafc', padding: 8, boxSizing: 'border-box', fontFamily: 'Outfit, sans-serif',
};

const toolBtn = (active = false): React.CSSProperties => ({
  width: 34, height: 34, borderRadius: 8, cursor: 'pointer',
  border: active ? '1px solid #a78bfa' : '1px solid rgba(255,255,255,0.12)',
  background: active ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.05)',
  color: active ? '#e9d5ff' : '#e2e8f0',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
});

export default function StoryCanvasEditor({
  title, levelNumber, layout, onChange, vocabulary = [], onVocabularyChange,
}: Props) {
  const { alert, confirm, prompt } = useDialog();
  const normalized = useMemo(() => normalizeStoryLayout(layout), [layout]);
  const [pageIndex, setPageIndex] = useState(0);
  const page = normalized.pages[Math.min(pageIndex, normalized.pages.length - 1)] || normalized.pages[0];

  // Keep latest pages in a ref so rapid edits (typing, drag) don't use stale render closures.
  const pagesRef = useRef(normalized.pages);
  const pageIndexRef = useRef(pageIndex);
  const pendingCommitRef = useRef(false);

  useEffect(() => {
    if (pendingCommitRef.current) {
      pendingCommitRef.current = false;
      return;
    }
    pagesRef.current = normalized.pages;
  }, [normalized]);

  useEffect(() => {
    pageIndexRef.current = pageIndex;
  }, [pageIndex]);

  const [selectedId, setSelectedId] = useState<string | null>(page?.blocks[0]?.id || null);

  useEffect(() => {
    setPageIndex(0);
    setSelectedId(null);
  }, [levelNumber]);

  const canvasRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [drag, setDrag] = useState<{ id: string; mode: DragMode; startX: number; startY: number; orig: StoryBlock } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bgFileRef = useRef<HTMLInputElement>(null);
  const [pendingImageId, setPendingImageId] = useState<string | null>(null);

  const selected = page?.blocks.find((b) => b.id === selectedId) || null;
  const pageBg = page?.background || { type: 'preset' as const, value: 'sunny' };
  const canvasBg = resolvePageBackground(pageBg);
  const isTransparentPage = pageBg.type === 'none' || canvasBg === 'transparent';

  const commitPages = (pages: StoryPage[]) => {
    pagesRef.current = pages;
    pendingCommitRef.current = true;
    onChange({ pages });
  };

  const updatePage = (patch: Partial<StoryPage>) => {
    const idx = pageIndexRef.current;
    const pages = pagesRef.current.map((p, i) => (i === idx ? { ...p, ...patch } : p));
    commitPages(pages);
  };

  const updateBlock = (id: string, patch: Partial<StoryBlock>) => {
    const idx = pageIndexRef.current;
    const currentPage = pagesRef.current[idx];
    if (!currentPage) return;
    updatePage({
      blocks: currentPage.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    });
  };

  const addBlock = (type: StoryBlockType) => {
    const idx = pageIndexRef.current;
    const currentPage = pagesRef.current[idx];
    if (!currentPage) return;
    const block = createDefaultBlock(type);
    block.zIndex = Math.max(0, ...currentPage.blocks.map((b) => b.zIndex), 0) + 1;
    updatePage({ blocks: [...currentPage.blocks, block] });
    setSelectedId(block.id);
  };

  const duplicateSelected = () => {
    if (!selected) return;
    const idx = pageIndexRef.current;
    const currentPage = pagesRef.current[idx];
    if (!currentPage) return;
    const copy: StoryBlock = {
      ...selected,
      id: createDefaultBlock(selected.type).id,
      x: Math.min(88, selected.x + 4),
      y: Math.min(88, selected.y + 4),
      zIndex: selected.zIndex + 1,
    };
    updatePage({ blocks: [...currentPage.blocks, copy] });
    setSelectedId(copy.id);
  };

  const removeBlock = async (id: string) => {
    const idx = pageIndexRef.current;
    const currentPage = pagesRef.current[idx];
    if (!currentPage) return;
    const next = currentPage.blocks.filter((b) => b.id !== id);
    updatePage({ blocks: next.length ? next : [createDefaultBlock('text')] });
    setSelectedId(next[0]?.id || null);
  };

  const addPage = () => {
    const pages = [...pagesRef.current, createBlankPage()];
    commitPages(pages);
    setPageIndex(pages.length - 1);
    setSelectedId(null);
  };

  const duplicatePage = () => {
    const idx = pageIndexRef.current;
    const currentPage = pagesRef.current[idx];
    if (!currentPage) return;
    const clone: StoryPage = {
      id: createPageId(),
      background: currentPage.background ? { ...currentPage.background } : { type: 'preset', value: 'sunny' },
      blocks: currentPage.blocks.map((b) => ({ ...b, id: createDefaultBlock(b.type).id })),
    };
    const pages = [...pagesRef.current];
    pages.splice(idx + 1, 0, clone);
    commitPages(pages);
    setPageIndex(idx + 1);
  };

  const deletePage = async () => {
    if (pagesRef.current.length <= 1) {
      await alert({ title: 'Keep one page', message: 'A level needs at least one story page.', variant: 'warning' });
      return;
    }
    const ok = await confirm({
      title: 'Delete this page?',
      message: `Remove page ${pageIndex + 1}?`,
      variant: 'danger',
      confirmLabel: 'Delete page',
    });
    if (!ok) return;
    const idx = pageIndexRef.current;
    const pages = pagesRef.current.filter((_, i) => i !== idx);
    commitPages(pages);
    setPageIndex(Math.max(0, idx - 1));
    setSelectedId(null);
  };

  const onPointerDown = (e: React.PointerEvent, block: StoryBlock, mode: DragMode) => {
    e.stopPropagation();
    setSelectedId(block.id);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setDrag({ id: block.id, mode, startX: e.clientX, startY: e.clientY, orig: { ...block } });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const dx = ((e.clientX - drag.startX) / rect.width) * 100;
    const dy = ((e.clientY - drag.startY) / rect.height) * 100;
    const b = drag.orig;
    if (drag.mode === 'move') {
      updateBlock(drag.id, {
        x: Math.max(0, Math.min(100 - b.w, b.x + dx)),
        y: Math.max(0, Math.min(100 - b.h, b.y + dy)),
      });
    } else {
      updateBlock(drag.id, {
        w: Math.max(10, Math.min(100 - b.x, b.w + dx)),
        h: Math.max(8, Math.min(100 - b.y, b.h + dy)),
      });
    }
  };

  const onPointerUp = () => setDrag(null);

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingImageId) return;
    void compressImageFile(file, 960).then((content) => {
      updateBlock(pendingImageId!, { content, objectFit: 'contain' });
    }).catch(console.error);
    e.target.value = '';
    setPendingImageId(null);
  };

  const handleBgImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void compressImageFile(file, 1280).then((value) => {
      updatePage({ background: { type: 'image', value } });
    }).catch(console.error);
    e.target.value = '';
  };

  const markSelectionAsVocab = async () => {
    if (!selected || selected.type !== 'text' || !onVocabularyChange) return;
    const el = textAreaRef.current;
    const start = el?.selectionStart ?? 0;
    const end = el?.selectionEnd ?? 0;
    let word = (start < end ? selected.content.slice(start, end) : '').trim();
    if (!word) {
      const asked = await prompt({
        title: 'Vocabulary word',
        message: 'Type the word from the story to highlight for students.',
        placeholder: 'e.g. curious',
        confirmLabel: 'Next',
      });
      word = (asked || '').trim();
    }
    if (!word) return;
    if (vocabulary.some((v) => v.word.trim().toLowerCase() === word.toLowerCase())) {
      await alert({ title: 'Already highlighted', message: `"${word}" is already in vocabulary.`, variant: 'info' });
      return;
    }
    const definition = await prompt({
      title: `Definition for “${word}”`,
      message: 'Students see this when they tap the word.',
      placeholder: 'Kid-friendly meaning…',
      confirmLabel: 'Add word',
    });
    if (!definition?.trim()) return;
    onVocabularyChange([...vocabulary, { word, definition: definition.trim() }]);
  };

  const btnStyle: React.CSSProperties = {
    padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontWeight: 700, fontSize: 12,
    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
  };
  const labelStyle: React.CSSProperties = { fontSize: 11, color: '#94a3b8', fontWeight: 700 };

  return (
    <div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImagePick} />
      <input ref={bgFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBgImagePick} />

      {/* Canva-like top toolbar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, alignItems: 'center',
        padding: '10px 12px', borderRadius: 14,
        background: 'rgba(15,17,35,0.75)', border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <button type="button" style={btnStyle} onClick={() => addBlock('text')}><Type size={14} /> Text</button>
        <button type="button" style={btnStyle} onClick={() => addBlock('image')}><ImageIcon size={14} /> Image</button>
        <button type="button" style={btnStyle} onClick={() => addBlock('video')}><Video size={14} /> Video</button>
        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.12)' }} />
        <button type="button" style={btnStyle} onClick={() => setSelectedId(null)}><Palette size={14} /> Background</button>
        {selected && (
          <>
            <button type="button" style={toolBtn()} onClick={duplicateSelected} title="Duplicate"><Copy size={14} /></button>
            <button type="button" style={{ ...toolBtn(), color: '#f87171' }} onClick={() => removeBlock(selected.id)} title="Delete"><Trash2 size={14} /></button>
          </>
        )}
        {selected?.type === 'text' && (
          <>
            <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.12)' }} />
            <button type="button" style={toolBtn(Number(selected.fontWeight) >= 700)} title="Bold"
              onClick={() => updateBlock(selected.id, { fontWeight: Number(selected.fontWeight) >= 700 ? 600 : 800 })}>
              <Bold size={14} />
            </button>
            <button type="button" style={toolBtn(selected.fontStyle === 'italic')} title="Italic"
              onClick={() => updateBlock(selected.id, { fontStyle: selected.fontStyle === 'italic' ? 'normal' : 'italic' })}>
              <Italic size={14} />
            </button>
            <button type="button" style={toolBtn(selected.textDecoration === 'underline')} title="Underline"
              onClick={() => updateBlock(selected.id, { textDecoration: selected.textDecoration === 'underline' ? 'none' : 'underline' })}>
              <Underline size={14} />
            </button>
            <button type="button" style={toolBtn(selected.textAlign === 'left')} onClick={() => updateBlock(selected.id, { textAlign: 'left' })}><AlignLeft size={14} /></button>
            <button type="button" style={toolBtn(selected.textAlign === 'center')} onClick={() => updateBlock(selected.id, { textAlign: 'center' })}><AlignCenter size={14} /></button>
            <button type="button" style={toolBtn(selected.textAlign === 'right')} onClick={() => updateBlock(selected.id, { textAlign: 'right' })}><AlignRight size={14} /></button>
            {onVocabularyChange && (
              <button type="button" style={{ ...btnStyle, color: '#fcd34d', borderColor: 'rgba(251,191,36,0.35)' }} onClick={markSelectionAsVocab}>
                <Highlighter size={14} /> Vocab
              </button>
            )}
          </>
        )}
      </div>

      <div className="db-canvas-layout">
        <div>
          <div
            ref={canvasRef}
            onClick={() => setSelectedId(null)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{
              position: 'relative', width: '100%', aspectRatio: '16/10',
              borderRadius: 18, overflow: 'hidden',
              border: '2px solid rgba(255,255,255,0.14)',
              background: isTransparentPage
                ? 'repeating-conic-gradient(#d1d5db 0% 25%, #e5e7eb 0% 50%) 50% / 18px 18px'
                : canvasBg,
              touchAction: 'none',
            }}
          >
            {page.blocks.map((block) => {
              const active = block.id === selectedId;
              const noTextBg = block.type === 'text' && isTransparentFill(block.blockBg);
              const noImageBg = block.type === 'image' && block.showFrameBg === false;
              return (
                <div
                  key={block.id}
                  onClick={(e) => { e.stopPropagation(); setSelectedId(block.id); }}
                  onPointerDown={(e) => onPointerDown(e, block, 'move')}
                  style={{
                    position: 'absolute',
                    left: `${block.x}%`, top: `${block.y}%`,
                    width: `${block.w}%`, height: `${block.h}%`,
                    zIndex: block.zIndex + (active ? 100 : 0),
                    border: active ? '2px solid #8B5CF6' : '1px dashed rgba(100,80,40,0.2)',
                    borderRadius: 14,
                    background: block.type === 'text'
                      ? (noTextBg ? 'transparent' : (block.blockBg || 'rgba(255,255,255,0.55)'))
                      : block.type === 'image'
                        ? (noImageBg ? 'transparent' : (block.frameBg || 'rgba(255,255,255,0.35)'))
                        : 'rgba(255,255,255,0.2)',
                    boxShadow: active ? '0 0 0 3px rgba(139,92,246,0.25)' : 'none',
                    cursor: 'grab', overflow: 'hidden', padding: 8, boxSizing: 'border-box',
                  }}
                >
                  {block.type === 'text' && (
                    <div style={{
                      fontSize: block.fontSize || 16,
                      fontFamily: block.fontFamily || 'Fredoka, sans-serif',
                      color: block.color || '#3b2f2f',
                      fontWeight: block.fontWeight || 600,
                      fontStyle: block.fontStyle || 'normal',
                      textDecoration: block.textDecoration || 'none',
                      textAlign: block.textAlign || 'left',
                      lineHeight: 1.55, height: '100%', overflow: 'hidden', whiteSpace: 'pre-wrap',
                    }}>
                      {splitTextByVocabulary(block.content || '', vocabulary).map((part, i) => (
                        part.type === 'vocab'
                          ? <span key={i} style={{ background: 'linear-gradient(180deg,#fde68a,#fbbf24)', borderRadius: 6, padding: '0 2px', fontWeight: 800 }}>{part.value}</span>
                          : <span key={i}>{part.value}</span>
                      ))}
                    </div>
                  )}
                  {block.type === 'image' && (
                    block.content
                      ? <img src={block.content} alt="" style={{ width: '100%', height: '100%', objectFit: block.objectFit || 'contain', objectPosition: 'center', borderRadius: 8, pointerEvents: 'none', background: 'transparent' }} />
                      : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 12 }}>Image</div>
                  )}
                  {block.type === 'video' && (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 12 }}>{block.content ? 'Video' : 'Video URL'}</div>
                  )}
                  {active && (
                    <div
                      onPointerDown={(e) => onPointerDown(e, block, 'resize')}
                      style={{ position: 'absolute', right: 4, bottom: 4, width: 14, height: 14, borderRadius: '50%', background: '#8B5CF6', cursor: 'nwse-resize', border: '2px solid #fff' }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Canva-like page strip */}
          <div style={{
            marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            padding: '10px 12px', borderRadius: 14,
            background: 'rgba(15,17,35,0.55)', border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8' }}>Pages</span>
            {normalized.pages.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => { setPageIndex(i); setSelectedId(null); }}
                style={{
                  width: 64, height: 42, borderRadius: 10, cursor: 'pointer', overflow: 'hidden',
                  border: i === pageIndex ? '2px solid #8B5CF6' : '1px solid rgba(255,255,255,0.15)',
                  background: resolvePageBackground(p.background) === 'transparent'
                    ? 'repeating-conic-gradient(#d1d5db 0% 25%, #e5e7eb 0% 50%) 50% / 10px 10px'
                    : resolvePageBackground(p.background),
                  boxShadow: i === pageIndex ? '0 0 0 3px rgba(139,92,246,0.25)' : 'none',
                  color: '#0f172a', fontWeight: 900, fontSize: 12,
                }}
              >
                {i + 1}
              </button>
            ))}
            <button type="button" onClick={addPage} style={{ ...btnStyle, background: 'rgba(139,92,246,0.18)', borderColor: 'rgba(167,139,250,0.4)', color: '#ddd6fe' }}>
              <Plus size={14} /> Add page
            </button>
            <button type="button" onClick={duplicatePage} style={btnStyle}><Copy size={13} /> Duplicate</button>
            <button type="button" onClick={deletePage} style={{ ...btnStyle, color: '#fca5a5' }}><Trash2 size={13} /> Delete page</button>
          </div>
        </div>

        {/* Properties */}
        <div style={{ background: 'rgba(20,24,45,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 14 }}>
          {!selected ? (
            <>
              <div style={{ fontWeight: 800, color: '#e2e8f0', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Palette size={15} color="#a78bfa" /> Page Background
              </div>
              <button
                type="button"
                onClick={() => updatePage({ background: { type: 'none', value: '' } })}
                style={{
                  ...btnStyle, width: '100%', justifyContent: 'center', marginBottom: 10,
                  background: pageBg.type === 'none' ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.05)',
                  borderColor: pageBg.type === 'none' ? '#a78bfa' : 'rgba(255,255,255,0.12)',
                }}
              >
                No background (transparent)
              </button>
              <label style={labelStyle}>Preset</label>
              <select
                value={pageBg.type === 'preset' ? pageBg.value : ''}
                onChange={(e) => updatePage({ background: { type: 'preset', value: e.target.value } })}
                style={fieldStyle}
              >
                <option value="" disabled>Choose…</option>
                {STORY_PAGE_PRESETS.map((p) => (
                  <option key={p.id} value={p.id} style={{ background: '#0f1123' }}>{p.label}</option>
                ))}
              </select>
              <label style={labelStyle}>Solid color</label>
              <input type="color" value={pageBg.type === 'color' ? pageBg.value : '#fff7ed'}
                onChange={(e) => updatePage({ background: { type: 'color', value: e.target.value } })}
                style={{ ...fieldStyle, height: 42, padding: 4, cursor: 'pointer' }}
              />
              <button type="button" style={{ ...btnStyle, width: '100%', justifyContent: 'center' }} onClick={() => bgFileRef.current?.click()}>
                <Upload size={14} /> Upload background image
              </button>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontWeight: 800, color: '#e2e8f0', textTransform: 'capitalize' }}>{selected.type}</span>
                <button type="button" onClick={() => removeBlock(selected.id)} style={{ ...btnStyle, color: '#f87171', padding: '6px 8px' }}><Trash2 size={13} /></button>
              </div>

              {selected.type === 'text' && (
                <>
                  <label style={labelStyle}>Text</label>
                  <textarea ref={textAreaRef} value={selected.content}
                    onChange={(e) => updateBlock(selected.id, { content: e.target.value })}
                    rows={5} style={{ ...fieldStyle, fontFamily: selected.fontFamily || 'Fredoka, sans-serif', resize: 'vertical' }}
                  />
                  <label style={labelStyle}>Font</label>
                  <select value={selected.fontFamily || 'Fredoka, sans-serif'}
                    onChange={(e) => updateBlock(selected.id, { fontFamily: e.target.value })} style={fieldStyle}>
                    {STORY_FONT_OPTIONS.map((f) => <option key={f.id} value={f.id} style={{ background: '#0f1123' }}>{f.label}</option>)}
                  </select>
                  <div className="db-dashboard-two-col" style={{ gap: 8 }}>
                    <div>
                      <label style={labelStyle}>Size</label>
                      <input type="number" min={12} max={56} value={selected.fontSize || 17}
                        onChange={(e) => updateBlock(selected.id, { fontSize: Number(e.target.value) || 17 })} style={fieldStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Color</label>
                      <input type="color" value={selected.color || '#3b2f2f'}
                        onChange={(e) => updateBlock(selected.id, { color: e.target.value })}
                        style={{ ...fieldStyle, height: 38, padding: 3, cursor: 'pointer' }} />
                    </div>
                  </div>
                  <label style={labelStyle}>Text background</label>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <button type="button" style={{
                      ...btnStyle, flex: 1, justifyContent: 'center',
                      background: isTransparentFill(selected.blockBg) ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.05)',
                      borderColor: isTransparentFill(selected.blockBg) ? '#a78bfa' : 'rgba(255,255,255,0.12)',
                    }} onClick={() => updateBlock(selected.id, { blockBg: 'transparent' })}>
                      None
                    </button>
                    <input type="color"
                      value={!isTransparentFill(selected.blockBg) && selected.blockBg?.startsWith('#') ? selected.blockBg : '#fffbeb'}
                      onChange={(e) => updateBlock(selected.id, { blockBg: e.target.value })}
                      style={{ width: 48, height: 36, borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', cursor: 'pointer' }}
                    />
                  </div>
                </>
              )}

              {selected.type === 'image' && (
                <>
                  <button type="button" style={{ ...btnStyle, width: '100%', justifyContent: 'center', marginBottom: 10 }}
                    onClick={() => { setPendingImageId(selected.id); fileRef.current?.click(); }}>
                    <Upload size={14} /> Upload Image
                  </button>
                  <label style={labelStyle}>Or image URL</label>
                  <input value={selected.content.startsWith('data:') ? '' : selected.content}
                    onChange={(e) => updateBlock(selected.id, { content: e.target.value })}
                    placeholder="https://..." style={fieldStyle} />
                  <label style={labelStyle}>Fit</label>
                  <select value={selected.objectFit || 'contain'}
                    onChange={(e) => updateBlock(selected.id, { objectFit: e.target.value as StoryBlock['objectFit'] })} style={fieldStyle}>
                    <option value="contain" style={{ background: '#0f1123' }}>Contain — full image</option>
                    <option value="cover" style={{ background: '#0f1123' }}>Cover — fill frame</option>
                    <option value="fill" style={{ background: '#0f1123' }}>Fill — stretch</option>
                  </select>
                  <label style={labelStyle}>Image background</label>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <button type="button" style={{
                      ...btnStyle, flex: 1, justifyContent: 'center',
                      background: selected.showFrameBg === false ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.05)',
                      borderColor: selected.showFrameBg === false ? '#a78bfa' : 'rgba(255,255,255,0.12)',
                    }} onClick={() => updateBlock(selected.id, { showFrameBg: false })}>
                      No background
                    </button>
                    <button type="button" style={{
                      ...btnStyle, flex: 1, justifyContent: 'center',
                      background: selected.showFrameBg !== false ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.05)',
                      borderColor: selected.showFrameBg !== false ? '#a78bfa' : 'rgba(255,255,255,0.12)',
                    }} onClick={() => updateBlock(selected.id, { showFrameBg: true, frameBg: selected.frameBg || '#fffbeb' })}>
                      With color
                    </button>
                  </div>
                  {selected.showFrameBg !== false && (
                    <input type="color" value={selected.frameBg?.startsWith('#') ? selected.frameBg : '#fffbeb'}
                      onChange={(e) => updateBlock(selected.id, { showFrameBg: true, frameBg: e.target.value })}
                      style={{ ...fieldStyle, height: 38, padding: 3, cursor: 'pointer' }}
                    />
                  )}
                </>
              )}

              {selected.type === 'video' && (
                <>
                  <label style={labelStyle}>Video URL</label>
                  <input value={selected.content} onChange={(e) => updateBlock(selected.id, { content: e.target.value })}
                    placeholder="https://youtube.com/..." style={fieldStyle} />
                </>
              )}

              <label style={{ ...labelStyle, display: 'block' }}>Layer</label>
              <input type="number" value={selected.zIndex}
                onChange={(e) => updateBlock(selected.id, { zIndex: Number(e.target.value) || 1 })} style={fieldStyle} />
            </>
          )}
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#c4b5fd', marginBottom: 8 }}>
          Live preview · Level {levelNumber} · {normalized.pages.length} page{normalized.pages.length === 1 ? '' : 's'}
        </div>
        <div style={{ height: 440, borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
          <StoryPageRenderer
            title={title}
            levelNumber={levelNumber}
            layout={{ pages: normalized.pages }}
            vocabulary={vocabulary}
            pageIndex={pageIndex}
            onPageIndexChange={setPageIndex}
          />
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 11, color: '#64748b' }}>
          Content sync: {flattenLayoutText({ pages: normalized.pages }).slice(0, 80) || '—'}…
        </p>
      </div>
    </div>
  );
}
