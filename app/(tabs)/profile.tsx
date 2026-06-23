import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator, Image, TextInput } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LogOut, User, Mail, Film, Star, Heart, Share2, Award, Calendar, Settings, ChevronRight, Camera, Edit2, Check, X, Users } from 'lucide-react-native';
import { signOut } from '@/lib/auth';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { getPendingRequests } from '@/lib/relationships';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const [loadingStats, setLoadingStats] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    watching: 0,
    pending: 0,
    shared: 0,
    avgRating: 0,
    favoriteGenre: 'Ninguno',
    seriesCount: 0,
    moviesCount: 0,
    animeCount: 0,
  });

  const fetchStats = useCallback(async () => {
    if (!user) return;
    try {
      // Obtener solicitudes pendientes
      const pendingData = await getPendingRequests();
      setPendingCount(pendingData.length);

      const { data, error } = await supabase
        .from('media_items')
        .select('tipo, estado, calificacion, genero, created_by, partners:media_partners(user_id)');
      
      if (error) throw error;
      
      if (data) {
        const total = data.length;
        const completed = data.filter(i => i.estado === 'Finalizado').length;
        const watching = data.filter(i => i.estado === 'Viendo').length;
        const pending = data.filter(i => i.estado === 'Pendiente').length;
        
        // Contar compartidos (creados por mí con compañeros, o creados por otros compartidos conmigo)
        const shared = data.filter(i => 
          (i.created_by === user.id && i.partners && i.partners.length > 0) || 
          (i.created_by !== user.id)
        ).length;

        // Calificación promedio
        const ratedItems = data.filter(i => i.calificacion !== null);
        const avgRating = ratedItems.length > 0 
          ? (ratedItems.reduce((acc, curr) => acc + (curr.calificacion || 0), 0) / ratedItems.length).toFixed(1)
          : 0;

        // Género Favorito
        const genres = data.map(i => i.genero).filter((g): g is string => g !== null && g !== '');
        const genreCounts = genres.reduce((acc, curr) => {
          acc[curr] = (acc[curr] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        let favoriteGenre = 'Ninguno';
        let maxCount = 0;
        for (const [genre, count] of Object.entries(genreCounts)) {
          if (count > maxCount) {
            maxCount = count;
            favoriteGenre = genre;
          }
        }

        const seriesCount = data.filter(i => i.tipo === 'Serie').length;
        const moviesCount = data.filter(i => i.tipo === 'Pelicula').length;
        const animeCount = data.filter(i => i.tipo === 'Anime').length;

        setStats({
          total,
          completed,
          watching,
          pending,
          shared,
          avgRating: Number(avgRating),
          favoriteGenre,
          seriesCount,
          moviesCount,
          animeCount,
        });
      }
    } catch (err) {
      console.error('Error fetching profile stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [fetchStats])
  );

  async function handlePickImage() {
    if (!user) return;
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permiso denegado', 'Se requiere acceso a la galería para cambiar la foto de perfil.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedUri = result.assets[0].uri;
        await uploadAvatar(selectedUri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Hubo un problema al seleccionar la imagen.');
    }
  }

  async function uploadAvatar(fileUri: string) {
    if (!user) return;
    setUploadingAvatar(true);
    try {
      // 1. Leer el archivo como base64 usando expo-file-system
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: 'base64',
      });

      // 2. Decodificar la cadena base64 en un ArrayBuffer
      const arrayBuffer = decode(base64);

      // 3. Definir el nombre del archivo (basado en el ID de usuario para sobrescribir su avatar anterior)
      const fileExt = fileUri.split('.').pop() || 'jpg';
      const fileName = `${user.id}/avatar.${fileExt}`;

      // 4. Subir el archivo (como ArrayBuffer) al bucket de avatars en Supabase
      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, arrayBuffer, {
          contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // 4. Obtener la URL pública del archivo subido
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData.publicUrl;

      // 5. Actualizar la base de datos con la URL del avatar
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (dbError) throw dbError;

      // 6. Refrescar el perfil en toda la aplicación
      await refreshProfile();
      Alert.alert('¡Éxito!', 'Foto de perfil actualizada correctamente.');
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      Alert.alert('Error', `No se pudo subir la imagen. Detalles: ${error.message || error}`);
    } finally {
      setUploadingAvatar(false);
    }
  }

  function startEditingName() {
    setTempName(profile?.display_name || '');
    setIsEditingName(true);
  }

  async function saveName() {
    if (!user) return;
    if (!tempName.trim()) {
      Alert.alert('Error', 'El nombre no puede estar vacío.');
      return;
    }
    setSavingName(true);
    try {
      const { error: authError } = await supabase.auth.updateUser({
        data: { display_name: tempName.trim() },
      });
      if (authError) throw authError;

      const { error: dbError } = await supabase
        .from('profiles')
        .update({ display_name: tempName.trim() })
        .eq('id', user.id);

      if (dbError) throw dbError;

      await refreshProfile();
      setIsEditingName(false);
      Alert.alert('¡Éxito!', 'Nombre de usuario actualizado correctamente.');
    } catch (err: any) {
      console.error('Error updating name:', err);
      Alert.alert('Error', `No se pudo actualizar el nombre. Detalles: ${err.message || err}`);
    } finally {
      setSavingName(false);
    }
  }

  async function handleLogout() {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            router.replace('/(auth)/login');
          } catch {
            Alert.alert('Error', 'No se pudo cerrar sesión');
          }
        },
      },
    ]);
  }

  // Formatear fecha de registro
  const getJoinedDate = () => {
    if (!user?.created_at) return '';
    const date = new Date(user.created_at);
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
  };

  // Calcular porcentajes para la barra de distribución
  const totalCounts = stats.seriesCount + stats.moviesCount + stats.animeCount;
  const seriesPercent = totalCounts > 0 ? (stats.seriesCount / totalCounts) * 100 : 0;
  const moviesPercent = totalCounts > 0 ? (stats.moviesCount / totalCounts) * 100 : 0;
  const animePercent = totalCounts > 0 ? (stats.animeCount / totalCounts) * 100 : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Header Sección Perfil */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mi Perfil</Text>
      </View>

      {/* Tarjeta de Usuario Premium */}
      <LinearGradient
        colors={[Colors.surface, '#161d2a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.profileCard}
      >
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handlePickImage} disabled={uploadingAvatar} activeOpacity={0.8}>
            <LinearGradient
              colors={['#00d4aa', Colors.primary]}
              style={styles.avatarGlow}
            >
              <View style={styles.avatarInner}>
                {uploadingAvatar ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>
                    {(profile?.display_name || 'U').charAt(0).toUpperCase()}
                  </Text>
                )}
                
                {/* Botón de cámara superpuesto */}
                <View style={styles.cameraIconContainer}>
                  <Camera size={11} color="#fff" />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.userInfo}>
            {isEditingName ? (
              <View style={styles.editNameInputRow}>
                <TextInput
                  style={styles.editNameInput}
                  value={tempName}
                  onChangeText={setTempName}
                  autoFocus
                  placeholder="Nombre de usuario"
                  placeholderTextColor={Colors.textMuted}
                  editable={!savingName}
                />
                <TouchableOpacity onPress={saveName} style={styles.saveNameButton} disabled={savingName}>
                  {savingName ? (
                    <ActivityIndicator size="small" color="#00d4aa" />
                  ) : (
                    <Check size={16} color="#00d4aa" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setIsEditingName(false)} style={styles.cancelNameButton} disabled={savingName}>
                  <X size={16} color={Colors.status.Abandonado} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.userNameContainer}>
                <Text style={styles.userName}>{profile?.display_name || 'Usuario'}</Text>
                <TouchableOpacity onPress={startEditingName} style={styles.editNameButton}>
                  <Edit2 size={13} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.emailRow}>
              <Mail size={14} color={Colors.textSecondary} />
              <Text style={styles.userEmail}>{user?.email || profile?.email || 'Sin email'}</Text>
            </View>
            {user?.created_at && (
              <View style={styles.joinedRow}>
                <Calendar size={14} color={Colors.textMuted} />
                <Text style={styles.joinedText}>Miembro desde {getJoinedDate()}</Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>

      {/* Fila de Estadísticas Rápidas */}
      <View style={styles.statsSummaryRow}>
        <View style={styles.statsSummaryCard}>
          <Film size={20} color={Colors.primary} />
          <Text style={styles.statsSummaryVal}>{stats.total}</Text>
          <Text style={styles.statsSummaryLabel}>Elementos</Text>
        </View>

        <View style={styles.statsSummaryCard}>
          <Award size={20} color="#00d4aa" />
          <Text style={styles.statsSummaryVal}>{stats.completed}</Text>
          <Text style={styles.statsSummaryLabel}>Completados</Text>
        </View>

        <View style={styles.statsSummaryCard}>
          <Share2 size={20} color="#9900ff" />
          <Text style={styles.statsSummaryVal}>{stats.shared}</Text>
          <Text style={styles.statsSummaryLabel}>Compartidos</Text>
        </View>
      </View>

      {/* Tarjeta de Distribución de Contenido */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionCardTitle}>Distribución por Tipo</Text>
        
        {totalCounts === 0 ? (
          <View style={styles.emptyDist}>
            <Text style={styles.emptyDistText}>No hay datos de distribución disponibles</Text>
          </View>
        ) : (
          <View>
            {/* Barra segmentada */}
            <View style={styles.distributionBar}>
              {stats.seriesCount > 0 && (
                <View style={[styles.barSegment, { width: `${seriesPercent}%`, backgroundColor: '#ff9800' }]} />
              )}
              {stats.moviesCount > 0 && (
                <View style={[styles.barSegment, { width: `${moviesPercent}%`, backgroundColor: '#4caf50' }]} />
              )}
              {stats.animeCount > 0 && (
                <View style={[styles.barSegment, { width: `${animePercent}%`, backgroundColor: '#00bcd4' }]} />
              )}
            </View>

            {/* Leyendas */}
            <View style={styles.legendsRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#ff9800' }]} />
                <Text style={styles.legendLabel}>Series ({stats.seriesCount})</Text>
                <Text style={styles.legendPercent}>{seriesPercent.toFixed(0)}%</Text>
              </View>

              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#4caf50' }]} />
                <Text style={styles.legendLabel}>Películas ({stats.moviesCount})</Text>
                <Text style={styles.legendPercent}>{moviesPercent.toFixed(0)}%</Text>
              </View>

              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#00bcd4' }]} />
                <Text style={styles.legendLabel}>Animes ({stats.animeCount})</Text>
                <Text style={styles.legendPercent}>{animePercent.toFixed(0)}%</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Fila de Datos Destacados */}
      <View style={styles.insightsRow}>
        <View style={[styles.insightCard, { marginRight: 8 }]}>
          <View style={styles.insightHeader}>
            <Star size={20} color="#f5c518" fill="#f5c518" />
            <Text style={styles.insightTitle}>Calificación</Text>
          </View>
          <Text style={styles.insightValue}>{stats.avgRating > 0 ? `${stats.avgRating} / 10` : '—'}</Text>
          <Text style={styles.insightSub}>Calificación promedio</Text>
        </View>

        <View style={[styles.insightCard, { marginLeft: 8 }]}>
          <View style={styles.insightHeader}>
            <Heart size={20} color="#e53935" fill="#e53935" />
            <Text style={styles.insightTitle}>Género Top</Text>
          </View>
          <Text style={styles.insightValue} numberOfLines={1}>{stats.favoriteGenre}</Text>
          <Text style={styles.insightSub}>Género favorito</Text>
        </View>
      </View>

      {/* Estado de Visualización */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionCardTitle}>Estado de Visualización</Text>
        <View style={styles.statusBreakdown}>
          <View style={styles.statusRow}>
            <View style={styles.statusInfoLeft}>
              <View style={[styles.statusIndicator, { backgroundColor: Colors.status.Viendo }]} />
              <Text style={styles.statusLabel}>En curso (Viendo)</Text>
            </View>
            <Text style={styles.statusCount}>{stats.watching}</Text>
          </View>

          <View style={styles.statusRow}>
            <View style={styles.statusInfoLeft}>
              <View style={[styles.statusIndicator, { backgroundColor: Colors.status.Pendiente }]} />
              <Text style={styles.statusLabel}>Pendientes (Por ver)</Text>
            </View>
            <Text style={styles.statusCount}>{stats.pending}</Text>
          </View>

          <View style={styles.statusRow}>
            <View style={styles.statusInfoLeft}>
              <View style={[styles.statusIndicator, { backgroundColor: Colors.status.Finalizado }]} />
              <Text style={styles.statusLabel}>Completados (Finalizados)</Text>
            </View>
            <Text style={styles.statusCount}>{stats.completed}</Text>
          </View>
        </View>
      </View>

      {/* Botones de acción */}
      <View style={styles.actionSection}>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/connections')}>
          <Users size={20} color={Colors.primary} />
          <Text style={[styles.actionButtonText, { color: Colors.text }]}>Amigos y Pareja</Text>
          {pendingCount > 0 && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
            </View>
          )}
          <ChevronRight size={18} color={Colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionButton, { marginTop: 12 }]} onPress={handleLogout}>
          <LogOut size={20} color={Colors.status.Abandonado} />
          <Text style={styles.actionButtonText}>Cerrar sesión</Text>
          <ChevronRight size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
  },
  profileCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#262626',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarGlow: {
    width: 74,
    height: 74,
    borderRadius: 37,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 34,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 34,
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#111',
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  joinedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  joinedText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  statsSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 8,
  },
  statsSummaryCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statsSummaryVal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 6,
  },
  statsSummaryLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  sectionCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  emptyDist: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  emptyDistText: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  distributionBar: {
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.surfaceLight,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 16,
  },
  barSegment: {
    height: '100%',
  },
  legendsRow: {
    flexDirection: 'column',
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  legendLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  legendPercent: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Colors.text,
  },
  insightsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  insightCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  insightValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  insightSub: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  statusBreakdown: {
    flexDirection: 'column',
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  statusCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
  },
  actionSection: {
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.status.Abandonado,
    marginLeft: 12,
  },
  userNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  editNameButton: {
    padding: 4,
  },
  editNameInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  editNameInput: {
    flex: 1,
    backgroundColor: '#1b2230',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: '#3a4a63',
  },
  saveNameButton: {
    backgroundColor: 'rgba(0, 212, 170, 0.15)',
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelNameButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingBadge: {
    backgroundColor: Colors.status.Abandonado,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  pendingBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 5,
  },
});
