import { MediaType, MediaStatus, Priority, Platform } from '@/types';

export const MEDIA_TYPES: MediaType[] = ['Serie', 'Pelicula', 'Anime'];

export const MEDIA_STATUSES: MediaStatus[] = ['Pendiente', 'Viendo', 'Finalizado', 'Abandonado'];

export const PRIORITIES: Priority[] = ['Alta', 'Media', 'Baja'];

export const PLATFORMS: Platform[] = [
  'Netflix',
  'Prime Video',
  'Disney+',
  'HBO Max',
  'Apple TV',
  'Paramount+',
  'Hulu',
  'Crunchyroll',
  'Otra',
];

export const GENRES = [
  'Acción',
  'Aventura',
  'Animación',
  'Comedia',
  'Crimen',
  'Documental',
  'Drama',
  'Familia',
  'Fantasía',
  'Terror',
  'Musical',
  'Misterio',
  'Romance',
  'Ciencia Ficción',
  'Thriller',
  'Guerra',
  'Western',
];

export function formatGenre(g: string | null | undefined): string {
  if (!g) return '';
  switch (g) {
    case 'Accion':
    case 'Acción':
      return 'Acción';
    case 'Animacion':
    case 'Animación':
      return 'Animación';
    case 'Fantasia':
    case 'Fantasía':
      return 'Fantasía';
    case 'Ciencia Ficcion':
    case 'Ciencia Ficción':
      return 'Ciencia Ficción';
    default:
      return g;
  }
}

export function formatTipo(t: string | null | undefined): string {
  if (!t) return '';
  if (t === 'Pelicula' || t === 'Película') return 'Película';
  return t;
}

