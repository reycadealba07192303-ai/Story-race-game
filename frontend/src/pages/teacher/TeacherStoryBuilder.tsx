import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  createManualCampaignAPI,
  generateCampaignAPI,
  getCampaignByIdAPI,
  updateCampaignAPI,
  deleteCampaignAPI,
} from '../../services/api';
import { CAMPAIGN_TEMPLATES } from '../../themes/campaignThemes';
import QuizQuestionEditor, { QuizTypePicker } from '../../components/quiz/QuizQuestionEditor';
import { createEmptyQuestion, normalizeQuestion, type QuizQuestion } from '../../types/quiz';
import {
  Upload, FileText, Award, ChevronDown, Check, X,
  BookOpen, Clock, Wand2, Layers, Sparkles, Plus, Trash2, RefreshCw, PenLine, Loader,
} from 'lucide-react';
import StoryCanvasEditor from '../../components/story/StoryCanvasEditor';
import StoryPageRenderer from '../../components/story/StoryPageRenderer';
import { getSectionsAPI, type Section } from '../../services/usersApi';
import {
  flattenLayoutText,
  layoutFromStoryContent,
  normalizeStoryLayout,
  type StoryLayout,
} from '../../types/storyLayout';
import { useDialog } from '../../components/DialogProvider';

// ── Types ──────────────────────────────────────────────────────────────────
interface VocabEntry { word: string; definition: string; example?: string; }
interface LevelData {
  levelNumber: number;
  storyNode: { title: string; content: string; vocabulary: VocabEntry[]; storyLayout?: StoryLayout };
  mediaPrompt: string;
  quiz: QuizQuestion[];
  customImage?: string | null;
}

function ensureStoryLayout(level: LevelData): LevelData {
  const normalized = normalizeStoryLayout(
    level.storyNode.storyLayout?.pages?.length || level.storyNode.storyLayout?.blocks?.length
      ? level.storyNode.storyLayout
      : layoutFromStoryContent(level.storyNode.content, level.storyNode.title)
  );

  // If AI generated a cover illustration, inject it into the first image block
  // of each page so the storybook looks illustrated right away.
  const aiImage = level.customImage || null;

  return {
    ...level,
    storyNode: {
      ...level.storyNode,
      storyLayout: {
        pages: normalized.pages.map((p, pageIdx) => ({
          ...p,
          blocks: p.blocks.map((b, bIdx) => {
            const base = {
              ...b,
              fontFamily: b.fontFamily || 'Fredoka, sans-serif',
              color: b.color || (b.type === 'text' ? '#3b2f2f' : b.color),
              objectFit: b.type === 'image' ? (b.objectFit || 'cover') : b.objectFit,
              showFrameBg: b.type === 'image' ? (b.showFrameBg !== false) : b.showFrameBg,
            };
            // Auto-fill the first image block on pages 0 & 1 with the AI illustration
            if (
              aiImage &&
              b.type === 'image' &&
              !b.content &&
              pageIdx <= 1 &&
              bIdx === p.blocks.findIndex(x => x.type === 'image')
            ) {
              return { ...base, content: aiImage, objectFit: 'cover' as const };
            }
            return base;
          }),
        })),
      },
    },
  };
}


function normalizeLevels(levels: LevelData[]) {
  return levels.map((l) => ensureStoryLayout({
    ...l,
    quiz: (l.quiz || []).map(normalizeQuestion),
  }));
}
interface CampaignData {
  _id?: string;
  title: string;
  theme: string;
  moralLesson: string;
  levels: LevelData[];
  storySource?: 'ai' | 'manual';
  description?: string;
  targetSection?: string;
  templateId?: string;
  customTheme?: string | null;
  published?: boolean;
}

type EditorTab = 'story' | 'vocabulary' | 'quiz' | 'preview';

// ── Helpers ────────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--db-input)', border: '1px solid var(--db-border)',
  borderRadius: 10, padding: '8px 12px', color: 'var(--db-text)', fontSize: 13,
  outline: 'none', boxSizing: 'border-box', fontFamily: 'Outfit, sans-serif',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'none' as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  paddingRight: 40,
  cursor: 'pointer',
};

export default function TeacherStoryBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');
  const { alert, confirm } = useDialog();

  // ── Step ──
  const [step, setStep] = useState<'details' | 'editor'>('details');
  const [loadingExisting, setLoadingExisting] = useState(Boolean(editId));
  const [isExisting, setIsExisting] = useState(Boolean(editId));

  // ── Step 1 state ──
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [numLevels, setNumLevels] = useState<number | ''>(5);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(CAMPAIGN_TEMPLATES[0].id);
  const [customTheme, setCustomTheme] = useState('');
  const [storySource, setStorySource] = useState<'ai' | 'manual'>('ai');

  // ── Step 2 state ──
  const [campaignData, setCampaignData] = useState<CampaignData | null>(null);
  const [levels, setLevels] = useState<LevelData[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<EditorTab>('story');
  const [showRewardsModal, setShowRewardsModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [draggingLevelIndex, setDraggingLevelIndex] = useState<number | null>(null);

  // ── Publish schedule modal state ──
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishDate, setPublishDate] = useState('');
  const [publishTime, setPublishTime] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [sectionDropdownOpen, setSectionDropdownOpen] = useState(false);

  // ── Refs ──
  const fileInputRef = useRef<HTMLInputElement>(null);
  const storyFileRef = useRef<HTMLInputElement>(null);

  const [availableSections, setAvailableSections] = useState<Section[]>([]);
  
  useEffect(() => {
    let cancelled = false;
    getSectionsAPI().then(res => {
      if (!cancelled) setAvailableSections(res.sections || []);
    }).catch(console.error);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!editId) {
      setLoadingExisting(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingExisting(true);
      try {
        const data = await getCampaignByIdAPI(editId);
        if (cancelled) return;
        const camp = data.campaign;
        const knownIds = new Set(CAMPAIGN_TEMPLATES.map((t) => t.id));
        const tpl = camp.templateId && knownIds.has(camp.templateId) ? camp.templateId : (camp.customTheme ? 'others' : 'space');

        setTitle(camp.title || '');
        setDescription(camp.description || '');
        setSelectedSections(camp.targetSection ? camp.targetSection.split(',').map((s: string) => s.trim()) : []);
        setNumLevels(camp.numLevels || camp.levels?.length || 5);
        setSelectedTemplate(tpl);
        setCustomTheme(camp.customTheme || '');
        setStorySource(camp.storySource === 'manual' ? 'manual' : 'ai');
        if (camp.coverImage) setCoverImage(camp.coverImage);
        setCampaignData({
          _id: camp._id,
          title: camp.title,
          theme: camp.theme,
          moralLesson: camp.moralLesson,
          levels: camp.levels,
          storySource: camp.storySource,
          description: camp.description,
          targetSection: camp.targetSection,
          templateId: camp.templateId,
          customTheme: camp.customTheme,
          published: camp.published,
        });
        const normalized = normalizeLevels(camp.levels || []);
        setLevels(normalized);
        setCurrentLevel(normalized[0]?.levelNumber || 1);
        setActiveTab('story');
        setIsExisting(true);
        setStep('editor');
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          await alert({
            title: 'Could not open story',
            message: 'This story could not be loaded. It may have been deleted.',
            variant: 'danger',
          });
          navigate('/teacher/stories');
        }
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  const selectedThemePreview =
    selectedTemplate === 'others'
      ? null
      : CAMPAIGN_TEMPLATES.find((t) => t.id === selectedTemplate) || CAMPAIGN_TEMPLATES[0];

  // ── Cover upload ──
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => setCoverImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  // ── Immutable level updater ──
  const updateLevel = (levelNum: number, updater: (lvl: LevelData) => LevelData) => {
    setLevels(prev => prev.map(l => l.levelNumber === levelNum ? updater(l) : l));
  };

  const reorderLevels = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setLevels(prev => {
      const copy = [...prev];
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);
      // Renumber after reorder so UI + backend stays consistent
      return copy.map((lvl, idx) => ({ ...lvl, levelNumber: idx + 1 }));
    });
    setCurrentLevel(toIndex + 1);
    setActiveTab('story');
  };

  const addStoryPage = () => {
    const newLevelNumber = levels.length + 1;
    const newLevel: LevelData = {
      levelNumber: newLevelNumber,
      storyNode: { title: '', content: '', vocabulary: [], storyLayout: layoutFromStoryContent('') },
      mediaPrompt: '',
      quiz: [],
      customImage: null,
    };
    setLevels(prev => [...prev, newLevel]);
    setCurrentLevel(newLevelNumber);
    setActiveTab('story');
  };

  const currentLevelData = levels.find(l => l.levelNumber === currentLevel);

  // ── Generate campaign via backend (Groq, free, invisible to users) ──
  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      if (storySource === 'manual') {
        const response = await createManualCampaignAPI({
          title, description, section: selectedSections.join(', '), numLevels: numLevels || 5,
          templateId: selectedTemplate === 'others' ? 'space' : selectedTemplate,
          customTheme: selectedTemplate === 'others' ? customTheme : undefined,
        });
        const camp: CampaignData = response.campaign;
        setCampaignData({ ...camp, storySource: 'manual' });
        setLevels(normalizeLevels(camp.levels));
      } else {
        const response = await generateCampaignAPI({
          title, description, section: selectedSections.join(', '), numLevels: numLevels || 5,
          templateId: selectedTemplate === 'others' ? 'others' : selectedTemplate,
          customTheme: selectedTemplate === 'others' ? customTheme : undefined,
        });
        const camp: CampaignData = response.campaign;
        setCampaignData({ ...camp, storySource: 'ai' });
        setLevels(normalizeLevels(camp.levels));
      }
      setCurrentLevel(1);
      setActiveTab('story');
      setStep('editor');
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      await alert({
        title: 'Campaign failed',
        message: storySource === 'manual'
          ? 'Failed to create campaign. Make sure the backend is running.\n\n' + msg
          : 'Failed to generate campaign. Make sure the backend is running and GROQ_API_KEY is set in .env.\n\n' + msg,
        variant: 'danger',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStoryFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      updateLevel(currentLevel, (l) => ({
        ...l,
        storyNode: {
          ...l.storyNode,
          content: text,
          storyLayout: layoutFromStoryContent(text, l.storyNode.title),
        },
      }));
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // ── Regenerate a single level section ──
  const handleRegenerate = async (type: 'story' | 'quiz') => {
    if (campaignData?.storySource === 'manual') return;
    setRegenerating(type);
    try {
      const response = await generateCampaignAPI({
        title, description, section: selectedSections.join(', '), numLevels: 1,
      });
      const freshLevel: LevelData = response.campaign.levels[0];
      updateLevel(currentLevel, lvl => type === 'story'
        ? {
          ...lvl,
          storyNode: {
            ...freshLevel.storyNode,
            storyLayout: layoutFromStoryContent(freshLevel.storyNode.content, freshLevel.storyNode.title),
          },
        }
        : { ...lvl, quiz: (freshLevel.quiz || []).map(normalizeQuestion) }
      );
    } catch {
      await alert({ title: 'Regeneration failed', message: 'Try again.', variant: 'danger' });
    } finally {
      setRegenerating(null);
    }
  };

  // ── Save Draft / Update ──
  const handleSave = async (publish: boolean) => {
    if (!campaignData?._id) return;
    setIsSaving(true);
    try {
      await updateCampaignAPI(campaignData._id, {
        levels,
        published: publish,
        title,
        description,
        targetSection: selectedSections.join(', '),
        templateId: selectedTemplate === 'others' ? 'others' : selectedTemplate,
        customTheme: selectedTemplate === 'others' ? customTheme : null,
        numLevels: levels.length,
        coverImage: coverImage || null,
      });
      await alert({
        title: publish ? 'Published' : 'Draft saved',
        message: publish ? 'Story is now available to students.' : 'Your changes were saved.',
        variant: 'success',
      });
      if (publish) navigate('/teacher/stories');
    } catch {
      await alert({ title: 'Save failed', message: 'Try again.', variant: 'danger' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!campaignData?._id) return;
    const ok = await confirm({
      title: 'Delete story?',
      message: `Delete "${title || campaignData.title}"? This cannot be undone.`,
      variant: 'danger',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    setIsDeleting(true);
    try {
      await deleteCampaignAPI(campaignData._id);
      navigate('/teacher/stories');
    } catch {
      await alert({ title: 'Delete failed', message: 'Could not delete this story.', variant: 'danger' });
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Publish with schedule ──
  const handlePublishConfirm = async () => {
    if (!campaignData?._id) return;
    if (!publishDate || !publishTime) {
      await alert({ title: 'Missing schedule', message: 'Please select both a date and time.', variant: 'warning' });
      return;
    }
    setIsPublishing(true);
    try {
      const scheduledAt = new Date(`${publishDate}T${publishTime}`).toISOString();
      await updateCampaignAPI(campaignData._id, {
        levels,
        published: true,
        scheduledAt,
        title,
        description,
        targetSection: selectedSections.join(', '),
        numLevels: levels.length,
      });
      setShowPublishModal(false);
      navigate('/teacher/stories');
    } catch {
      await alert({ title: 'Publish failed', message: 'Try again.', variant: 'danger' });
    } finally {
      setIsPublishing(false);
    }
  };

  // ── Open publish modal with today's date/time pre-filled ──
  const openPublishModal = () => {
    const now = new Date();
    const localDate = now.toLocaleDateString('en-CA'); // yyyy-mm-dd
    const localTime = now.toTimeString().slice(0, 5);  // HH:MM
    setPublishDate(localDate);
    setPublishTime(localTime);
    setShowPublishModal(true);
  };

  // ── Tab styles ──
  const tabBtn = (tab: EditorTab): React.CSSProperties => ({
    padding: '10px 20px', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer',
    border: 'none', transition: 'all 0.2s',
    background: activeTab === tab ? 'rgba(99,102,241,0.2)' : 'transparent',
    color: activeTab === tab ? '#a5b4fc' : '#64748b',
    borderBottom: activeTab === tab ? '2px solid #6366F1' : '2px solid transparent',
  });

  const sectionCard: React.CSSProperties = {
    background: 'rgba(20,24,45,0.6)', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 18, padding: 24, marginBottom: 16,
  };

  const btnSecondary: React.CSSProperties = {
    padding: '8px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', fontSize: 13,
    fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
  };

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="db-wrap" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--db-bg)', fontFamily: 'Outfit, sans-serif', overflowY: 'auto', color: 'var(--db-text)', width: '100%' }}>

      {/* Hidden inputs */}
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
      <input ref={storyFileRef} type="file" accept=".txt,.md,text/plain" style={{ display: 'none' }} onChange={handleStoryFileUpload} />

      {loadingExisting && (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          color: '#94a3b8', fontWeight: 700, fontSize: 15,
        }}>
          <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /> Opening story…
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          STEP 1 — Campaign Details
      ═══════════════════════════════════════════════════════════════ */}
      {!loadingExisting && step === 'details' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-15%', left: '10%', width: 600, height: 600, background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(90px)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '-15%', right: '10%', width: 600, height: 600, background: 'radial-gradient(circle, rgba(236,72,153,0.14) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(100px)', pointerEvents: 'none' }} />

          <header style={{ width: '100%', height: 72, padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10, background: 'var(--db-card)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--db-border)' }}>
            <button onClick={() => navigate('/teacher/stories')} style={{ background: 'var(--db-bg)', border: '1px solid var(--db-border)', padding: '10px 22px', borderRadius: 12, color: 'var(--db-text)', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--db-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--db-bg)'; }}>
              <ChevronDown size={18} style={{ transform: 'rotate(90deg)', color: 'var(--db-accent)' }} /> Back to Stories
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, var(--db-accent), var(--db-purple))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Wand2 color="#fff" size={20} />
              </div>
              <div>
                <h1 style={{ fontSize: 18, fontWeight: 900, color: 'var(--db-text)', margin: 0 }}>AI Story Campaign Studio</h1>
                <p style={{ color: 'var(--db-muted)', fontSize: 12, margin: 0 }}>Gamified Multi-Level Learning Generator</p>
              </div>
            </div>
            <div style={{ width: 120 }} />
          </header>

          <main style={{ flex: 1, padding: '24px', display: 'flex', zIndex: 2, overflow: 'hidden' }}>
            <div className="db-builder-details-panel">

              {/* Left Column: Cover Upload only */}
              <div className="db-builder-cover-col">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--db-accent)', letterSpacing: 1.5, textTransform: 'uppercase' }}>Campaign Cover</span>
                  <span style={{ fontSize: 11, background: 'rgba(139,92,246,0.15)', color: 'var(--db-accent)', padding: '4px 10px', borderRadius: 20, fontWeight: 700 }}>Optional</span>
                </div>
                <div onClick={() => fileInputRef.current?.click()} style={{ flex: 1, background: coverImage ? `url(${coverImage}) center/cover` : 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(236,72,153,0.05))', border: coverImage ? '1px solid rgba(255,255,255,0.2)' : '2px dashed rgba(139,92,246,0.3)', borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', overflow: 'hidden', minHeight: 280 }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#8B5CF6'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = coverImage ? 'rgba(255,255,255,0.2)' : 'rgba(139,92,246,0.3)'; }}>
                  {!coverImage ? (
                    <div style={{ textAlign: 'center', padding: 16 }}>
                      <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                        <Upload size={24} color="#a78bfa" />
                      </div>
                      <div style={{ color: 'var(--db-text)', fontWeight: 800, fontSize: 15, marginBottom: 4 }}>Upload Cover Artwork</div>
                      <div style={{ color: 'var(--db-muted)', fontSize: 12 }}>PNG, JPG or WebP</div>
                    </div>
                  ) : (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,17,35,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0'}>
                      <div style={{ background: 'rgba(255,255,255,0.2)', padding: '10px 24px', borderRadius: 50, color: '#fff', fontWeight: 800, fontSize: 13 }}>Change Cover</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Form */}
              <div className="db-builder-form-col">
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--db-accent)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16 }}>Campaign Settings</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--db-text)', fontWeight: 700, marginBottom: 4, fontSize: 12 }}><FileText size={14} color="var(--db-accent)" /> Story Campaign Title</label>
                      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. The Quest for the Lost Compass" style={inputStyle}
                        onFocus={e => { e.currentTarget.style.borderColor = '#818cf8'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(129,140,248,0.15)'; }}
                        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none'; }} />
                    </div>
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--db-text)', fontWeight: 700, marginBottom: 4, fontSize: 12 }}><BookOpen size={14} color="var(--db-green)" /> Story Synopsis / Description</label>
                      <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Provide a brief summary or story idea..." rows={3}
                        style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
                        onFocus={e => { e.currentTarget.style.borderColor = '#34d399'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(52,211,153,0.15)'; }}
                        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none'; }} />
                    </div>
                    <div className="db-form-split">
                      <div style={{ position: 'relative' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--db-text)', fontWeight: 700, marginBottom: 8, fontSize: 12 }}><BookOpen size={14} color="var(--db-yellow)" /> Target Section</label>
                        {/* Dropdown trigger */}
                        <button
                          type="button"
                          onClick={() => setSectionDropdownOpen(o => !o)}
                          style={{
                            ...inputStyle,
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            cursor: 'pointer', textAlign: 'left',
                            border: sectionDropdownOpen ? '1px solid var(--db-accent)' : '1px solid var(--db-border)',
                          }}
                        >
                          <span style={{ color: selectedSections.length > 0 ? 'var(--db-text)' : 'var(--db-muted)', fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {selectedSections.length > 0 ? selectedSections.join(', ') : 'Select sections...'}
                          </span>
                          <ChevronDown size={14} style={{ flexShrink: 0, marginLeft: 8, transition: 'transform 0.2s', transform: sectionDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', color: 'var(--db-muted)' }} />
                        </button>
                        {/* Dropdown panel */}
                        {sectionDropdownOpen && (
                          <div style={{
                            position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                            background: 'var(--db-card)', border: '1px solid var(--db-border)',
                            borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                            zIndex: 100, overflow: 'hidden',
                          }}>
                            {availableSections.length > 0 ? availableSections.map(sec => (
                              <label
                                key={sec.id}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 10,
                                  padding: '10px 14px', cursor: 'pointer', fontSize: 13,
                                  color: 'var(--db-text)',
                                  background: selectedSections.includes(sec.name) ? 'rgba(var(--db-accent-rgb, 99,102,241),0.1)' : 'transparent',
                                  transition: 'background 0.15s',
                                }}
                                onMouseEnter={e => { if (!selectedSections.includes(sec.name)) (e.currentTarget as HTMLElement).style.background = 'var(--db-hover)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = selectedSections.includes(sec.name) ? 'rgba(99,102,241,0.1)' : 'transparent'; }}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedSections.includes(sec.name)}
                                  onChange={e => {
                                    if (e.target.checked) setSelectedSections(prev => [...prev, sec.name]);
                                    else setSelectedSections(prev => prev.filter(s => s !== sec.name));
                                  }}
                                  style={{ accentColor: 'var(--db-accent)', width: 15, height: 15 }}
                                />
                                <span style={{ fontWeight: selectedSections.includes(sec.name) ? 700 : 500 }}>{sec.name}</span>
                                {selectedSections.includes(sec.name) && <Check size={13} color="var(--db-accent)" style={{ marginLeft: 'auto' }} />}
                              </label>
                            )) : (
                              <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--db-muted)' }}>No sections handled yet</div>
                            )}
                          </div>
                        )}
                      </div>
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--db-text)', fontWeight: 700, marginBottom: 8, fontSize: 12 }}><Layers size={14} color="var(--db-purple)" /> Number of Levels</label>
                        <input type="number" min="1" max="10" value={numLevels} onChange={e => setNumLevels(parseInt(e.target.value) || '')} style={inputStyle}
                          onFocus={e => { e.currentTarget.style.borderColor = '#a78bfa'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(167,139,250,0.15)'; }}
                          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none'; }} />
                      </div>
                    </div>

                    {/* Story Source */}
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--db-text)', fontWeight: 700, marginBottom: 6, fontSize: 12 }}>
                        <BookOpen size={14} color="var(--db-green)" /> Story Source
                      </label>
                      <div className="db-dashboard-two-col" style={{ gap: 10 }}>
                        <button
                          type="button"
                          onClick={() => setStorySource('ai')}
                          style={{
                            padding: '12px 14px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                            background: storySource === 'ai' ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                            border: storySource === 'ai' ? '2px solid #818cf8' : '1px solid var(--db-border)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <Wand2 size={15} color="var(--db-accent)" />
                            <span style={{ fontWeight: 800, color: 'var(--db-text)', fontSize: 13 }}>AI Generated</span>
                          </div>
                          <p style={{ margin: 0, fontSize: 11, color: 'var(--db-muted)' }}>Auto-create story, vocabulary & quiz drafts.</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => setStorySource('manual')}
                          style={{
                            padding: '12px 14px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                            background: storySource === 'manual' ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.03)',
                            border: storySource === 'manual' ? '2px solid #34d399' : '1px solid var(--db-border)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <PenLine size={15} color="var(--db-green)" />
                            <span style={{ fontWeight: 800, color: 'var(--db-text)', fontSize: 13 }}>Manual Upload</span>
                          </div>
                          <p style={{ margin: 0, fontSize: 11, color: 'var(--db-muted)' }}>Write or upload your own story & build custom quizzes.</p>
                        </button>
                      </div>
                    </div>

                    {/* Level Map Theme — dropdown */}
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--db-text)', fontWeight: 700, marginBottom: 6, fontSize: 12 }}>
                        <Sparkles size={14} color="var(--db-accent)" /> Level Map Theme
                      </label>
                      <p style={{ margin: '0 0 8px', fontSize: 11, color: 'var(--db-muted)' }}>
                        Students will see this as the game map background.
                      </p>
                      <select
                        value={selectedTemplate}
                        onChange={(e) => {
                          const next = e.target.value;
                          setSelectedTemplate(next);
                          if (next !== 'others') setCustomTheme('');
                        }}
                        style={selectStyle}
                      >
                        {CAMPAIGN_TEMPLATES.map((tpl) => (
                          <option key={tpl.id} value={tpl.id} style={{ background: 'var(--db-input)', color: 'var(--db-text)' }}>
                            {tpl.emoji} {tpl.name}
                          </option>
                        ))}
                        <option value="others" style={{ background: 'var(--db-input)', color: 'var(--db-text)' }}>
                          ✏️ Custom Theme
                        </option>
                      </select>

                      {selectedThemePreview && (
                        <div style={{
                          marginTop: 8, borderRadius: 12, overflow: 'hidden',
                          border: '1px solid var(--db-border)',
                        }}>
                          <div style={{
                            height: 48, background: selectedThemePreview.preview,
                            display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px',
                          }}>
                            <span style={{ fontSize: 18 }}>{selectedThemePreview.emoji}</span>
                            <span style={{ fontWeight: 800, color: '#fff', fontSize: 12, textShadow: '0 1px 4px rgba(0,0,0,0.45)' }}>
                              {selectedThemePreview.name}
                            </span>
                          </div>
                        </div>
                      )}

                      {selectedTemplate === 'others' && (
                        <input
                          value={customTheme}
                          onChange={e => setCustomTheme(e.target.value)}
                          placeholder="e.g. Underwater Kingdom..."
                          style={{ ...inputStyle, marginTop: 12 }}
                          onFocus={e => { e.currentTarget.style.borderColor = '#8B5CF6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.15)'; }}
                          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
                        />
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 'auto', paddingTop: 32 }}>
                  <div style={{ padding: '10px 14px', background: storySource === 'ai' ? 'rgba(139,92,246,0.1)' : 'rgba(16,185,129,0.1)', border: storySource === 'ai' ? '1px dashed rgba(139,92,246,0.3)' : '1px dashed rgba(16,185,129,0.3)', borderRadius: 12, color: storySource === 'ai' ? 'var(--db-accent)' : 'var(--db-green)', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    {storySource === 'ai' ? <Wand2 size={15} color="var(--db-accent)" /> : <PenLine size={15} color="var(--db-green)" />}
                    <span>
                      {storySource === 'ai'
                        ? `AI will auto-generate ${numLevels || 5} gamified learning levels.`
                        : `You'll build ${numLevels || 5} levels manually — upload stories & create quizzes yourself.`}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <button onClick={() => navigate('/teacher/stories')} style={{ padding: '12px 20px', borderRadius: 12, fontWeight: 700, fontSize: 13, background: 'var(--db-bg)', border: '1px solid var(--db-border)', color: 'var(--db-muted)', cursor: 'pointer' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--db-border)'; e.currentTarget.style.color = 'var(--db-muted)'; }}>
                      Cancel
                    </button>
                    <button onClick={handleGenerate} disabled={!title || selectedSections.length === 0 || isGenerating}
                      style={{ padding: '12px 28px', borderRadius: 12, fontWeight: 900, fontSize: 14, background: (title && selectedSections.length > 0 && !isGenerating) ? (storySource === 'ai' ? 'linear-gradient(135deg, var(--db-accent), var(--db-purple), #ec4899)' : 'linear-gradient(135deg, var(--db-green), #059669)') : 'var(--db-bg)', border: 'none', color: '#fff', cursor: (title && selectedSections.length > 0 && !isGenerating) ? 'pointer' : 'not-allowed', opacity: (title && selectedSections.length > 0 && !isGenerating) ? 1 : 0.4, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {storySource === 'ai' ? <Wand2 size={16} /> : <PenLine size={16} />}
                      {isGenerating
                        ? (storySource === 'ai' ? 'Generating AI Campaign...' : 'Creating Campaign...')
                        : (storySource === 'ai' ? 'Generate Campaign' : 'Create & Build Manually')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          STEP 2 — Full Rich Editor
      ═══════════════════════════════════════════════════════════════ */}
      {!loadingExisting && step === 'editor' && currentLevelData && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Header */}
          <header style={{ height: 72, background: 'var(--db-card)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--db-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', flexShrink: 0, zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button
                onClick={() => (isExisting ? navigate('/teacher/stories') : setStep('details'))}
                style={{ background: 'var(--db-bg)', border: '1px solid var(--db-border)', width: 38, height: 38, borderRadius: 10, color: 'var(--db-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--db-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--db-bg)'}
                title={isExisting ? 'Back to stories' : 'Back to details'}
              >
                <ChevronDown size={18} style={{ transform: 'rotate(90deg)' }} />
              </button>
              <div>
                <h3 style={{ margin: 0, fontWeight: 900, color: 'var(--db-text)', fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={15} color="var(--db-accent)" /> {title || campaignData?.title || 'Untitled Story'}
                </h3>
                <div style={{ display: 'flex', gap: 12, marginTop: 2, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 999,
                    background: campaignData?.published ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                    color: campaignData?.published ? '#34d399' : '#fbbf24',
                  }}>
                    {campaignData?.published ? 'Published' : 'Draft'}
                  </span>
                  {campaignData?.theme && <span style={{ fontSize: 11, color: 'var(--db-accent)' }}>🎭 {campaignData.theme}</span>}
                  {campaignData?.moralLesson && <span style={{ fontSize: 11, color: 'var(--db-green)' }}>💡 {campaignData.moralLesson}</span>}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {isExisting && (
                <button
                  onClick={handleDelete}
                  disabled={isDeleting || isSaving}
                  style={{
                    padding: '9px 16px', borderRadius: 10, fontWeight: 700, fontSize: 13,
                    background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)',
                    color: '#fca5a5', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7,
                  }}
                >
                  <Trash2 size={14} /> {isDeleting ? 'Deleting…' : 'Delete'}
                </button>
              )}
              <button onClick={() => handleSave(false)} disabled={isSaving || isDeleting} style={{ padding: '9px 20px', borderRadius: 10, fontWeight: 700, fontSize: 13, background: 'var(--db-bg)', border: '1px solid var(--db-border)', color: 'var(--db-text)', cursor: 'pointer' }}>
                {isSaving ? 'Saving...' : 'Save / Update'}
              </button>
              <button onClick={openPublishModal} disabled={isSaving || isDeleting} style={{ padding: '9px 22px', borderRadius: 10, fontWeight: 800, fontSize: 13, background: 'linear-gradient(135deg, #10B981, #059669)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Check size={15} /> Publish Campaign
              </button>
            </div>
          </header>

          <div className="db-builder-editor">

            {/* Sidebar */}
            <div className="db-builder-sidebar">
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--db-accent)', letterSpacing: 1.5, textTransform: 'uppercase', padding: '0 8px', marginBottom: 10 }}>Campaign Map</div>
              <button
                type="button"
                onClick={addStoryPage}
                style={{ ...btnSecondary, width: 'calc(100% - 16px)', marginLeft: 8, marginBottom: 4, borderColor: 'rgba(184,134,11,0.25)', color: '#fcd34d' }}
              >
                + Add Story Page
              </button>
              {levels.map((lvl, idx) => (
                <button
                  key={lvl.levelNumber}
                  draggable
                  onDragStart={(e) => { setDraggingLevelIndex(idx); e.dataTransfer.effectAllowed = 'move'; }}
                  onDragOver={(e) => { e.preventDefault(); }}
                  onDrop={(e) => { e.preventDefault(); if (draggingLevelIndex === null) return; reorderLevels(draggingLevelIndex, idx); setDraggingLevelIndex(null); }}
                  onClick={() => { setCurrentLevel(lvl.levelNumber); setActiveTab('story'); }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px 14px',
                    background: currentLevel === lvl.levelNumber ? 'rgba(99,102,241,0.15)' : 'transparent',
                    border: currentLevel === lvl.levelNumber ? '1px solid rgba(99,102,241,0.35)' : '1px solid transparent',
                    borderRadius: 10,
                    color: currentLevel === lvl.levelNumber ? '#fff' : '#64748b',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    opacity: draggingLevelIndex === idx ? 0.6 : 1,
                    transform: draggingLevelIndex === idx ? 'scale(0.99)' : undefined,
                  }}
                  title="Drag to reorder"
                >
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: currentLevel === lvl.levelNumber ? '#6366F1' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', flexShrink: 0 }}>{lvl.levelNumber}</div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lvl.storyNode.title || `Level ${lvl.levelNumber}`}</div>
                  </div>
                  {currentLevel === lvl.levelNumber && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981', flexShrink: 0 }} />}
                </button>
              ))}
            </div>

            {/* Main editor area */}
            <div className="db-builder-main" style={{ overflowY: 'auto', padding: '28px 36px' }}>
              <div style={{ maxWidth: 1100, margin: '0 auto' }}>

                {/* Level header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#6366F1', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>Level {currentLevel}</div>
                    <input value={currentLevelData.storyNode.title}
                      onChange={e => updateLevel(currentLevel, l => ({ ...l, storyNode: { ...l.storyNode, title: e.target.value } }))}
                      style={{ background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 26, fontWeight: 900, fontFamily: 'Outfit, sans-serif', width: '100%' }}
                      placeholder="Level Title..." />
                  </div>
                  <button onClick={() => setShowRewardsModal(true)} style={{ padding: '9px 18px', borderRadius: 10, fontWeight: 800, fontSize: 12, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#FCD34D', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
                    <Award size={14} /> Rewards
                  </button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 0 }}>
                  {(['story', 'vocabulary', 'quiz', 'preview'] as EditorTab[]).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} style={tabBtn(tab)}>
                      {tab === 'story' && '📖 Story'}
                      {tab === 'vocabulary' && '📚 Vocabulary'}
                      {tab === 'quiz' && '🧩 Quiz'}
                      {tab === 'preview' && '📕 Storybook Preview'}
                    </button>
                  ))}
                </div>

                {/* ── STORY TAB (Visual Designer) ── */}
                {activeTab === 'story' && currentLevelData.storyNode.storyLayout && (
                  <div>
                    <div style={{ ...sectionCard, marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <FileText size={16} color="#818cf8" />
                          <span style={{ fontWeight: 800, fontSize: 14, color: '#e2e8f0' }}>Story Designer</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => storyFileRef.current?.click()} style={btnSecondary}>
                            <Upload size={13} /> Import .txt
                          </button>
                          {campaignData?.storySource !== 'manual' && (
                            <button onClick={() => handleRegenerate('story')} disabled={regenerating === 'story'} style={btnSecondary}>
                              <RefreshCw size={13} style={{ animation: regenerating === 'story' ? 'spin 1s linear infinite' : 'none' }} />
                              {regenerating === 'story' ? 'Regenerating...' : 'Regenerate Story'}
                            </button>
                          )}
                        </div>
                      </div>
                      <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
                        Canva-style designer — add pages, remove backgrounds, style fonts & images (works for AI + manual).
                      </p>
                    </div>

                    <StoryCanvasEditor
                      title={currentLevelData.storyNode.title}
                      levelNumber={currentLevel}
                      layout={normalizeStoryLayout(currentLevelData.storyNode.storyLayout)}
                      vocabulary={currentLevelData.storyNode.vocabulary}
                      onVocabularyChange={(vocabulary) => updateLevel(currentLevel, (l) => ({
                        ...l,
                        storyNode: { ...l.storyNode, vocabulary },
                      }))}
                      onChange={(storyLayout) => updateLevel(currentLevel, (l) => ({
                        ...l,
                        storyNode: {
                          ...l.storyNode,
                          storyLayout: normalizeStoryLayout(storyLayout),
                          content: flattenLayoutText(storyLayout),
                        },
                      }))}
                    />
                  </div>
                )}

                {/* ── VOCABULARY TAB ── */}
                {activeTab === 'vocabulary' && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <BookOpen size={16} color="#34d399" />
                        <span style={{ fontWeight: 800, fontSize: 14, color: '#e2e8f0' }}>Vocabulary Words ({currentLevelData.storyNode.vocabulary.length})</span>
                      </div>
                      <button onClick={() => updateLevel(currentLevel, l => ({ ...l, storyNode: { ...l.storyNode, vocabulary: [...l.storyNode.vocabulary, { word: '', definition: '' }] } }))} style={{ ...btnSecondary, color: '#34d399', borderColor: 'rgba(52,211,153,0.3)' }}>
                        <Plus size={13} /> Add Word
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {currentLevelData.storyNode.vocabulary.map((v, i) => (
                        <div key={i} style={{ ...sectionCard, display: 'flex', gap: 14, alignItems: 'flex-start', padding: 16, marginBottom: 0 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(52,211,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, color: '#34d399', fontWeight: 800 }}>{i + 1}</div>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <input value={v.word} placeholder="Word" onChange={e => updateLevel(currentLevel, l => {
                              const vocab = [...l.storyNode.vocabulary]; vocab[i] = { ...vocab[i], word: e.target.value };
                              return { ...l, storyNode: { ...l.storyNode, vocabulary: vocab } };
                            })} style={{ ...inputStyle, fontWeight: 700 }} />
                            <input value={v.definition} placeholder="Definition" onChange={e => updateLevel(currentLevel, l => {
                              const vocab = [...l.storyNode.vocabulary]; vocab[i] = { ...vocab[i], definition: e.target.value };
                              return { ...l, storyNode: { ...l.storyNode, vocabulary: vocab } };
                            })} style={inputStyle} />
                            <input value={v.example || ''} placeholder="Example sentence (optional)" onChange={e => updateLevel(currentLevel, l => {
                              const vocab = [...l.storyNode.vocabulary]; vocab[i] = { ...vocab[i], example: e.target.value };
                              return { ...l, storyNode: { ...l.storyNode, vocabulary: vocab } };
                            })} style={{ ...inputStyle, fontStyle: 'italic', color: '#94a3b8' }} />
                          </div>
                          <button onClick={() => updateLevel(currentLevel, l => ({ ...l, storyNode: { ...l.storyNode, vocabulary: l.storyNode.vocabulary.filter((_, vi) => vi !== i) } }))}
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 6, flexShrink: 0 }}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                      {currentLevelData.storyNode.vocabulary.length === 0 && (
                        <div style={{ textAlign: 'center', color: '#475569', padding: 32, border: '2px dashed rgba(255,255,255,0.06)', borderRadius: 16 }}>No vocabulary words yet. Click "Add Word" to get started.</div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── QUIZ TAB ── */}
                {activeTab === 'quiz' && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Clock size={16} color="#fbbf24" />
                        <span style={{ fontWeight: 800, fontSize: 14, color: '#e2e8f0' }}>Quiz Questions ({currentLevelData.quiz.length})</span>
                      </div>
                      {campaignData?.storySource !== 'manual' && (
                        <button onClick={() => handleRegenerate('quiz')} disabled={regenerating === 'quiz'} style={btnSecondary}>
                          <RefreshCw size={13} style={{ animation: regenerating === 'quiz' ? 'spin 1s linear infinite' : 'none' }} />
                          {regenerating === 'quiz' ? 'Regenerating...' : 'Regenerate Quiz'}
                        </button>
                      )}
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, marginBottom: 8 }}>Add question type:</div>
                      <QuizTypePicker onSelect={(type) => updateLevel(currentLevel, l => ({
                        ...l,
                        quiz: [...l.quiz, createEmptyQuestion(type)],
                      }))} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {currentLevelData.quiz.length === 0 && (
                        <div style={{ textAlign: 'center', color: '#475569', padding: 32, border: '2px dashed rgba(255,255,255,0.06)', borderRadius: 16 }}>
                          No quiz questions yet. Pick a question type above to add one.
                        </div>
                      )}
                      {currentLevelData.quiz.map((q, qi) => (
                        <QuizQuestionEditor
                          key={qi}
                          question={q}
                          index={qi}
                          total={currentLevelData.quiz.length}
                          onChange={(updated) => updateLevel(currentLevel, l => {
                            const quiz = [...l.quiz];
                            quiz[qi] = updated;
                            return { ...l, quiz };
                          })}
                          onDelete={() => updateLevel(currentLevel, l => ({ ...l, quiz: l.quiz.filter((_, i) => i !== qi) }))}
                          onMoveUp={() => updateLevel(currentLevel, l => {
                            const quiz = [...l.quiz];
                            if (qi > 0) [quiz[qi - 1], quiz[qi]] = [quiz[qi], quiz[qi - 1]];
                            return { ...l, quiz };
                          })}
                          onMoveDown={() => updateLevel(currentLevel, l => {
                            const quiz = [...l.quiz];
                            if (qi < quiz.length - 1) [quiz[qi], quiz[qi + 1]] = [quiz[qi + 1], quiz[qi]];
                            return { ...l, quiz };
                          })}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* ── STORYBOOK PREVIEW TAB ── */}
                {activeTab === 'preview' && currentLevelData.storyNode.storyLayout && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                      <BookOpen size={16} color="#b8860b" />
                      <span style={{ fontWeight: 800, fontSize: 14, color: '#e2e8f0' }}>Storyboard Preview</span>
                      <span style={{ fontSize: 11, background: 'rgba(184,134,11,0.15)', color: '#d4a843', padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>Student view</span>
                    </div>

                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
                      <button type="button" onClick={addStoryPage} style={{ ...btnSecondary, borderColor: 'rgba(184,134,11,0.25)', color: '#fcd34d' }}>
                        + Add Story Page
                      </button>
                      {levels.map((lvl, idx) => (
                        <div
                          key={lvl.levelNumber}
                          draggable
                          onDragStart={(e) => { setDraggingLevelIndex(idx); e.dataTransfer.effectAllowed = 'move'; }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => { e.preventDefault(); if (draggingLevelIndex === null) return; reorderLevels(draggingLevelIndex, idx); setDraggingLevelIndex(null); }}
                          onClick={() => { setCurrentLevel(lvl.levelNumber); setActiveTab('preview'); }}
                          style={{
                            userSelect: 'none', cursor: 'pointer', padding: '10px 12px', borderRadius: 14,
                            border: currentLevel === lvl.levelNumber ? '1px solid rgba(168,85,247,0.65)' : '1px solid rgba(255,255,255,0.08)',
                            background: currentLevel === lvl.levelNumber ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                            color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 10,
                            opacity: draggingLevelIndex === idx ? 0.6 : 1,
                          }}
                          title="Drag to reorder"
                        >
                          <div style={{ width: 26, height: 26, borderRadius: 9, background: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 12 }}>
                            {idx + 1}
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 800, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {lvl.storyNode.title || `Level ${idx + 1}`}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ height: 'min(72vh, 640px)', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 60px rgba(0,0,0,0.45)' }}>
                      <StoryPageRenderer
                        title={currentLevelData.storyNode.title}
                        levelNumber={currentLevel}
                        layout={normalizeStoryLayout(currentLevelData.storyNode.storyLayout)}
                        vocabulary={currentLevelData.storyNode.vocabulary}
                        showQuizButton
                      />
                    </div>

                    <p style={{ marginTop: 14, fontSize: 12, color: '#64748b', textAlign: 'center' }}>
                      Edit layout in the Story tab. Drag blocks, add images/videos, then preview here.
                    </p>
                  </div>
                )}

                {/* ── REWARDS MODAL ── */}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Rewards Modal ── */}
      {showRewardsModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#13172e', width: 480, borderRadius: 22, padding: 30, border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10, fontSize: 20, fontWeight: 900, color: '#f8fafc' }}>
                <Award color="#F59E0B" size={24} /> Level {currentLevel} Rewards
              </h2>
              <button onClick={() => setShowRewardsModal(false)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Award Certificate', desc: 'Students receive a certificate upon completing this level', icon: '🏆' },
                { label: 'Bonus XP Points', desc: 'Grant extra experience points for this level completion', icon: '⭐' },
                { label: 'Unlock Badge', desc: 'Unlock a special achievement badge for this level', icon: '🎖' },
              ].map(item => (
                <label key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,0.04)', padding: 16, borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked style={{ width: 18, height: 18, accentColor: '#8B5CF6' }} />
                  <div>
                    <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: 14 }}>{item.icon} {item.label}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{item.desc}</div>
                  </div>
                </label>
              ))}
            </div>
            <button onClick={() => setShowRewardsModal(false)} style={{ marginTop: 20, width: '100%', padding: '13px', borderRadius: 12, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', border: 'none', color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
              Save Rewards
            </button>
          </div>
        </div>
      )}

      {/* ── Publish Schedule Modal ── */}
      {showPublishModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div style={{ background: '#13172e', width: 460, borderRadius: 24, padding: 32, border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}>

            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg, #10B981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={20} color="#fff" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#f8fafc' }}>Publish Campaign</h2>
                  <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Set when this campaign goes live</p>
                </div>
              </div>
              <button onClick={() => setShowPublishModal(false)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            {/* Campaign preview */}
            <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 14, padding: '14px 18px', marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#6366F1', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>Campaign</div>
              <div style={{ fontWeight: 800, color: '#f8fafc', fontSize: 15 }}>{title}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{selectedSections.join(', ')} · {levels.length} Levels</div>
            </div>

            {/* Date & Time pickers */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 8, letterSpacing: 0.5 }}>📅 Publish Date</label>
                <input
                  type="date"
                  value={publishDate}
                  min={new Date().toLocaleDateString('en-CA')}
                  onChange={e => setPublishDate(e.target.value)}
                  style={{ ...inputStyle, colorScheme: 'dark', fontSize: 15, padding: '12px 16px' }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#10B981'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.15)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 8, letterSpacing: 0.5 }}>🕐 Publish Time</label>
                <input
                  type="time"
                  value={publishTime}
                  onChange={e => setPublishTime(e.target.value)}
                  style={{ ...inputStyle, colorScheme: 'dark', fontSize: 15, padding: '12px 16px' }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#10B981'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.15)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
            </div>

            {/* Summary line */}
            {publishDate && publishTime && (
              <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 24, fontSize: 13, color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Check size={14} />
                Will publish on {new Date(`${publishDate}T${publishTime}`).toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowPublishModal(false)} style={{ flex: 1, padding: '13px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handlePublishConfirm} disabled={isPublishing || !publishDate || !publishTime}
                style={{ flex: 2, padding: '13px', borderRadius: 12, background: (!publishDate || !publishTime) ? 'rgba(16,185,129,0.3)' : 'linear-gradient(135deg, #10B981, #059669)', border: 'none', color: '#fff', fontWeight: 800, fontSize: 14, cursor: (!publishDate || !publishTime) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: (!publishDate || !publishTime) ? 0.5 : 1 }}>
                <Check size={16} /> {isPublishing ? 'Publishing...' : 'Confirm & Publish'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
