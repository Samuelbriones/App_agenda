import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import {
  ArrowLeft,
  Edit3,
  Trash2,
  Film,
  Tv,
  Play,
  Star,
  Users,
  Plus,
  X,
  Heart,
  UserCheck,
  Check,
} from 'lucide-react-native';
import { TextInput } from 'react-native';
import { getMediaItem, deleteMediaItem, addPartner, removePartner, searchUsersByEmail } from '@/lib/media';
import { supabase } from '@/lib/supabase';
import { MediaItem, Profile, UserRelationship } from '@/types';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { formatTipo, formatGenre } from '@/constants/data';
import { getRelationships } from '@/lib/relationships';

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
  const [connections, setConnections] = useState<UserRelationship[]>([]);

  const fetchConnections = useCallback(async () => {
    try {
      const data = await getRelationships();
      setConnections(data);
    } catch (error) {
      console.error('Error fetching connections:', error);
    }
  }, []);

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

  useFocusEffect(
    useCallback(() => {
      fetchItem();
      fetchConnections();
    }, [fetchItem, fetchConnections])
  );

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
    Alert.alert('Eliminar', `¿Eliminar "${item?.titulo}"?`, [
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



  async function handleSearchAndAddPartner() {
    const emailToSearch = searchEmail.trim().toLowerCase();
    if (!emailToSearch) return;
    setSearching(true);
    try {
      const results = await searchUsersByEmail(emailToSearch);
      // Intentar encontrar una coincidencia exacta de correo electrónico
      const exactMatch = (results as Profile[]).find(
        (u) => u.email.toLowerCase() === emailToSearch
      );

      if (exactMatch) {
        // Verificar si ya está compartido con este usuario
        const isAlreadyShared = item?.partners?.some((p) => p.user_id === exactMatch.id);
        if (isAlreadyShared) {
          Alert.alert('Aviso', 'Este contenido ya se está compartiendo con este usuario.');
          setSearchEmail('');
          setSearchResults([]);
          setSearching(false);
          return;
        }
        if (exactMatch.id === user?.id) {
          Alert.alert('Aviso', 'No puedes compartir el contenido contigo mismo.');
          setSearchEmail('');
          setSearchResults([]);
          setSearching(false);
          return;
        }
        // Compartir directamente
        await addPartner(id, exactMatch.id);
        setSearchEmail('');
        setSearchResults([]);
        fetchItem();
        Alert.alert('¡Compartido!', 'El contenido ahora se está compartiendo.');
      } else {
        // Si no hay coincidencia exacta, mostrar resultados de coincidencia parcial
        const filtered = (results as Profile[]).filter(
          (u) => u.id !== user?.id && !item?.partners?.some((p) => p.user_id === u.id)
        );
        if (filtered.length === 0) {
          Alert.alert('Usuario no encontrado', 'No se encontró ningún usuario registrado con ese correo.');
          setSearchResults([]);
        } else {
          setSearchResults(filtered);
        }
      }
    } catch (error: any) {
      console.error('Error sharing:', error);
      Alert.alert('Error', `No se pudo compartir con este usuario. Detalles: ${error.message || JSON.stringify(error)}`);
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
      Alert.alert('¡Compartido!', 'El contenido ahora se está compartiendo.');
    } catch (error: any) {
      console.error('Error adding partner:', error);
      Alert.alert('Error', `No se pudo agregar el usuario. Detalles: ${error.message || JSON.stringify(error)}`);
    }
  }

  async function handleRemovePartner(userId: string) {
    try {
      await removePartner(id, userId);
      fetchItem();
      Alert.alert('¡Dejado de compartir!', 'Se dejó de compartir el contenido.');
    } catch (error: any) {
      console.error('Error removing partner:', error);
      Alert.alert('Error', `No se pudo eliminar el usuario. Detalles: ${error.message || JSON.stringify(error)}`);
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

      {item.image_url ? (
        <View style={styles.premiumHeader}>
          <Image source={{ uri: item.image_url }} style={styles.backdropImage} blurRadius={Platform.OS === 'ios' ? 10 : 5} />
          <View style={styles.backdropOverlay} />
          <View style={styles.premiumHeaderContent}>
            <Image source={{ uri: item.image_url }} style={styles.premiumPoster} />
            <View style={styles.premiumHeaderTextInfo}>
              <View style={[styles.typeBadge, { backgroundColor: statusColor + '22', alignSelf: 'flex-start' }]}>
                <TypeIcon size={14} color={statusColor} />
                <Text style={[styles.typeText, { color: statusColor, fontSize: 11 }]}>{formatTipo(item.tipo)}</Text>
              </View>
              <Text style={styles.premiumTitle} numberOfLines={3}>{item.titulo}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColor, alignSelf: 'flex-start', marginTop: 6 }]}>
                <Text style={styles.statusText}>{item.estado}</Text>
              </View>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.hero}>
          <View style={[styles.typeBadge, { backgroundColor: statusColor + '22' }]}>
            <TypeIcon size={20} color={statusColor} />
            <Text style={[styles.typeText, { color: statusColor }]}>{formatTipo(item.tipo)}</Text>
          </View>
          <Text style={styles.title}>{item.titulo}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{item.estado}</Text>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.infoGrid}>
          {item.plataforma && (
            <InfoItem label="Plataforma" value={item.plataforma} />
          )}
          {item.genero && (
            <InfoItem label="Género" value={formatGenre(item.genero)} />
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
              label="Calificación"
              value={`${item.calificacion}/10`}
              icon={<Star size={14} color="#f5c518" fill="#f5c518" />}
            />
          )}
        </View>
      </View>

      {item.description ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sinopsis</Text>
          <Text style={styles.descriptionText}>{item.description}</Text>
        </View>
      ) : null}

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

        {/* Compartir Rápido con Amigos/Pareja */}
        {connections.length > 0 && (
          <View style={styles.quickShareContainer}>
            <Text style={styles.quickShareTitle}>Compartir rápido</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickShareScroll}>
              {connections.map((c) => {
                const profile = c.profiles;
                if (!profile) return null;
                const isShared = item.partners?.some((p) => p.user_id === profile.id);
                const isPartner = c.relationship_type === 'partner';
                const name = profile.display_name || profile.email || 'Usuario';

                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.quickShareAvatarBtn,
                      isShared && (isPartner ? styles.quickShareAvatarBtnActivePartner : styles.quickShareAvatarBtnActiveFriend),
                    ]}
                    onPress={() => {
                      if (isShared) {
                        handleRemovePartner(profile.id);
                      } else {
                        handleAddPartner(profile.id);
                      }
                    }}
                  >
                    <View style={styles.avatarWrapper}>
                      {profile.avatar_url ? (
                        <Image source={{ uri: profile.avatar_url }} style={styles.quickShareAvatar} />
                      ) : (
                        <View style={styles.quickShareAvatarPlaceholder}>
                          <Text style={styles.quickShareAvatarText}>
                            {name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      {isShared && (
                        <View style={[styles.avatarBadge, { backgroundColor: isPartner ? '#ff3366' : Colors.primary }]}>
                          <Check size={8} color="#fff" />
                        </View>
                      )}
                    </View>
                    <Text style={styles.quickShareName} numberOfLines={1}>
                      {name.split(' ')[0]}
                    </Text>
                    {isPartner ? (
                      <Heart size={10} color="#ff3366" fill={isShared ? "#ff3366" : "transparent"} style={{ marginTop: 2 }} />
                    ) : (
                      <Users size={10} color={Colors.textSecondary} style={{ marginTop: 2 }} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

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
              <TouchableOpacity style={styles.searchButton} onPress={handleSearchAndAddPartner} disabled={searching}>
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

        {item.partners && item.partners.length > 0 && (
          <Text style={styles.sharingStatusText}>
            Se está compartiendo {item.tipo === 'Anime' ? 'este anime' : item.tipo === 'Pelicula' ? 'esta película' : 'esta serie'}
          </Text>
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
  sharingStatusText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  quickShareContainer: {
    marginBottom: 16,
  },
  quickShareTitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: 8,
  },
  quickShareScroll: {
    gap: 12,
    paddingRight: 16,
  },
  quickShareAvatarBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: 'transparent',
    minWidth: 70,
  },
  quickShareAvatarBtnActiveFriend: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '0a',
  },
  quickShareAvatarBtnActivePartner: {
    borderColor: '#ff3366',
    backgroundColor: '#ff33660a',
  },
  avatarWrapper: {
    position: 'relative',
    width: 44,
    height: 44,
  },
  quickShareAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  quickShareAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickShareAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.surface,
  },
  quickShareName: {
    fontSize: 11,
    color: Colors.text,
    marginTop: 4,
    maxWidth: 64,
    textAlign: 'center',
  },
  premiumHeader: {
    height: 220,
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: Colors.surface,
  },
  backdropImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    opacity: 0.35,
  },
  backdropOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  premiumHeaderContent: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    alignItems: 'flex-end',
  },
  premiumPoster: {
    width: 90,
    height: 135,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  premiumHeaderTextInfo: {
    flex: 1,
    marginLeft: 16,
  },
  premiumTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  descriptionText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
