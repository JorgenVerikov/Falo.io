/**
 * SUPABASE AUTHENTICATION SERVICE MODULE
 */

// Replace these placeholders with your actual Supabase Project details
export const SUPABASE_URL = 'https://YOUR_SUPABASE_PROJECT_ID.supabase.co';
export const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

let supabaseClient = null;

export function getSupabase() {
  if (!supabaseClient) {
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
    } else {
      console.warn('[AUTH] Supabase SDK not found on window. Running in offline/guest mode.');
    }
  }
  return supabaseClient;
}

/**
 * Sign up using Email and Password
 */
export async function signUpEmail(email, password) {
  const client = getSupabase();
  if (!client) throw new Error('Supabase client is not available.');

  const { data, error } = await client.auth.signUp({
    email,
    password
  });

  if (error) throw error;
  return data;
}

/**
 * Sign in using Email and Password
 */
export async function signInEmail(email, password) {
  const client = getSupabase();
  if (!client) throw new Error('Supabase client is not available.');

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data;
}

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle() {
  const client = getSupabase();
  if (!client) throw new Error('Supabase client is not available.');

  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });

  if (error) throw error;
  return data;
}

/**
 * Sign out current user
 */
export async function signOut() {
  const client = getSupabase();
  if (!client) return;

  const { error } = await client.auth.signOut();
  if (error) throw error;
}

/**
 * Get the current active user, or null
 */
export async function getUser() {
  const client = getSupabase();
  if (!client) return null;

  try {
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch (err) {
    console.warn('[AUTH] Error fetching user:', err);
    return null;
  }
}

/**
 * Listen to auth state changes (login, logout, token refresh)
 */
export function onAuthStateChange(callback) {
  const client = getSupabase();
  if (!client) return { unsubscribe: () => {} };

  const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });

  return subscription;
}