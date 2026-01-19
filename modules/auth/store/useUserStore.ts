import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { Profile, UserStats } from '@/types/app';
import { supabase } from '@/utils/supabase';

interface UserState {
  session: Session | null;
  profile: Profile | null;
  stats: UserStats | null;
  guestMode: boolean;
  initialized: boolean;

  // Actions
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setStats: (stats: UserStats | null) => void;
  setGuestMode: (mode: boolean) => void;
  setInitialized: (init: boolean) => void;

  // Async Actions
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  session: null,
  profile: null,
  stats: null,
  guestMode: false,
  initialized: false,

  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setStats: (stats) => set({ stats }),
  setGuestMode: (guestMode) => set({ guestMode }),
  setInitialized: (initialized) => set({ initialized }),

  refreshProfile: async () => {
    const { session } = get();
    if (!session?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (!error && data) {
        set({ profile: data });
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null, stats: null });
  }
}));
