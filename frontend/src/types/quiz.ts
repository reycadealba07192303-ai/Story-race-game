export type QuizType =
  | 'multiple_choice'
  | 'true_false'
  | 'matching'
  | 'sequence'
  | 'drag_drop';

export interface QuizOption {
  text: string;
  image?: string | null;
}

export interface MatchingPair {
  left: string;
  right: string;
  leftImage?: string | null;
  rightImage?: string | null;
}

export interface QuizQuestion {
  type: QuizType;
  question: string;
  questionImage?: string | null;
  options?: QuizOption[];
  correctAnswer?: string;
  correctBoolean?: boolean;
  pairs?: MatchingPair[];
  sequenceItems?: string[];
  correctSequence?: string[];
  sentence?: string;
  wordBank?: string[];
  correctWord?: string;
}

export const QUIZ_TYPE_LABELS: Record<QuizType, string> = {
  multiple_choice: 'Multiple Choice',
  true_false: 'True or False',
  matching: 'Matching (Draw Lines)',
  sequence: 'Sequence of Events',
  drag_drop: 'Drag & Drop Word',
};

export function createEmptyQuestion(type: QuizType = 'multiple_choice'): QuizQuestion {
  switch (type) {
    case 'true_false':
      return { type, question: '', correctBoolean: true };
    case 'matching':
      return {
        type,
        question: '',
        pairs: [
          { left: '', right: '' },
          { left: '', right: '' },
        ],
      };
    case 'sequence':
      return {
        type,
        question: '',
        sequenceItems: ['Event 1', 'Event 2', 'Event 3'],
        correctSequence: ['Event 1', 'Event 2', 'Event 3'],
      };
    case 'drag_drop':
      return {
        type,
        question: '',
        sentence: 'The character felt ___ when they arrived.',
        wordBank: ['happy', 'sad', 'excited'],
        correctWord: 'happy',
      };
    default:
      return {
        type: 'multiple_choice',
        question: '',
        options: [
          { text: '', image: null },
          { text: '', image: null },
          { text: '', image: null },
          { text: '', image: null },
        ],
        correctAnswer: '',
      };
  }
}

/** Normalize legacy AI-generated quizzes */
export function normalizeQuestion(raw: Partial<QuizQuestion> & { options?: (string | QuizOption)[] }): QuizQuestion {
  const type = (raw.type as QuizType) || 'multiple_choice';

  if (type === 'multiple_choice') {
    const opts: QuizOption[] = (raw.options || []).map((o) =>
      typeof o === 'string' ? { text: o, image: null } : { text: o.text || '', image: o.image || null }
    );
    while (opts.length < 4) opts.push({ text: '', image: null });
    return {
      type: 'multiple_choice',
      question: raw.question || '',
      questionImage: raw.questionImage || null,
      options: opts,
      correctAnswer: raw.correctAnswer || '',
    };
  }

  return {
    ...createEmptyQuestion(type),
    ...raw,
    type,
  } as QuizQuestion;
}

export function getOptionText(opt: QuizOption | string): string {
  return typeof opt === 'string' ? opt : opt.text;
}

export function checkQuizAnswer(q: QuizQuestion, answer: string): boolean {
  if (!answer && q.type !== 'true_false') return false;

  switch (q.type) {
    case 'multiple_choice':
      return answer === q.correctAnswer;
    case 'true_false':
      return answer === String(q.correctBoolean);
    case 'matching': {
      try {
        const submitted = JSON.parse(answer) as Record<string, string>;
        const expected = Object.fromEntries((q.pairs || []).map((p) => [p.left, p.right]));
        const keys = Object.keys(expected);
        return keys.length > 0 && keys.every((k) => submitted[k] === expected[k]);
      } catch {
        return false;
      }
    }
    case 'sequence': {
      try {
        const submitted = JSON.parse(answer) as string[];
        const expected = q.correctSequence || q.sequenceItems || [];
        return (
          submitted.length === expected.length &&
          submitted.every((item, i) => item === expected[i])
        );
      } catch {
        return false;
      }
    }
    case 'drag_drop':
      return answer === q.correctWord;
    default:
      return answer === q.correctAnswer;
  }
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
