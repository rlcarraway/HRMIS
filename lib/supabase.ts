import { createClient } from '@supabase/supabase-js';

// Check for required environment variables
// Use placeholder values during build if not set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';

const isConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

if (!isConfigured && process.env.NODE_ENV !== 'production') {
  console.warn('⚠️  Supabase not configured - using placeholder client for build');
  console.warn('   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to use Supabase');
}

// Next.js's App Router patches the global fetch() to cache GET requests by
// default. supabase-js's PostgREST calls are plain GET fetches, so without
// this override every read gets cached indefinitely on first call and never
// reflects subsequent writes — force every Supabase request to bypass it.
const noStoreFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: 'no-store' });

/**
 * Server-side Supabase client with service role key
 * Bypasses Row Level Security (RLS) - use only in API routes and server components
 * Has full access to all tables and operations
 */
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      fetch: noStoreFetch,
    },
  }
);

/**
 * Check if Supabase is properly configured
 */
export const isSupabaseConfigured = isConfigured;

/**
 * Client-side Supabase client with anon key
 * Respects Row Level Security (RLS) policies
 * Use for future client-side features if needed
 */
export const supabaseClient = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ? createClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
  : null;

// Export types for TypeScript
export type { SupabaseClient } from '@supabase/supabase-js';
