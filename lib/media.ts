import { supabase } from './supabase';
import { MediaItem, MediaType, MediaStatus, Priority } from '@/types';

export async function createMediaItem(item: {
  tipo: MediaType;
  titulo: string;
  genero: string;
  plataforma: string;
  estado: MediaStatus;
  progreso: string;
  prioridad: Priority;
  calificacion: number | null;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuario no autenticado');

  const { data, error } = await supabase
    .from('media_items')
    .insert({
      ...item,
      created_by: user.id,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateMediaItem(
  id: string,
  item: Partial<{
    tipo: MediaType;
    titulo: string;
    genero: string;
    plataforma: string;
    estado: MediaStatus;
    progreso: string;
    prioridad: Priority;
    calificacion: number | null;
  }>
) {
  const { data, error } = await supabase
    .from('media_items')
    .update(item)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMediaItem(id: string) {
  const { error } = await supabase.from('media_items').delete().eq('id', id);
  if (error) throw error;
}

export async function getMediaItem(id: string) {
  const { data, error } = await supabase
    .from('media_items')
    .select('*, media_partners(user_id, profiles(display_name, email))')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as unknown as MediaItem;
}

export async function addPartner(mediaId: string, userId: string) {
  const { data, error } = await supabase
    .from('media_partners')
    .insert({ media_id: mediaId, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removePartner(mediaId: string, userId: string) {
  const { error } = await supabase
    .from('media_partners')
    .delete()
    .eq('media_id', mediaId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function searchUsersByEmail(email: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, display_name')
    .ilike('email', `%${email}%`)
    .limit(10);
  if (error) throw error;
  return data;
}
