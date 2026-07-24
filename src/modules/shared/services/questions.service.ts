import allQuestions from '../../../data/questions.json';

export interface LocalQuestion {
  id: number;
  type: 'multiple' | 'boolean';
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
}

/**
 * Get random questions from the local bank, excluding already answered ones.
 * If not enough unanswered questions remain, it resets and picks from all.
 */
export function getRandomQuestions(
  amount: number,
  excludeIds: number[] = [],
  difficulty?: string | null,
): LocalQuestion[] {
  let pool = (allQuestions as LocalQuestion[]).filter(q => !excludeIds.includes(q.id));

  // Filter by difficulty if specified
  if (difficulty) {
    const filtered = pool.filter(q => q.difficulty === difficulty);
    if (filtered.length >= amount) {
      pool = filtered;
    }
    // If not enough with that difficulty, use all available
  }

  // If not enough questions after excluding, reset (use full pool)
  if (pool.length < amount) {
    pool = allQuestions as LocalQuestion[];
    if (difficulty) {
      const filtered = pool.filter(q => q.difficulty === difficulty);
      if (filtered.length >= amount) {
        pool = filtered;
      }
    }
  }

  // Shuffle and pick
  const shuffled = shuffleArray(pool);
  return shuffled.slice(0, amount);
}

/**
 * Shuffle answers for a question (mix correct with incorrect)
 */
export function shuffleAnswers(question: LocalQuestion): string[] {
  const answers = [...question.incorrect_answers, question.correct_answer];
  return shuffleArray(answers);
}

/**
 * Calculate points based on difficulty, time remaining, streak, 
 * number of questions selected, and time per question selected.
 * 
 * Used when participant chooses their own config (free mode).
 * More questions = less points per question (penalty for playing safe)
 * Less time = more points per question (reward for risk)
 */
export function calculatePoints(
  difficulty: string,
  timeRemaining: number,
  totalTime: number,
  streak: number,
  totalQuestions: number = 10,
): number {
  // Base points by difficulty
  const basePoints = difficulty === 'hard' ? 300 : difficulty === 'medium' ? 200 : 100;

  // Time bonus: answering fast rewards more
  const timeBonus = Math.round((timeRemaining / totalTime) * 50);

  // Streak multiplier (up to 2x)
  const streakMultiplier = Math.min(1 + streak * 0.1, 2);

  // Questions penalty: more questions = less per question
  // 10 questions = 1.0x, 15 = 0.8x, 20 = 0.6x
  const questionsPenalty = 1 - ((totalQuestions - 10) / 10) * 0.4;

  // Time risk bonus: less time = more points
  // 20s = 1.5x, 30s = 1.25x, 40s = 1.1x, 50s = 1.0x
  const timeRiskBonus = 1 + ((50 - totalTime) / 30) * 0.5;

  return Math.round((basePoints + timeBonus) * streakMultiplier * questionsPenalty * timeRiskBonus);
}

/**
 * Calculate points for tournament-locked config (Kahoot-style scoring).
 * 
 * Used when the tournament defines difficulty, questions, and time globally.
 * Since everyone has the same conditions, the only differentiator is SPEED.
 * 
 * Formula:
 *   points = basePoints + speedBonus + streakBonus
 * 
 * - basePoints: fixed per difficulty (easy=100, medium=200, hard=300)
 * - speedBonus: 0 to 100 points based on how fast you answer (linear)
 *   - Answer instantly = 100 bonus
 *   - Answer at last second = 0 bonus
 * - streakBonus: +20 points per consecutive correct answer (max +100)
 * 
 * Max per question: 300 (hard) + 100 (speed) + 100 (streak) = 500
 * Min per question: 100 (easy) + 0 (slow) + 0 (no streak) = 100
 */
export function calculateTournamentPoints(
  difficulty: string,
  timeRemaining: number,
  totalTime: number,
  streak: number,
): number {
  // Base points by difficulty (fixed, same for everyone)
  const basePoints = difficulty === 'hard' ? 300 : difficulty === 'medium' ? 200 : 100;

  // Speed bonus: linear from 0 to 100 based on remaining time
  // timeRemaining/totalTime = 1.0 (instant answer) → 100 points
  // timeRemaining/totalTime = 0.0 (last second) → 0 points
  const speedRatio = Math.max(0, Math.min(1, timeRemaining / totalTime));
  const speedBonus = Math.round(speedRatio * 100);

  // Streak bonus: +20 per consecutive correct, capped at 100 (5+ streak)
  const streakBonus = Math.min(streak * 20, 100);

  return basePoints + speedBonus + streakBonus;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
