import { supabase } from './supabase';
import { UserRelationship, Profile } from '@/types';

/**
 * Envía una solicitud de conexión (amigo o pareja) a otro usuario por su correo electrónico.
 */
export async function sendRelationshipRequest(
  email: string,
  relationshipType: 'friend' | 'partner'
): Promise<UserRelationship> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuario no autenticado');

  const cleanEmail = email.trim().toLowerCase();

  if (cleanEmail === user.email?.toLowerCase()) {
    throw new Error('No puedes enviarte una solicitud a ti mismo.');
  }

  // 1. Buscar perfil del receptor
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, display_name')
    .eq('email', cleanEmail)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profiles) {
    throw new Error('No se encontró ningún usuario con ese correo electrónico.');
  }

  const receiverId = profiles.id;

  // 2. Verificar si ya existe alguna relación previa en cualquier dirección
  const { data: existing, error: existingError } = await supabase
    .from('user_relationships')
    .select('*')
    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) {
    if (existing.status === 'accepted') {
      throw new Error(`Ya estás conectado con este usuario como ${existing.relationship_type === 'partner' ? 'pareja' : 'amigo'}.`);
    } else if (existing.status === 'pending') {
      if (existing.sender_id === user.id) {
        throw new Error('Ya enviaste una solicitud a este usuario y está pendiente de respuesta.');
      } else {
        throw new Error('Este usuario ya te envió una solicitud. Revisa tus solicitudes recibidas.');
      }
    } else if (existing.status === 'rejected') {
      // Si fue rechazada, permitimos reenviarla restableciendo el remitente y estado
      const { data, error } = await supabase
        .from('user_relationships')
        .update({
          sender_id: user.id,
          receiver_id: receiverId,
          status: 'pending',
          relationship_type: relationshipType,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error) throw error;
      return data as unknown as UserRelationship;
    }
  }

  // 3. Crear nueva relación
  const { data, error } = await supabase
    .from('user_relationships')
    .insert({
      sender_id: user.id,
      receiver_id: receiverId,
      status: 'pending',
      relationship_type: relationshipType,
    })
    .select()
    .single();

  if (error) throw error;
  return data as unknown as UserRelationship;
}

/**
 * Obtiene todas las relaciones confirmadas (estado 'accepted') del usuario actual.
 * Modela los resultados para incluir siempre el perfil del otro usuario.
 */
export async function getRelationships(): Promise<UserRelationship[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuario no autenticado');

  // Consulta relaciones donde soy remitente o receptor y están aceptadas
  const { data, error } = await supabase
    .from('user_relationships')
    .select(`
      id,
      sender_id,
      receiver_id,
      status,
      relationship_type,
      created_at,
      updated_at,
      sender:profiles!user_relationships_sender_id_fkey(id, email, display_name, avatar_url),
      receiver:profiles!user_relationships_receiver_id_fkey(id, email, display_name, avatar_url)
    `)
    .eq('status', 'accepted');

  if (error) throw error;
  if (!data) return [];

  // Mapear los datos para que el perfil del "otro" usuario quede unificado en 'profiles'
  return data.map((item: any) => {
    const isSender = item.sender_id === user.id;
    const otherProfile = isSender ? item.receiver : item.sender;
    return {
      id: item.id,
      sender_id: item.sender_id,
      receiver_id: item.receiver_id,
      status: item.status,
      relationship_type: item.relationship_type,
      created_at: item.created_at,
      updated_at: item.updated_at,
      profiles: otherProfile,
    } as UserRelationship;
  });
}

/**
 * Obtiene solicitudes de conexión pendientes (estado 'pending') recibidas por el usuario actual.
 */
export async function getPendingRequests(): Promise<UserRelationship[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuario no autenticado');

  const { data, error } = await supabase
    .from('user_relationships')
    .select(`
      id,
      sender_id,
      receiver_id,
      status,
      relationship_type,
      created_at,
      updated_at,
      sender:profiles!user_relationships_sender_id_fkey(id, email, display_name, avatar_url)
    `)
    .eq('receiver_id', user.id)
    .eq('status', 'pending');

  if (error) throw error;
  if (!data) return [];

  return data.map((item: any) => {
    return {
      id: item.id,
      sender_id: item.sender_id,
      receiver_id: item.receiver_id,
      status: item.status,
      relationship_type: item.relationship_type,
      created_at: item.created_at,
      updated_at: item.updated_at,
      profiles: item.sender,
    } as UserRelationship;
  });
}

/**
 * Acepta una solicitud de conexión pendiente.
 */
export async function acceptRequest(relationshipId: string): Promise<void> {
  const { error } = await supabase
    .from('user_relationships')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', relationshipId);

  if (error) throw error;
}

/**
 * Rechaza una solicitud pendiente o elimina una conexión existente.
 */
export async function rejectOrDeleteRelationship(relationshipId: string): Promise<void> {
  const { error } = await supabase
    .from('user_relationships')
    .delete()
    .eq('id', relationshipId);

  if (error) throw error;
}
