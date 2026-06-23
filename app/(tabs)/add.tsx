import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronDown, Search, Film, Tv, Star, X } from 'lucide-react-native';
import { createMediaItem } from '@/lib/media';
import { searchTMDB, TMDBMediaResult } from '@/lib/tmdb';
import { MediaType, MediaStatus, Priority } from '@/types';
import { Colors } from '@/constants/colors';
import { MEDIA_TYPES, MEDIA_STATUSES, PRIORITIES, PLATFORMS, GENRES, formatTipo } from '@/constants/data';

export default function AddScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Formulario local
  const [tipo, setTipo] = useState<MediaType>('Serie');
  const [titulo, setTitulo] = useState('');
  const [genero, setGenero] = useState('');
  const [plataforma, setPlataforma] = useState('');
  const [estado, setEstado] = useState<MediaStatus>('Pendiente');
  const [temporada, setTemporada] = useState('');
  const [episodio, setEpisodio] = useState('');
  const [prioridad, setPrioridad] = useState<Priority>('Media');
  const [calificacion, setCalificacion] = useState('');

  // Nuevos campos TMDB
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [tmdbId, setTmdbId] = useState<string | null>(null);

  // Búsqueda TMDB
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TMDBMediaResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const isMovie = tipo === 'Pelicula';
  const isFinished = estado === 'Finalizado';

  function resetForm() {
    setTipo('Serie');
    setTitulo('');
    setGenero('');
    setPlataforma('');
    setEstado('Pendiente');
    setTemporada('');
    setEpisodio('');
    setPrioridad('Media');
    setCalificacion('');
    setImageUrl(null);
    setDescription(null);
    setTmdbId(null);
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
    setError(null);
    setOpenDropdown(null);
  }

  function getProgreso(): string {
    if (isMovie) return 'Vista';
    const t = temporada.trim();
    const e = episodio.trim();
    if (t && e) return `T${t} E${e}`;
    if (t) return `T${t}`;
    if (e) return `E${e}`;
    return '';
  }

  // Buscar en TMDB
  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const results = await searchTMDB(searchQuery);
      setSearchResults(results);
      setShowResults(true);
    } catch (err: any) {
      setError('Error al conectar con el motor de búsqueda.');
    } finally {
      setSearching(false);
    }
  }

  // Búsqueda automática con Debounce (Instant Search)
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      handleSearch();
    }, 450); // 450ms de espera antes de consultar la API

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Rellenar formulario con resultado de búsqueda
  function handleSelectResult(item: TMDBMediaResult) {
    setTitulo(item.titulo);
    setTipo(item.tipo);
    setGenero(item.genero);
    setImageUrl(item.image_url);
    setDescription(item.sinopsis);
    setTmdbId(item.id);
    setShowResults(false);
    setSearchQuery('');
  }

  async function handleSave() {
    if (!titulo.trim()) {
      setError('El título es obligatorio');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await createMediaItem({
        tipo,
        titulo: titulo.trim(),
        genero: genero.trim(),
        plataforma: plataforma.trim(),
        estado,
        progreso: getProgreso(),
        prioridad,
        calificacion: calificacion.trim() ? parseInt(calificacion.trim(), 10) : null,
        image_url: imageUrl,
        description: description,
        tmdb_id: tmdbId,
      });
      resetForm();
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  }

  function formatDropdownValue(val: string, dropdownId: string): string {
    if (dropdownId === 'tipo') return formatTipo(val);
    return val;
  }

  function Dropdown<T extends string>({
    label,
    value,
    options,
    onSelect,
    id,
    containerStyle,
  }: {
    label: string;
    value: T;
    options: T[];
    onSelect: (v: T) => void;
    id: string;
    containerStyle?: any;
  }) {
    const open = openDropdown === id;
    return (
      <View style={[styles.field, containerStyle]}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity
          style={styles.dropdownTrigger}
          onPress={() => setOpenDropdown(open ? null : id)}
        >
          <Text style={styles.dropdownValue}>{formatDropdownValue(value, id)}</Text>
          <ChevronDown size={16} color={Colors.textMuted} />
        </TouchableOpacity>
        {open && (
          <ScrollView
            style={styles.dropdownMenu}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
          >
            {options.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.dropdownItem, value === opt && styles.dropdownItemActive]}
                onPress={() => {
                  onSelect(opt);
                  setOpenDropdown(null);
                }}
              >
                <Text style={[styles.dropdownItemText, value === opt && styles.dropdownItemTextActive]}>
                  {formatDropdownValue(opt, id)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Agregar contenido</Text>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* 1. Buscador TMDB */}
        <View style={[styles.searchCard, { zIndex: 20 }]}>
          <Text style={styles.searchLabel}>¿Quieres importar los datos automáticamente?</Text>
          <View style={{ position: 'relative', zIndex: 20 }}>
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar película, serie o anime..."
                placeholderTextColor={Colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
              />
              <TouchableOpacity style={styles.searchButtonInner} onPress={handleSearch}>
                {searching ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Search size={18} color="#fff" />
                )}
              </TouchableOpacity>
            </View>

            {/* 2. Resultados de la Búsqueda como Dropdown flotante con scroll */}
            {showResults && (
              <View style={styles.resultsContainer}>
                <View style={styles.resultsHeader}>
                  <Text style={styles.resultsTitle}>Resultados en internet</Text>
                  <TouchableOpacity onPress={() => setShowResults(false)}>
                    <X size={18} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>

                {searchResults.length === 0 ? (
                  <Text style={styles.noResultsText}>No se encontraron resultados.</Text>
                ) : (
                  <ScrollView
                    style={styles.resultsScroll}
                    nestedScrollEnabled={true}
                    keyboardShouldPersistTaps="handled"
                  >
                    {searchResults.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.resultItem}
                        onPress={() => handleSelectResult(item)}
                      >
                        {item.image_url ? (
                          <Image source={{ uri: item.image_url }} style={styles.resultPoster} />
                        ) : (
                          <View style={styles.resultPosterPlaceholder}>
                            <Film size={16} color={Colors.textMuted} />
                          </View>
                        )}
                        <View style={styles.resultInfo}>
                          <Text style={styles.resultTitleText} numberOfLines={1}>
                            {item.titulo}
                          </Text>
                          <Text style={styles.resultMetaText}>
                            {item.tipo} • {item.release_year || 'S/A'}
                          </Text>
                          <Text style={styles.resultGenreText} numberOfLines={1}>
                            {item.genero}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Vista previa de carátula importada */}
        {imageUrl && (
          <View style={styles.previewContainer}>
            <Image source={{ uri: imageUrl }} style={styles.previewPoster} />
            <View style={styles.previewInfo}>
              <Text style={styles.previewTitle} numberOfLines={1}>
                {titulo}
              </Text>
              <Text style={styles.previewLabel}>Importado con éxito</Text>
              <TouchableOpacity
                style={styles.removePreviewBtn}
                onPress={() => {
                  setImageUrl(null);
                  setDescription(null);
                  setTmdbId(null);
                }}
              >
                <Text style={styles.removePreviewBtnText}>Quitar vinculación</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Formulario Simétrico */}
        <View style={styles.formContainer}>
          {/* Fila 1: Tipo y Estado */}
          <View style={styles.row}>
            <Dropdown
              id="tipo"
              label="Tipo *"
              value={tipo}
              options={MEDIA_TYPES}
              onSelect={(v) => setTipo(v)}
              containerStyle={styles.halfField}
            />
            <Dropdown
              id="estado"
              label="Estado *"
              value={estado}
              options={MEDIA_STATUSES}
              onSelect={(v) => setEstado(v)}
              containerStyle={styles.halfField}
            />
          </View>

          {/* Fila 2: Título (Ocupa 100%) */}
          <View style={styles.field}>
            <Text style={styles.label}>Título *</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre del contenido"
              placeholderTextColor={Colors.textMuted}
              value={titulo}
              onChangeText={setTitulo}
            />
          </View>

          {/* Fila 3: Género y Plataforma */}
          <View style={styles.row}>
            <Dropdown
              id="genero"
              label="Género"
              value={genero || 'Seleccionar...'}
              options={['Seleccionar...', ...GENRES]}
              onSelect={(v) => setGenero(v === 'Seleccionar...' ? '' : v)}
              containerStyle={styles.halfField}
            />
            <Dropdown
              id="plataforma"
              label="Plataforma"
              value={plataforma || 'Seleccionar...'}
              options={['Seleccionar...', ...PLATFORMS]}
              onSelect={(v) => setPlataforma(v === 'Seleccionar...' ? '' : v)}
              containerStyle={styles.halfField}
            />
          </View>

          {/* Fila 4: Temporada y Episodio (Solo para Series/Anime) */}
          {!isMovie && (
            <View style={styles.row}>
              <View style={[styles.field, styles.halfField]}>
                <Text style={styles.label}>Temporada</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: 1"
                  placeholderTextColor={Colors.textMuted}
                  value={temporada}
                  onChangeText={setTemporada}
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.field, styles.halfField]}>
                <Text style={styles.label}>Episodio</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: 12"
                  placeholderTextColor={Colors.textMuted}
                  value={episodio}
                  onChangeText={setEpisodio}
                  keyboardType="number-pad"
                />
              </View>
            </View>
          )}

          {/* Fila 5: Prioridad y Calificación */}
          <View style={styles.row}>
            <Dropdown
              id="prioridad"
              label="Prioridad"
              value={prioridad}
              options={PRIORITIES}
              onSelect={(v) => setPrioridad(v)}
              containerStyle={isFinished ? styles.halfField : styles.fullField}
            />

            {isFinished && (
              <View style={[styles.field, styles.halfField]}>
                <Text style={styles.label}>Calificación (1-10)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1 al 10"
                  placeholderTextColor={Colors.textMuted}
                  value={calificacion}
                  onChangeText={setCalificacion}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Guardar contenido</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  errorText: {
    color: Colors.status.Abandonado,
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  searchCard: {
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  searchLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 8,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    color: Colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 48,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    height: 48,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 14,
    color: Colors.text,
    fontSize: 14,
  },
  searchButtonInner: {
    backgroundColor: Colors.primary,
    height: '100%',
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsContainer: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    marginTop: 6,
    maxHeight: 200,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  resultsTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Colors.text,
  },
  noResultsText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: 12,
  },
  resultsList: {
    width: '100%',
  },
  resultsScroll: {
    maxHeight: 140,
    width: '100%',
  },
  resultItem: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: Colors.border + '11',
    alignItems: 'center',
  },
  resultPoster: {
    width: 40,
    height: 56,
    borderRadius: 4,
    backgroundColor: Colors.surface,
  },
  resultPosterPlaceholder: {
    width: 40,
    height: 56,
    borderRadius: 4,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  resultTitleText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  resultMetaText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  resultGenreText: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  previewContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary + '44',
    alignItems: 'center',
    marginBottom: 20,
  },
  previewPoster: {
    width: 50,
    height: 75,
    borderRadius: 6,
  },
  previewInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  previewLabel: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: 8,
  },
  removePreviewBtn: {
    alignSelf: 'flex-start',
  },
  removePreviewBtnText: {
    color: Colors.status.Abandonado,
    fontSize: 11,
    fontWeight: '600',
  },
  formContainer: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  fullField: {
    width: '100%',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 48,
  },
  dropdownValue: {
    color: Colors.text,
    fontSize: 15,
  },
  dropdownMenu: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    maxHeight: 200,
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  dropdownItemActive: {
    backgroundColor: Colors.primary + '22',
  },
  dropdownItemText: {
    color: Colors.text,
    fontSize: 14,
  },
  dropdownItemTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
