import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GlassCard } from "./ui/GlassCard";
import { BookOpen, BookMarked, Layers, Users, Sparkles, Loader2, DollarSign, TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

interface StatItemProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
}

const StatItem = ({ label, value, icon, color, onClick }: StatItemProps) => (
  <div onClick={onClick} className="cursor-pointer transition-transform active:scale-95 h-full">
    <GlassCard className="flex items-center gap-3 p-3 h-full" hover={true}>
      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider truncate">{label}</p>
        <p className="text-base font-black text-foreground whitespace-nowrap">
          {value}
        </p>
      </div>
    </GlassCard>
  </div>
);

export const DashboardStats = () => {
  const navigate = useNavigate();
  const { user, isAdmin, role } = useAuth();
  const [stats, setStats] = useState({
    subjects: 0,
    courses: 0,
    topics: 0,
    paidBalance: 0,
    balance: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: statsData, error: statsError } = await supabase.rpc('get_system_stats', {
        target_user_id: isAdmin ? null : user?.id
      });

      if (statsError) throw statsError;

      setStats({
        subjects: statsData.subjects || 0,
        courses: statsData.courses || 0,
        topics: statsData.topics || 0,
        paidBalance: statsData.paid_balance || 0,
        balance: statsData.unpaid_balance || 0
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full max-w-5xl mx-auto mb-8 animate-fade-up">
      <StatItem 
        label="Subjects" 
        value={stats.subjects} 
        icon={<BookMarked className="w-5 h-5 text-white" />} 
        color="from-blue-500 to-indigo-500" 
        onClick={() => navigate('/content')}
      />
      <StatItem 
        label="Courses" 
        value={stats.courses} 
        icon={<BookOpen className="w-5 h-5 text-white" />} 
        color="from-purple-500 to-pink-500" 
        onClick={() => navigate('/content')}
      />
      <StatItem 
        label="Topics" 
        value={stats.topics} 
        icon={<Layers className="w-5 h-5 text-white" />} 
        color="from-orange-500 to-red-500" 
        onClick={() => navigate('/content')}
      />
      <StatItem 
        label="Total Paid" 
        value={`RWF ${stats.paidBalance.toLocaleString()}`} 
        icon={<TrendingUp className="w-5 h-5 text-white" />} 
        color="from-blue-400 to-cyan-500" 
        onClick={() => navigate('/moderator-stats')}
      />
      <StatItem 
        label={isAdmin ? "Unpaid Balance" : "Balance"} 
        value={`RWF ${stats.balance.toLocaleString()}`} 
        icon={<DollarSign className="w-5 h-5 text-white" />} 
        color="from-emerald-500 to-teal-500" 
        onClick={() => navigate('/moderator-stats')}
      />
    </div>
  );
};
