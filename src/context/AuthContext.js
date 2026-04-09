import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';

export const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [avatar, setAvatar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [authDebug, setAuthDebug] = useState('Initializing...');
  
  // Failsafe timer to prevent infinite loading
  useEffect(() => {
    const watchdog = setTimeout(() => {
      setLoading((prev) => {
        if (prev) console.warn("Watchdog forced loading to false to prevent infinite loop.");
        return false;
      });
    }, 6000);
    return () => clearTimeout(watchdog);
  }, []);

  const isFetching = useRef(false);
  const lastFetchedId = useRef(null);

  // Función asíncrona para obtener el perfil de usuario con Timeout
  const fetchUserProfile = useCallback(async (userId, email, force = false) => {
    if (!userId) {
        setLoading(false);
        return null;
    }

    if (!force && isFetching.current && lastFetchedId.current === userId) return;
    
    isFetching.current = true;
    lastFetchedId.current = userId;
    setAuthDebug(`Checking profile for ${email}...`);
    
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id_rol, foto_url')
        .eq('auth_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const roleMap = { 1: 'administrador', 2: 'docente', 3: 'estudiante' };
        const roleName = roleMap[data.id_rol];
        
        if (roleName) {
          setAuthDebug(`Profile Found: ${roleName}`);
          setRole(roleName);
          setAvatar(data.foto_url);
          setNeedsProfile(false);
          return roleName;
        }
      }
      
      setAuthDebug('No valid profile found in DB - Onboarding needed');
      setNeedsProfile(true);
      setRole(null);
      setLoading(false);
      return null;
    } catch (err) {
      setAuthDebug(`Profile Error: ${err.message}. Defaulting to onboarding.`);
      setNeedsProfile(true);
      setRole(null);
      setLoading(false);
      return null;
    } finally {
      isFetching.current = false;
      setLoading(false);
    }
  }, []);

  // ÚNICO PUNTO DE ENTRADA para la inicialización de Auth
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      setLoading(true);
      setAuthDebug('Getting initial session...');
      
      try {


        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          if (session?.user) {
            setUser(session.user);
            await fetchUserProfile(session.user.id, session.user.email);
          } else {
            setLoading(false);
          }
        }
      } catch (err) {
        if (mounted) setLoading(false);
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setRole(null);
        setAvatar(null);
        setNeedsProfile(false);
        setLoading(false);
        lastFetchedId.current = null;
        isFetching.current = false;
        return;
      }

      if (!session?.user) return;

      setUser(session.user);

      const shouldSyncProfile =
        event === 'SIGNED_IN' ||
        event === 'USER_UPDATED' ||
        event === 'INITIAL_SESSION' ||
        event === 'PASSWORD_RECOVERY';

      if (shouldSyncProfile && lastFetchedId.current !== session.user.id) {
        setLoading(true);
        await fetchUserProfile(session.user.id, session.user.email);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  const signIn = async ({ email, password }) => {
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const signUp = async ({ nombre, email, password, role: roleName, avatarUrl }) => {
    const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: { data: { full_name: nombre } } 
    });

    if (error) return { error };

    if (data.user) {
      const roleMapInv = { administrador: 1, docente: 2, estudiante: 3 };
      const { error } = await supabase.from('usuarios').insert([
        {
          auth_id: data.user.id,
          email: email,
          nombre: nombre,
          id_rol: roleMapInv[roleName],
          foto_url: avatarUrl,
          contraseña_hash: 'managed_by_supabase_auth',
        }
      ]);
      // Silenciar errores durante signup en consola
    }

    return { data, error: null };
  };

  const signInWithGoogle = async () => {
    return await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        queryParams: { access_type: 'offline', prompt: 'consent' }
      }
    });
  };

  const completeProfile = async (roleName, fotoUrl) => {
    if (!user) return { error: { message: 'No session' } };
    
    try {
      const roleMapInv = { administrador: 1, docente: 2, estudiante: 3 };
      const { error } = await supabase.from('usuarios').insert([
        {
          auth_id: user.id,
          email: user.email,
          nombre: user.user_metadata?.full_name || user.email.split('@')[0],
          id_rol: roleMapInv[roleName],
          foto_url: fotoUrl,
          contraseña_hash: 'managed_by_supabase_auth',
        }
      ]).select();

      if (error) {
        if (error.code === '23505') {
          await fetchUserProfile(user.id, user.email, true);
          return { error: null };
        }
        throw error;
      }

      setRole(roleName);
      setAvatar(fotoUrl);
      setNeedsProfile(false);
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
  };

  const value = {
    user,
    role,
    avatar,
    loading,
    needsProfile,
    authDebug,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    logout: signOut,
    completeProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
