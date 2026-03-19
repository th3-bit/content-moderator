/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassInput } from "@/components/ui/GlassInput";
import { FloatingOrbs } from "@/components/FloatingOrbs";
import { 
  ArrowLeft, 
  Users, 
  BookOpen, 
  Layers, 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Loader2,
  ChevronRight,
  User,
  Clock,
  Check,
  X,
  Search
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ModeratorProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  price_per_topic: number;
  created_at: string;
}

interface StatsData {
  coursesCount: number;
  topicsCount: number;
  courses: any[];
  topics: any[];
}

export const ModeratorStats = () => {
  const navigate = useNavigate();
  const { user: currentUser, isAdmin } = useAuth();
  const [moderators, setModerators] = useState<ModeratorProfile[]>([]);
  const [selectedModId, setSelectedModId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Stats filtering
  const [timeframe, setTimeframe] = useState<"day" | "week" | "month">("month");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [modStats, setModStats] = useState<StatsData | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  
  // Pricing state
  const [editingPrice, setEditingPrice] = useState(false);
  const [newPrice, setNewPrice] = useState("");

  // Payout Modal state
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState<string>("");
  const [payoutMode, setPayoutMode] = useState<"all" | "partial">("all");
  const [allUnpaidTopics, setAllUnpaidTopics] = useState<any[]>([]);
  const [loadingUnpaid, setLoadingUnpaid] = useState(false);
  const [confirmingPayout, setConfirmingPayout] = useState(false);

  // Individual Stats state
  const [individualStats, setIndividualStats] = useState({
    unpaidBalance: 0,
    paidBalance: 0,
    unpaidCount: 0,
    paidCount: 0
  });

  // Global Stats state
  const [globalStats, setGlobalStats] = useState<{
    coursesCount: number;
    topicsCount: number;
    totalPaid: number;
    totalUnpaid: number;
  }>({ coursesCount: 0, topicsCount: 0, totalPaid: 0, totalUnpaid: 0 });
  const [loadingGlobal, setLoadingGlobal] = useState(false);

  useEffect(() => {
    fetchModerators();
    if (isAdmin) {
      fetchGlobalStats();
    }
  }, []);

  useEffect(() => {
    if (selectedModId) {
      fetchModStats(selectedModId, timeframe);
      fetchUnpaidBalance(selectedModId);
      const mod = moderators.find(m => m.id === selectedModId);
      if (mod) setNewPrice(mod.price_per_topic?.toString() || "0");
      setSelectedDay(null); // Reset day filter on timeframe or mod change
      setShowDayPicker(false);
    }
  }, [selectedModId, timeframe]);

  const fetchUnpaidBalance = async (modId: string) => {
    setLoadingUnpaid(true);
    try {
      // Still fetch the list for the payout logic (first 1000 is usually enough for one payout session, 
      // but we use RPC for the actual CARD BALANCE)
      const { data: listData } = await supabase
        .from('lessons')
        .select('id, created_at, is_paid')
        .eq('created_by', modId)
        .eq('is_paid', false)
        .order('created_at', { ascending: true });
      
      setAllUnpaidTopics(listData || []);

      // Fetch accurate balances via RPC
      const { data: statsData } = await supabase.rpc('get_system_stats', { target_user_id: modId });
      if (statsData) {
        setIndividualStats({
          unpaidBalance: statsData.unpaid_balance || 0,
          paidBalance: statsData.paid_balance || 0,
          unpaidCount: statsData.unpaid_count || 0,
          paidCount: statsData.paid_count || 0
        });
      }
    } catch (error) {
      console.error("Error fetching unpaid balance:", error);
    } finally {
      setLoadingUnpaid(false);
    }
  };

  const fetchModerators = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'moderator')
        .order('full_name', { ascending: true });
      
      if (error) throw error;
      setModerators(data || []);
      
      // Auto-select current user if they are a moderator and not admin
      if (!isAdmin && currentUser) {
        setSelectedModId(currentUser.id);
      }
    } catch (error: any) {
      toast.error("Failed to load moderators");
    } finally {
      setLoading(false);
    }
  };

  const fetchGlobalStats = async () => {
    setLoadingGlobal(true);
    try {
      const { data: statsData, error: statsError } = await supabase.rpc('get_system_stats');

      if (statsError) throw statsError;

      setGlobalStats({
        coursesCount: statsData.courses || 0,
        topicsCount: statsData.topics || 0,
        totalPaid: statsData.paid_balance || 0,
        totalUnpaid: statsData.unpaid_balance || 0
      });
    } catch (error) {
      console.error("Error fetching global stats:", error);
    } finally {
      setLoadingGlobal(false);
    }
  };

  const fetchModStats = async (modId: string, range: "day" | "week" | "month") => {
    setLoadingStats(true);
    try {
      const now = new Date();
      let startDate = new Date();
      
      if (range === 'day' || range === 'week') startDate.setDate(now.getDate() - 7);
      else if (range === 'month') startDate.setMonth(now.getMonth() - 1);

      const startIso = startDate.toISOString();

      // Fetch Courses (topics table)
      const { data: courses } = await supabase
        .from('topics')
        .select('*, subjects(id, name)')
        .eq('created_by', modId)
        .gte('created_at', startIso);

      // Fetch Topics (lessons table)
      const { data: topics } = await supabase
        .from('lessons')
        .select('*, topics(id, title, subjects(id))')
        .eq('created_by', modId)
        .gte('created_at', startIso);

      setModStats({
        coursesCount: courses?.length || 0,
        topicsCount: topics?.length || 0,
        courses: courses || [],
        topics: topics || []
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  const filteredModStats = useMemo(() => {
    if (!modStats) return null;
    
    // Determine the active day filter
    // If timeframe is 'day' and no day selected, default to today
    // If timeframe is 'week' or 'month' and no day selected, show all
    const activeDay = selectedDay !== null 
      ? selectedDay 
      : (timeframe === 'day' ? new Date().getDay() : null);

    if (activeDay === null) return modStats;
    
    const filteredCourses = modStats.courses.filter(c => new Date(c.created_at).getDay() === activeDay);
    const filteredTopics = modStats.topics.filter(t => new Date(t.created_at).getDay() === activeDay);
    
    return {
      ...modStats,
      courses: filteredCourses,
      topics: filteredTopics,
      coursesCount: filteredCourses.length,
      topicsCount: filteredTopics.length
    };
  }, [modStats, selectedDay, timeframe]);

  const handleDaySelect = (dayIndex: number) => {
    setSelectedDay(selectedDay === dayIndex ? null : dayIndex);
    setShowDayPicker(false);
  };

  const handleUpdatePrice = async () => {
    if (!selectedModId || !isAdmin) return;
    
    const priceNum = parseFloat(newPrice);
    if (isNaN(priceNum)) {
      toast.error("Invalid price");
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ price_per_topic: priceNum })
        .eq('id', selectedModId);

      if (error) throw error;
      
      setModerators(moderators.map(m => m.id === selectedModId ? { ...m, price_per_topic: priceNum } : m));
      setEditingPrice(false);
      toast.success("Price updated successfully");
    } catch (error) {
      toast.error("Failed to update price");
    }
  };

  const filteredModerators = moderators.filter(m => 
    m.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedMod = moderators.find(m => m.id === selectedModId);
  const totalUnpaid = individualStats.unpaidBalance;
  
  // This is now handled by get_system_stats RPC called in fetchUnpaidBalance

  const handleOpenPayoutModal = () => {
    if (totalUnpaid <= 0) {
      toast.error("No unpaid balance to clear");
      return;
    }
    setPayoutMode("all");
    setPayoutAmount(totalUnpaid.toString());
    setConfirmingPayout(false); // Reset confirmation state
    setIsPayoutModalOpen(true);
  };

  const handleClearBalance = async () => {
    if (!selectedModId || !isAdmin || individualStats.unpaidCount === 0) {
      toast.error("Nothing to pay");
      return;
    }

    const amount = parseInt(payoutAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount (numbers only)");
      return;
    }

    if (amount > totalUnpaid) {
      toast.error(`Cannot pay more than the balance (Max: RWF ${totalUnpaid})`);
      return;
    }

    const pricePerTopic = selectedMod?.price_per_topic || 0;
    if (pricePerTopic <= 0) {
       toast.error("Moderator rate is not set");
       return;
    }

    const topicsToPay = Math.floor(amount / pricePerTopic);
    if (topicsToPay === 0) {
      toast.error(`Amount too low. Minimum to clear 1 topic: RWF ${pricePerTopic}`);
      return;
    }

    const topicsToMark = allUnpaidTopics.slice(0, topicsToPay).map(t => t.id);

    // If not confirmed yet, switch to confirmation view
    if (!confirmingPayout) {
      setConfirmingPayout(true);
      return;
    }

    setLoadingStats(true);
    try {
      // Direct call to Supabase
      const { data, error } = await supabase
        .from('lessons')
        .update({ is_paid: true })
        .in('id', topicsToMark)
        .select();

      if (error) throw error;
      
      toast.success(`CASH Record: RWF ${amount} paid to ${selectedMod?.full_name}`);
      setIsPayoutModalOpen(false);
      setConfirmingPayout(false);
      
      // Refresh everything
      fetchModStats(selectedModId, timeframe);
      fetchUnpaidBalance(selectedModId);
      fetchGlobalStats();
    } catch (error: any) {
      console.error("Payout error:", error);
      toast.error("Failed to update payment status: " + (error.message || "Unknown error"));
    } finally {
      setLoadingStats(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingOrbs />
      
      <div className="relative z-10 p-6 max-w-6xl mx-auto space-y-6">
        <header className="animate-fade-up">
          <div className="glass-panel-strong px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <GlassButton variant="ghost" size="sm" onClick={() => navigate("/")}>
                <ArrowLeft className="w-4 h-4" />
              </GlassButton>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold gradient-text">Moderator Performance</h1>
                  <p className="text-xs text-muted-foreground">Track contributions and earnings</p>
                </div>
              </div>
            </div>

            {/* Balances in Header */}
            <div className="flex items-center gap-3 animate-fade-in">
              <div className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-2xl shadow-sm">
                <div className="p-1.5 rounded-lg bg-blue-500 text-white shadow-lg shadow-blue-500/20 shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase font-bold text-blue-400 leading-tight">Paid</p>
                  <p className="font-black text-base leading-tight">
                    {selectedModId 
                      ? (loadingUnpaid ? "..." : `RWF ${individualStats.paidBalance.toLocaleString()}`)
                      : (loadingGlobal ? "..." : `RWF ${globalStats.totalPaid.toLocaleString()}`)
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-2xl shadow-sm relative pr-12">
                <div className="p-1.5 rounded-lg bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 shrink-0">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase font-bold text-emerald-400 leading-tight">Unpaid</p>
                  <p className="font-black text-base leading-tight">
                    {selectedModId 
                      ? (loadingUnpaid ? "..." : `RWF ${individualStats.unpaidBalance.toLocaleString()}`)
                      : (loadingGlobal ? "..." : `RWF ${globalStats.totalUnpaid.toLocaleString()}`)
                    }
                  </p>
                </div>
                {isAdmin && selectedModId && individualStats.unpaidBalance > 0 && !loadingUnpaid && (
                  <GlassButton 
                    size="sm" 
                    variant="primary" 
                    onClick={handleOpenPayoutModal}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 px-2 text-[8px] uppercase font-bold bg-emerald-600 hover:bg-emerald-500 border-none shadow-lg animate-fade-in"
                  >
                    Pay
                  </GlassButton>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-180px)]">
          {/* Sidebar: Moderator List (Only for Admin) */}
          {isAdmin && (
            <GlassCard className="lg:col-span-4 flex flex-col p-0">
              <div className="p-4 border-b border-white/10 space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <h2 className="font-bold">Moderators</h2>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="glass-input pl-9 w-full text-sm"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {filteredModerators.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedModId(m.id)}
                    className={cn(
                      "w-full text-left p-3 rounded-xl transition-all border border-transparent flex items-center justify-between group",
                      selectedModId === m.id ? "bg-primary/20 border-primary/30" : "bg-black/[0.02] dark:bg-white/5 border-black/5 dark:border-white/10 hover:bg-black/[0.05] dark:hover:bg-white/10"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-sm truncate">{m.full_name}</p>
                        <p className="text-[10px] text-muted-foreground">{m.email}</p>
                      </div>
                    </div>
                    <ChevronRight className={cn("w-4 h-4 transition-transform", selectedModId === m.id ? "translate-x-1" : "opacity-0 group-hover:opacity-100")} />
                  </button>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Main Content: Stats & Details */}
          <div className={cn("flex flex-col gap-6 h-full min-h-0", isAdmin ? "lg:col-span-8" : "lg:col-span-12")}>
            {/* Context Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-black flex flex-wrap items-center gap-2">
                  {selectedModId ? (
                    <>
                      {selectedMod?.full_name}
                      <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded uppercase tracking-widest font-black">Individual Stats</span>
                    </>
                  ) : (
                    <>
                      Global Overview
                      <span className="text-[10px] bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded uppercase tracking-widest font-black">System Wide</span>
                    </>
                  )}
                </h2>
              </div>

              {/* Compact Counts in Header */}
              <div className="flex items-center gap-3">
                {/* Unified Timeframe & Day Selector */}
                <div className="flex items-center gap-1 bg-black/[0.03] dark:bg-white/5 border border-black/5 dark:border-white/10 p-0.5 rounded-xl mr-1">
                  <div className="relative">
                    <button
                      onClick={() => {
                        setTimeframe('day');
                        setShowDayPicker(!showDayPicker);
                      }}
                      className={cn(
                        "px-3 py-1 rounded-lg text-[9px] font-bold transition-all capitalize",
                        timeframe === 'day' ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:bg-white/5"
                      )}
                    >
                      Day
                    </button>

                    {/* Day Picker Popover */}
                    {showDayPicker && timeframe === 'day' && (
                      <div className="absolute top-full mt-2 left-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-black/10 dark:border-white/10 p-1.5 rounded-2xl shadow-2xl flex items-center gap-1 animate-in zoom-in-95 fade-in duration-200 origin-top-left ring-1 ring-black/5 dark:ring-white/5">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => {
                          const isToday = new Date().getDay() === idx;
                          const isActive = selectedDay === idx || (selectedDay === null && isToday);
                          return (
                            <button
                              key={`${day}-${idx}`}
                              onClick={() => handleDaySelect(idx)}
                              className={cn(
                                "w-7 h-7 rounded-lg text-[10px] font-black transition-all flex items-center justify-center",
                                isActive 
                                  ? "bg-primary text-white shadow-md scale-105" 
                                  : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:scale-105",
                                isToday && !isActive && "border border-primary/30"
                              )}
                              title={isToday ? "Today" : undefined}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => {
                      setTimeframe('week');
                      setSelectedDay(null);
                      setShowDayPicker(false);
                    }}
                    className={cn(
                      "px-3 py-1 rounded-lg text-[9px] font-bold transition-all capitalize",
                      timeframe === 'week' ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:bg-white/5"
                    )}
                  >
                    Week
                  </button>
                  <button
                    onClick={() => {
                      setTimeframe('month');
                      setSelectedDay(null);
                      setShowDayPicker(false);
                    }}
                    className={cn(
                      "px-3 py-1 rounded-lg text-[9px] font-bold transition-all capitalize",
                      timeframe === 'month' ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:bg-white/5"
                    )}
                  >
                    Month
                  </button>
                </div>

                <div className="flex items-center gap-2.5 bg-blue-500/10 border border-blue-500/20 px-3 h-[46px] rounded-xl animate-fade-in shadow-sm">
                  <div className="p-1.5 rounded-lg bg-blue-500 text-white shrink-0">
                    <BookOpen className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase font-bold text-blue-400/80 leading-tight">Courses</p>
                    <p className="font-black text-sm leading-tight">
                      {selectedModId 
                        ? (loadingStats ? "..." : filteredModStats?.coursesCount)
                        : (loadingGlobal ? "..." : globalStats.coursesCount)
                      }
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 bg-purple-500/10 border border-purple-500/20 px-3 h-[46px] rounded-xl animate-fade-in shadow-sm">
                  <div className="p-1.5 rounded-lg bg-purple-500 text-white shrink-0">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase font-bold text-purple-400/80 leading-tight">Topics</p>
                    <p className="font-black text-sm leading-tight">
                      {selectedModId 
                        ? (loadingStats ? "..." : filteredModStats?.topicsCount)
                        : (loadingGlobal ? "..." : globalStats.topicsCount)
                      }
                    </p>
                  </div>
                </div>

                {isAdmin && selectedModId && (
                  editingPrice ? (
                    <div className="flex items-center gap-2 animate-fade-in bg-emerald-500/10 border border-emerald-500/20 px-3 h-[46px] rounded-xl">
                      <GlassInput
                        type="number"
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        className="w-16 h-7 text-xs px-1"
                        autoFocus
                      />
                      <div className="flex flex-col gap-0.5">
                        <button onClick={handleUpdatePrice} className="p-0.5 hover:bg-emerald-500/20 rounded text-emerald-500" title="Save rate">
                          <Check className="w-3 h-3" />
                        </button>
                        <button onClick={() => setEditingPrice(false)} className="p-0.5 hover:bg-red-500/20 rounded text-red-500" title="Cancel">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => setEditingPrice(true)}
                      className="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/20 px-3 h-[46px] rounded-xl animate-fade-in shadow-sm cursor-pointer hover:bg-emerald-500/20 transition-all group"
                    >
                      <div className="p-1.5 rounded-lg bg-emerald-500 text-white shrink-0">
                        <DollarSign className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] uppercase font-bold text-emerald-400/80 leading-tight">Rate</p>
                        <p className="font-black text-sm leading-tight">
                          RWF {selectedMod?.price_per_topic || 0}
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            {!selectedModId ? (
              <div className="flex-1 glass-card flex flex-col items-center justify-center p-12 text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-10 h-10 text-primary/40" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">System Overview Mode</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    The cards above show aggregated data for the entire platform. Select a moderator from the left to view individual performance.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Details Card */}
                <GlassCard className="flex-1 flex flex-col p-6 min-h-0">

                  <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar pr-2">
                    {/* Course List */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold flex items-center gap-2 text-muted-foreground">
                        <BookOpen className="w-4 h-4" /> Courses Created ({filteredModStats?.coursesCount})
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {filteredModStats?.courses.map((c: any) => (
                          <div 
                            key={c.id} 
                            onClick={isAdmin ? () => navigate(`/content?subjectId=${c.subjects?.id}&courseId=${c.id}`) : undefined}
                            className={cn(
                              "p-3 bg-black/[0.02] dark:bg-white/5 rounded-xl border border-black/10 dark:border-white/10 flex items-center justify-between transition-all group",
                              isAdmin && "hover:bg-primary/10 hover:border-primary/30 cursor-pointer"
                            )}
                          >
                            <div>
                               <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                 {c.title}
                                 {isAdmin && <ChevronRight className="w-3 h-3 text-primary opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" />}
                               </p>
                               <p className="text-[10px] text-muted-foreground">{c.subjects?.name}</p>
                            </div>
                            <span className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Topics List */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold flex items-center gap-2 text-muted-foreground pt-4 border-t border-black/5 dark:border-white/10">
                        <Layers className="w-4 h-4" /> Topics Created ({filteredModStats?.topicsCount})
                      </h3>
                      <div className="flex flex-col gap-2">
                        {filteredModStats?.topics.map((t: any) => (
                          <div 
                            key={t.id} 
                            onClick={isAdmin ? () => navigate(`/content?subjectId=${t.topics?.subjects?.id}&courseId=${t.topics?.id}&lessonId=${t.id}`) : undefined}
                            className={cn(
                              "p-3 bg-black/[0.02] dark:bg-white/5 rounded-xl border border-black/10 dark:border-white/10 flex items-center justify-between transition-all group",
                              isAdmin && "hover:bg-primary/10 hover:border-primary/30 cursor-pointer"
                            )}
                          >
                            <div>
                               <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                 {t.title}
                                 {isAdmin && <ChevronRight className="w-3 h-3 text-primary opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" />}
                               </p>
                               <p className="text-[10px] text-muted-foreground">Course: {t.topics?.title}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</span>
                              {t.is_paid ? (
                                <span className="text-[8px] bg-green-500/20 text-green-500 px-1.5 py-0.5 rounded uppercase font-black tracking-tighter">Paid</span>
                              ) : (
                                <span className="text-[8px] bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded uppercase font-black tracking-tighter">Unpaid</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {(!loadingStats && modStats?.coursesCount === 0 && modStats?.topicsCount === 0) && (
                      <div className="text-center py-12 opacity-30 italic text-sm">
                        No content added in this timeframe
                      </div>
                    )}
                  </div>
                </GlassCard>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Payout Modal */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <GlassCard className="max-w-md w-full p-8 space-y-6" hover={false}>
            <div className="flex items-center gap-3 mb-2">
               <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                 <DollarSign className="w-6 h-6 text-emerald-500" />
               </div>
               <div>
                 <h2 className="text-xl font-bold">Process Payout</h2>
                 <p className="text-xs text-muted-foreground">{selectedMod?.full_name}</p>
               </div>
            </div>

            <div className="space-y-4">
               {!confirmingPayout ? (
                 <>
                   <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                      <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">Total Unpaid Balance</p>
                      <p className="text-2xl font-black">RWF {totalUnpaid.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">From {individualStats.unpaidCount} total unpaid topics</p>
                   </div>

                   <div className="flex bg-white/5 p-1 rounded-xl">
                     <button 
                      onClick={() => { setPayoutMode("all"); setPayoutAmount(totalUnpaid.toString()); }}
                      className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-all", payoutMode === "all" ? "bg-primary text-white" : "text-muted-foreground hover:bg-white/5")}
                     >
                       Pay All
                     </button>
                     <button 
                      onClick={() => setPayoutMode("partial")}
                      className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-all", payoutMode === "partial" ? "bg-primary text-white" : "text-muted-foreground hover:bg-white/5")}
                     >
                       Partial Payment
                     </button>
                   </div>

                   {payoutMode === "partial" && (
                     <div className="space-y-2 animate-fade-up">
                        <label className="text-xs font-bold text-muted-foreground px-1">Amount to Pay in Cash (RWF)</label>
                        <GlassInput 
                          type="text"
                          inputMode="numeric"
                          value={payoutAmount}
                          onChange={(e) => setPayoutAmount(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder="Enter amount..."
                          className="h-12"
                        />
                        <p className="text-[10px] text-muted-foreground italic px-1">
                          Enter numbers only. Multiples of RWF {selectedMod?.price_per_topic} will clear full topics.
                        </p>
                     </div>
                   )}

                   <div className="pt-4 flex gap-3">
                     <GlassButton variant="ghost" className="flex-1" onClick={() => setIsPayoutModalOpen(false)}>
                       Cancel
                     </GlassButton>
                     <GlassButton variant="primary" className="flex-[2]" onClick={handleClearBalance}>
                       Next: Confirm
                     </GlassButton>
                   </div>
                 </>
               ) : (
                 <div className="space-y-6 animate-fade-in">
                    <div className="relative overflow-hidden p-8 rounded-[2rem] bg-emerald-500/10 border-2 border-emerald-500/20 text-center space-y-3 group">
                       <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                         <DollarSign className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
                       </div>
                       
                       <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">Confirm Cash Delivery</p>
                       <p className="text-5xl font-black text-emerald-500 drop-shadow-sm">RWF {parseInt(payoutAmount).toLocaleString()}</p>
                       <div className="flex flex-col gap-1 items-center">
                         <div className="h-px w-12 bg-emerald-500/30 mb-2" />
                         <p className="text-[11px] font-bold text-foreground/80">
                           {Math.floor(parseInt(payoutAmount) / (selectedMod?.price_per_topic || 1))} Topics to be marked Paid
                         </p>
                         <p className="text-[10px] text-muted-foreground">For {selectedMod?.full_name}</p>
                       </div>
                    </div>

                    <div className="relative overflow-hidden bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 p-5 rounded-2xl flex items-start gap-4">
                       <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
                       <div className="p-2 rounded-lg bg-amber-500/20 shrink-0">
                         <Clock className="w-4 h-4 text-amber-500" />
                       </div>
                       <div className="space-y-1">
                         <p className="text-[11px] font-bold text-amber-500 uppercase tracking-widest">Important Notice</p>
                         <p className="text-[10px] text-muted-foreground leading-relaxed">
                           By confirming, you verify that RWF {parseInt(payoutAmount).toLocaleString()} was physically delivered to the moderator. This action will permanently update the payment ledger.
                         </p>
                       </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                       <GlassButton variant="ghost" className="flex-1 h-12 rounded-xl text-xs font-bold" onClick={() => setConfirmingPayout(false)}>
                         Back
                       </GlassButton>
                       <GlassButton 
                        variant="accent" 
                        className="flex-[2] h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white border-none shadow-xl shadow-emerald-900/40 relative overflow-hidden group" 
                        onClick={handleClearBalance}
                        disabled={loadingStats}
                       >
                         <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                         {loadingStats ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                         <span className="font-bold uppercase tracking-widest text-[10px]">Record Cash Payment</span>
                       </GlassButton>
                    </div>
                 </div>
               )}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

export default ModeratorStats;
