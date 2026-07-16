/**
 * Supabase Database Types — GameDay ADL V2
 */

export interface Database {
  public: {
    Tables: {
      gamedays: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          status: 'upcoming' | 'active' | 'finished';
          max_teams: number;
          questions_per_round: number;
          time_per_question: number;
          category: number | null;
          difficulty: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          status?: 'upcoming' | 'active' | 'finished';
          max_teams?: number;
          questions_per_round?: number;
          time_per_question?: number;
          category?: number | null;
          difficulty?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          status?: 'upcoming' | 'active' | 'finished';
          max_teams?: number;
          questions_per_round?: number;
          time_per_question?: number;
          category?: number | null;
          difficulty?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      teams: {
        Row: {
          id: string;
          gameday_id: string;
          name: string;
          color: string;
          avatar: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          gameday_id: string;
          name: string;
          color?: string;
          avatar?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          gameday_id?: string;
          name?: string;
          color?: string;
          avatar?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'teams_gameday_id_fkey';
            columns: ['gameday_id'];
            isOneToOne: false;
            referencedRelation: 'gamedays';
            referencedColumns: ['id'];
          },
        ];
      };
      participants: {
        Row: {
          id: string;
          team_id: string;
          name: string;
          avatar: string;
          is_captain: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          name: string;
          avatar?: string;
          is_captain?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          name?: string;
          avatar?: string;
          is_captain?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'participants_team_id_fkey';
            columns: ['team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
        ];
      };
      scores: {
        Row: {
          id: string;
          gameday_id: string;
          team_id: string;
          participant_id: string;
          score: number;
          correct_answers: number;
          total_questions: number;
          best_streak: number;
          time_per_question: number;
          category: string | null;
          difficulty: string | null;
          completed_at: string;
        };
        Insert: {
          id?: string;
          gameday_id: string;
          team_id: string;
          participant_id: string;
          score: number;
          correct_answers: number;
          total_questions: number;
          best_streak?: number;
          time_per_question?: number;
          category?: string | null;
          difficulty?: string | null;
          completed_at?: string;
        };
        Update: {
          id?: string;
          gameday_id?: string;
          team_id?: string;
          participant_id?: string;
          score?: number;
          correct_answers?: number;
          total_questions?: number;
          best_streak?: number;
          time_per_question?: number;
          category?: string | null;
          difficulty?: string | null;
          completed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'scores_gameday_id_fkey';
            columns: ['gameday_id'];
            isOneToOne: false;
            referencedRelation: 'gamedays';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'scores_team_id_fkey';
            columns: ['team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'scores_participant_id_fkey';
            columns: ['participant_id'];
            isOneToOne: false;
            referencedRelation: 'participants';
            referencedColumns: ['id'];
          },
        ];
      };
      players: {
        Row: {
          id: string;
          name: string;
          avatar: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          avatar: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          avatar?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      game_sessions: {
        Row: {
          id: string;
          player_id: string;
          score: number;
          correct_answers: number;
          total_questions: number;
          category: string | null;
          difficulty: string | null;
          best_streak: number;
          time_per_question: number;
          completed_at: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          score: number;
          correct_answers: number;
          total_questions: number;
          category?: string | null;
          difficulty?: string | null;
          best_streak?: number;
          time_per_question?: number;
          completed_at?: string;
        };
        Update: {
          id?: string;
          player_id?: string;
          score?: number;
          correct_answers?: number;
          total_questions?: number;
          category?: string | null;
          difficulty?: string | null;
          best_streak?: number;
          time_per_question?: number;
          completed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'game_sessions_player_id_fkey';
            columns: ['player_id'];
            isOneToOne: false;
            referencedRelation: 'players';
            referencedColumns: ['id'];
          },
        ];
      };
      leaderboard: {
        Row: {
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
        };
        Insert: {
          id?: string;
          player_id: string;
          player_name: string;
          player_avatar: string;
          total_score?: number;
          games_played?: number;
          best_score?: number;
          best_streak?: number;
          total_correct?: number;
          total_questions?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          player_id?: string;
          player_name?: string;
          player_avatar?: string;
          total_score?: number;
          games_played?: number;
          best_score?: number;
          best_streak?: number;
          total_correct?: number;
          total_questions?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'leaderboard_player_id_fkey';
            columns: ['player_id'];
            isOneToOne: true;
            referencedRelation: 'players';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      team_leaderboard: {
        Row: {
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
        };
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
