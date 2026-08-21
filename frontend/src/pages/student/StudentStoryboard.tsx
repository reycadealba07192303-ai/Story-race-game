import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { STUDENT_NAV } from './StudentDashboard';
import { useAuth } from '../../context/AuthContext';
import { Star, ArrowLeft, X, Gift, Loader, ChevronLeft, Download } from 'lucide-react';
import { getCampaignTheme } from '../../themes/campaignThemes';
import LevelMapCanvas from '../../components/levelMap/LevelMapCanvas';
import '../../components/levelMap/levelMap.css';
import QuizPlayer from '../../components/quiz/QuizPlayer';
import '../../components/quiz/quizPlayer.css';
import { checkQuizAnswer, normalizeQuestion, QUIZ_TYPE_LABELS, type QuizQuestion } from '../../types/quiz';
import { getPublishedCampaignsAPI } from '../../services/api';
import StoryPageRenderer from '../../components/story/StoryPageRenderer';
import { layoutFromStoryContent, normalizeStoryLayout, type StoryLayout } from '../../types/storyLayout';
import { getMyProgressAPI, recordLevelProgressAPI, claimCampaignRewardAPI } from '../../services/usersApi';
import { downloadAwardCertificate } from '../../utils/awardCertificate';
import { campaignMatchesSection } from '../../utils/sectionMatching';

// ── Types ──────────────────────────────────────────────────────────────────
interface CampaignLevel {
  levelNumber: number;
  storyNode: { title: string; content: string; vocabulary: { word: string; definition: string; example?: string }[]; storyLayout?: StoryLayout };
  quiz: QuizQuestion[];
}
interface Campaign {
  _id: string; title: string; numLevels: number;
  targetSection: string; templateId: string; levels: CampaignLevel[];
}
interface LevelProgress { stars: number; completed: boolean; coins: number; }
interface CampaignRewardMeta { rewardClaimed: boolean; bonusCoins: number; }
type Phase = 'story' | 'quiz' | 'result';

const QUIZ_SECONDS = 40;

export default function StudentStoryboard() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const campaignParam = searchParams.get('campaign');

  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [progress, setProgress] = useState<Record<string, Record<number, LevelProgress>>>({});
  const [rewardMeta, setRewardMeta] = useState<Record<string, CampaignRewardMeta>>({});
  const [showReward, setShowReward] = useState(false);
  const [claimingReward, setClaimingReward] = useState(false);
  const [totalCoins, setTotalCoins] = useState(0);

  const [popupLevel, setPopupLevel] = useState<CampaignLevel | null>(null);
  const [phase, setPhase] = useState<Phase>('story');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(QUIZ_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Promise.all([getPublishedCampaignsAPI(), getMyProgressAPI().catch(() => ({ progress: [] }))])
      .then(([data, prog]) => {
        const list: Campaign[] = (data.campaigns ?? []).filter((c: Campaign) =>
          campaignMatchesSection(c.targetSection, user?.section)
        );

        const mapped: Record<string, Record<number, LevelProgress>> = {};
        const meta: Record<string, CampaignRewardMeta> = {};
        let coins = 0;
        for (const p of prog.progress || []) {
          const cid = String(p.campaignId);
          mapped[cid] = {};
          meta[cid] = {
            rewardClaimed: Boolean(p.rewardClaimed),
            bonusCoins: p.bonusCoins || 0,
          };
          for (const l of p.levels || []) {
            mapped[cid][l.levelNumber] = {
              stars: l.stars || 0,
              completed: Boolean(l.completed),
              coins: l.coins || 0,
            };
            coins += l.coins || 0;
          }
          if (meta[cid].rewardClaimed) coins += meta[cid].bonusCoins;
        }
        setProgress(mapped);
        setRewardMeta(meta);
        setTotalCoins(coins);

        if (campaignParam) {
          const found = list.find((c) => c._id === campaignParam);
          if (found) setSelectedCampaign(found);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [campaignParam, user?.section]);

  // ── Timer ────────────────────────────────────────────────────────────────
  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    setTimeLeft(QUIZ_SECONDS);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { stopTimer(); return 0; }
        return t - 1;
      });
    }, 1000);
  }, [stopTimer]);

  useEffect(() => {
    if (phase === 'quiz' && timeLeft === 0) {
      handleSubmitAnswer(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase]);

  useEffect(() => { if (phase === 'quiz') startTimer(); else stopTimer(); }, [phase, currentQ, startTimer, stopTimer]);
  useEffect(() => () => stopTimer(), [stopTimer]);

  const getProgress = (cId: string, lvl: number): LevelProgress =>
    progress[cId]?.[lvl] ?? { stars: 0, completed: false, coins: 0 };

  const getLevelStatus = (c: Campaign, lvl: number) => {
    if (getProgress(c._id, lvl).completed) return 'completed';
    if (lvl === 1) return 'available';
    if (getProgress(c._id, lvl - 1).completed) return 'available';
    return 'locked';
  };

  const getTotalStars = (c: Campaign) =>
    c.levels.reduce((sum, l) => sum + getProgress(c._id, l.levelNumber).stars, 0);

  const minStarsRequired = (c: Campaign) => Math.floor(c.levels.length * 10 / 4);

  const allLevelsCompleted = (c: Campaign) =>
    c.levels.every(l => getProgress(c._id, l.levelNumber).completed);

  const qualifiesForReward = (c: Campaign) =>
    allLevelsCompleted(c) && getTotalStars(c) >= minStarsRequired(c);

  const isRewardClaimed = (c: Campaign) => Boolean(rewardMeta[c._id]?.rewardClaimed);

  const handleClaimReward = async () => {
    if (!selectedCampaign || claimingReward || isRewardClaimed(selectedCampaign)) return;
    setClaimingReward(true);
    try {
      const result = await claimCampaignRewardAPI(selectedCampaign._id);
      setRewardMeta(prev => ({
        ...prev,
        [selectedCampaign._id]: { rewardClaimed: true, bonusCoins: result.bonusCoins },
      }));
      setTotalCoins(c => c + result.bonusCoins);
      await refreshUser().catch(() => {});
    } catch (err) {
      console.error(err);
    } finally {
      setClaimingReward(false);
    }
  };

  const openRewardModal = () => setShowReward(true);

  const openLevel = (level: CampaignLevel) => {
    setPopupLevel(level); setPhase('story');
    setCurrentQ(0); setAnswers([]); setSelected(null);
  };
  const closePopup = () => { stopTimer(); setPopupLevel(null); };

  const handleSubmitAnswer = (expired = false) => {
    if (!popupLevel || !selectedCampaign) return;
    const ans = expired ? '' : (selected ?? '');
    const newAnswers = [...answers, ans];
    stopTimer();
    if (currentQ + 1 < popupLevel.quiz.length) {
      setAnswers(newAnswers); setCurrentQ(q => q + 1); setSelected(null);
    } else {
      const normalized = popupLevel.quiz.map(normalizeQuestion);
      const correct = normalized.filter((q, i) => checkQuizAnswer(q, newAnswers[i] || '')).length;
      const stars = correct;
      const coins = stars * 10;
      setAnswers(newAnswers);
      setProgress(prev => ({
        ...prev,
        [selectedCampaign._id]: { ...(prev[selectedCampaign._id] ?? {}), [popupLevel.levelNumber]: { stars, completed: true, coins } },
      }));
      setTotalCoins(c => c + coins);
      setPhase('result');

      const nextProgress = {
        ...(progress[selectedCampaign._id] ?? {}),
        [popupLevel.levelNumber]: { stars, completed: true, coins },
      };
      const campaignDone = selectedCampaign.levels.every((l) =>
        l.levelNumber === popupLevel.levelNumber
          ? true
          : Boolean(nextProgress[l.levelNumber]?.completed)
      );

      recordLevelProgressAPI({
        campaignId: selectedCampaign._id,
        levelNumber: popupLevel.levelNumber,
        stars,
        coins,
        campaignCompleted: campaignDone,
      })
        .then(() => refreshUser().catch(() => {}))
        .catch(console.error);
    }
  };

  const formatAnswerDisplay = (q: QuizQuestion, ans: string): string => {
    const nq = normalizeQuestion(q);
    if (!ans) return '(no answer — time ran out)';
    if (nq.type === 'true_false') return ans === 'true' ? 'True' : 'False';
    if (nq.type === 'matching') {
      try {
        const obj = JSON.parse(ans) as Record<string, string>;
        return Object.entries(obj).map(([l, r]) => `${l} → ${r}`).join(', ');
      } catch { return ans; }
    }
    if (nq.type === 'sequence') {
      try {
        return (JSON.parse(ans) as string[]).join(' → ');
      } catch { return ans; }
    }
    return ans;
  };

  const formatCorrectDisplay = (q: QuizQuestion): string => {
    const nq = normalizeQuestion(q);
    if (nq.type === 'true_false') return nq.correctBoolean ? 'True' : 'False';
    if (nq.type === 'matching') return (nq.pairs || []).map((p) => `${p.left} → ${p.right}`).join(', ');
    if (nq.type === 'sequence') return (nq.correctSequence || []).join(' → ');
    if (nq.type === 'drag_drop') return nq.correctWord || '';
    return nq.correctAnswer || '';
  };

  const renderStars = (count: number, total = 3, size = 18) => (
    <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <Star key={i} size={size}
          fill={i < count ? '#FDE047' : 'rgba(255,255,255,0.12)'}
          color={i < count ? '#EAB308' : 'rgba(255,255,255,0.2)'}
          style={{ filter: i < count ? 'drop-shadow(0 1px 4px rgba(234,179,8,0.8))' : 'none' }}
        />
      ))}
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  if (!loading && !selectedCampaign) {
    return (
      <DashboardLayout navItems={STUDENT_NAV} role="student" userName={user?.name || 'Student'} sectionLabel="Learning">
        <div className="db-card" style={{ padding: 48, textAlign: 'center' }}>
          <p style={{ color: 'var(--db-muted)', marginBottom: 16 }}>Pick a story from your section to start reading.</p>
          <Link to="/student/section" className="db-btn primary" style={{ textDecoration: 'none' }}>Go to My Section</Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={STUDENT_NAV} role="student" userName={user?.name || 'Student'} sectionLabel="Learning">

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80, color: 'var(--db-muted)', gap: 12 }}>
          <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /> Loading...
        </div>
      )}

      {selectedCampaign && (() => {
        const c = selectedCampaign;
        const theme = getCampaignTheme(c.templateId);
        const mapLevels = c.levels.map((lvl) => ({
          levelNumber: lvl.levelNumber,
          stars: getProgress(c._id, lvl.levelNumber).stars,
          status: getLevelStatus(c, lvl.levelNumber) as 'locked' | 'available' | 'completed',
        }));

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* ── Header row: back + title + coins + reward button ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <button onClick={() => navigate('/student/section')}
                style={{ background: 'var(--db-hover)', border: '1px solid var(--db-border)', width: 40, height: 40, borderRadius: 12, cursor: 'pointer', color: 'var(--db-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ArrowLeft size={18} />
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 20 }}>{theme.emoji}</span>
                  <h2 style={{ fontSize: 20, fontWeight: 900, color: 'var(--db-text)', margin: 0 }}>{c.title}</h2>
                </div>
                <p style={{ color: 'var(--db-muted)', fontSize: 12, margin: 0 }}>
                  {theme.name} · {getTotalStars(c)}/{c.levels.length * 3} stars · need {minStarsRequired(c)} for reward
                </p>
              </div>
              {/* Coins badge */}
              {totalCoins > 0 && (
                <div style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 50, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 800, color: '#fbbf24', flexShrink: 0 }}>
                  🪙 {totalCoins} coins
                </div>
              )}
              {/* View / Claim Reward */}
              {qualifiesForReward(c) && (
                <button onClick={openRewardModal}
                  style={{ padding: '8px 18px', borderRadius: 50, background: 'linear-gradient(135deg, #10B981, #059669)', border: 'none', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <Gift size={14} /> {isRewardClaimed(c) ? 'View Reward' : 'Claim Reward'}
                </button>
              )}
            </div>

            <LevelMapCanvas
              templateId={c.templateId}
              levels={mapLevels}
              qualifiesForReward={qualifiesForReward(c)}
              onLevelClick={(levelNumber) => {
                const lvl = c.levels.find((l) => l.levelNumber === levelNumber);
                if (lvl) openLevel(lvl);
              }}
              onRewardClick={openRewardModal}
            />
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════════════
          POPUP
      ══════════════════════════════════════════════════════════════ */}
      {popupLevel && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 500,
          background: phase === 'story' ? '#1a2e22' : 'rgba(0,0,0,0.78)',
          backdropFilter: phase === 'story' ? 'none' : 'blur(14px)',
          display: 'flex',
          alignItems: phase === 'story' ? 'stretch' : 'center',
          justifyContent: 'center',
        }}>

          {/* ── Storybook View ── */}
          {phase === 'story' && (() => {
            const layout = normalizeStoryLayout(
              popupLevel.storyNode.storyLayout?.pages?.length || popupLevel.storyNode.storyLayout?.blocks?.length
                ? popupLevel.storyNode.storyLayout
                : layoutFromStoryContent(popupLevel.storyNode.content || '', popupLevel.storyNode.title)
            );

            return (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'stretch', justifyContent: 'center', padding: 0 }}>
                <button onClick={closePopup} style={{ position: 'absolute', top: 16, right: 20, zIndex: 20, background: 'rgba(0,0,0,0.5)', border: '2px solid rgba(255,255,255,0.15)', width: 36, height: 36, borderRadius: '50%', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={16} />
                </button>

                <div style={{ width: '100%', height: '100%' }}>
                  <StoryPageRenderer
                    title={popupLevel.storyNode.title}
                    levelNumber={popupLevel.levelNumber}
                    layout={layout}
                    vocabulary={popupLevel.storyNode.vocabulary}
                    showQuizButton
                    onTakeQuiz={() => { setPhase('quiz'); setCurrentQ(0); setSelected(null); }}
                  />
                </div>
              </div>
            );
          })()}

          {/* Quiz & Result container — premium redesign */}
          {phase !== 'story' && (
          <div style={{
            width: '94%', maxWidth: 600,
            maxHeight: '92vh',
            background: 'linear-gradient(160deg, #0d0f2b 0%, #0f1123 60%, #0a1a2e 100%)',
            borderRadius: 28,
            border: '1.5px solid rgba(139,92,246,0.25)',
            boxShadow: '0 40px 100px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>

            {/* ── Header ── */}
            <div style={{
              padding: '16px 20px 14px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexShrink: 0,
              background: 'rgba(255,255,255,0.02)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                  borderRadius: 8, padding: '4px 10px',
                  fontSize: 10, fontWeight: 900, color: '#fff',
                  letterSpacing: 1.5, textTransform: 'uppercase',
                }}>
                  Level {popupLevel.levelNumber}
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#f1f5f9' }}>{popupLevel.storyNode.title}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Phase progress pips */}
                {(['story','quiz','result'] as Phase[]).map((p, i) => (
                  <div key={p} style={{
                    height: 4, width: 28, borderRadius: 99,
                    background: phase === p
                      ? 'linear-gradient(90deg, #6366F1, #a78bfa)'
                      : i < ['story','quiz','result'].indexOf(phase)
                        ? '#10B981'
                        : 'rgba(255,255,255,0.08)',
                    transition: 'all 0.35s',
                    boxShadow: phase === p ? '0 0 8px rgba(139,92,246,0.6)' : 'none',
                  }} />
                ))}
                <button onClick={closePopup} style={{
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  width: 30, height: 30, borderRadius: '50%',
                  color: '#64748b', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginLeft: 4, transition: 'all 0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.15)'; (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.color = '#64748b'; }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* ── Quiz Phase ── */}
            {phase === 'quiz' && (() => {
              const q = normalizeQuestion(popupLevel.quiz[currentQ]);
              if (!q) return null;
              const pct = (timeLeft / QUIZ_SECONDS) * 100;
              const timerColor = pct > 50 ? '#10B981' : pct > 25 ? '#fbbf24' : '#ef4444';
              const timerGlow = pct > 50 ? 'rgba(16,185,129,0.4)' : pct > 25 ? 'rgba(251,191,36,0.4)' : 'rgba(239,68,68,0.4)';
              const canSubmit = (() => {
                if (selected === null || selected === '') return false;
                if (q.type === 'matching') {
                  try {
                    const obj = JSON.parse(selected) as Record<string, string>;
                    return Object.keys(obj).length >= (q.pairs || []).filter((p) => p.left && p.right).length;
                  } catch { return false; }
                }
                return true;
              })();
              return (
                <>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>

                    {/* Timer bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                      <div style={{ flex: 1, height: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)' }}>
                        <div style={{
                          height: '100%', width: `${pct}%`,
                          background: `linear-gradient(90deg, ${timerColor}, ${timerColor}cc)`,
                          borderRadius: 99,
                          transition: 'width 1s linear, background 0.3s',
                          boxShadow: `0 0 10px ${timerGlow}`,
                        }} />
                      </div>
                      <div style={{
                        fontSize: 15, fontWeight: 900, color: timerColor,
                        minWidth: 40, textAlign: 'right',
                        textShadow: `0 0 10px ${timerGlow}`,
                        fontFamily: 'Outfit',
                      }}>{timeLeft}s</div>
                    </div>

                    {/* Question label */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <div style={{
                        background: 'rgba(251,191,36,0.12)',
                        border: '1px solid rgba(251,191,36,0.3)',
                        borderRadius: 50, padding: '3px 10px',
                        fontSize: 11, fontWeight: 800, color: '#fbbf24',
                      }}>
                        Q{currentQ + 1} of {popupLevel.quiz.length}
                      </div>
                      <div style={{
                        background: 'rgba(99,102,241,0.12)',
                        border: '1px solid rgba(99,102,241,0.3)',
                        borderRadius: 50, padding: '3px 10px',
                        fontSize: 11, fontWeight: 800, color: '#a78bfa',
                      }}>
                        {QUIZ_TYPE_LABELS[q.type]}
                      </div>
                    </div>

                    <QuizPlayer
                      question={q}
                      answer={selected}
                      onAnswer={setSelected}
                    />
                  </div>

                  {/* Footer buttons */}
                  <div style={{
                    padding: '14px 22px',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', gap: 10, flexShrink: 0,
                    background: 'rgba(0,0,0,0.2)',
                  }}>
                    {currentQ > 0 && (
                      <button onClick={() => { setCurrentQ(q => q - 1); setSelected(answers[currentQ - 1] ?? null); stopTimer(); }}
                        style={{
                          padding: '12px 18px', borderRadius: 14,
                          background: 'rgba(255,255,255,0.04)',
                          border: '1.5px solid rgba(255,255,255,0.1)',
                          color: '#94a3b8', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 7,
                          fontWeight: 700, fontFamily: 'Outfit', fontSize: 13,
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLElement).style.color = '#94a3b8'; }}
                      >
                        <ChevronLeft size={15} /> Back
                      </button>
                    )}
                    <button
                      onClick={() => handleSubmitAnswer(false)}
                      disabled={!canSubmit}
                      style={{
                        flex: 1, padding: '13px', borderRadius: 14,
                        background: canSubmit
                          ? 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #a855f7 100%)'
                          : 'rgba(255,255,255,0.06)',
                        border: 'none', color: '#fff',
                        fontWeight: 800, fontSize: 14,
                        cursor: canSubmit ? 'pointer' : 'not-allowed',
                        opacity: canSubmit ? 1 : 0.35,
                        fontFamily: 'Outfit',
                        boxShadow: canSubmit ? '0 4px 20px rgba(99,102,241,0.4)' : 'none',
                        transition: 'all 0.2s',
                        letterSpacing: 0.3,
                      }}
                    >
                      {currentQ + 1 === popupLevel.quiz.length ? 'Submit ✓' : 'Next →'}
                    </button>
                  </div>
                </>
              );
            })()}

            {/* ── Result Phase ── */}
            {phase === 'result' && (() => {
              const normalized = popupLevel.quiz.map(normalizeQuestion);
              const correct = normalized.filter((q, i) => checkQuizAnswer(q, answers[i] || '')).length;
              const stars = correct;
              const coins = stars * 10;
              const total = popupLevel.quiz.length;
              const pct = Math.round((correct / total) * 100);
              const resultData = [
                { score: 0,  emoji: '😓', msg: 'Keep Trying!',  accent: '#ef4444', glow: 'rgba(239,68,68,0.25)' },
                { score: 1,  emoji: '⭐', msg: 'Good Job!',     accent: '#fbbf24', glow: 'rgba(251,191,36,0.25)' },
                { score: 2,  emoji: '🎖️', msg: 'Great Work!',   accent: '#6366F1', glow: 'rgba(99,102,241,0.25)' },
                { score: 3,  emoji: '🏆', msg: 'Perfect!',      accent: '#10B981', glow: 'rgba(16,185,129,0.25)' },
              ];
              const rd = resultData[Math.min(stars, 3)];
              return (
                <>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '24px 22px' }}>

                    {/* Score card */}
                    <div style={{
                      background: `radial-gradient(circle at 50% 0%, ${rd.glow}, transparent 70%)`,
                      border: `1.5px solid ${rd.accent}30`,
                      borderRadius: 20, padding: '24px 20px 20px',
                      textAlign: 'center', marginBottom: 20,
                    }}>
                      <div style={{ fontSize: 56, lineHeight: 1, marginBottom: 8 }}>{rd.emoji}</div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 4, fontFamily: 'Outfit' }}>{rd.msg}</div>
                      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>{correct} out of {total} correct</div>

                      {/* Stars */}
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 14 }}>
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} style={{
                            fontSize: 28,
                            filter: i < stars ? `drop-shadow(0 0 8px rgba(234,179,8,0.8))` : 'grayscale(1) opacity(0.2)',
                            transform: i < stars ? 'scale(1.1)' : 'scale(0.9)',
                            transition: 'all 0.3s',
                            transitionDelay: `${i * 80}ms`,
                          }}>⭐</div>
                        ))}
                      </div>

                      {/* Coins + Score row */}
                      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                        <div style={{
                          background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)',
                          borderRadius: 50, padding: '6px 16px',
                          fontSize: 13, fontWeight: 800, color: '#fbbf24',
                          display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                          🪙 +{coins} coins
                        </div>
                        <div style={{
                          background: `${rd.accent}15`, border: `1px solid ${rd.accent}35`,
                          borderRadius: 50, padding: '6px 16px',
                          fontSize: 13, fontWeight: 800, color: rd.accent,
                        }}>
                          {pct}% score
                        </div>
                      </div>
                    </div>

                    {/* Answer review */}
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Answer Review</div>
                    {normalized.map((q, i) => {
                      const ok = checkQuizAnswer(q, answers[i] || '');
                      return (
                        <div key={i} style={{
                          background: ok ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)',
                          border: `1px solid ${ok ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.18)'}`,
                          borderRadius: 14, padding: '12px 16px', marginBottom: 8,
                          display: 'flex', gap: 12, alignItems: 'flex-start',
                        }}>
                          <div style={{
                            width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                            background: ok ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, fontWeight: 900,
                            color: ok ? '#34d399' : '#f87171',
                          }}>
                            {ok ? '✓' : '✗'}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 4, lineHeight: 1.4 }}>{q.question}</div>
                            <div style={{ fontSize: 11, color: '#475569' }}>
                              Your answer: <span style={{ color: ok ? '#34d399' : '#f87171', fontWeight: 700 }}>{formatAnswerDisplay(q, answers[i] || '')}</span>
                              {!ok && <span> · Correct: <span style={{ color: '#34d399', fontWeight: 700 }}>{formatCorrectDisplay(q)}</span></span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{
                    padding: '14px 22px',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    flexShrink: 0,
                    background: 'rgba(0,0,0,0.2)',
                  }}>
                    <button onClick={closePopup} style={{
                      width: '100%', padding: '13px', borderRadius: 14,
                      background: 'linear-gradient(135deg, #10B981, #059669)',
                      border: 'none', color: '#fff',
                      fontWeight: 800, fontSize: 14,
                      cursor: 'pointer', fontFamily: 'Outfit',
                      boxShadow: '0 4px 20px rgba(16,185,129,0.35)',
                      letterSpacing: 0.3,
                    }}>
                      ✓ Back to Map
                    </button>
                  </div>
                </>
              );
            })()}

          </div>
          )}
        </div>
      )}

      {/* ── Reward Modal ── */}
      {showReward && selectedCampaign && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(14px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600 }}>
          <div style={{ width: '92%', maxWidth: 460, background: '#0f1123', borderRadius: 28, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
            <div style={{ height: 140, background: 'radial-gradient(circle at top, #10B981, #065F46)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, position: 'relative' }}>
              <button onClick={() => setShowReward(false)} style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(0,0,0,0.3)', border: 'none', color: '#fff', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
              <div style={{ fontSize: 52 }}>🏆</div>
              <div style={{ fontSize: 52 }}>🎖</div>
              <div style={{ fontSize: 52 }}>📜</div>
            </div>
            <div style={{ padding: 26, textAlign: 'center' }}>
              <h3 style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginBottom: 6 }}>Congratulations! 🎉</h3>
              <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>
                You completed <strong style={{ color: '#fff' }}>{selectedCampaign.title}</strong> with {getTotalStars(selectedCampaign)} stars!
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
                <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 12, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left' }}>
                  <div style={{ fontSize: 28 }}>🎖</div>
                  <div>
                    <div style={{ fontWeight: 800, color: '#fbbf24', fontSize: 14 }}>Story Champion Badge</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Earned for completing {selectedCampaign.title}</div>
                  </div>
                </div>
                <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 12, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left' }}>
                  <div style={{ fontSize: 28 }}>📜</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, color: '#34d399', fontSize: 14 }}>Certificate of Completion</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Official achievement certificate</div>
                  </div>
                  <button onClick={() => downloadAwardCertificate({ studentName: user?.name || 'Student', award: { id: selectedCampaign._id, title: 'Story Champion Badge', description: `Earned for completing ${selectedCampaign.title}` } })}
                    style={{ background: '#10B981', border: 'none', borderRadius: 8, padding: '6px 12px', color: '#fff', fontWeight: 700, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                    <Download size={11} /> PDF
                  </button>
                </div>
                <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 12, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left' }}>
                  <div style={{ fontSize: 28 }}>🪙</div>
                  <div>
                    <div style={{ fontWeight: 800, color: '#a5b4fc', fontSize: 14 }}>+{getTotalStars(selectedCampaign) * 10} Bonus Coins</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      {isRewardClaimed(selectedCampaign) ? 'Added to your leaderboard score' : 'Tap Claim Rewards to collect'}
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {!isRewardClaimed(selectedCampaign) ? (
                  <button
                    onClick={handleClaimReward}
                    disabled={claimingReward}
                    style={{
                      width: '100%', padding: '13px', borderRadius: 12,
                      background: claimingReward ? 'rgba(16,185,129,0.3)' : 'linear-gradient(135deg, #10B981, #059669)',
                      border: 'none', color: '#fff', fontWeight: 800, fontSize: 14,
                      cursor: claimingReward ? 'not-allowed' : 'pointer',
                      fontFamily: 'Outfit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      boxShadow: claimingReward ? 'none' : '0 4px 16px rgba(16,185,129,0.35)',
                    }}
                  >
                    <Gift size={16} /> {claimingReward ? 'Claiming…' : 'Claim Rewards'}
                  </button>
                ) : (
                  <div style={{
                    width: '100%', padding: '13px', borderRadius: 12, textAlign: 'center',
                    background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
                    color: '#34d399', fontWeight: 800, fontSize: 14, fontFamily: 'Outfit',
                  }}>
                    ✓ Rewards Claimed!
                  </div>
                )}
                <button onClick={() => setShowReward(false)} style={{ width: '100%', padding: '12px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit' }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </DashboardLayout>
  );
}
