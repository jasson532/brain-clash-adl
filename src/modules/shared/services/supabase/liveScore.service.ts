import { supabase } from './supabaseClient';

export interface LiveScoreData {
  gameday_id: string;
  team_id: string;
  participant_id: string;
  current_score: number;
  current_correct: number;
  current_question: number;
  total_questions: number;
  current_streak: number;
  is_playing: boolean;
  category_name?: string | null;
  participant_name?: string;
  participant_avatar?: string;
  games_completed?: number;
}

export interface LiveScoreRow extends LiveScoreData {
  id: string;
  updated_at: string;
}

/**
 * Create or update a live score entry (upsert on gameday_id + participant_id)
 */
export async function upsertLiveScore(data: LiveScoreData): Promise<void> {
  const { error } = await supabase
    .from('live_scores')
    .upsert(
      { ...data, updated_at: new Date().toISOString() },
      { onConflict: 'gameday_id,participant_id' },
    );

  if (error) throw new Error(`Error upserting live score: ${error.message}`);
}

/**
 * Mark participant as finished playing
 */
export async function finishLiveScore(gamedayId: string, participantId: string): Promise<void> {
  const { error } = await supabase
    .from('live_scores')
    .update({ is_playing: false, updated_at: new Date().toISOString() })
    .eq('gameday_id', gamedayId)
    .eq('participant_id', participantId);

  if (error) throw new Error(`Error finishing live score: ${error.message}`);
}

/**
 * Get all live scores for a gameday (for dashboard)
 */
export async function getLiveScores(gamedayId: string): Promise<LiveScoreRow[]> {
  const { data, error } = await supabase
    .from('live_scores')
    .select('*')
    .eq('gameday_id', gamedayId)
    .order('current_score', { ascending: false });

  if (error) throw new Error(`Error fetching live scores: ${error.message}`);
  return (data ?? []) as LiveScoreRow[];
}

/**
 * Subscribe to real-time changes on live_scores for a gameday
 */
export function subscribeToLiveScores(
  gamedayId: string,
  onUpdate: (scores: LiveScoreRow[]) => void,
) {
  // Initial fetch
  getLiveScores(gamedayId).then(onUpdate);

  const channel = supabase
    .channel(`live-scores-${gamedayId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'live_scores',
        filter: `gameday_id=eq.${gamedayId}`,
      },
      () => {
        // Re-fetch all scores on any change
        getLiveScores(gamedayId).then(onUpdate);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
