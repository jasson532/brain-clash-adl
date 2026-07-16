import axios from 'axios';
import type { TriviaApiResponse, TriviaQuestion } from '../types/game.types';
import { translateBatch } from './translation.service';

const TRIVIA_BASE_URL = 'https://opentdb.com';

const triviaClient = axios.create({
  baseURL: TRIVIA_BASE_URL,
  timeout: 10000,
});

function decodeHtml(html: string): string {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = html;
  return textarea.value;
}

function decodeQuestion(question: TriviaQuestion): TriviaQuestion {
  return {
    ...question,
    question: decodeHtml(question.question),
    correct_answer: decodeHtml(question.correct_answer),
    incorrect_answers: question.incorrect_answers.map(decodeHtml),
  };
}

export async function fetchTriviaQuestions(
  amount: number,
  category: number | null,
  difficulty: string | null,
): Promise<TriviaQuestion[]> {
  const params: Record<string, string | number> = { amount };

  if (category) {
    params.category = category;
  }
  if (difficulty) {
    params.difficulty = difficulty;
  }

  const response = await triviaClient.get<TriviaApiResponse>('/api.php', { params });

  if (response.data.response_code !== 0) {
    throw new Error('No se pudieron obtener las preguntas. Intenta con otra configuración.');
  }

  const questions = response.data.results.map(decodeQuestion);

  // Translate questions to Spanish
  return translateQuestions(questions);
}

async function translateQuestions(questions: TriviaQuestion[]): Promise<TriviaQuestion[]> {
  // Collect all texts that need translation
  const textsToTranslate: string[] = [];
  for (const q of questions) {
    textsToTranslate.push(q.question);
    textsToTranslate.push(q.correct_answer);
    textsToTranslate.push(...q.incorrect_answers);
  }

  // Translate all at once
  const translated = await translateBatch(textsToTranslate);

  // Map translations back to questions
  let idx = 0;
  return questions.map(q => {
    const translatedQuestion = translated[idx++];
    const translatedCorrect = translated[idx++];
    const translatedIncorrect = q.incorrect_answers.map(() => translated[idx++]);

    return {
      ...q,
      question: translatedQuestion,
      correct_answer: translatedCorrect,
      incorrect_answers: translatedIncorrect,
    };
  });
}

export function shuffleAnswers(question: TriviaQuestion): string[] {
  const answers = [...question.incorrect_answers, question.correct_answer];
  return answers.sort(() => Math.random() - 0.5);
}

export function calculatePoints(
  difficulty: string,
  timeRemaining: number,
  totalTime: number,
  streak: number,
): number {
  const basePoints = difficulty === 'hard' ? 300 : difficulty === 'medium' ? 200 : 100;
  const timeBonus = Math.round((timeRemaining / totalTime) * 50);
  const streakMultiplier = Math.min(1 + streak * 0.1, 2);
  return Math.round((basePoints + timeBonus) * streakMultiplier);
}
