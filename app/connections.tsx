import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform as RNPlatform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Mail,
  UserPlus,
  Check,
  X,
  Heart,
  Users,
  UserCheck,
  Trash2,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/colors';
import {
  sendRelationshipRequest,
  getRelationships,
  getPendingRequests,
  acceptRequest,
  rejectOrDeleteRelationship,
} from '@/lib/relationships';
import { UserRelationship } from '@/types';

export default function ConnectionsScreen() {
  const router = useRouter();

  // Estados de datos
  const [activeTab, setActiveTab] = useState<'connections' | 'requests'>('connections');
  const [connections, setConnections] = useState<UserRelationship[]>([]);
  const [requests, setRequests] = useState<UserRelationship[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados del formulario de invitación
  const [emailInput, setEmailInput] = useState('');
  const [relationType, setRelationType] = useState<'friend' | 'partner'>('friend');
  const [submitting, setSubmitting] = useState(false);

  // Cargar datos de relaciones y solicitudes
  const loadData = useCallback(async () => {
    try {
      const [connectionsData, requestsData] = await Promise.all([
        getRelationships(),
        getPendingRequests(),
      ]);
      setConnections(connectionsData);
      setRequests(requestsData);
    } catch (error) {
      console.error('Error loading connections data:', error);
      Alert.alert('Error', 'No se pudieron cargar las conexiones.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Enviar solicitud de conexión
  const handleSendRequest = async () => {
    const email = emailInput.trim();
    if (!email) {
      Alert.alert('Campo requerido', 'Por favor ingresa un correo electrónico.');
      return;
    }

    setSubmitting(true);
    try {
      await sendRelationshipRequest(email, relationType);
      setEmailInput('');
      Alert.alert('Solicitud enviada', `Se envió la invitación de conexión a ${email}.`);
      loadData();
    } catch (error: any) {
      Alert.alert('Error al enviar', error.message || 'No se pudo enviar la solicitud.');
    } finally {
      setSubmitting(false);
    }
  };

  // Aceptar solicitud
  const handleAcceptRequest = async (id: string) => {
    try {
      await acceptRequest(id);
      Alert.alert('Conexión aceptada', '¡Ahora están conectados!');
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo aceptar la solicitud.');
    }
  };

  // Rechazar o eliminar relación
  const handleDeleteRelationship = async (id: string, name: string, isRequest: boolean) => {
    const title = isRequest ? 'Rechazar solicitud' : 'Eliminar conexión';
    const message = isRequest
      ? `¿Quieres rechazar la solicitud de ${name}?`
      : `¿Quieres eliminar la conexión con ${name}? Esta persona dejará de tener acceso a los contenidos compartidos contigo.`;

    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        style: 'destructive',
        onPress: async () => {
          try {
            await rejectOrDeleteRelationship(id);
            loadData();
          } catch (error: any) {
            Alert.alert('Error', error.message || 'No se pudo completar la acción.');
          }
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      behavior={RNPlatform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Amigos & Pareja</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        ListHeaderComponent={
          <>
            {/* Formulario de Nueva Conexión */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Conectar con alguien</Text>
              <Text style={styles.cardSubtitle}>
                Envía una invitación para compartir listas y ver contenidos juntos.
              </Text>

              <View style={styles.inputContainer}>
                <Mail size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="ejemplo@correo.com"
                  placeholderTextColor={Colors.textMuted}
                  value={emailInput}
                  onChangeText={setEmailInput}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!submitting}
                />
              </View>

              {/* Selector de Tipo de Relación */}
              <View style={styles.typeSelectorRow}>
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    relationType === 'friend' && styles.typeOptionActive,
                  ]}
                  onPress={() => setRelationType('friend')}
                  disabled={submitting}
                >
                  <Users
                    size={16}
                    color={relationType === 'friend' ? Colors.primary : Colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.typeOptionText,
                      relationType === 'friend' && styles.typeOptionTextActive,
                    ]}
                  >
                    Amigo
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    relationType === 'partner' && styles.typeOptionActivePartner,
                  ]}
                  onPress={() => setRelationType('partner')}
                  disabled={submitting}
                >
                  <Heart
                    size={16}
                    color={relationType === 'partner' ? '#ff3366' : Colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.typeOptionText,
                      relationType === 'partner' && styles.typeOptionTextActivePartner,
                    ]}
                  >
                    Pareja
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSendRequest}
                disabled={submitting}
              >
                <LinearGradient
                  colors={[Colors.primary, Colors.primaryDark]}
                  style={styles.submitGradient}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <UserPlus size={18} color="#fff" />
                      <Text style={styles.submitText}>Enviar Invitación</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Selector de Tabs */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'connections' && styles.tabActive]}
                onPress={() => setActiveTab('connections')}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === 'connections' && styles.tabTextActive,
                  ]}
                >
                  Mis Conexiones ({connections.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'requests' && styles.tabActive]}
                onPress={() => setActiveTab('requests')}
              >
                <View style={styles.requestsTabRow}>
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === 'requests' && styles.tabTextActive,
                    ]}
                  >
                    Solicitudes ({requests.length})
                  </Text>
                  {requests.length > 0 && <View style={styles.badgeDot} />}
                </View>
              </TouchableOpacity>
            </View>

            {/* Listados */}
            {loading ? (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            ) : activeTab === 'connections' ? (
              connections.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <UserCheck size={36} color={Colors.textMuted} />
                  <Text style={styles.emptyText}>No tienes conexiones activas aún.</Text>
                  <Text style={styles.emptySubText}>
                    Envía una solicitud arriba para empezar a compartir.
                  </Text>
                </View>
              ) : null
            ) : requests.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Mail size={36} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No tienes solicitudes pendientes.</Text>
              </View>
            ) : null}
          </>
        }
        data={activeTab === 'connections' ? connections : requests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const profile = item.profiles;
          if (!profile) return null;

          const isPartner = item.relationship_type === 'partner';
          const name = profile.display_name || profile.email || 'Usuario';

          return (
            <View style={styles.listItem}>
              <View style={styles.listItemLeft}>
                {profile.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                      {name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}

                <View style={styles.profileDetails}>
                  <Text style={styles.profileName} numberOfLines={1}>
                    {name}
                  </Text>
                  <View style={styles.typeBadgeRow}>
                    <View
                      style={[
                        styles.relationshipBadge,
                        isPartner
                          ? styles.relationshipBadgePartner
                          : styles.relationshipBadgeFriend,
                      ]}
                    >
                      {isPartner ? (
                        <Heart size={10} color="#ff3366" fill="#ff3366" />
                      ) : (
                        <Users size={10} color={Colors.primary} />
                      )}
                      <Text
                        style={[
                          styles.relationshipBadgeText,
                          isPartner ? { color: '#ff3366' } : { color: Colors.primary },
                        ]}
                      >
                        {isPartner ? 'Pareja' : 'Amigo'}
                      </Text>
                    </View>
                    {activeTab === 'requests' && (
                      <Text style={styles.requestDate}>
                        Recibida el {new Date(item.created_at).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Acciones de la Fila */}
              <View style={styles.listItemRight}>
                {activeTab === 'requests' ? (
                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={styles.acceptButton}
                      onPress={() => handleAcceptRequest(item.id)}
                    >
                      <Check size={16} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.declineButton}
                      onPress={() => handleDeleteRelationship(item.id, name, true)}
                    >
                      <X size={16} color={Colors.status.Abandonado} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteRelationship(item.id, name, false)}
                  >
                    <Trash2 size={18} color={Colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
        contentContainerStyle={styles.listContent}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceLight,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '11',
  },
  typeOptionActivePartner: {
    borderColor: '#ff3366',
    backgroundColor: '#ff336611',
  },
  typeOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  typeOptionTextActive: {
    color: Colors.primary,
  },
  typeOptionTextActivePartner: {
    color: '#ff3366',
  },
  submitButton: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
  },
  submitText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderColor: 'transparent',
  },
  tabActive: {
    borderColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  requestsTabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.status.Abandonado,
  },
  loaderContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  emptySubText: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  profileDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  typeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  relationshipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  relationshipBadgeFriend: {
    backgroundColor: Colors.primary + '15',
  },
  relationshipBadgePartner: {
    backgroundColor: '#ff336615',
  },
  relationshipBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  requestDate: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  listItemRight: {
    justifyContent: 'center',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.status.Finalizado,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.status.Abandonado + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    padding: 8,
  },
});
