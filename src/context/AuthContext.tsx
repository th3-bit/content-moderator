import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';

type UserRole = 'admin' | 'moderator' | 'student';
type UserStatus = 'pending' | 'active' | 'suspended';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: UserRole | null;
  status: UserStatus | null;
  subject_access: string[] | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isModerator: boolean;
  isActive: boolean;
  pendingRequestsCount: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [status, setStatus] = useState<UserStatus | null>(null);
  const [subjectAccess, setSubjectAccess] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  
  // Guard refs to prevent loops
  const isInitialMount = useRef(true);
  const fetchingProfileRef = useRef<string | null>(null);

  useEffect(() => {
    console.log("[Auth] Initialization started");

    // Listen for auth changes - this handles both initial session and subsequent changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log(`[Auth] Event: ${event}`, { userId: currentSession?.user?.id });

      // If we got a SIGNED_OUT event or no session, reset everything
      if (!currentSession) {
        setSession(null);
        setUser(null);
        setRole(null);
        setStatus(null);
        setSubjectAccess(null);
        setLoading(false);
        fetchingProfileRef.current = null;
        return;
      }

      setSession(currentSession);
      setUser(currentSession.user);

      // Only fetch profile if user has changed or we don't have a role yet
      // This prevents the infinite loop during background refreshes
      if (fetchingProfileRef.current !== currentSession.user.id) {
        await fetchProfile(currentSession.user.id);
      } else {
        // Even if we don't fetch, we must stop the loading spinner
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (role === 'admin') {
      fetchPendingCount();

      const channel = supabase
        .channel('admin-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'profiles',
          },
          (payload) => {
            if (payload.new.status === 'pending') {
              toast('New Moderator Request', {
                description: `${payload.new.full_name || payload.new.email} has requested moderator access.`,
                icon: <UserPlus className="w-4 h-4 text-primary" />,
                action: {
                  label: 'View',
                  onClick: () => window.location.href = '/users'
                }
              });
            }
            fetchPendingCount();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
          },
          () => {
            fetchPendingCount();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'profiles',
          },
          () => {
            fetchPendingCount();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setPendingRequestsCount(0);
    }
  }, [role]);

  const fetchPendingCount = async () => {
    try {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      if (error) throw error;
      setPendingRequestsCount(count || 0);
    } catch (error) {
      console.error('[Auth] Error fetching pending count:', error);
    }
  };

  const fetchProfile = async (userId: string) => {
    // Basic debounce/guard
    if (fetchingProfileRef.current === userId) return;
    fetchingProfileRef.current = userId;

    console.log(`[Auth] Fetching profile for ${userId}...`);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, status, subject_access')
        .eq('id', userId)
        .single();

      if (error) {
        // PGRST116 means zero rows returned (profile missing)
        if (error.code === 'PGRST116') {
          console.warn('[Auth] No profile found, defaulting to pending moderator');
          setRole('moderator');
          setStatus('pending');
          setSubjectAccess([]);
        } else if (error.message.includes('406') || error.message.includes('401')) {
          console.error('[Auth] Session invalid or expired during profile fetch. Signing out.');
          await signOut();
          throw error;
        } else {
          console.error('[Auth] Database error fetching profile:', error);
          throw error;
        }
      } else {
        setRole(data?.role as UserRole);
        setStatus(data?.status as UserStatus);
        setSubjectAccess(data?.subject_access || []);
        console.log('[Auth] Profile loaded successfully', { role: data?.role, status: data?.status });
      }
    } catch (error) {
      // If we failed and didn't sign out, we reset fetching ref so we can try again on next legitimate event
      // but we DON'T reset if it was an auth error (handled above)
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    console.log("[Auth] Signing out...");
    fetchingProfileRef.current = null;
    await supabase.auth.signOut();
  };

  const value = {
    session,
    user,
    role,
    status,
    subject_access: subjectAccess,
    loading,
    signOut,
    isAdmin: role === 'admin',
    isModerator: role === 'admin' || role === 'moderator',
    isActive: !!role && status === 'active',
    pendingRequestsCount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

