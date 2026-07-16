export interface Gameday {
  id: string;
  name: string;
  description: string | null;
  status: 'upcoming' | 'active' | 'finished';
  max_teams: number;
  max_games_per_participant: number;
  event_date: string | null;
  created_at: string;
}

export interface Team {
  id: string;
  gameday_id: string;
  name: string;
  color: string;
  avatar: string;
  created_at: string;
}

export interface Game {
  id: string;
  gameday_id: string;
  team_id: string;
  category: number | null;
  difficulty: string | null;
  questions_per_round: number;
  time_per_question: number;
  status: 'active' | 'finished';
  created_at: string;
}

export interface Participant {
  id: string;
  team_id: string;
  name: string;
  avatar: string;
  is_captain: boolean;
  created_at: string;
}

export interface TeamLeaderboardEntry {
  team_id: string;
  team_name: string;
  team_color: string;
  team_avatar: string;
  gameday_id: string;
  gameday_name: string;
  total_score: number;
  total_correct: number;
  total_questions: number;
  best_streak: number;
  active_players: number;
  games_played: number;
}

export const TEAM_COLORS = [
  '#00f5ff', // Cyan
  '#bf00ff', // Purple
  '#ff00aa', // Pink
  '#00ff88', // Green
  '#ffaa00', // Orange
  '#ff4466', // Red
  '#44aaff', // Blue
  '#ffff00', // Yellow
];

export const TEAM_AVATARS = ['🐉', '🦄', '🐺', '🦅', '🐙', '🦁', '🦈', '🐲', '🦇', '🐯'];
