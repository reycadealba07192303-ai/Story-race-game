import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, CheckCircle, XCircle, Play, Image as ImageIcon, Video, Star, ArrowRight, BookOpen } from 'lucide-react';

const DICTIONARY: Record<string, string> = {
  famine: "Extreme scarcity of food in a region.",
  urged: "To try earnestly or persistently to persuade someone.",
  glean: "To gather leftover grain or produce after a harvest.",
  kinsman: "A male blood relative.",
  threshing: "The process of separating grain from a plant.",
  winnowing: "Blowing air through grain to remove the chaff.",
  redemption: "The action of saving or clearing a debt; buying back.",
  inheritance: "Property or land passed down after death.",
  mantle: "A loose sleeveless cloak or shawl.",
  elders: "Older people serving as leaders or judges in a community.",
};

const RUTH_STORY_DATA: Record<number, { title: string, leftText: string, rightText: string, videoNote: string }> = {
  1: {
    title: "A Time of Famine",
    leftText: "During the time of the Judges, there was a famine in the land of Judah. Elimelech left Bethlehem with his wife, Naomi, and their two sons, Mahlon and Chilion, to live in Moab.",
    rightText: "After settling there, Elimelech died. Later, Mahlon and Chilion married Moabite women named Orpah and Ruth. About ten years later, both sons also died, leaving Naomi without her husband and sons.",
    videoNote: "Watch the journey to Moab"
  },
  2: {
    title: "Naomi's Choice",
    leftText: "When Naomi heard that the famine in Judah had ended, she decided to return home. Her daughters-in-law went with her, but Naomi urged them to stay in Moab.",
    rightText: "She said, 'Go back, each of you, to your mother's house. May Yahweh be kind to you. Return home, my daughters. Why should you come with me? I have no more sons to become your husbands.' The women wept. Orpah kissed Naomi goodbye and returned home, but Ruth refused to leave.",
    videoNote: "Watch the tearful goodbye"
  },
  3: {
    title: "Ruth's Loyalty",
    leftText: "Naomi said, 'Look, your sister-in-law has returned to her people and her gods. You too must return.' But Ruth answered, 'Don't ask me to leave you. Where you go, I will go, and where you stay, I will stay.'",
    rightText: "'Your people will be my people, and your God my God. Where you die, I will die and be buried.' Seeing Ruth's determination, Naomi stopped urging her. Together they traveled to Bethlehem. Naomi told the people, 'Call me Mara, for Yahweh has made my life bitter.'",
    videoNote: "Ruth's promise"
  },
  4: {
    title: "Gleaning in the Fields",
    leftText: "Naomi had a wealthy kinsman, Boaz. Ruth said to Naomi, 'Let me go to the fields and glean behind the harvesters in the field of one who will show me favor.'",
    rightText: "As it happened, Ruth came to the field of Boaz. When Boaz arrived, he greeted the harvesters and asked the foreman, 'To whom does this young woman belong?' The foreman explained she was the Moabite who returned with Naomi.",
    videoNote: "Working in the fields"
  },
  5: {
    title: "Favor from Boaz",
    leftText: "Boaz said to Ruth, 'Do not glean in another field. Stay here with my maidservants. I have commanded the young men not to molest you. When thirsty, drink from the jars they have filled.'",
    rightText: "Ruth bowed and asked why she found favor despite being a foreigner. Boaz answered, 'I have been told all that you have done for your mother-in-law. May Yahweh reward you, under whose wings you have come for refuge.'",
    videoNote: "A meal with Boaz"
  },
  6: {
    title: "A Generous Harvest",
    leftText: "At mealtime, Boaz invited Ruth to eat. Then he instructed his men, 'Let her glean even among the sheaves, and do not reproach her. Pull out some stalks for her to gather.'",
    rightText: "Ruth gleaned until evening and brought the barley to Naomi. Naomi said, 'Blessed be Yahweh! This man is our close kinsman, one who has the right of redemption over us.' Ruth continued to glean until the end of the harvests.",
    videoNote: "Bringing the harvest home"
  },
  7: {
    title: "Naomi's Plan",
    leftText: "Naomi said, 'My daughter, should I not seek a home for you? Tonight Boaz will be at the threshing floor winnowing barley.'",
    rightText: "'Wash, perfume yourself, put on your best clothes, and go there. Do not make yourself known until he finishes eating. When he lies down, uncover his feet and lie there.' Ruth replied, 'I will do all that you say.'",
    videoNote: "Preparing for the night"
  },
  8: {
    title: "At the Threshing Floor",
    leftText: "At midnight Boaz awoke and found a woman lying at his feet. She said, 'I am Ruth. Spread the corner of your cloak over me, for you are a kinsman who has the right of redemption over me.'",
    rightText: "Boaz said, 'Do not fear. I will do all that you ask. It is true I am a close relative, but there is another nearer than I. If he will not redeem you, I will.' He filled her mantle with six measures of barley.",
    videoNote: "The promise of redemption"
  },
  9: {
    title: "The Town Gate",
    leftText: "Boaz went to the town gate. When the other kinsman passed by, Boaz called him and gathered ten elders as witnesses. He offered the right to redeem Elimelech's land.",
    rightText: "The man agreed, until Boaz said, 'You must also take Ruth to preserve the name of the dead.' The man refused, lest he endanger his own inheritance. He gave his sandal to Boaz, confirming the transfer of right.",
    videoNote: "The exchange at the gate"
  },
  10: {
    title: "A New Beginning",
    leftText: "Boaz announced to the elders, 'You are witnesses that I take Ruth as my wife.' Yahweh made her conceive, and she gave birth to a son named Obed.",
    rightText: "The women said to Naomi, 'Blessed be Yahweh who provided you with an heir! He will be your comfort in your old age.' Naomi became his nurse. Obed was the father of Jesse, who was David's father.",
    videoNote: "The lineage of David"
  }
};

export default function StudentStoryReader() {
  const navigate = useNavigate();
  const { storyId, levelId } = useParams();

  const [mode, setMode] = useState<'reading' | 'quiz' | 'result'>('reading');
  const [timeLeft, setTimeLeft] = useState(60); 
  const [dictWord, setDictWord] = useState<string | null>(null); // Dictionary popup state
  
  // Quiz State
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);

  // Q1: Multiple Choice
  const [q1Answer, setQ1Answer] = useState<number | null>(null);

  // Q2: Matching Type
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({});

  // Q3: Fill in the blank (Tap to Drop)
  const [blanks, setBlanks] = useState<(string | null)[]>([null, null]);
  const [availableWords, setAvailableWords] = useState(['necklace', 'diamond', 'fake', 'expensive']);

  // Timer Effect
  useEffect(() => {
    if (mode === 'quiz' && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (mode === 'quiz' && timeLeft === 0) {
      finishQuiz();
    }
  }, [mode, timeLeft]);

  const finishQuiz = () => {
    let newScore = 0;
    // Q1 logic
    if (q1Answer === 1) newScore += 33; // B is correct
    // Q2 logic
    if (matches['Mathilde'] === 'Loisel' && matches['Madame'] === 'Forestier') newScore += 33;
    // Q3 logic
    if (blanks[0] === 'necklace' && blanks[1] === 'fake') newScore += 34;

    setScore(newScore);
    setMode('result');
  };

  const renderTextWithDictionary = (text: string) => {
    // Split by non-word boundaries but keep delimiters to reconstruct
    const parts = text.split(/(\b\w+\b)/);
    return parts.map((part, i) => {
      const cleanWord = part.toLowerCase();
      if (DICTIONARY[cleanWord]) {
        return (
          <span 
            key={i} 
            onClick={() => setDictWord(cleanWord)}
            style={{ 
              backgroundColor: 'rgba(245,158,11,0.2)', color: '#D97706', 
              padding: '0 4px', borderRadius: 4, cursor: 'pointer', 
              fontWeight: 'bold', borderBottom: '2px dashed #D97706',
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(245,158,11,0.4)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(245,158,11,0.2)'}
            title="Click for definition"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const levelNum = parseInt(levelId || '1');
  const storyData = RUTH_STORY_DATA[levelNum] || RUTH_STORY_DATA[1];

  const renderReadingMode = () => (
    <div style={{ maxWidth: 1000, margin: '20px auto 60px', animation: 'fadeIn 0.6s ease-out' }}>
      
      {/* Top Navigation */}
      <div className="db-page-header" style={{ marginBottom: 40 }}>
        <button onClick={() => navigate('/student/stories')} className="db-btn ghost" style={{ padding: 10 }}>
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: 'var(--db-text)', margin: 0, letterSpacing: '-0.5px' }}>Reading Mode</h2>
          <p style={{ color: 'var(--db-muted)', fontSize: 14, margin: 0 }}>The Story of Ruth • Level {levelId}</p>
        </div>
      </div>

      {/* Floating Magic Book */}
      <div className="db-story-book" style={{
        background: '#fdfbf7',
        borderRadius: 16,
        boxShadow: '0 40px 100px rgba(0,0,0,0.6), inset 0 0 40px rgba(0,0,0,0.05)',
        color: '#2d3748', fontFamily: '"Georgia", serif',
        border: '1px solid #e2d8c3',
      }}>
        
        {/* Realistic Book Spine / Center Shadow */}
        <div className="db-story-book-spine" style={{
          background: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.05) 60%, transparent 100%)',
        }} />

        {/* Page Shadow Details (edges) */}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 20, background: 'linear-gradient(to right, rgba(0,0,0,0.05) 0%, transparent 100%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 20, background: 'linear-gradient(to left, rgba(0,0,0,0.05) 0%, transparent 100%)', pointerEvents: 'none' }} />

        {/* ─── Left Page ─── */}
        <div className="db-story-page" style={{ padding: '50px 60px 60px 50px', position: 'relative' }}>
          {/* Page number */}
          <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', color: '#a0aec0', fontSize: 13, fontStyle: 'italic' }}>{(levelNum * 2) - 1}</div>
          
          <h1 style={{ fontSize: 32, fontWeight: 'normal', margin: '0 0 16px 0', textAlign: 'center', color: '#1a202c', borderBottom: '1px solid #e2e8f0', paddingBottom: 16 }}>
            {storyData.title}
          </h1>
          <p style={{ textAlign: 'center', fontStyle: 'italic', color: '#718096', marginBottom: 32 }}>The Story of Ruth</p>
          
          {/* Picture / Illustration embedded in page */}
          <div style={{ 
            width: '100%', height: 220, marginBottom: 32,
            border: '8px solid #fff', boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            background: `url(https://images.unsplash.com/photo-1501630834273-4b5604d2ee31?auto=format&fit=crop&q=80) center/cover`,
            position: 'relative'
          }}>
            <div style={{ position: 'absolute', bottom: -12, right: -12, background: '#fff', padding: '4px 8px', fontSize: 11, fontStyle: 'italic', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', color: '#4a5568' }}>
              Historical Context
            </div>
          </div>

          <p style={{ fontSize: 18, lineHeight: 1.8, textIndent: 40, textAlign: 'justify' }}>
            <span style={{ fontSize: 56, float: 'left', lineHeight: 0.8, marginRight: 8, marginTop: 4, fontFamily: 'serif', color: '#1a202c' }}>{storyData.leftText.charAt(0)}</span>
            {renderTextWithDictionary(storyData.leftText.substring(1))}
          </p>
        </div>

        {/* ─── Right Page ─── */}
        <div className="db-story-page" style={{ padding: '50px 50px 60px 60px', position: 'relative' }}>
          {/* Page number */}
          <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', color: '#a0aec0', fontSize: 13, fontStyle: 'italic' }}>{levelNum * 2}</div>

          <p style={{ fontSize: 18, lineHeight: 1.8, textIndent: 40, textAlign: 'justify', marginBottom: 40 }}>
            {renderTextWithDictionary(storyData.rightText)}
          </p>

          {/* Video Placeholder embedded like a magical painting */}
          <div style={{ marginBottom: 40 }}>
            <p style={{ fontSize: 14, fontStyle: 'italic', color: '#718096', textAlign: 'center', marginBottom: 12 }}>{storyData.videoNote}:</p>
            <div style={{ 
              width: '100%', height: 200, background: '#111', borderRadius: 12,
              position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 12px 32px rgba(0,0,0,0.2)', border: '1px solid #4a5568', cursor: 'pointer', overflow: 'hidden'
            }}>
              {/* Fake Video Thumbnail */}
              <div style={{ position: 'absolute', inset: 0, opacity: 0.5, background: 'url(https://images.unsplash.com/photo-1447069387366-2a347069a1eb?auto=format&fit=crop&q=80) center/cover' }} />
              <div style={{ width: 64, height: 64, background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, border: '2px solid rgba(255,255,255,0.8)', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                <Play size={32} fill="white" color="white" style={{ marginLeft: 4 }} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'auto' }}>
            <button 
              onClick={() => setMode('quiz')}
              style={{
                padding: '16px 40px', borderRadius: 50, border: 'none',
                background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff',
                fontWeight: 900, fontSize: 16, cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
                boxShadow: '0 8px 24px rgba(16,185,129,0.3)', textTransform: 'uppercase', letterSpacing: 1,
                display: 'flex', alignItems: 'center', gap: 12, transition: 'transform 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05) translateY(-4px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              Take Checkpoint Quiz <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Dictionary Popup */}
      {dictWord && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          animation: 'fadeIn 0.2s'
        }} onClick={() => setDictWord(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', width: 360, borderRadius: 24, padding: 32, boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
            textAlign: 'center', border: '1px solid #e2e8f0', color: '#1a202c', fontFamily: 'Outfit, sans-serif'
          }}>
            <div style={{ width: 64, height: 64, background: '#FEF3C7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#D97706' }}>
              <BookOpen size={32} />
            </div>
            <h3 style={{ fontSize: 24, fontWeight: 900, textTransform: 'capitalize', marginBottom: 8, color: '#D97706' }}>{dictWord}</h3>
            <p style={{ fontSize: 16, color: '#4a5568', lineHeight: 1.6, marginBottom: 24 }}>
              {DICTIONARY[dictWord]}
            </p>
            <button onClick={() => setDictWord(null)} className="db-btn primary" style={{ width: '100%', background: '#D97706', border: 'none' }}>Close Dictionary</button>
          </div>
        </div>
      )}
    </div>
  );

  const renderQuizMode = () => (
    <div style={{ maxWidth: 800, margin: '0 auto', animation: 'fadeIn 0.5s ease-out' }}>

      {/* Quiz Header & Timer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--db-text)', margin: 0 }}>Checkpoint Quiz</h2>
          <p style={{ color: 'var(--db-muted)', fontSize: 14, margin: 0 }}>Question {currentQuestion + 1} of 3</p>
        </div>

        <div style={{
          background: timeLeft <= 10 ? 'rgba(239,68,68,0.1)' : 'var(--db-card)',
          border: `2px solid ${timeLeft <= 10 ? '#EF4444' : 'var(--db-border)'}`,
          padding: '12px 24px', borderRadius: 50, display: 'flex', alignItems: 'center', gap: 10,
          color: timeLeft <= 10 ? '#EF4444' : 'var(--db-text)', fontWeight: 900, fontSize: 20
        }}>
          <Clock size={24} className={timeLeft <= 10 ? "animate-pulse" : ""} />
          00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
        </div>
      </div>

      <div className="db-card" style={{ padding: '40px', minHeight: 400 }}>

        {/* Q1: Multiple Choice */}
        {currentQuestion === 0 && (
          <div style={{ animation: 'fadeIn 0.3s' }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 24 }}>1. Why was Mathilde unhappy with her life?</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {['She wanted to travel the world.', 'She felt she was born for a life of luxury.', 'She did not love her husband.', 'She lost her favorite dress.'].map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => setQ1Answer(idx)}
                  style={{
                    padding: '20px', borderRadius: 16, textAlign: 'left',
                    background: q1Answer === idx ? 'rgba(99,102,241,0.15)' : 'var(--db-hover)',
                    border: q1Answer === idx ? '2px solid #6366F1' : '2px solid transparent',
                    color: 'var(--db-text)', fontWeight: 600, fontSize: 16, cursor: 'pointer',
                    transition: 'all 0.2s', fontFamily: 'Outfit'
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Q2: Matching Type (Tap left, tap right) */}
        {currentQuestion === 1 && (
          <div style={{ animation: 'fadeIn 0.3s' }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>2. Match the Characters (Tap to connect)</h3>
            <p style={{ color: 'var(--db-muted)', marginBottom: 24, fontSize: 14 }}>Tap a name on the left, then tap their corresponding last name on the right.</p>

            <div className="db-dashboard-two-col" style={{ gap: 40 }}>
              {/* Left Column */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {['Mathilde', 'Madame'].map(name => (
                  <button key={name} onClick={() => setSelectedLeft(name)} style={{
                    padding: '16px', borderRadius: 16, background: selectedLeft === name ? '#6366F1' : 'var(--db-hover)',
                    color: selectedLeft === name ? '#fff' : 'var(--db-text)', fontWeight: 800, fontSize: 16, border: 'none', cursor: 'pointer',
                    boxShadow: selectedLeft === name ? '0 8px 24px rgba(99,102,241,0.4)' : 'none'
                  }}>
                    {name}
                  </button>
                ))}
              </div>

              {/* Lines visualization can be complex in CSS alone without absolute coords, we'll use color coding */}

              {/* Right Column */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {['Forestier', 'Loisel'].map(last => {
                  // Find if matched
                  const isMatchedTo = Object.keys(matches).find(k => matches[k] === last);
                  return (
                    <button key={last} onClick={() => {
                      if (selectedLeft) {
                        setMatches(prev => ({ ...prev, [selectedLeft]: last }));
                        setSelectedLeft(null);
                      }
                    }} style={{
                      padding: '16px', borderRadius: 16,
                      background: isMatchedTo ? '#10B981' : 'var(--db-hover)',
                      color: isMatchedTo ? '#fff' : 'var(--db-text)',
                      fontWeight: 800, fontSize: 16, border: isMatchedTo ? 'none' : '2px dashed var(--db-border)', cursor: 'pointer',
                    }}>
                      {isMatchedTo ? `Connected to ${isMatchedTo}` : last}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Q3: Drag and Drop (Tap to place) */}
        {currentQuestion === 2 && (
          <div style={{ animation: 'fadeIn 0.3s' }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>3. Complete the Sentence</h3>
            <p style={{ color: 'var(--db-muted)', marginBottom: 24, fontSize: 14 }}>Tap a word below to fill in the blanks.</p>

            <div style={{ background: 'var(--db-hover)', padding: '32px', borderRadius: 20, fontSize: 20, lineHeight: 2, fontWeight: 600, textAlign: 'center', marginBottom: 32 }}>
              She borrowed a beautiful
              <span onClick={() => {
                if (blanks[0]) {
                  setAvailableWords(p => [...p, blanks[0]!]);
                  setBlanks(p => [null, p[1]]);
                }
              }} style={{ display: 'inline-block', width: 120, height: 40, borderBottom: '3px solid #6366F1', margin: '0 12px', color: '#6366F1', fontWeight: 900, cursor: 'pointer' }}>
                {blanks[0] || '___'}
              </span>
              which turned out to be completely
              <span onClick={() => {
                if (blanks[1]) {
                  setAvailableWords(p => [...p, blanks[1]!]);
                  setBlanks(p => [p[0], null]);
                }
              }} style={{ display: 'inline-block', width: 120, height: 40, borderBottom: '3px solid #6366F1', margin: '0 12px', color: '#6366F1', fontWeight: 900, cursor: 'pointer' }}>
                {blanks[1] || '___'}
              </span>.
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              {availableWords.map(word => (
                <button key={word} onClick={() => {
                  const emptyIdx = blanks.indexOf(null);
                  if (emptyIdx !== -1) {
                    const newBlanks = [...blanks];
                    newBlanks[emptyIdx] = word;
                    setBlanks(newBlanks);
                    setAvailableWords(p => p.filter(w => w !== word));
                  }
                }} style={{
                  padding: '12px 24px', borderRadius: 12, background: 'var(--db-card)', border: '2px solid var(--db-border)',
                  color: 'var(--db-text)', fontWeight: 800, fontSize: 16, cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                  {word}
                </button>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
        <button
          onClick={() => setCurrentQuestion(p => Math.max(0, p - 1))}
          disabled={currentQuestion === 0}
          className="db-btn outline"
        >
          Previous
        </button>

        {currentQuestion < 2 ? (
          <button
            onClick={() => setCurrentQuestion(p => Math.min(2, p + 1))}
            className="db-btn primary"
          >
            Next Question
          </button>
        ) : (
          <button
            onClick={finishQuiz}
            style={{
              padding: '12px 32px', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff',
              fontWeight: 900, fontSize: 16, cursor: 'pointer', fontFamily: 'Outfit',
              boxShadow: '0 8px 24px rgba(16,185,129,0.4)'
            }}
          >
            Submit Quiz
          </button>
        )}
      </div>
    </div>
  );

  const renderResultMode = () => {
    const passed = score >= 50;
    return (
      <div style={{ maxWidth: 600, margin: '60px auto', textAlign: 'center', animation: 'scaleUp 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
        <div style={{
          width: 120, height: 120, margin: '0 auto 24px', borderRadius: '50%',
          background: passed ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {passed ? <Star size={64} color="#10B981" fill="#10B981" /> : <XCircle size={64} color="#EF4444" />}
        </div>

        <h2 style={{ fontSize: 36, fontWeight: 900, color: 'var(--db-text)', marginBottom: 8 }}>
          {passed ? 'Level Completed!' : 'Try Again!'}
        </h2>
        <p style={{ color: 'var(--db-muted)', fontSize: 18, marginBottom: 32 }}>
          You scored <strong style={{ color: passed ? '#10B981' : '#EF4444', fontSize: 24 }}>{Math.round(score)}%</strong> on the checkpoint.
        </p>

        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <button onClick={() => navigate('/student/stories')} className="db-btn outline">
            Back to Map
          </button>
          {!passed && (
            <button onClick={() => { setMode('quiz'); setTimeLeft(60); setCurrentQuestion(0); setScore(0); }} className="db-btn primary">
              Retry Quiz
            </button>
          )}
          {passed && (
            <button onClick={() => navigate('/student/stories')} style={{
              padding: '12px 32px', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff',
              fontWeight: 900, fontSize: 16, cursor: 'pointer', fontFamily: 'Outfit',
              boxShadow: '0 8px 24px rgba(245,158,11,0.4)'
            }}>
              Next Level
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--db-bg)', padding: '40px 20px', fontFamily: 'Outfit, sans-serif' }}>

      {/* Background Orbs */}
      <div style={{ position: 'fixed', top: '-10%', left: '-5%', width: 400, height: 400, background: 'var(--db-primary)', borderRadius: '50%', filter: 'blur(150px)', opacity: 0.15, zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-10%', right: '-5%', width: 500, height: 500, background: '#EC4899', borderRadius: '50%', filter: 'blur(150px)', opacity: 0.1, zIndex: 0, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {mode === 'reading' && renderReadingMode()}
        {mode === 'quiz' && renderQuizMode()}
        {mode === 'result' && renderResultMode()}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleUp { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
}
