export interface TriviaQuestion {
  category: string;
  type: 'multiple' | 'boolean';
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
}

export interface TriviaApiResponse {
  response_code: number;
  results: TriviaQuestion[];
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  score: number;
  streak: number;
  correctAnswers: number;
  totalAnswers: number;
}

export interface GameConfig {
  numberOfQuestions: number;
  category: number | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  timePerQuestion: number;
  playerName: string;
}

export interface GameState {
  status: 'idle' | 'lobby' | 'playing' | 'reviewing' | 'finished';
  currentQuestionIndex: number;
  questions: TriviaQuestion[];
  players: Player[];
  config: GameConfig;
  timeRemaining: number;
  selectedAnswer: string | null;
  showResult: boolean;
}

export interface TriviaCategory {
  id: number;
  name: string;
}

export const TRIVIA_CATEGORIES: TriviaCategory[] = [
  { id: 9, name: '🧠 Conocimiento General' },
  { id: 10, name: '📚 Libros' },
  { id: 11, name: '🎬 Películas' },
  { id: 12, name: '🎵 Música' },
  { id: 14, name: '📺 Televisión' },
  { id: 15, name: '🎮 Videojuegos' },
  { id: 17, name: '🔬 Ciencia & Naturaleza' },
  { id: 18, name: '💻 Computación' },
  { id: 19, name: '📐 Matemáticas' },
  { id: 21, name: '⚽ Deportes' },
  { id: 22, name: '🌍 Geografía' },
  { id: 23, name: '📜 Historia' },
  { id: 25, name: '🎨 Arte' },
  { id: 26, name: '👑 Celebridades' },
  { id: 27, name: '🐾 Animales' },
  { id: 28, name: '🚗 Vehículos' },
  { id: 29, name: '🦸 Comics' },
  { id: 31, name: '🍣 Anime & Manga' },
  { id: 32, name: '🎭 Dibujos Animados' },
];

export const AVATARS = ['🦊', '🐉', '🦄', '🐺', '🦅', '🐙', '🦁', '🐯', '🦈', '🐻', '🦇', '🐲'];

export const DIFFICULTY_CONFIG = {
  easy: { label: '🟢 Fácil', points: 100, color: '#00ff88' },
  medium: { label: '🟡 Medio', points: 200, color: '#ffaa00' },
  hard: { label: '🔴 Difícil', points: 300, color: '#ff4466' },
};
