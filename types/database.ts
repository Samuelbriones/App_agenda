export interface Database {
  public: {
    Tables: {
      media_items: {
        Row: {
          id: string;
          tipo: 'Serie' | 'Pelicula' | 'Anime';
          titulo: string;
          genero: string | null;
          plataforma: string | null;
          estado: 'Pendiente' | 'Viendo' | 'Finalizado' | 'Abandonado';
          progreso: string | null;
          prioridad: 'Alta' | 'Media' | 'Baja' | null;
          calificacion: number | null;
          created_by: string;
          created_at: string;
          updated_at: string;
          image_url: string | null;
          description: string | null;
          tmdb_id: string | null;
        };
        Insert: {
          id?: string;
          tipo: 'Serie' | 'Pelicula' | 'Anime';
          titulo: string;
          genero?: string | null;
          plataforma?: string | null;
          estado: 'Pendiente' | 'Viendo' | 'Finalizado' | 'Abandonado';
          progreso?: string | null;
          prioridad?: 'Alta' | 'Media' | 'Baja' | null;
          calificacion?: number | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          image_url?: string | null;
          description?: string | null;
          tmdb_id?: string | null;
        };
        Update: {
          id?: string;
          tipo?: 'Serie' | 'Pelicula' | 'Anime';
          titulo?: string;
          genero?: string | null;
          plataforma?: string | null;
          estado?: 'Pendiente' | 'Viendo' | 'Finalizado' | 'Abandonado';
          progreso?: string | null;
          prioridad?: 'Alta' | 'Media' | 'Baja' | null;
          calificacion?: number | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          image_url?: string | null;
          description?: string | null;
          tmdb_id?: string | null;
        };
        Relationships: [];
      };
      media_partners: {
        Row: {
          id: string;
          media_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          media_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          media_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      user_relationships: {
        Row: {
          id: string;
          sender_id: string;
          receiver_id: string;
          status: 'pending' | 'accepted' | 'rejected';
          relationship_type: 'friend' | 'partner';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sender_id: string;
          receiver_id: string;
          status: 'pending' | 'accepted' | 'rejected';
          relationship_type: 'friend' | 'partner';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sender_id?: string;
          receiver_id?: string;
          status?: 'pending' | 'accepted' | 'rejected';
          relationship_type?: 'friend' | 'partner';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      movie_swipes: {
        Row: {
          id: string;
          user_id: string;
          media_id: string;
          vote: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          media_id: string;
          vote: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          media_id?: string;
          vote?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}
