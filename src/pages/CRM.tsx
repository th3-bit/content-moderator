/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { FloatingOrbs } from "@/components/FloatingOrbs";
import { 
  ArrowLeft, 
  Users, 
  CreditCard, 
  Activity, 
  Search, 
  Filter, 
  Download,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Transaction {
  id: string;
  user_id: string;
  plan_id: string;
  payment_reference: string;
  expires_at: string;
  created_at: string;
  is_active: boolean;
  profile: {
    full_name: string;
    email: string;
  };
  plan: {
    name: string;
    price: number;
    plan_type: string;
  };
}

interface ActivityLog {
  id: string;
  user_id: string;
  topic_id: string;
  score: number;
  completed_at: string;
  profile: {
    full_name: string;
  };
  topic_title: string;
}

export const CRM = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchCRMData();
  }, []);

  const fetchCRMData = async () => {
    setLoading(true);
    try {
      // Fetch Subscriptions with profile and plan info
      const { data: subData } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          profile:profiles(full_name, email),
          plan:subscription_plans(name, price, plan_type)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      // Fetch Recent Activity
      const { data: progData } = await supabase
        .from('user_progress')
        .select(`
          *,
          profile:profiles(full_name)
        `)
        .order('completed_at', { ascending: false })
        .limit(50);

      if (progData) {
        // Resolve topic titles (heuristic or secondary fetch if needed)
        const enrichedProg = await Promise.all(progData.map(async (act) => {
           const { data: topic } = await supabase.from('topics').select('title').eq('id', act.topic_id).single();
           return { ...act, topic_title: topic?.title || "Unknown" };
        }));
        setActivities(enrichedProg as any);
      }

      setTransactions((subData as any) || []);
    } catch (error) {
      console.error("Error fetching CRM data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(t => 
    t.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.payment_reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.profile?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      <FloatingOrbs />
      
      <div className="relative z-10 p-6 max-w-7xl mx-auto space-y-6">
        <header className="animate-fade-up">
          <div className="glass-panel-strong px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <GlassButton variant="ghost" size="sm" onClick={() => navigate("/")}>
                  <ArrowLeft className="w-4 h-4" />
                </GlassButton>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shadow-inner">
                    <Activity className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-foreground">
                      <span className="gradient-text">CRM \u0026 Business Hub</span>
                    </h1>
                    <p className="text-xs text-muted-foreground">Monitor revenue and student engagement</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                 <div className="flex items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20 shadow-sm">
                    <TrendingUp className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-bold text-primary">
                       {transactions.filter(t => t.is_active).length} Active Subscriptions
                    </span>
                 </div>
                 <GlassButton variant="ghost" size="sm" title="Export Data">
                   <Download className="w-4 h-4" />
                 </GlassButton>
              </div>
            </div>
          </div>
        </header>

        <div className="grid lg:grid-cols-4 gap-6 animate-fade-up">
          {/* Revenue Stat */}
          <GlassCard className="p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <CreditCard className="w-5 h-5 text-emerald-400" />
              </div>
              <Badge variant="outline" className="text-[10px] uppercase font-bold text-emerald-400 border-emerald-500/30">Live</Badge>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-1">Total Estimated Revenue</p>
              <h3 className="text-3xl font-black text-foreground">
                {transactions.reduce((acc, t) => acc + (t.plan?.price || 0), 0).toLocaleString()} <span className="text-sm font-normal text-muted-foreground">RWF</span>
              </h3>
            </div>
          </GlassCard>

          {/* Quick Metrics */}
          <GlassCard className="lg:col-span-3 p-5">
             <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold flex items-center gap-2"><Filter className="w-4 h-4 text-primary" /> Subscription Feed</h3>
                <div className="relative w-64">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                   <input 
                     type="text" 
                     placeholder="Search transactions..." 
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="glass-input pl-9 w-full text-xs py-1.5"
                   />
                </div>
             </div>

             <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead className="text-xs font-bold uppercase tracking-wider">Student</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider">Plan</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider">Amount</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider">Reference</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider">Status</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((t) => (
                      <TableRow key={t.id} className="border-border/30 hover:bg-white/5 transition-colors">
                        <TableCell className="py-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-sm">{t.profile?.full_name || "Unknown User"}</span>
                            <span className="text-[10px] text-muted-foreground">{t.profile?.email}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge variant="secondary" className="text-[10px] font-bold">
                            {t.plan?.name || "Topic Level"}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 font-mono font-bold text-primary">
                          {t.plan?.price?.toLocaleString() || 0}
                        </TableCell>
                        <TableCell className="py-3 font-mono text-[10px] text-muted-foreground">
                          {t.payment_reference?.substring(0, 15)}...
                        </TableCell>
                        <TableCell className="py-3">
                          {t.is_active ? (
                            <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3" /> ACTIVE
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-rose-400 text-[10px] font-bold">
                              <AlertCircle className="w-3 h-3" /> EXPIRED
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-3 text-xs text-muted-foreground">
                          {new Date(t.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
             </div>
          </GlassCard>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 animate-fade-up">
           {/* Progress Feed */}
           <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                 <div>
                   <h3 className="font-bold text-lg flex items-center gap-2"><Activity className="w-5 h-5 text-indigo-400" /> Student Progress Feed</h3>
                   <p className="text-xs text-muted-foreground">Live updates on lesson completions</p>
                 </div>
                 <div className="p-2 bg-indigo-500/10 rounded-full">
                   <Clock className="w-4 h-4 text-indigo-400" />
                 </div>
              </div>

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                 {activities.map((act) => (
                   <div key={act.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-indigo-500/20 transition-all">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg flex-shrink-0">
                            {act.profile?.full_name?.charAt(0)}
                         </div>
                         <div>
                            <p className="text-sm font-bold text-foreground">{act.profile?.full_name}</p>
                            <p className="text-[11px] text-muted-foreground">Completed: <span className="text-indigo-300">{act.topic_title}</span></p>
                         </div>
                      </div>
                      <div className="text-right">
                         <div className="text-lg font-black text-emerald-400">{act.score}%</div>
                         <p className="text-[9px] uppercase tracking-tighter text-muted-foreground">Mastery Score</p>
                      </div>
                   </div>
                 ))}
              </div>
           </GlassCard>

           {/* User Distribution / Placeholder */}
           <GlassCard className="p-6 relative overflow-hidden flex flex-col items-center justify-center">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                 <Users className="w-64 h-64 text-primary" />
              </div>
              <div className="text-center relative z-10">
                 <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 border-2 border-primary/30">
                    <Users className="w-10 h-10 text-primary" />
                 </div>
                 <h3 className="text-2xl font-bold mb-2">Platform Growth</h3>
                 <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
                    Continue to the primary User Management screen to manage permissions, reset passwords, or deactivate accounts.
                 </p>
                 <GlassButton variant="primary" onClick={() => navigate("/users")} className="px-8">
                    Go to User Management
                 </GlassButton>
              </div>
           </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default CRM;
