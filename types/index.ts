export type MediaType = 'Serie' | 'Pelicula' | 'Anime';
export type MediaStatus = 'Pendiente' | 'Viendo' | 'Finalizado' | 'Abandonado';
export type Priority = 'Alta' | 'Media' | 'Baja';
export type Platform = 'Netflix' | 'Prime Video' | 'Disney+' | 'HBO Max' | 'Apple TV' | 'Paramount+' | 'Hulu' | 'Crunchyroll' | 'Otra';

export interface MediaItem {
  id: string;
  tipo: MediaType;
  titulo: string;
  genero: string | null;
  plataforma: Platform | string | null;
  estado: MediaStatus;
  progreso: string | null;
  prioridad: Priority | null;
  calificacion: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  image_url?: string | null;
  description?: string | null;
  tmdb_id?: string | null;
  partners?: { user_id: string; profiles?: { display_name: string; email: string } }[];
}

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface MediaPartner {
  id: string;
  media_id: string;
  user_id: string;
  created_at: string;
}

export interface Filters {
  tipo: MediaType | 'Todos';
  estado: MediaStatus | 'Todos';
  plataforma: string;
  prioridad: Priority | 'Todos';
  search: string;
}

export interface UserRelationship {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  relationship_type: 'friend' | 'partner';
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface MovieSwipe {
  id: string;
  user_id: string;
  media_id: string;
  vote: boolean;
  created_at: string;
}

