import { useState, useCallback } from 'react';

const STORAGE_KEY = 'gameday_answered_questions';

interface AnsweredState {
  [tournamentId: string]: number[]; // array of question IDs used in this tournament
}

function getStoredState(): AnsweredState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveState(state: AnsweredState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/**
 * Hook to track which questions have been used in a tournament.
 * Shared across ALL participants in the same tournament.
 * Persists in localStorage so it survives page refreshes.
 */
export function useAnsweredQuestions(tournamentId: string | null) {
  const [state, setState] = useState<AnsweredState>(getStoredState);

  const answeredIds: number[] = tournamentId ? (state[tournamentId] ?? []) : [];

  const markAnswered = useCallback((questionIds: number[]) => {
    if (!tournamentId) return;
    setState(prev => {
      const current = prev[tournamentId] ?? [];
      const updated = { ...prev, [tournamentId]: [...new Set([...current, ...questionIds])] };
      saveState(updated);
      return updated;
    });
  }, [tournamentId]);

  const resetForTournament = useCallback(() => {
    if (!tournamentId) return;
    setState(prev => {
      const updated = { ...prev, [tournamentId]: [] };
      saveState(updated);
      return updated;
    });
  }, [tournamentId]);

  return { answeredIds, markAnswered, resetForTournament };
}
