// ============================================
// Tournament Mode Types
// ============================================

export type TournamentStatus = 'pending' | 'organizing' | 'in_progress' | 'paused' | 'finished';
export type RoundStatus = 'pending' | 'in_progress' | 'finished';
export type MatchStatus = 'pending' | 'in_progress' | 'finished';
export type BracketSide = 'left' | 'right' | 'final';
export type TournamentSize = 8 | 16 | 32;

export interface Tournament {
  id: string;
  name: string;
  description: string | null;
  date: string;
  size: TournamentSize;
  status: TournamentStatus;
  max_games_per_participant: number;
  config_difficulty: string | null;
  config_questions_per_game: number | null;
  current_round_id: string | null;
  champion_team_id: string | null;
  created_at: string;
}

export interface TrnTeam {
  id: string;
  tournament_id: string;
  name: string;
  color: string;
  avatar: string;
  seed: number | null;
  bracket_side: BracketSide | null;
  is_eliminated: boolean;
  final_position: number | null;
  created_at: string;
}

export interface TrnParticipant {
  id: string;
  team_id: string;
  name: string;
  avatar: string;
  is_captain: boolean;
  created_at: string;
}

export interface TrnRound {
  id: string;
  tournament_id: string;
  name: string;
  display_name: string;
  round_order: number;
  status: RoundStatus;
  total_matches: number;
  completed_matches: number;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export interface TrnMatch {
  id: string;
  tournament_id: string;
  round_id: string;
  match_number: number;
  bracket_side: BracketSide;
  team_a_id: string | null;
  team_b_id: string | null;
  winner_id: string | null;
  loser_id: string | null;
  team_a_score: number;
  team_b_score: number;
  status: MatchStatus;
  next_match_id: string | null;
  next_match_slot: 'team_a' | 'team_b' | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export interface TrnMatchScore {
  id: string;
  match_id: string;
  tournament_id: string;
  team_id: string;
  participant_id: string;
  score: number;
  correct_answers: number;
  total_questions: number;
  best_streak: number;
  is_finished: boolean;
  updated_at: string;
}

export interface TrnLiveScore {
  id: string;
  match_id: string;
  tournament_id: string;
  team_id: string;
  participant_id: string;
  participant_name: string | null;
  participant_avatar: string;
  current_score: number;
  current_correct: number;
  current_question: number;
  total_questions: number;
  current_streak: number;
  category_name: string | null;
  is_playing: boolean;
  updated_at: string;
}

// View type for bracket rendering
export interface BracketMatch {
  match_id: string;
  tournament_id: string;
  round_id: string;
  round_name: string;
  round_display_name: string;
  round_order: number;
  match_number: number;
  bracket_side: BracketSide;
  match_status: MatchStatus;
  team_a_id: string | null;
  team_a_name: string | null;
  team_a_color: string | null;
  team_a_avatar: string | null;
  team_a_score: number;
  team_b_id: string | null;
  team_b_name: string | null;
  team_b_color: string | null;
  team_b_avatar: string | null;
  team_b_score: number;
  winner_id: string | null;
  loser_id: string | null;
  next_match_id: string | null;
  next_match_slot: 'team_a' | 'team_b' | null;
  started_at: string | null;
  finished_at: string | null;
}

// Team with participants (for detail page)
export interface TrnTeamWithParticipants extends TrnTeam {
  participants: TrnParticipant[];
}

// Round name constants
export const ROUND_NAMES: Record<string, string> = {
  round_of_32: '32Avos',
  round_of_16: '16Avos',
  quarterfinals: 'Cuartos',
  semifinals: 'Semifinal',
  third_place: 'Tercer Puesto',
  final: 'Gran Final',
};

// Tournament colors and avatars (different from gameday to distinguish)
export const TRN_TEAM_COLORS = [
  '#00f5ff', // Cyan
  '#bf00ff', // Purple
  '#ff00aa', // Pink
  '#00ff88', // Green
  '#ffaa00', // Orange
  '#ff4466', // Red
  '#44aaff', // Blue
  '#ffff00', // Yellow
  '#ff6600', // Deep Orange
  '#00ffcc', // Teal
  '#ff0066', // Magenta
  '#9900ff', // Violet
  '#00cc44', // Emerald
  '#ff3333', // Scarlet
  '#3399ff', // Sky Blue
  '#ccff00', // Lime
];

export const TRN_TEAM_AVATARS = [
  '🐉', '🦄', '🐺', '🦅', '🐙', '🦁', '🦈', '🐲',
  '🦇', '🐯', '🦊', '🐍', '🦖', '🐋', '🦏', '🐗',
];
