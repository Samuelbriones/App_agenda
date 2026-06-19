import { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { ChevronDown, Calendar } from 'lucide-react-native';
import { createMediaItem } from '@/lib/media';
import { MediaType, MediaStatus, Priority } from '@/types';
import { Colors } from '@/constants/colors';
import { MEDIA_TYPES, MEDIA_STATUSES, PRIORITIES, PLATFORMS, GENRES } from '@/constants/data';

export default function AddScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tipo, setTipo] = useState<MediaType>('Serie');
  const [titulo, setTitulo] = useState('');
  const [genero, setGenero] = useState('');
  const [plataforma, setPlataforma] = useState('');
  const [estado, setEstado] = useState<MediaStatus>('Pendiente');
  const [temporada, setTemporada] = useState('');
  const [episodio, setEpisodio] = useState('');
  const [prioridad, setPrioridad] = useState<Priority>('Media');
  const [calificacion, setCalificacion] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

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
      setError('El titulo es obligatorio');
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
        fecha_inicio: fechaInicio.trim() || null,
        fecha_fin: fechaFin.trim() || null,
      });
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
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
          <Text style={styles.dropdownValue}>{value}</Text>
          <ChevronDown size={16} color={Colors.textMuted} />
        </TouchableOpacity>
        {open && (
          <View style={styles.dropdownMenu}>
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
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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

        <Dropdown
          id="tipo"
          label="Tipo *"
          value={tipo}
          options={MEDIA_TYPES}
          onSelect={(v) => setTipo(v)}
        />

        <View style={styles.field}>
          <Text style={styles.label}>Titulo *</Text>
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
          label="Genero"
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
            <Text style={styles.label}>Calificacion (1-10)</Text>
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

        <View style={styles.row}>
          <View style={[styles.field, styles.halfField]}>
            <Text style={styles.label}>Fecha inicio</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textMuted}
              value={fechaInicio}
              onChangeText={setFechaInicio}
            />
          </View>
          <View style={[styles.field, styles.halfField]}>
            <Text style={styles.label}>Fecha fin</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textMuted}
              value={fechaFin}
              onChangeText={setFechaFin}
            />
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
            <Text style={styles.saveButtonText}>Guardar</Text>
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
