const TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY || '670074cd864cc41254c6f60519955c49';
const BASE_URL = 'https://api.themoviedb.org/3';

export interface TMDBMediaResult {
  id: string;
  tipo: 'Pelicula' | 'Serie' | 'Anime';
  titulo: string;
  genero: string;
  sinopsis: string;
  image_url: string | null;
  release_year: string;
}

// Mapa de géneros TMDB a nombres en español
const GENRE_MAP: { [key: number]: string } = {
  28: 'Acción',
  12: 'Aventura',
  16: 'Animación',
  35: 'Comedia',
  80: 'Crimen',
  99: 'Documental',
  18: 'Drama',
  10751: 'Familia',
  14: 'Fantasía',
  36: 'Historia',
  27: 'Terror',
  10402: 'Música',
  9648: 'Misterio',
  10749: 'Romance',
  878: 'Ciencia Ficción',
  10770: 'Película de la TV',
  53: 'Suspenso',
  10752: 'Guerra',
  37: 'Western',
  10759: 'Acción y Aventura',
  10762: 'Infantil',
  10763: 'Noticias',
  10764: 'Reality',
  10765: 'Sci-Fi y Fantasía',
  10766: 'Telenovela',
  10767: 'Talk Show',
  10768: 'Guerra y Política',
};

/**
 * Busca contenidos (películas y series) en TMDB.
 */
export async function searchTMDB(query: string): Promise<TMDBMediaResult[]> {
  if (!query.trim()) return [];

  try {
    const url = `${BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
      query
    )}&language=es-ES&include_adult=false`;

    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`TMDB API query failed (status ${response.status}). Ensure EXPO_PUBLIC_TMDB_API_KEY is configured correctly.`);
      return [];
    }

    const data = await response.json();
    const results = data.results || [];

    return results
      .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
      .map((item: any) => {
        const mediaType = item.media_type;
        const originCountries = item.origin_country || [];
        const genreIds = item.genre_ids || [];

        // 1. Determinar tipo de contenido
        let tipo: 'Pelicula' | 'Serie' | 'Anime' = 'Serie';
        if (mediaType === 'movie') {
          tipo = 'Pelicula';
        } else if (mediaType === 'tv') {
          // Si es de Japón y tiene género animación (16), se clasifica como Anime
          const isJapanese = originCountries.includes('JP');
          const hasAnimationGenre = genreIds.includes(16);
          if (isJapanese && hasAnimationGenre) {
            tipo = 'Anime';
          } else {
            tipo = 'Serie';
          }
        }

        // 2. Mapear géneros
        let genres = genreIds
          .map((id: number) => GENRE_MAP[id])
          .filter(Boolean)
          .join(', ');

        // Clasificar inteligentemente como K-Drama si el origen es Corea del Sur (KR)
        const isKorean = originCountries.includes('KR');
        if (isKorean) {
          genres = genres ? `K-Drama, ${genres}` : 'K-Drama';
        }

        // 3. Obtener año de lanzamiento
        const releaseDate = item.release_date || item.first_air_date || '';
        const releaseYear = releaseDate ? releaseDate.split('-')[0] : '';

        // 4. Formatear URL de imagen
        const image_url = item.poster_path
          ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
          : null;

        return {
          id: String(item.id),
          tipo,
          titulo: item.title || item.name || 'Sin título',
          genero: genres || 'General',
          sinopsis: item.overview || 'Sin descripción disponible.',
          image_url,
          release_year: releaseYear,
        };
      })
      .slice(0, 5);
  } catch (error) {
    console.warn('Error fetching data from TMDB:', error);
    return [];
  }
}
