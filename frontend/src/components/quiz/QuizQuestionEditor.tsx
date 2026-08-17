import React, { useRef } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2, Upload, X } from 'lucide-react';
import {
  createEmptyQuestion,
  normalizeQuestion,
  QUIZ_TYPE_LABELS,
  readFileAsDataUrl,
  type QuizQuestion,
  type QuizType,
} from '../../types/quiz';

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  padding: '10px 14px',
  color: '#f8fafc',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'Outfit, sans-serif',
};

const btnSmall: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 8,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#cbd5e1',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};

function ImageUpload({
  value,
  onChange,
  label,
}: {
  value?: string | null;
  onChange: (v: string | null) => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    onChange(dataUrl);
    e.target.value = '';
  };

  return (
    <div>
      <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
      {value ? (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img src={value} alt={label} style={{ maxHeight: 80, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)' }} />
          <button type="button" onClick={() => onChange(null)} style={{ ...btnSmall, position: 'absolute', top: 4, right: 4, padding: 4, background: 'rgba(0,0,0,0.7)' }}>
            <X size={12} />
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => ref.current?.click()} style={btnSmall}>
          <Upload size={12} /> {label}
        </button>
      )}
    </div>
  );
}

interface QuizQuestionEditorProps {
  question: QuizQuestion;
  index: number;
  total: number;
  onChange: (q: QuizQuestion) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export default function QuizQuestionEditor({
  question,
  index,
  total,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: QuizQuestionEditorProps) {
  const q = normalizeQuestion(question);

  const setType = (type: QuizType) => onChange(createEmptyQuestion(type));

  const update = (patch: Partial<QuizQuestion>) => onChange({ ...q, ...patch });

  return (
    <div style={{
      background: 'rgba(20,24,45,0.6)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 18,
      padding: 24,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'rgba(245,158,11,0.15)', color: '#fbbf24',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 800, flexShrink: 0,
        }}>
          Q{index + 1}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <select
            value={q.type}
            onChange={(e) => setType(e.target.value as QuizType)}
            style={{ ...inputStyle, maxWidth: 280, cursor: 'pointer' }}
          >
            {Object.entries(QUIZ_TYPE_LABELS).map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
          <textarea
            value={q.question}
            placeholder="Enter question..."
            rows={2}
            onChange={(e) => update({ question: e.target.value })}
            style={{ ...inputStyle, resize: 'none', fontWeight: 600 }}
          />
          <ImageUpload
            value={q.questionImage}
            onChange={(questionImage) => update({ questionImage })}
            label="Question Image"
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
          <button type="button" onClick={onMoveUp} disabled={index === 0} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: 2 }}>
            <ChevronUp size={14} />
          </button>
          <button type="button" onClick={onMoveDown} disabled={index === total - 1} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: 2 }}>
            <ChevronDown size={14} />
          </button>
        </div>
        <button type="button" onClick={onDelete} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
          <Trash2 size={14} />
        </button>
      </div>

      {q.type === 'multiple_choice' && (
        <div className="db-dashboard-two-col" style={{ gap: 10 }}>
          {(q.options || []).map((opt, oi) => (
            <label
              key={oi}
              style={{
                display: 'flex', flexDirection: 'column', gap: 8,
                background: q.correctAnswer === opt.text && opt.text ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.02)',
                border: q.correctAnswer === opt.text && opt.text ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(255,255,255,0.07)',
                borderRadius: 10, padding: '10px 14px', cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="radio"
                  name={`correct-${index}`}
                  checked={q.correctAnswer === opt.text && opt.text !== ''}
                  onChange={() => update({ correctAnswer: opt.text })}
                  style={{ accentColor: '#10B981' }}
                />
                <input
                  value={opt.text}
                  placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                  onChange={(e) => {
                    const options = [...(q.options || [])];
                    const prev = options[oi].text;
                    options[oi] = { ...options[oi], text: e.target.value };
                    update({
                      options,
                      correctAnswer: q.correctAnswer === prev ? e.target.value : q.correctAnswer,
                    });
                  }}
                  style={{ background: 'transparent', border: 'none', outline: 'none', color: '#f8fafc', fontSize: 13, flex: 1 }}
                />
              </div>
              <ImageUpload
                value={opt.image}
                onChange={(image) => {
                  const options = [...(q.options || [])];
                  options[oi] = { ...options[oi], image };
                  update({ options });
                }}
                label="Choice Image"
              />
            </label>
          ))}
        </div>
      )}

      {q.type === 'true_false' && (
        <div style={{ display: 'flex', gap: 12 }}>
          {[true, false].map((val) => (
            <label
              key={String(val)}
              style={{
                flex: 1, padding: '14px', borderRadius: 12, textAlign: 'center', cursor: 'pointer', fontWeight: 800,
                background: q.correctBoolean === val ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)',
                border: q.correctBoolean === val ? '2px solid #10B981' : '1px solid rgba(255,255,255,0.08)',
                color: q.correctBoolean === val ? '#34d399' : '#94a3b8',
              }}
            >
              <input type="radio" checked={q.correctBoolean === val} onChange={() => update({ correctBoolean: val })} style={{ display: 'none' }} />
              {val ? 'True ✓' : 'False ✗'}
            </label>
          ))}
        </div>
      )}

      {q.type === 'matching' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(q.pairs || []).map((pair, pi) => (
            <div key={pi} className="db-match-row">
              <div>
                <input
                  value={pair.left}
                  placeholder="Left item"
                  onChange={(e) => {
                    const pairs = [...(q.pairs || [])];
                    pairs[pi] = { ...pairs[pi], left: e.target.value };
                    update({ pairs });
                  }}
                  style={inputStyle}
                />
                <div style={{ marginTop: 6 }}>
                  <ImageUpload value={pair.leftImage} onChange={(leftImage) => {
                    const pairs = [...(q.pairs || [])];
                    pairs[pi] = { ...pairs[pi], leftImage };
                    update({ pairs });
                  }} label="Left Image" />
                </div>
              </div>
              <div style={{ paddingTop: 12, color: '#64748b', fontWeight: 800 }}>↔</div>
              <div>
                <input
                  value={pair.right}
                  placeholder="Right match"
                  onChange={(e) => {
                    const pairs = [...(q.pairs || [])];
                    pairs[pi] = { ...pairs[pi], right: e.target.value };
                    update({ pairs });
                  }}
                  style={inputStyle}
                />
                <div style={{ marginTop: 6 }}>
                  <ImageUpload value={pair.rightImage} onChange={(rightImage) => {
                    const pairs = [...(q.pairs || [])];
                    pairs[pi] = { ...pairs[pi], rightImage };
                    update({ pairs });
                  }} label="Right Image" />
                </div>
              </div>
              <button type="button" onClick={() => update({ pairs: (q.pairs || []).filter((_, i) => i !== pi) })} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', paddingTop: 10 }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => update({ pairs: [...(q.pairs || []), { left: '', right: '' }] })} style={btnSmall}>
            <Plus size={12} /> Add Pair
          </button>
        </div>
      )}

      {q.type === 'sequence' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Enter events in the correct order (top to bottom).</p>
          {(q.sequenceItems || []).map((item, si) => (
            <div key={si} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{si + 1}</span>
              <input
                value={item}
                placeholder={`Event ${si + 1}`}
                onChange={(e) => {
                  const sequenceItems = [...(q.sequenceItems || [])];
                  sequenceItems[si] = e.target.value;
                  update({ sequenceItems, correctSequence: sequenceItems });
                }}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button type="button" onClick={() => {
                const sequenceItems = (q.sequenceItems || []).filter((_, i) => i !== si);
                update({ sequenceItems, correctSequence: sequenceItems });
              }} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => {
            const sequenceItems = [...(q.sequenceItems || []), ''];
            update({ sequenceItems, correctSequence: sequenceItems });
          }} style={btnSmall}>
            <Plus size={12} /> Add Event
          </button>
        </div>
      )}

      {q.type === 'drag_drop' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: 6 }}>
              Sentence (use ___ for the blank)
            </label>
            <input
              value={q.sentence || ''}
              onChange={(e) => update({ sentence: e.target.value })}
              placeholder="The hero felt ___ when they won."
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: 6 }}>Word bank</label>
            {(q.wordBank || []).map((word, wi) => (
              <div key={wi} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <input
                  value={word}
                  onChange={(e) => {
                    const wordBank = [...(q.wordBank || [])];
                    const prev = wordBank[wi];
                    wordBank[wi] = e.target.value;
                    update({
                      wordBank,
                      correctWord: q.correctWord === prev ? e.target.value : q.correctWord,
                    });
                  }}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <input
                  type="radio"
                  name={`drag-correct-${index}`}
                  checked={q.correctWord === word}
                  onChange={() => update({ correctWord: word })}
                  title="Mark as correct answer"
                  style={{ accentColor: '#10B981' }}
                />
                <button type="button" onClick={() => update({ wordBank: (q.wordBank || []).filter((_, i) => i !== wi) })} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => update({ wordBank: [...(q.wordBank || []), ''] })} style={btnSmall}>
              <Plus size={12} /> Add Word
            </button>
          </div>
          {q.correctWord && (
            <div style={{ fontSize: 12, color: '#10B981', fontWeight: 700 }}>✓ Correct word: {q.correctWord}</div>
          )}
        </div>
      )}

      {q.type === 'multiple_choice' && q.correctAnswer && (
        <div style={{ marginTop: 10, fontSize: 12, color: '#10B981', fontWeight: 700 }}>✓ Correct answer: {q.correctAnswer}</div>
      )}
    </div>
  );
}

export function QuizTypePicker({ onSelect }: { onSelect: (type: QuizType) => void }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {(Object.entries(QUIZ_TYPE_LABELS) as [QuizType, string][]).map(([type, label]) => (
        <button key={type} type="button" onClick={() => onSelect(type)} style={{
          padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer',
          background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc',
        }}>
          + {label}
        </button>
      ))}
    </div>
  );
}
