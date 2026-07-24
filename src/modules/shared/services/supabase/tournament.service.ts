import { supabase } from './supabaseClient';
import type {
  Tournament,
  TrnTeam,
  TrnParticipant,
  TrnRound,
  TrnMatch,
  TrnMatchScore,
  BracketMatch,
  TournamentSize,
  TournamentStatus,
} from 'modules/shared/types/tournament.types';
import { ROUND_NAMES, TRN_TEAM_COLORS, TRN_TEAM_AVATARS } from 'modules/shared/types/tournament.types';

// ============================================
// INSERT TYPES
// ============================================

interface TournamentInsert {
  name: string;
  description?: string | null;
  date: string;
  size: TournamentSize;
  max_games_per_participant?: number;
  config_difficulty?: string | null;
  config_questions_per_game?: number | null;
}

interface TrnTeamInsert {
  tournament_id: string;
  name: string;
  color?: string;
  avatar?: string;
}

interface TrnParticipantInsert {
  team_id: string;
  name: string;
  avatar?: string;
  is_captain?: boolean;
}

export interface TrnMatchScoreInsert {
  match_id: string;
  tournament_id: string;
  team_id: string;
  participant_id: string;
  score: number;
  correct_answers: number;
  total_questions: number;
  best_streak?: number;
}

// ============================================
// TOURNAMENTS CRUD
// ============================================

export async function createTournament(tournament: TournamentInsert): Promise<Tournament> {
  const { data, error } = await supabase
    .from('trn_tournaments')
    .insert(tournament)
    .select()
    .single();
  if (error) throw new Error(`Error creating tournament: ${error.message}`);

  const createdTournament = data as Tournament;

  // Auto-create teams with default participants
  await createDefaultTeams(createdTournament.id, createdTournament.size);

  return createdTournament;
}

async function createDefaultTeams(tournamentId: string, size: TournamentSize): Promise<void> {
  for (let i = 0; i < size; i++) {
    const color = TRN_TEAM_COLORS[i % TRN_TEAM_COLORS.length];
    const avatar = TRN_TEAM_AVATARS[i % TRN_TEAM_AVATARS.length];
    const teamName = `Equipo ${i + 1}`;

    // Create team
    const { data: team, error: teamError } = await supabase
      .from('trn_teams')
      .insert({ tournament_id: tournamentId, name: teamName, color, avatar })
      .select()
      .single();
    if (teamError) throw new Error(`Error creating team: ${teamError.message}`);

    // Create default participant
    await supabase
      .from('trn_participants')
      .insert({ team_id: team.id, name: `Jugador 1`, avatar: '🦊' });
  }
}

export async function getTournaments(): Promise<Tournament[]> {
  const { data, error } = await supabase
    .from('trn_tournaments')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Error fetching tournaments: ${error.message}`);
  return (data ?? []) as Tournament[];
}

export async function getTournament(id: string): Promise<Tournament> {
  const { data, error } = await supabase
    .from('trn_tournaments')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new Error(`Error fetching tournament: ${error.message}`);
  return data as Tournament;
}

export async function updateTournament(id: string, updates: Partial<TournamentInsert & { status: TournamentStatus; current_round_id: string | null; champion_team_id: string | null }>): Promise<void> {
  const { error } = await supabase
    .from('trn_tournaments')
    .update(updates)
    .eq('id', id);
  if (error) throw new Error(`Error updating tournament: ${error.message}`);
}

export async function deleteTournament(id: string): Promise<void> {
  const { error } = await supabase
    .from('trn_tournaments')
    .delete()
    .eq('id', id);
  if (error) throw new Error(`Error deleting tournament: ${error.message}`);
}

// ============================================
// TEAMS CRUD
// ============================================

export async function createTrnTeam(team: TrnTeamInsert): Promise<TrnTeam> {
  const { data, error } = await supabase
    .from('trn_teams')
    .insert(team)
    .select()
    .single();
  if (error) throw new Error(`Error creating team: ${error.message}`);
  return data as TrnTeam;
}

export async function getTrnTeamsByTournament(tournamentId: string): Promise<TrnTeam[]> {
  const { data, error } = await supabase
    .from('trn_teams')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('seed', { ascending: true, nullsFirst: false });
  if (error) throw new Error(`Error fetching teams: ${error.message}`);
  return (data ?? []) as TrnTeam[];
}

export async function updateTrnTeam(id: string, updates: Partial<TrnTeamInsert & { seed: number; bracket_side: string; is_eliminated: boolean; final_position: number | null }>): Promise<void> {
  const { error } = await supabase
    .from('trn_teams')
    .update(updates)
    .eq('id', id);
  if (error) throw new Error(`Error updating team: ${error.message}`);
}

export async function deleteTrnTeam(id: string): Promise<void> {
  const { error } = await supabase
    .from('trn_teams')
    .delete()
    .eq('id', id);
  if (error) throw new Error(`Error deleting team: ${error.message}`);
}

// ============================================
// PARTICIPANTS CRUD
// ============================================

export async function addTrnParticipant(participant: TrnParticipantInsert): Promise<TrnParticipant> {
  const { data, error } = await supabase
    .from('trn_participants')
    .insert(participant)
    .select()
    .single();
  if (error) throw new Error(`Error adding participant: ${error.message}`);
  return data as TrnParticipant;
}

export async function getTrnParticipantsByTeam(teamId: string): Promise<TrnParticipant[]> {
  const { data, error } = await supabase
    .from('trn_participants')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`Error fetching participants: ${error.message}`);
  return (data ?? []) as TrnParticipant[];
}

export async function updateTrnParticipant(id: string, updates: Partial<TrnParticipantInsert>): Promise<void> {
  const { error } = await supabase
    .from('trn_participants')
    .update(updates)
    .eq('id', id);
  if (error) throw new Error(`Error updating participant: ${error.message}`);
}

export async function deleteTrnParticipant(id: string): Promise<void> {
  const { error } = await supabase
    .from('trn_participants')
    .delete()
    .eq('id', id);
  if (error) throw new Error(`Error deleting participant: ${error.message}`);
}

// ============================================
// ROUNDS
// ============================================

export async function getRoundsByTournament(tournamentId: string): Promise<TrnRound[]> {
  const { data, error } = await supabase
    .from('trn_rounds')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('round_order', { ascending: true });
  if (error) throw new Error(`Error fetching rounds: ${error.message}`);
  return (data ?? []) as TrnRound[];
}

export async function updateRound(id: string, updates: Partial<TrnRound>): Promise<void> {
  const { error } = await supabase
    .from('trn_rounds')
    .update(updates)
    .eq('id', id);
  if (error) throw new Error(`Error updating round: ${error.message}`);
}

// ============================================
// MATCHES
// ============================================

export async function getMatchesByRound(roundId: string): Promise<TrnMatch[]> {
  const { data, error } = await supabase
    .from('trn_matches')
    .select('*')
    .eq('round_id', roundId)
    .order('match_number', { ascending: true });
  if (error) throw new Error(`Error fetching matches: ${error.message}`);
  return (data ?? []) as TrnMatch[];
}

export async function getMatchesByTournament(tournamentId: string): Promise<TrnMatch[]> {
  const { data, error } = await supabase
    .from('trn_matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`Error fetching matches: ${error.message}`);
  return (data ?? []) as TrnMatch[];
}

export async function updateMatch(id: string, updates: Partial<TrnMatch>): Promise<void> {
  const { error } = await supabase
    .from('trn_matches')
    .update(updates)
    .eq('id', id);
  if (error) throw new Error(`Error updating match: ${error.message}`);
}

// ============================================
// MATCH SCORES
// ============================================

export async function saveMatchScore(score: TrnMatchScoreInsert): Promise<void> {
  const { error } = await supabase
    .from('trn_match_scores')
    .insert(score);
  if (error) throw new Error(`Error saving match score: ${error.message}`);
}

export async function getMatchScores(matchId: string): Promise<TrnMatchScore[]> {
  const { data, error } = await supabase
    .from('trn_match_scores')
    .select('*')
    .eq('match_id', matchId);
  if (error) throw new Error(`Error fetching match scores: ${error.message}`);
  return (data ?? []) as TrnMatchScore[];
}

// ============================================
// LIVE SCORES (real-time per answer)
// ============================================

export async function upsertTrnLiveScore(liveScore: {
  match_id: string;
  tournament_id: string;
  team_id: string;
  participant_id: string;
  participant_name?: string;
  participant_avatar?: string;
  current_score: number;
  current_correct: number;
  current_question: number;
  total_questions: number;
  current_streak: number;
  category_name?: string;
  is_playing: boolean;
}): Promise<void> {
  const { error } = await supabase
    .from('trn_live_scores')
    .upsert({ ...liveScore, updated_at: new Date().toISOString() }, { onConflict: 'match_id,participant_id' });
  if (error) throw new Error(`Error upserting live score: ${error.message}`);
}

export async function getTrnLiveScoresByMatch(matchId: string) {
  const { data, error } = await supabase
    .from('trn_live_scores')
    .select('*')
    .eq('match_id', matchId);
  if (error) throw new Error(`Error fetching live scores: ${error.message}`);
  return data ?? [];
}

export async function deleteTrnLiveScoresByMatch(matchId: string): Promise<void> {
  const { error } = await supabase
    .from('trn_live_scores')
    .delete()
    .eq('match_id', matchId);
  if (error) throw new Error(`Error deleting live scores: ${error.message}`);
}

// ============================================
// BRACKET VIEW
// ============================================

export async function getBracket(tournamentId: string): Promise<BracketMatch[]> {
  const { data, error } = await supabase
    .from('trn_bracket_view')
    .select('*')
    .eq('tournament_id', tournamentId);
  if (error) throw new Error(`Error fetching bracket: ${error.message}`);
  return (data ?? []) as BracketMatch[];
}

// ============================================
// REAL-TIME SUBSCRIPTIONS
// ============================================

export function subscribeToMatches(tournamentId: string, onUpdate: () => void) {
  const channel = supabase
    .channel(`trn-matches-${tournamentId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'trn_matches', filter: `tournament_id=eq.${tournamentId}` },
      () => onUpdate(),
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

export function subscribeToTrnLiveScores(matchId: string, onUpdate: () => void) {
  const channel = supabase
    .channel(`trn-live-${matchId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'trn_live_scores', filter: `match_id=eq.${matchId}` },
      () => onUpdate(),
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

export function subscribeToRounds(tournamentId: string, onUpdate: () => void) {
  const channel = supabase
    .channel(`trn-rounds-${tournamentId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'trn_rounds', filter: `tournament_id=eq.${tournamentId}` },
      () => onUpdate(),
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

// ============================================
// BRACKET ORGANIZATION LOGIC
// (Shuffle teams, create rounds & matches)
// ============================================

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getRoundsForSize(size: TournamentSize): { name: string; displayName: string }[] {
  const rounds: { name: string; displayName: string }[] = [];
  if (size === 32) rounds.push({ name: 'round_of_32', displayName: ROUND_NAMES['round_of_32'] });
  if (size >= 16) rounds.push({ name: 'round_of_16', displayName: ROUND_NAMES['round_of_16'] });
  rounds.push({ name: 'quarterfinals', displayName: ROUND_NAMES['quarterfinals'] });
  rounds.push({ name: 'semifinals', displayName: ROUND_NAMES['semifinals'] });
  rounds.push({ name: 'third_place', displayName: ROUND_NAMES['third_place'] });
  rounds.push({ name: 'final', displayName: ROUND_NAMES['final'] });
  return rounds;
}

/**
 * Organizes the tournament bracket:
 * 1. Shuffles teams randomly
 * 2. Assigns seeds and bracket sides (left/right)
 * 3. Creates all rounds
 * 4. Creates all matches with next_match links
 * 5. Updates tournament status to 'organizing'
 */
export async function organizeTournament(tournamentId: string): Promise<void> {
  // 1. Get tournament and teams
  const tournament = await getTournament(tournamentId);
  const teams = await getTrnTeamsByTournament(tournamentId);

  if (teams.length !== tournament.size) {
    throw new Error(`Se necesitan exactamente ${tournament.size} equipos. Hay ${teams.length} registrados.`);
  }

  // 2. Shuffle and assign seeds + sides
  const shuffled = shuffleArray(teams);
  const halfSize = tournament.size / 2;

  for (let i = 0; i < shuffled.length; i++) {
    const side = i < halfSize ? 'left' : 'right';
    await updateTrnTeam(shuffled[i].id, {
      seed: i + 1,
      bracket_side: side,
    });
  }

  // 3. Create rounds
  const roundDefs = getRoundsForSize(tournament.size);
  const createdRounds: { id: string; name: string; order: number }[] = [];

  for (let i = 0; i < roundDefs.length; i++) {
    const rd = roundDefs[i];
    let totalMatches = 0;
    if (rd.name === 'third_place') {
      totalMatches = 1;
    } else if (rd.name === 'final') {
      totalMatches = 1;
    } else {
      // First round has size/2 matches, each subsequent halves
      const firstRoundMatches = tournament.size / 2;
      totalMatches = firstRoundMatches / Math.pow(2, i);
    }

    const { data, error } = await supabase
      .from('trn_rounds')
      .insert({
        tournament_id: tournamentId,
        name: rd.name,
        display_name: rd.displayName,
        round_order: i + 1,
        total_matches: totalMatches,
      })
      .select()
      .single();
    if (error) throw new Error(`Error creating round: ${error.message}`);
    createdRounds.push({ id: data.id, name: rd.name, order: i + 1 });
  }

  // 4. Create matches for all rounds (bottom-up to link next_match)
  await createBracketMatches(tournamentId, tournament.size, shuffled, createdRounds);

  // 5. Update tournament status
  await updateTournament(tournamentId, {
    status: 'organizing',
    current_round_id: createdRounds[0].id,
  });
}

async function createBracketMatches(
  tournamentId: string,
  size: TournamentSize,
  shuffledTeams: TrnTeam[],
  rounds: { id: string; name: string; order: number }[],
): Promise<void> {
  const halfSize = size / 2;
  const leftTeams = shuffledTeams.slice(0, halfSize);
  const rightTeams = shuffledTeams.slice(halfSize);

  // We'll store match IDs per round for linking
  const matchesByRound: Map<string, string[]> = new Map();

  // Create matches round by round
  for (const round of rounds) {
    const matchIds: string[] = [];

    if (round.name === 'third_place' || round.name === 'final') {
      // These are single matches, teams TBD (filled when semis finish)
      const bracketSide = round.name === 'third_place' ? 'final' : 'final';
      const { data, error } = await supabase
        .from('trn_matches')
        .insert({
          tournament_id: tournamentId,
          round_id: round.id,
          match_number: 1,
          bracket_side: bracketSide,
          team_a_id: null,
          team_b_id: null,
        })
        .select('id')
        .single();
      if (error) throw new Error(`Error creating match: ${error.message}`);
      matchIds.push(data.id);
    } else {
      // Regular elimination round
      const isFirstRound = round.order === 1;
      let matchCount: number;
      if (isFirstRound) {
        matchCount = halfSize / 1; // half on each side
      } else {
        // Get previous round matches count / 2
        const prevRound = rounds[round.order - 2];
        const prevMatches = matchesByRound.get(prevRound.id) ?? [];
        matchCount = prevMatches.length / 2;
      }

      // Half matches on left, half on right
      const matchesPerSide = matchCount / 2;

      for (let side = 0; side < 2; side++) {
        const bracketSide = side === 0 ? 'left' : 'right';
        const teamsForSide = side === 0 ? leftTeams : rightTeams;

        for (let m = 0; m < matchesPerSide; m++) {
          const matchNumber = side * matchesPerSide + m + 1;
          let teamAId: string | null = null;
          let teamBId: string | null = null;

          // Only first round has teams assigned immediately
          if (isFirstRound) {
            teamAId = teamsForSide[m * 2]?.id ?? null;
            teamBId = teamsForSide[m * 2 + 1]?.id ?? null;
          }

          const { data, error } = await supabase
            .from('trn_matches')
            .insert({
              tournament_id: tournamentId,
              round_id: round.id,
              match_number: matchNumber,
              bracket_side: bracketSide,
              team_a_id: teamAId,
              team_b_id: teamBId,
            })
            .select('id')
            .single();
          if (error) throw new Error(`Error creating match: ${error.message}`);
          matchIds.push(data.id);
        }
      }
    }

    matchesByRound.set(round.id, matchIds);
  }

  // 5. Link matches: each match's winner goes to next_match
  await linkMatches(rounds, matchesByRound);
}

async function linkMatches(
  rounds: { id: string; name: string; order: number }[],
  matchesByRound: Map<string, string[]>,
): Promise<void> {
  // Link regular rounds (not third_place/final specially)
  const regularRounds = rounds.filter(r => r.name !== 'third_place' && r.name !== 'final');
  const semisRound = rounds.find(r => r.name === 'semifinals');
  const finalRound = rounds.find(r => r.name === 'final');
  const thirdPlaceRound = rounds.find(r => r.name === 'third_place');

  // Link each regular round to the next
  for (let i = 0; i < regularRounds.length - 1; i++) {
    const currentRound = regularRounds[i];
    const nextRound = regularRounds[i + 1];
    const currentMatches = matchesByRound.get(currentRound.id) ?? [];
    const nextMatches = matchesByRound.get(nextRound.id) ?? [];

    // Every 2 matches feed into 1 next match
    for (let m = 0; m < currentMatches.length; m++) {
      const nextMatchIndex = Math.floor(m / 2);
      const slot = m % 2 === 0 ? 'team_a' : 'team_b';

      if (nextMatches[nextMatchIndex]) {
        await updateMatch(currentMatches[m], {
          next_match_id: nextMatches[nextMatchIndex],
          next_match_slot: slot,
        } as Partial<TrnMatch>);
      }
    }
  }

  // Link semifinals to final and third_place
  if (semisRound && finalRound && thirdPlaceRound) {
    const semisMatches = matchesByRound.get(semisRound.id) ?? [];
    const finalMatchId = (matchesByRound.get(finalRound.id) ?? [])[0];
    // Note: losers of semis go to third_place - handled in advanceWinner

    // Winners of semis go to final
    if (semisMatches[0] && finalMatchId) {
      await updateMatch(semisMatches[0], {
        next_match_id: finalMatchId,
        next_match_slot: 'team_a',
      } as Partial<TrnMatch>);
    }
    if (semisMatches[1] && finalMatchId) {
      await updateMatch(semisMatches[1], {
        next_match_id: finalMatchId,
        next_match_slot: 'team_b',
      } as Partial<TrnMatch>);
    }
  }
}

// ============================================
// ROUND & MATCH FLOW
// ============================================

/**
 * Start a round: set status to in_progress, set all its matches to in_progress.
 * Special case: if starting 'third_place' or 'final', start BOTH simultaneously.
 */
export async function startRound(roundId: string): Promise<void> {
  // Get this round's info
  const { data: roundData } = await supabase.from('trn_rounds').select('*').eq('id', roundId).single();
  const round = roundData as TrnRound;

  // Start this round
  await activateRound(roundId);

  // If it's third_place or final, also start the other one
  if (round && (round.name === 'third_place' || round.name === 'final')) {
    const siblingName = round.name === 'third_place' ? 'final' : 'third_place';
    const { data: siblingData } = await supabase
      .from('trn_rounds')
      .select('*')
      .eq('tournament_id', round.tournament_id)
      .eq('name', siblingName)
      .single();

    if (siblingData && siblingData.status === 'pending') {
      await activateRound(siblingData.id);
    }
  }
}

async function activateRound(roundId: string): Promise<void> {
  await updateRound(roundId, { status: 'in_progress', started_at: new Date().toISOString() } as Partial<TrnRound>);

  // Set pending matches with both teams assigned to in_progress
  const matches = await getMatchesByRound(roundId);
  for (const match of matches) {
    if (match.status === 'pending' && match.team_a_id && match.team_b_id) {
      await updateMatch(match.id, { status: 'in_progress', started_at: new Date().toISOString() } as Partial<TrnMatch>);
    }
  }
}

/**
 * Finish a match: determine winner, advance to next match, handle semis losers
 */
export async function finishMatch(matchId: string): Promise<void> {
  // Get match scores aggregated by team
  const scores = await getMatchScores(matchId);
  const match = (await supabase.from('trn_matches').select('*').eq('id', matchId).single()).data as TrnMatch;

  if (!match) throw new Error('Match not found');

  const teamAScore = scores
    .filter(s => s.team_id === match.team_a_id)
    .reduce((sum, s) => sum + s.score, 0);
  const teamBScore = scores
    .filter(s => s.team_id === match.team_b_id)
    .reduce((sum, s) => sum + s.score, 0);

  const winnerId = teamAScore >= teamBScore ? match.team_a_id : match.team_b_id;
  const loserId = winnerId === match.team_a_id ? match.team_b_id : match.team_a_id;

  // Update match result
  await updateMatch(matchId, {
    team_a_score: teamAScore,
    team_b_score: teamBScore,
    winner_id: winnerId,
    loser_id: loserId,
    status: 'finished',
    finished_at: new Date().toISOString(),
  } as Partial<TrnMatch>);

  // Mark loser as eliminated
  if (loserId) {
    await updateTrnTeam(loserId, { is_eliminated: true });
  }

  // Advance winner to next match
  if (match.next_match_id && match.next_match_slot && winnerId) {
    const updateData: Record<string, string> = {};
    updateData[match.next_match_slot === 'team_a' ? 'team_a_id' : 'team_b_id'] = winnerId;
    await supabase.from('trn_matches').update(updateData).eq('id', match.next_match_id);
  }

  // Handle semifinals losers → third place match
  const round = (await supabase.from('trn_rounds').select('*').eq('id', match.round_id).single()).data as TrnRound;
  if (round?.name === 'semifinals' && loserId) {
    await advanceLoserToThirdPlace(match.tournament_id, loserId, matchId);
  }

  // Update round completed_matches count
  await supabase.from('trn_rounds').update({
    completed_matches: round.completed_matches + 1,
  }).eq('id', round.id);

  // Check if round is complete
  const updatedRound = (await supabase.from('trn_rounds').select('*').eq('id', round.id).single()).data as TrnRound;
  if (updatedRound.completed_matches >= updatedRound.total_matches) {
    await updateRound(round.id, { status: 'finished', finished_at: new Date().toISOString() } as Partial<TrnRound>);
  }

  // Clean up live scores for this match
  await deleteTrnLiveScoresByMatch(matchId);
}

async function advanceLoserToThirdPlace(tournamentId: string, loserId: string, semisMatchId: string): Promise<void> {
  // Find third_place round and its match
  const rounds = await getRoundsByTournament(tournamentId);
  const thirdPlaceRound = rounds.find(r => r.name === 'third_place');
  if (!thirdPlaceRound) return;

  const matches = await getMatchesByRound(thirdPlaceRound.id);
  const thirdPlaceMatch = matches[0];
  if (!thirdPlaceMatch) return;

  // Find which semi match this is (first or second) to assign slot
  const semisRound = rounds.find(r => r.name === 'semifinals');
  if (!semisRound) return;
  const semisMatches = await getMatchesByRound(semisRound.id);
  const semisIndex = semisMatches.findIndex(m => m.id === semisMatchId);

  const slot = semisIndex === 0 ? 'team_a_id' : 'team_b_id';
  await supabase.from('trn_matches').update({ [slot]: loserId }).eq('id', thirdPlaceMatch.id);
}

/**
 * Finish the tournament: set final positions and champion
 */
export async function finishTournament(tournamentId: string): Promise<void> {
  const rounds = await getRoundsByTournament(tournamentId);
  const finalRound = rounds.find(r => r.name === 'final');
  const thirdPlaceRound = rounds.find(r => r.name === 'third_place');

  if (finalRound) {
    const finalMatches = await getMatchesByRound(finalRound.id);
    const finalMatch = finalMatches[0];
    if (finalMatch?.winner_id) {
      await updateTrnTeam(finalMatch.winner_id, { final_position: 1 });
      await updateTournament(tournamentId, { champion_team_id: finalMatch.winner_id });
      if (finalMatch.loser_id) {
        await updateTrnTeam(finalMatch.loser_id, { final_position: 2 });
      }
    }
  }

  if (thirdPlaceRound) {
    const thirdMatches = await getMatchesByRound(thirdPlaceRound.id);
    const thirdMatch = thirdMatches[0];
    if (thirdMatch?.winner_id) {
      await updateTrnTeam(thirdMatch.winner_id, { final_position: 3 });
      if (thirdMatch.loser_id) {
        await updateTrnTeam(thirdMatch.loser_id, { final_position: 4 });
      }
    }
  }

  await updateTournament(tournamentId, { status: 'finished' });
}

/**
 * Check if all participants in a match have finished playing
 */
export async function isMatchComplete(matchId: string): Promise<boolean> {
  const scores = await getMatchScores(matchId);
  if (scores.length === 0) return false;
  return scores.every(s => s.is_finished);
}

/**
 * Force-finish all in-progress matches in the active round (admin action).
 * Uses current scores to determine winners.
 */
export async function forceFinishRound(tournamentId: string): Promise<number> {
  const rounds = await getRoundsByTournament(tournamentId);
  const activeRound = rounds.find(r => r.status === 'in_progress');
  if (!activeRound) throw new Error('No hay una ronda activa');

  const matches = await getMatchesByRound(activeRound.id);
  const inProgressMatches = matches.filter(m => m.status === 'in_progress');

  for (const match of inProgressMatches) {
    await finishMatch(match.id);
  }

  return inProgressMatches.length;
}

/**
 * Count how many games (scores) a participant has saved in a given match
 */
export async function getParticipantMatchGamesCount(matchId: string, participantId: string): Promise<number> {
  const { count, error } = await supabase
    .from('trn_match_scores')
    .select('*', { count: 'exact', head: true })
    .eq('match_id', matchId)
    .eq('participant_id', participantId);
  if (error) throw new Error(`Error counting games: ${error.message}`);
  return count ?? 0;
}

/**
 * Check if all participants in both teams of a match have used all their games.
 * If so, auto-finish the match.
 * Returns { finished: boolean, winnerId?, loserId? }
 */
export async function checkAndAutoFinishMatch(
  matchId: string,
  tournamentId: string,
): Promise<{ finished: boolean; winnerId?: string; loserId?: string; teamAScore?: number; teamBScore?: number }> {
  // Get tournament for max games
  const tournament = await getTournament(tournamentId);
  const maxGames = tournament.max_games_per_participant;

  // Get the match
  const { data: matchData } = await supabase.from('trn_matches').select('*').eq('id', matchId).single();
  const match = matchData as TrnMatch;
  if (!match || match.status !== 'in_progress') return { finished: false };

  // Get participants from both teams
  const teamAParticipants = match.team_a_id ? await getTrnParticipantsByTeam(match.team_a_id) : [];
  const teamBParticipants = match.team_b_id ? await getTrnParticipantsByTeam(match.team_b_id) : [];
  const allParticipants = [...teamAParticipants, ...teamBParticipants];

  if (allParticipants.length === 0) return { finished: false };

  // Check if each participant has played maxGames
  for (const p of allParticipants) {
    const gamesCount = await getParticipantMatchGamesCount(matchId, p.id);
    if (gamesCount < maxGames) return { finished: false };
  }

  // All participants are done! Auto-finish the match.
  await finishMatch(matchId);

  // Re-fetch match to get winner
  const { data: finishedMatch } = await supabase.from('trn_matches').select('*').eq('id', matchId).single();
  const fm = finishedMatch as TrnMatch;

  return {
    finished: true,
    winnerId: fm?.winner_id ?? undefined,
    loserId: fm?.loser_id ?? undefined,
    teamAScore: fm?.team_a_score,
    teamBScore: fm?.team_b_score,
  };
}

// ============================================
// TOURNAMENT SIMULATOR (Admin only)
// ============================================

/**
 * Simulates an entire round: generates random scores for all participants
 * in all in-progress matches, then auto-finishes each match.
 * Returns summary of results.
 */
export async function simulateRound(tournamentId: string): Promise<{
  matchesSimulated: number;
  results: { matchId: string; teamAName: string; teamBName: string; teamAScore: number; teamBScore: number; winnerId: string }[];
}> {
  const tournament = await getTournament(tournamentId);
  const maxGames = tournament.max_games_per_participant;

  // Find active round
  const rounds = await getRoundsByTournament(tournamentId);
  const activeRound = rounds.find(r => r.status === 'in_progress');
  if (!activeRound) throw new Error('No hay una ronda activa para simular');

  const matches = await getMatchesByRound(activeRound.id);
  const inProgressMatches = matches.filter(m => m.status === 'in_progress');

  if (inProgressMatches.length === 0) throw new Error('No hay matches en progreso');

  const results: { matchId: string; teamAName: string; teamBName: string; teamAScore: number; teamBScore: number; winnerId: string }[] = [];

  for (const match of inProgressMatches) {
    if (!match.team_a_id || !match.team_b_id) continue;

    // Get participants from both teams
    const teamAParticipants = await getTrnParticipantsByTeam(match.team_a_id);
    const teamBParticipants = await getTrnParticipantsByTeam(match.team_b_id);

    // Get team names
    const { data: teamAData } = await supabase.from('trn_teams').select('name').eq('id', match.team_a_id).single();
    const { data: teamBData } = await supabase.from('trn_teams').select('name').eq('id', match.team_b_id).single();

    // Simulate games for each participant
    const allParticipants = [
      ...teamAParticipants.map(p => ({ ...p, teamId: match.team_a_id! })),
      ...teamBParticipants.map(p => ({ ...p, teamId: match.team_b_id! })),
    ];

    for (const participant of allParticipants) {
      // Check how many games they already have
      const existingGames = await getParticipantMatchGamesCount(match.id, participant.id);
      const gamesToSimulate = maxGames - existingGames;

      for (let g = 0; g < gamesToSimulate; g++) {
        // Generate random but realistic scores
        const totalQuestions = 10;
        const correctAnswers = Math.floor(Math.random() * 7) + 3; // 3-9 correct
        const baseScore = correctAnswers * (Math.floor(Math.random() * 150) + 100); // 100-250 per correct
        const streakBonus = Math.floor(Math.random() * 200);
        const score = baseScore + streakBonus;
        const bestStreak = Math.min(correctAnswers, Math.floor(Math.random() * 5) + 1);

        await saveMatchScore({
          match_id: match.id,
          tournament_id: tournamentId,
          team_id: participant.teamId,
          participant_id: participant.id,
          score,
          correct_answers: correctAnswers,
          total_questions: totalQuestions,
          best_streak: bestStreak,
        });

        // Small delay to let realtime propagate
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    // Finish the match
    await finishMatch(match.id);

    // Get result
    const { data: finishedMatch } = await supabase.from('trn_matches').select('*').eq('id', match.id).single();
    if (finishedMatch) {
      results.push({
        matchId: match.id,
        teamAName: teamAData?.name ?? 'Equipo A',
        teamBName: teamBData?.name ?? 'Equipo B',
        teamAScore: finishedMatch.team_a_score,
        teamBScore: finishedMatch.team_b_score,
        winnerId: finishedMatch.winner_id,
      });
    }
  }

  return { matchesSimulated: inProgressMatches.length, results };
}

// ============================================
// GAME SESSIONS (for page reload recovery)
// ============================================

export interface GameSessionRow {
  id: string;
  tournament_id: string;
  match_id: string;
  team_id: string;
  participant_id: string;
  question_ids: number[];
  current_index: number;
  score: number;
  correct_answers: number;
  streak: number;
  best_streak: number;
  total_questions: number;
  config_time: number;
  config_difficulty: string | null;
  is_active: boolean;
}

/**
 * Create a new game session when participant starts playing
 */
export async function createGameSession(session: {
  tournament_id: string;
  match_id: string;
  team_id: string;
  participant_id: string;
  question_ids: number[];
  total_questions: number;
  config_time: number;
  config_difficulty: string | null;
}): Promise<string> {
  // Delete any previous active session for this participant in this match
  await supabase
    .from('trn_game_sessions')
    .delete()
    .eq('match_id', session.match_id)
    .eq('participant_id', session.participant_id)
    .eq('is_active', true);

  const { data, error } = await supabase
    .from('trn_game_sessions')
    .insert({
      ...session,
      current_index: 0,
      score: 0,
      correct_answers: 0,
      streak: 0,
      best_streak: 0,
      is_active: true,
    })
    .select('id')
    .single();

  if (error) throw new Error(`Error creating game session: ${error.message}`);
  return data.id;
}

/**
 * Update game session progress (called on each answer)
 */
export async function updateGameSession(sessionId: string, updates: {
  current_index: number;
  score: number;
  correct_answers: number;
  streak: number;
  best_streak: number;
}): Promise<void> {
  const { error } = await supabase
    .from('trn_game_sessions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', sessionId);
  if (error) throw new Error(`Error updating game session: ${error.message}`);
}

/**
 * Finish a game session (delete it - score is already in trn_match_scores)
 */
export async function finishGameSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('trn_game_sessions')
    .delete()
    .eq('id', sessionId);
  if (error) throw new Error(`Error finishing game session: ${error.message}`);
}

/**
 * Get active game session for a participant in a match
 */
export async function getActiveGameSession(matchId: string, participantId: string): Promise<GameSessionRow | null> {
  const { data, error } = await supabase
    .from('trn_game_sessions')
    .select('*')
    .eq('match_id', matchId)
    .eq('participant_id', participantId)
    .eq('is_active', true)
    .single();

  if (error || !data) return null;
  return data as GameSessionRow;
}
