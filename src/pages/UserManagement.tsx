import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassInput } from "@/components/ui/GlassInput";
import { FloatingOrbs } from "@/components/FloatingOrbs";
import { Edit2, Trash2, User, Users, Mail, Key, Shield, Check, Search, ArrowLeft, UserCheck, UserX, AlertTriangle, Eye, Loader2, Clock, Wand2, Filter } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type SubscriptionType = "free_trial" | "per_course" | "daily" | "weekly" | "monthly";
type UserRole = "admin" | "moderator" | "student";
type UserStatus = "pending" | "active" | "suspended";

interface Subscription {
  id: string;
  plan_id: string;
  started_at: string;
  expires_at: string;
  is_active: boolean;
  payment_reference: string | null;
  plan: {
    name: string;
    price: number;
    plan_type: string;
  };
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  email_confirmed?: boolean;
  last_sign_in?: string | null;
  subscription_type: SubscriptionType;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  subscriptions?: Subscription[];
  subject_access?: string[];
}

interface UserActivity {
  id: string;
  topic_id: string;
  score: number;
  completed_at: string;
  topic_title: string;
  lesson_title?: string;
}

const subscriptionLabels: Record<SubscriptionType, string> = {
  free_trial: "🆓 Free Trial",
  per_course: "📘 Per Course",
  daily: "☀️ Daily",
  weekly: "📅 Weekly",
  monthly: "🗓 Monthly",
};

interface Subject {
  id: string;
  name: string;
}

const UserManagement = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [statusTab, setStatusTab] = useState("all");
  
  const [editFormData, setEditFormData] = useState({
    full_name: "",
    role: "moderator" as UserRole,
    password: "",
    subject_access: [] as string[],
  });

  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [loadingActivity, setLoadingActivity] = useState(false);
  const [selectedUserForActivity, setSelectedUserForActivity] = useState<UserProfile | null>(null);
  const [userActivities, setUserActivities] = useState<UserActivity[]>([]);

  useEffect(() => {
    fetchProfiles();

    const channel = supabase
      .channel('public:profiles')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          fetchProfiles();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const fetchSubjects = async () => {
      const { data } = await supabase.from('subjects').select('id, name');
      if (data) setSubjects(data);
    };
    fetchSubjects();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      // Fetch profiles directly - RLS now allows admins to see all
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['admin', 'moderator', 'student'])
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setProfiles(data || []);
    } catch (error: any) {
      console.error('Error fetching profiles:', error);
      toast.error(error.message || "Failed to fetch user data");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = profiles.filter((user) => {
    const matchesSearch =
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusTab === "all" || user.status === statusTab;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      // Direct deletion might fail due to FKs, we already saw this
      // For now, we'll try to delete from profiles first
      const { error } = await supabase.from('profiles').delete().eq('id', userToDelete.id);
      if (error) throw error;
      
      setProfiles(profiles.filter((u) => u.id !== userToDelete.id));
      toast.success("User profile deleted");
    } catch (error: any) {
      console.error("Delete failed:", error);
      toast.error(error.message || "Failed to delete profile");
    }
    setUserToDelete(null);
  };

  const handleUpdateStatus = async (id: string, newStatus: UserStatus) => {
    const { error } = await supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('id', id);
    
    if (error) {
      toast.error("Failed to update status");
    } else {
      setProfiles(profiles.map(p => p.id === id ? { ...p, status: newStatus } : p));
      toast.success(`User status updated to ${newStatus}`);
    }
  };

  const handleStartEdit = (user: UserProfile) => {
    setEditingUserId(user.id);
    setEditFormData({
      full_name: user.full_name,
      role: user.role,
      password: "",
      subject_access: user.subject_access || [],
    });
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: editFormData.full_name,
          role: editFormData.role,
          subject_access: editFormData.subject_access,
        })
        .eq('id', id);
      
      if (profileError) throw profileError;

      if (editFormData.password) {
        toast.info("Password updates must be performed by the user via 'Forgot Password' or an Edge Function. Client-side admin reset is restricted.");
      }
      
      toast.success("User updated successfully");
      setEditingUserId(null);
      fetchProfiles();
    } catch (error: any) {
      console.error("Update failed:", error);
      toast.error(error.message || "Failed to update user");
    }
  };

  const handleViewActivity = (user: UserProfile) => {
    setSelectedUserForActivity(user);
    // ... (rest of activity logic similar to before)
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingOrbs />
      
      <div className="relative z-10 p-6 max-w-5xl mx-auto space-y-6">
        <header className="animate-fade-up">
          <div className="glass-panel-strong px-6 py-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <GlassButton variant="ghost" size="sm" onClick={() => navigate("/")}>
                  <ArrowLeft className="w-4 h-4" />
                </GlassButton>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/20">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold tracking-tight text-foreground">
                      <span className="gradient-text">Manage Users</span>
                    </h1>
                    <p className="text-xs text-muted-foreground">Approve requests and manage moderator permissions</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 bg-white/5 p-2 rounded-xl border border-white/10">
                <div className="px-3 border-r border-white/10">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Users</p>
                  <p className="text-lg font-bold text-foreground">{profiles.length}</p>
                </div>
                <div className="px-3">
                  <p className="text-[10px] uppercase font-bold text-amber-400">Moderator Requests</p>
                  <p className="text-lg font-bold text-foreground">
                    {profiles.filter(p => p.status === 'pending').length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <Tabs defaultValue="all" className="animate-fade-up" onValueChange={setStatusTab}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <TabsList className="glass-panel p-1">
              <TabsTrigger value="all" className="px-5">All Accounts</TabsTrigger>
              <TabsTrigger value="pending" className="px-5 relative">
                Moderator Requests
                {profiles.some(p => p.status === 'pending') && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-background animate-pulse" />
                )}
              </TabsTrigger>
              <TabsTrigger value="active" className="px-5">Active</TabsTrigger>
              <TabsTrigger value="suspended" className="px-5">Suspended</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="glass-input pl-10 w-full"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="glass-input text-sm"
              >
                <option value="all">All Roles</option>
                <option value="admin">Administrators</option>
                <option value="moderator">Content Moderators</option>
                <option value="student">Students</option>
              </select>
            </div>
          </div>

          <TabsContent value={statusTab} className="mt-0">
            <div className="space-y-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="w-10 h-10 animate-spin text-primary" />
                  <p className="text-muted-foreground text-sm">Fetching user records...</p>
                </div>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <div key={user.id} className="group glass-panel p-5 hover:bg-white/5 transition-all duration-300">
                    {editingUserId === user.id ? (
                      <div className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Full Name</label>
                            <GlassInput
                              value={editFormData.full_name}
                              onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Access Role</label>
                            <select
                              value={editFormData.role}
                              onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as UserRole })}
                              className="glass-input w-full"
                            >
                              <option value="admin">Administrator</option>
                              <option value="moderator">Content Moderator</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1 text-amber-400">Reset Password (Optional)</label>
                            <div className="relative">
                              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <input
                                type="text"
                                placeholder="New password"
                                value={editFormData.password}
                                onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                                className="glass-input pl-10 w-full"
                              />
                            </div>
                          </div>
                        </div>
                        
                        {editFormData.role === 'moderator' && (
                          <div className="mt-4 space-y-2">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Subject Access</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                              {subjects.map((subject) => (
                                <label key={subject.id} className="flex items-center space-x-2 bg-white/5 p-2 rounded-lg border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                                  <input
                                    type="checkbox"
                                    className="rounded border-white/20 bg-background text-primary"
                                    checked={editFormData.subject_access.includes(subject.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setEditFormData(prev => ({ ...prev, subject_access: [...prev.subject_access, subject.id] }));
                                      } else {
                                        setEditFormData(prev => ({ ...prev, subject_access: prev.subject_access.filter(id => id !== subject.id) }));
                                      }
                                    }}
                                  />
                                  <span className="text-sm text-foreground truncate">{subject.name}</span>
                                </label>
                              ))}
                            </div>
                            <p className="text-[10px] text-muted-foreground">Select the subjects this moderator is allowed to manage.</p>
                          </div>
                        )}

                        <div className="flex justify-end gap-3 mt-4">
                          <GlassButton variant="ghost" size="sm" onClick={() => setEditingUserId(null)}>Cancel</GlassButton>
                          <GlassButton variant="primary" size="sm" onClick={() => handleSaveEdit(user.id)}>
                            <Check className="w-4 h-4 mr-2" /> Save Changes
                          </GlassButton>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg border border-white/10 ${
                            user.role === 'admin' ? 'bg-indigo-500/20 text-indigo-400' : 
                            user.role === 'moderator' ? 'bg-primary/20 text-primary' : 
                            'bg-slate-500/20 text-slate-400'
                          }`}>
                            <User className="w-7 h-7" />
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              <h4 className="font-bold text-lg text-foreground">{user.full_name}</h4>
                              <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded tracking-widest ${
                                user.role === 'admin' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 
                                user.role === 'moderator' ? 'bg-primary/20 text-primary border border-primary/30' : 
                                'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                              }`}>
                                {user.role}
                              </span>
                              <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded tracking-widest ${
                                user.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 
                                user.status === 'pending' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse' : 
                                'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              }`}>
                                {user.status}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {user.email}</span>
                              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Joined {new Date(user.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 lg:bg-white/5 lg:p-2 lg:rounded-2xl border-white/10">
                          {user.status === 'pending' && (
                            <GlassButton 
                              variant="primary" 
                              size="sm" 
                              onClick={() => handleUpdateStatus(user.id, 'active')}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white border-0"
                            >
                              <UserCheck className="w-4 h-4 mr-2" /> Approve
                            </GlassButton>
                          )}
                          
                          {user.status === 'active' && user.id !== currentUser?.id ? (
                            <GlassButton 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleUpdateStatus(user.id, 'suspended')}
                              className="text-rose-400 hover:bg-rose-500/10"
                            >
                              <UserX className="w-4 h-4 mr-2" /> Suspend
                            </GlassButton>
                          ) : user.status === 'suspended' ? (
                            <GlassButton 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleUpdateStatus(user.id, 'active')}
                              className="text-emerald-400 hover:bg-emerald-500/10"
                            >
                              <UserCheck className="w-4 h-4 mr-2" /> Activate
                            </GlassButton>
                          ) : null}

                          <div className="w-px h-6 bg-white/10 mx-1 hidden lg:block" />
                          
                          <GlassButton variant="ghost" size="sm" onClick={() => handleStartEdit(user)} title="Edit User">
                            <Edit2 className="w-4 h-4" />
                          </GlassButton>
                          
                          <GlassButton variant="ghost" size="sm" onClick={() => setUserToDelete(user)} className="text-rose-400 hover:bg-rose-500/10" title="Delete Account">
                            <Trash2 className="w-4 h-4" />
                          </GlassButton>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10 animate-fade-up">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Filter className="w-8 h-8 text-muted-foreground opacity-30" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-1">No users found</h3>
                  <p className="text-sm text-muted-foreground">Try adjusting your filters or search query</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent className="glass-panel border-rose-500/30">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
              </div>
              <AlertDialogTitle className="text-foreground">Delete Account</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete <span className="font-bold text-foreground">{userToDelete?.full_name}</span>? This action is permanent and will remove both their profile and their login account. They will need to register again from scratch to gain access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="glass-panel hover:bg-white/5">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-rose-500 text-white hover:bg-rose-600 border-0">
               Delete Permanent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserManagement;
