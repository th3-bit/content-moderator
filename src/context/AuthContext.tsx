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
    // Initial Auth State
    const initAuth = async () => {
      console.log("[Auth] Initialization started");
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        console.log("[Auth] Initial session checked:", initialSession?.user?.id || 'none');
        
        if (initialSession) {
          setSession(initialSession);
          setUser(initialSession.user);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("[Auth] Initial session error:", err);
        setLoading(false);
      }
    };

    initAuth();

    // Listener for subsequent changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      console.log(`[Auth] State change: ${_event}`, { userId: currentSession?.user?.id });
      
      if (!currentSession) {
        setSession(null);
        setUser(null);
        setRole(null);
        setStatus(null);
        setSubjectAccess(null);
        setLoading(false);
        fetchingProfileRef.current = null;
      } else {
        setSession(currentSession);
        setUser(currentSession.user);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Separate effect to handle profile fetching when the user changes
  useEffect(() => {
    if (user?.id) {
      fetchProfile(user.id);
    }
  }, [user?.id]);

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
    // Basic guard to prevent duplicate fetches for the same session
    if (fetchingProfileRef.current === userId && role !== null) {
      setLoading(false);
      return;
    }
    
    fetchingProfileRef.current = userId;
    setLoading(true);

    console.log(`[Auth] Fetching profile for ${userId}...`);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, status, subject_access')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.warn('[Auth] No profile found, defaulting to pending moderator');
          setRole('moderator');
          setStatus('pending');
          setSubjectAccess([]);
        } else if (error.message.includes('406') || error.message.includes('401')) {
          console.error('[Auth] Session invalid during fetch. Signing out.');
          await signOut();
        } else {
          console.error('[Auth] Profile fetch error:', error);
        }
      } else {
        setRole(data?.role as UserRole);
        setStatus(data?.status as UserStatus);
        setSubjectAccess(data?.subject_access || []);
        console.log('[Auth] Profile loaded', { role: data?.role, status: data?.status });
      }
    } catch (err) {
      console.error('[Auth] Unexpected error in fetchProfile:', err);
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

