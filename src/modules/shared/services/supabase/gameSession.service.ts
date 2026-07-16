import { supabase } from './supabaseClient';

interface GameSessionData {
  player_id: string;
  score: number;
  correct_answers: number;
  total_questions: number;
  category?: string | null;
  difficulty?: string | null;
  best_streak?: number;
  time_per_question?: number;
}

interface LeaderboardEntry {
  id: string;
  player_id: string;
  player_name: string;
  player_avatar: string;
  total_score: number;
  games_played: number;
  best_score: number;
  best_streak: number;
  total_correct: number;
  total_questions: number;
  updated_at: string;
}

/**
 * Create or get a player by name + avatar
 */
export async function upsertPlayer(name: string, avatar: string): Promise<string> {
  const { data: existing } = await supabase
    .from('players')
    .select('id')
    .eq('name', name)
    .eq('avatar', avatar)
    .single();

  if (existing) {
    return (existing as { id: string }).id;
  }

  const { data, error } = await supabase
    .from('players')
    .insert({ name, avatar })
    .select('id')
    .single();

  if (error) throw new Error(`Error creating player: ${error.message}`);
  return (data as { id: string }).id;
}

/**
 * Save a completed game session
 */
export async function saveGameSession(session: GameSessionData): Promise<void> {
  const { error } = await supabase.from('game_sessions').insert(session);
  if (error) throw new Error(`Error saving game session: ${error.message}`);
}

/**
 * Update the leaderboard for a player after a game
 */
export async function updateLeaderboard(
  playerId: string,
  playerName: string,
  playerAvatar: string,
  score: number,
  correctAnswers: number,
  totalQuestions: number,
  bestStreak: number,
): Promise<void> {
  const { data: existing } = await supabase
    .from('leaderboard')
    .select('*')
    .eq('player_id', playerId)
    .single();

  if (existing) {
    const entry = existing as LeaderboardEntry;
    const { error } = await supabase
      .from('leaderboard')
      .update({
        player_name: playerName,
        player_avatar: playerAvatar,
        total_score: entry.total_score + score,
        games_played: entry.games_played + 1,
        best_score: Math.max(entry.best_score, score),
        best_streak: Math.max(entry.best_streak, bestStreak),
        total_correct: entry.total_correct + correctAnswers,
        total_questions: entry.total_questions + totalQuestions,
        updated_at: new Date().toISOString(),
      })
      .eq('player_id', playerId);

    if (error) throw new Error(`Error updating leaderboard: ${error.message}`);
  } else {
    const { error } = await supabase.from('leaderboard').insert({
      player_id: playerId,
      player_name: playerName,
      player_avatar: playerAvatar,
      total_score: score,
      games_played: 1,
      best_score: score,
      best_streak: bestStreak,
      total_correct: correctAnswers,
      total_questions: totalQuestions,
    });

    if (error) throw new Error(`Error creating leaderboard entry: ${error.message}`);
  }
}

/**
 * Get top players from leaderboard
 */
export async function getLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('leaderboard')
    .select('*')
    .order('best_score', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Error fetching leaderboard: ${error.message}`);
  return (data ?? []) as LeaderboardEntry[];
}
