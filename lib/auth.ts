import { supabase } from './supabase';

import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

export async function signUp(email: string, password: string, displayName: string, avatarUri?: string | null) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
    },
  });
  if (error) throw error;
  if (data.user) {
    // Si tenemos sesión, la establecemos explícitamente en el cliente de inmediato para autenticar llamadas subsecuentes
    if (data.session) {
      await supabase.auth.setSession(data.session);
    }

    let avatarUrl: string | null = null;

    if (avatarUri) {
      try {
        const base64 = await FileSystem.readAsStringAsync(avatarUri, {
          encoding: 'base64',
        });
        const arrayBuffer = decode(base64);
        const fileExt = avatarUri.split('.').pop() || 'jpg';
        const fileName = `${data.user.id}/avatar.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, arrayBuffer, {
            contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
            upsert: true,
          });

        if (uploadError) {
          console.error('Error al subir el avatar en storage:', uploadError);
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);
          avatarUrl = publicUrlData.publicUrl;
        }
      } catch (uploadErr) {
        console.error('Excepción al subir avatar en registro:', uploadErr);
      }
    }

    const { error: dbError } = await supabase.from('profiles').upsert({
      id: data.user.id,
      email: data.user.email,
      display_name: displayName,
      avatar_url: avatarUrl,
    });

    if (dbError) {
      console.error('Error al guardar datos de perfil en base de datos:', dbError);
    }
  }
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
