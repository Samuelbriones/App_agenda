import { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronDown } from 'lucide-react-native';
import { getMediaItem, updateMediaItem } from '@/lib/media';
import { supabase } from '@/lib/supabase';
import { MediaItem, MediaType, MediaStatus, Priority } from '@/types';
import { Colors } from '@/constants/colors';
import { MEDIA_TYPES, MEDIA_STATUSES, PRIORITIES, PLATFORMS, GENRES, formatTipo } from '@/constants/data';

export default function EditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<MediaItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const [tipo, setTipo] = useState<MediaType>('Serie');
  const [titulo, setTitulo] = useState('');
  const [genero, setGenero] = useState('');
  const [plataforma, setPlataforma] = useState('');
  const [estado, setEstado] = useState<MediaStatus>('Pendiente');
  const [temporada, setTemporada] = useState('');
  const [episodio, setEpisodio] = useState('');
  const [prioridad, setPrioridad] = useState<Priority>('Media');
  const [calificacion, setCalificacion] = useState('');

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [tmdbId, setTmdbId] = useState<string | null>(null);

  const fetchItem = useCallback(async () => {
    try {
      const data = await getMediaItem(id);
      setItem(data);
      setTipo(data.tipo);
      setTitulo(data.titulo);
      setGenero(data.genero || '');
      setPlataforma(data.plataforma || '');
      setEstado(data.estado);
      setPrioridad(data.prioridad || 'Media');
      setCalificacion(data.calificacion?.toString() || '');
      setImageUrl(data.image_url || null);
      setDescription(data.description || null);
      setTmdbId(data.tmdb_id || null);
      if (data.progreso && data.progreso.startsWith('T')) {
        const match = data.progreso.match(/T(\d+)(?:\s*E(\d+))?/);
        if (match) {
          setTemporada(match[1] || '');
          setEpisodio(match[2] || '');
        }
      } else {
        setTemporada('');
        setEpisodio('');
      }
    } catch {
      setError('No se pudo cargar el contenido');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchItem();
  }, [fetchItem]);

  useEffect(() => {
    const subscription = supabase
      .channel(`media_edit_${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'media_items', filter: `id=eq.${id}` },
        () => fetchItem()
      )
      .subscribe();
    return () => { subscription.unsubscribe(); };
  }, [id, fetchItem]);

  const isMovie = tipo === 'Pelicula';
  const isFinished = estado === 'Finalizado';

  function getProgreso(): string {
    if (isMovie) return 'Vista';
    const t = temporada.trim();
    const e = episodio.trim();
    if (t && e) return `T${t} E${e}`;
    if (t) return `T${t}`;
    if (e) return `E${e}`;
    return '';
  }

  async function handleSave() {
    if (!titulo.trim()) {
      setError('El título es obligatorio');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateMediaItem(id, {
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
      router.back();
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
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
  }: {
    label: string;
    value: T;
    options: T[];
    onSelect: (v: T) => void;
    id: string;
  }) {
    const open = openDropdown === id;
    return (
      <View style={styles.field}>
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

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={Colors.primary} size="large" />
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
          <Text style={styles.title}>Editar contenido</Text>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Dropdown
          id="tipo"
          label="Tipo *"
          value={tipo}
          options={MEDIA_TYPES}
          onSelect={(v) => setTipo(v)}
        />

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

        <Dropdown
          id="genero"
          label="Género"
          value={genero || 'Seleccionar...'}
          options={['Seleccionar...', ...GENRES]}
          onSelect={(v) => setGenero(v === 'Seleccionar...' ? '' : v)}
        />

        <Dropdown
          id="plataforma"
          label="Plataforma"
          value={plataforma || 'Seleccionar...'}
          options={['Seleccionar...', ...PLATFORMS]}
          onSelect={(v) => setPlataforma(v === 'Seleccionar...' ? '' : v)}
        />

        <Dropdown
          id="estado"
          label="Estado *"
          value={estado}
          options={MEDIA_STATUSES}
          onSelect={(v) => setEstado(v)}
        />

        {!isMovie && (
          <View style={styles.row}>
            <View style={[styles.field, styles.halfField]}>
              <Text style={styles.label}>Temporada</Text>
              <TextInput
                style={styles.input}
                placeholder="T"
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
                placeholder="E"
                placeholderTextColor={Colors.textMuted}
                value={episodio}
                onChangeText={setEpisodio}
                keyboardType="number-pad"
              />
            </View>
          </View>
        )}

        <Dropdown
          id="prioridad"
          label="Prioridad"
          value={prioridad}
          options={PRIORITIES}
          onSelect={(v) => setPrioridad(v)}
        />

        {isFinished && (
          <View style={styles.field}>
            <Text style={styles.label}>Calificación (1-10)</Text>
            <TextInput
              style={styles.input}
              placeholder="Del 1 al 10"
              placeholderTextColor={Colors.textMuted}
              value={calificacion}
              onChangeText={setCalificacion}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
        )}


        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Guardar cambios</Text>
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
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
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
