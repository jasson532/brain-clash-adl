import { supabase } from './supabaseClient';

interface GamedayInsert {
  name: string;
  description?: string | null;
  status?: 'upcoming' | 'active' | 'finished';
  max_teams?: number;
  max_games_per_participant?: number;
  event_date?: string | null;
}

interface TeamInsert {
  gameday_id: string;
  name: string;
  color?: string;
  avatar?: string;
}

interface ParticipantInsert {
  team_id: string;
  name: string;
  avatar?: string;
  is_captain?: boolean;
}

export interface ScoreInsert {
  gameday_id: string;
  team_id: string;
  participant_id: string;
  game_id: string;
  score: number;
  correct_answers: number;
  total_questions: number;
  best_streak?: number;
  time_per_question?: number;
  category?: string | null;
  difficulty?: string | null;
}

export interface TeamLeaderboardRow {
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

// ============================================
// GAMEDAYS
// ============================================

export async function createGameday(gameday: GamedayInsert) {
  const { data, error } = await supabase
    .from('gamedays')
    .insert(gameday)
    .select()
    .single();

  if (error) throw new Error(`Error creating gameday: ${error.message}`);
  return data;
}

export async function getGamedays() {
  const { data, error } = await supabase
    .from('gamedays')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Error fetching gamedays: ${error.message}`);
  return data ?? [];
}

export async function getGameday(id: string) {
  const { data, error } = await supabase
    .from('gamedays')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(`Error fetching gameday: ${error.message}`);
  return data;
}

export async function updateGamedayStatus(id: string, status: 'upcoming' | 'active' | 'finished'): Promise<void> {
  const { error } = await supabase
    .from('gamedays')
    .update({ status })
    .eq('id', id);

  if (error) throw new Error(`Error updating gameday status: ${error.message}`);
}

export async function updateGameday(id: string, updates: Partial<GamedayInsert>): Promise<void> {
  const { error } = await supabase
    .from('gamedays')
    .update(updates)
    .eq('id', id);

  if (error) throw new Error(`Error updating gameday: ${error.message}`);
}

export async function deleteGameday(id: string): Promise<void> {
  const { error } = await supabase
    .from('gamedays')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Error deleting gameday: ${error.message}`);
}

// ============================================
// TEAMS
// ============================================

export async function createTeam(team: TeamInsert) {
  const { data, error } = await supabase
    .from('teams')
    .insert(team)
    .select()
    .single();

  if (error) throw new Error(`Error creating team: ${error.message}`);
  return data;
}

export async function getTeamsByGameday(gamedayId: string) {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('gameday_id', gamedayId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Error fetching teams: ${error.message}`);
  return data ?? [];
}

export async function updateTeam(id: string, updates: Partial<TeamInsert>): Promise<void> {
  const { error } = await supabase
    .from('teams')
    .update(updates)
    .eq('id', id);

  if (error) throw new Error(`Error updating team: ${error.message}`);
}

export async function deleteTeam(id: string): Promise<void> {
  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Error deleting team: ${error.message}`);
}

// ============================================
// PARTICIPANTS
// ============================================

export async function addParticipant(participant: ParticipantInsert) {
  const { data, error } = await supabase
    .from('participants')
    .insert(participant)
    .select()
    .single();

  if (error) throw new Error(`Error adding participant: ${error.message}`);
  return data;
}

export async function getParticipantsByTeam(teamId: string) {
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Error fetching participants: ${error.message}`);
  return data ?? [];
}

export async function updateParticipant(id: string, updates: Partial<ParticipantInsert>): Promise<void> {
  const { error } = await supabase
    .from('participants')
    .update(updates)
    .eq('id', id);

  if (error) throw new Error(`Error updating participant: ${error.message}`);
}

export async function deleteParticipant(id: string): Promise<void> {
  const { error } = await supabase
    .from('participants')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Error deleting participant: ${error.message}`);
}

// ============================================
// GAMES (team-level game configuration)
// ============================================

export interface GameInsert {
  gameday_id: string;
  team_id: string;
  category?: number | null;
  difficulty?: string | null;
  questions_per_round?: number;
  time_per_question?: number;
}

export async function createGame(game: GameInsert) {
  const { data, error } = await supabase
    .from('games')
    .insert(game)
    .select()
    .single();

  if (error) throw new Error(`Error creating game: ${error.message}`);
  return data;
}

export async function getGamesByTeam(teamId: string) {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Error fetching games: ${error.message}`);
  return data ?? [];
}

export async function finishGame(gameId: string): Promise<void> {
  const { error } = await supabase
    .from('games')
    .update({ status: 'finished' })
    .eq('id', gameId);

  if (error) throw new Error(`Error finishing game: ${error.message}`);
}

// ============================================
// SCORES
// ============================================

export async function saveScore(score: ScoreInsert): Promise<void> {
  const { error } = await supabase.from('scores').insert(score);
  if (error) throw new Error(`Error saving score: ${error.message}`);
}

export async function getScoresByGameday(gamedayId: string) {
  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .eq('gameday_id', gamedayId)
    .order('completed_at', { ascending: false });

  if (error) throw new Error(`Error fetching scores: ${error.message}`);
  return data ?? [];
}

export async function getParticipantGamesCount(gamedayId: string, participantId: string): Promise<number> {
  const { count, error } = await supabase
    .from('scores')
    .select('*', { count: 'exact', head: true })
    .eq('gameday_id', gamedayId)
    .eq('participant_id', participantId);

  if (error) throw new Error(`Error counting participant games: ${error.message}`);
  return count ?? 0;
}

// ============================================
// LEADERBOARD
// ============================================

export async function getTeamLeaderboard(gamedayId: string): Promise<TeamLeaderboardRow[]> {
  const { data, error } = await supabase
    .from('team_leaderboard')
    .select('*')
    .eq('gameday_id', gamedayId)
    .order('total_score', { ascending: false });

  if (error) throw new Error(`Error fetching team leaderboard: ${error.message}`);
  return (data ?? []) as TeamLeaderboardRow[];
}

// ============================================
// REAL-TIME SUBSCRIPTIONS
// ============================================

export function subscribeToScores(gamedayId: string, onUpdate: () => void) {
  const channel = supabase
    .channel(`scores-${gamedayId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'scores',
        filter: `gameday_id=eq.${gamedayId}`,
      },
      () => onUpdate(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToTeams(gamedayId: string, onUpdate: () => void) {
  const channel = supabase
    .channel(`teams-${gamedayId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'teams',
        filter: `gameday_id=eq.${gamedayId}`,
      },
      () => onUpdate(),
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'participants',
      },
      () => onUpdate(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
