import { supabase } from '../supabaseClient';

export const getUsuarioIdFromUser = async (user) => {
  if (!user) return null;
  

  
  if (user.id && typeof user.id === 'string' && user.id.length > 20) {
    const { data } = await supabase
      .from('usuarios')
      .select('id_usuario')
      .eq('auth_id', user.id)
      .maybeSingle();
    return data?.id_usuario || null;
  }
  
  return null;
};
