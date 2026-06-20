export type MediaType = 'Serie' | 'Pelicula' | 'Anime';
export type MediaStatus = 'Pendiente' | 'Viendo' | 'Finalizado' | 'Abandonado';
export type Priority = 'Alta' | 'Media' | 'Baja';
export type Platform = 'Netflix' | 'Prime Video' | 'Disney+' | 'HBO Max' | 'Apple TV' | 'Paramount+' | 'Hulu' | 'Crunchyroll' | 'Otra';

export interface MediaItem {
  id: string;
  tipo: MediaType;
  titulo: string;
  genero: string;
  plataforma: Platform | string;
  estado: MediaStatus;
  progreso: string;
  prioridad: Priority;
  calificacion: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
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
