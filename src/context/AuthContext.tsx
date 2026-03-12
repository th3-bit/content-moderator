import React, { createContext, useContext, useEffect, useState } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setRole(null);
        setStatus(null);
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
      console.error('Error fetching pending count:', error);
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setRole(data?.role as UserRole);
      setStatus(data?.status as UserStatus);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setRole('moderator'); // Fallback to lowest privileged moderator role
      setStatus('pending'); // Safety first: default to pending if profile fetch fails
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    session,
    user,
    role,
    status,
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
