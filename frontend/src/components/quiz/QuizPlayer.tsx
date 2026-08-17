import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GripVertical } from 'lucide-react';
import { getOptionText, normalizeQuestion, type QuizQuestion } from '../../types/quiz';
import './quizPlayer.css';

interface QuizPlayerProps {
  question: QuizQuestion;
  answer: string | null;
  onAnswer: (answer: string) => void;
}

export default function QuizPlayer({ question, answer, onAnswer }: QuizPlayerProps) {
  const q = normalizeQuestion(question);

  return (
    <div className="qp-root">
      {q.questionImage && (
        <img src={q.questionImage} alt="Question visual" className="qp-question-image" />
      )}
      <p className="qp-question-text">{q.question}</p>

      {q.type === 'multiple_choice' && (
        <MultipleChoice q={q} answer={answer} onAnswer={onAnswer} />
      )}
      {q.type === 'true_false' && (
        <TrueFalse answer={answer} onAnswer={onAnswer} />
      )}
      {q.type === 'matching' && (
        <Matching q={q} answer={answer} onAnswer={onAnswer} />
      )}
      {q.type === 'sequence' && (
        <Sequence q={q} answer={answer} onAnswer={onAnswer} />
      )}
      {q.type === 'drag_drop' && (
        <DragDrop q={q} answer={answer} onAnswer={onAnswer} />
      )}
    </div>
  );
}

function MultipleChoice({ q, answer, onAnswer }: { q: QuizQuestion; answer: string | null; onAnswer: (a: string) => void }) {
  return (
    <div className="qp-options">
      {(q.options || []).filter((o) => getOptionText(o).trim()).map((opt, i) => {
        const text = getOptionText(opt);
        const selected = answer === text;
        return (
          <button
            key={i}
            type="button"
            className={`qp-option ${selected ? 'qp-option--selected' : ''}`}
            onClick={() => onAnswer(text)}
          >
            <span className="qp-option-letter">{String.fromCharCode(65 + i)}</span>
            <div className="qp-option-body">
              {opt.image && <img src={opt.image} alt="" className="qp-option-image" />}
              <span>{text}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function TrueFalse({ answer, onAnswer }: { answer: string | null; onAnswer: (a: string) => void }) {
  return (
    <div className="qp-tf">
      {[{ val: 'true', label: 'True ✓' }, { val: 'false', label: 'False ✗' }].map(({ val, label }) => (
        <button
          key={val}
          type="button"
          className={`qp-tf-btn ${answer === val ? 'qp-tf-btn--selected' : ''}`}
          onClick={() => onAnswer(val)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Matching({ q, answer, onAnswer }: { q: QuizQuestion; answer: string | null; onAnswer: (a: string) => void }) {
  const pairs = q.pairs || [];
  const leftItems = pairs.map((p) => p.left).filter(Boolean);
  const [rightItems, setRightItems] = useState<string[]>([]);

  useEffect(() => {
    const rights = pairs.map((p) => p.right).filter(Boolean);
    setRightItems([...rights].sort(() => Math.random() - 0.5));
  }, [q.question, q.pairs?.length]);

  const parsed: Record<string, string> = useMemo(() => {
    try { return answer ? JSON.parse(answer) : {}; } catch { return {}; }
  }, [answer]);

  const [activeLeft, setActiveLeft] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const leftRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const rightRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const handleRightClick = (right: string) => {
    if (!activeLeft) return;
    const next = { ...parsed, [activeLeft]: right };
    onAnswer(JSON.stringify(next));
    setActiveLeft(null);
  };

  const lines = Object.entries(parsed).map(([left, right]) => {
    const lEl = leftRefs.current[left];
    const rEl = rightRefs.current[right];
    const container = containerRef.current;
    if (!lEl || !rEl || !container) return null;
    const cRect = container.getBoundingClientRect();
    const lRect = lEl.getBoundingClientRect();
    const rRect = rEl.getBoundingClientRect();
    return {
      x1: lRect.right - cRect.left,
      y1: lRect.top + lRect.height / 2 - cRect.top,
      x2: rRect.left - cRect.left,
      y2: rRect.top + rRect.height / 2 - cRect.top,
      key: `${left}-${right}`,
    };
  }).filter(Boolean) as { x1: number; y1: number; x2: number; y2: number; key: string }[];

  return (
    <div className="qp-matching" ref={containerRef}>
      <p className="qp-hint">Tap a left item, then tap its match on the right.</p>
      <svg className="qp-match-lines">
        {lines.map((l) => (
          <line key={l.key} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#6366F1" strokeWidth="2" />
        ))}
      </svg>
      <div className="qp-match-cols">
        <div className="qp-match-col">
          {leftItems.map((left) => (
            <button
              key={left}
              type="button"
              ref={(el) => { leftRefs.current[left] = el; }}
              className={`qp-match-item ${activeLeft === left ? 'qp-match-item--active' : ''} ${parsed[left] ? 'qp-match-item--matched' : ''}`}
              onClick={() => setActiveLeft(left)}
            >
              {pairs.find((p) => p.left === left)?.leftImage && (
                <img src={pairs.find((p) => p.left === left)!.leftImage!} alt="" className="qp-match-img" />
              )}
              {left}
            </button>
          ))}
        </div>
        <div className="qp-match-col">
          {rightItems.map((right) => (
            <button
              key={right}
              type="button"
              ref={(el) => { rightRefs.current[right] = el; }}
              className={`qp-match-item ${Object.values(parsed).includes(right) ? 'qp-match-item--matched' : ''}`}
              onClick={() => handleRightClick(right)}
            >
              {pairs.find((p) => p.right === right)?.rightImage && (
                <img src={pairs.find((p) => p.right === right)!.rightImage!} alt="" className="qp-match-img" />
              )}
              {right}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Sequence({ q, answer, onAnswer }: { q: QuizQuestion; answer: string | null; onAnswer: (a: string) => void }) {
  const [items, setItems] = useState<string[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  useEffect(() => {
    try {
      if (answer) {
        setItems(JSON.parse(answer) as string[]);
        return;
      }
    } catch { /* ignore */ }
    const shuffled = [...(q.sequenceItems || [])].sort(() => Math.random() - 0.5);
    setItems(shuffled);
    onAnswer(JSON.stringify(shuffled));
  }, [q.question, q.sequenceItems?.length]);

  const move = (from: number, to: number) => {
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setItems(next);
    onAnswer(JSON.stringify(next));
  };

  return (
    <div className="qp-sequence">
      <p className="qp-hint">Drag to arrange events in the correct order.</p>
      {items.map((item, i) => (
        <div
          key={`${item}-${i}`}
          className={`qp-seq-item ${dragIdx === i ? 'qp-seq-item--dragging' : ''}`}
          draggable
          onDragStart={() => setDragIdx(i)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => { if (dragIdx !== null && dragIdx !== i) move(dragIdx, i); setDragIdx(null); }}
          onDragEnd={() => setDragIdx(null)}
        >
          <GripVertical size={16} color="#64748b" />
          <span className="qp-seq-num">{i + 1}</span>
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

function DragDrop({ q, answer, onAnswer }: { q: QuizQuestion; answer: string | null; onAnswer: (a: string) => void }) {
  const parts = (q.sentence || '').split('___');
  const bank = q.wordBank || [];

  return (
    <div className="qp-dragdrop">
      <div className="qp-sentence">
        {parts[0]}
        <span
          className={`qp-blank ${answer ? 'qp-blank--filled' : ''}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const word = e.dataTransfer.getData('text/plain');
            if (word) onAnswer(word);
          }}
        >
          {answer || 'drop here'}
        </span>
        {parts[1] || ''}
      </div>
      <div className="qp-word-bank">
        {bank.filter(Boolean).map((word) => (
          <button
            key={word}
            type="button"
            className={`qp-word ${answer === word ? 'qp-word--used' : ''}`}
            draggable={answer !== word}
            onDragStart={(e) => e.dataTransfer.setData('text/plain', word)}
            onClick={() => onAnswer(word)}
          >
            {word}
          </button>
        ))}
      </div>
      <p className="qp-hint">Drag a word into the blank, or tap to select.</p>
    </div>
  );
}
