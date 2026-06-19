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
        };
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
      };
      profiles: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          display_name?: string | null;
          created_at?: string;
        };
      };
    };
  };
}
