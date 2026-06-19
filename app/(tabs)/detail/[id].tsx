import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Edit3,
  Trash2,
  Film,
  Tv,
  Play,
  Star,
  Calendar,
  Users,
  Plus,
  X,
} from 'lucide-react-native';
import { TextInput } from 'react-native';
import { getMediaItem, deleteMediaItem, addPartner, removePartner, searchUsersByEmail } from '@/lib/media';
import { supabase } from '@/lib/supabase';
import { MediaItem, Profile } from '@/types';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';

export default function DetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [item, setItem] = useState<MediaItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [showShare, setShowShare] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);

  const fetchItem = useCallback(async () => {
    try {
      const data = await getMediaItem(id);
      setItem(data);
    } catch {
      Alert.alert('Error', 'No se pudo cargar el contenido');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchItem();
  }, [fetchItem]);

  useEffect(() => {
    const subscription = supabase
      .channel(`media_item_${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'media_items', filter: `id=eq.${id}` },
        () => fetchItem()
      )
      .subscribe();
    return () => { subscription.unsubscribe(); };
  }, [id, fetchItem]);

  async function handleDelete() {
    Alert.alert('Eliminar', `Eliminar "${item?.titulo}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMediaItem(id);
            router.back();
          } catch {
            Alert.alert('Error', 'No se pudo eliminar');
          }
        },
      },
    ]);
  }

  async function handleSearchUsers() {
    if (!searchEmail.trim()) return;
    setSearching(true);
    try {
      const results = await searchUsersByEmail(searchEmail.trim());
      const filtered = (results as Profile[]).filter(
        (u) => u.id !== user?.id && !item?.partners?.some((p) => p.user_id === u.id)
      );
      setSearchResults(filtered);
    } catch {
      Alert.alert('Error', 'No se pudieron buscar usuarios');
    } finally {
      setSearching(false);
    }
  }

  async function handleAddPartner(userId: string) {
    try {
      await addPartner(id, userId);
      setSearchResults([]);
      setSearchEmail('');
      fetchItem();
    } catch {
      Alert.alert('Error', 'No se pudo agregar el usuario');
    }
  }

  async function handleRemovePartner(userId: string) {
    try {
      await removePartner(id, userId);
      fetchItem();
    } catch {
      Alert.alert('Error', 'No se pudo eliminar el usuario');
    }
  }

  const TypeIcon = item?.tipo === 'Pelicula' ? Film : item?.tipo === 'Anime' ? Play : Tv;
  const statusColor = item ? Colors.status[item.estado] || Colors.textMuted : Colors.textMuted;

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.emptyText}>Contenido no encontrado</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <ArrowLeft size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.push(`/(tabs)/edit/${id}`)}>
            <Edit3 size={20} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={handleDelete}>
            <Trash2 size={20} color={Colors.status.Abandonado} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.hero}>
        <View style={[styles.typeBadge, { backgroundColor: statusColor + '22' }]}>
          <TypeIcon size={20} color={statusColor} />
          <Text style={[styles.typeText, { color: statusColor }]}>{item.tipo}</Text>
        </View>
        <Text style={styles.title}>{item.titulo}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{item.estado}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.infoGrid}>
          {item.plataforma && (
            <InfoItem label="Plataforma" value={item.plataforma} />
          )}
          {item.genero && (
            <InfoItem label="Genero" value={item.genero} />
          )}
          {item.prioridad && (
            <InfoItem
              label="Prioridad"
              value={item.prioridad}
              color={Colors.priority[item.prioridad]}
            />
          )}
          {item.progreso && (
            <InfoItem label="Progreso" value={item.progreso} />
          )}
          {item.calificacion && (
            <InfoItem
              label="Calificacion"
              value={`${item.calificacion}/10`}
              icon={<Star size={14} color="#f5c518" fill="#f5c518" />}
            />
          )}
          {item.fecha_inicio && (
            <InfoItem
              label="Inicio"
              value={item.fecha_inicio}
              icon={<Calendar size={14} color={Colors.textSecondary} />}
            />
          )}
          {item.fecha_fin && (
            <InfoItem
              label="Fin"
              value={item.fecha_fin}
              icon={<Calendar size={14} color={Colors.textSecondary} />}
            />
          )}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Compartido con</Text>
          <TouchableOpacity style={styles.shareButton} onPress={() => setShowShare(!showShare)}>
            <Users size={16} color={Colors.primary} />
            <Text style={styles.shareButtonText}>
              {showShare ? 'Cerrar' : 'Compartir'}
            </Text>
          </TouchableOpacity>
        </View>

        {showShare && (
          <View style={styles.sharePanel}>
            <Text style={styles.shareLabel}>Buscar usuario por email</Text>
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                placeholder="email@ejemplo.com"
                placeholderTextColor={Colors.textMuted}
                value={searchEmail}
                onChangeText={setSearchEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TouchableOpacity style={styles.searchButton} onPress={handleSearchUsers} disabled={searching}>
                {searching ? <ActivityIndicator size="small" color="#fff" /> : <Plus size={18} color="#fff" />}
              </TouchableOpacity>
            </View>
            {searchResults.map((u) => (
              <TouchableOpacity key={u.id} style={styles.userResult} onPress={() => handleAddPartner(u.id)}>
                <Text style={styles.userResultName}>{u.display_name || u.email}</Text>
                <Text style={styles.userResultEmail}>{u.email}</Text>
                <Plus size={16} color={Colors.primary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.partnersList}>
          {item.partners?.map((p) => (
            <View key={p.user_id} style={styles.partnerChip}>
              <Text style={styles.partnerChipText}>
                {p.profiles?.display_name || p.profiles?.email || 'Usuario'}
              </Text>
              <TouchableOpacity onPress={() => handleRemovePartner(p.user_id)}>
                <X size={14} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))}
          {(!item.partners || item.partners.length === 0) && (
            <Text style={styles.noPartnersText}>No compartido con nadie</Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function InfoItem({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string;
  color?: string;
  icon?: React.ReactNode;
}) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <View style={styles.infoValueRow}>
        {icon}
        <Text style={[styles.infoValue, color ? { color } : {}]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 16,
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  hero: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    alignItems: 'flex-start',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    marginBottom: 10,
  },
  typeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  infoItem: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    minWidth: 100,
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  infoValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  shareButtonText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  sharePanel: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  shareLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userResult: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  userResultName: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  userResultEmail: {
    color: Colors.textMuted,
    fontSize: 12,
    flex: 1,
    marginLeft: 8,
  },
  partnersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  partnerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  partnerChipText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  noPartnersText: {
    color: Colors.textMuted,
    fontSize: 13,
  },
});
