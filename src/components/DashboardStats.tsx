import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GlassCard } from "./ui/GlassCard";
import { BookOpen, BookMarked, Layers, Users, Sparkles, Loader2, DollarSign } from "lucide-react";
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
  <div onClick={onClick} className="cursor-pointer transition-transform active:scale-95">
    <GlassCard className="flex items-center gap-4 p-4 min-w-[140px]" hover={true}>
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
        <p className="text-xl font-extrabold text-foreground">{value}</p>
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
    balance: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { count: subjectCount } = await supabase.from('subjects').select('*', { count: 'exact', head: true });
      const { count: topicCount } = await supabase.from('topics').select('*', { count: 'exact', head: true });
      const { count: lessonCount } = await supabase.from('lessons').select('*', { count: 'exact', head: true });
      
      let balance = 0;

      if (role === 'admin') {
        // Fetch all moderators and their price_per_topic
        const { data: mods } = await supabase
          .from('profiles')
          .select('id, price_per_topic')
          .eq('role', 'moderator');

        // Fetch all lessons to calculate unpaid balance
        const { data: allLessons } = await supabase
          .from('lessons')
          .select('created_by, is_paid');
        
        // Sum up (lessons per mod * that mod's price)
        let totalBalance = 0;
        if (allLessons && mods) {
          allLessons.filter(l => !l.is_paid).forEach(lesson => {
            const mod = mods.find(p => p.id === lesson.created_by);
            if (mod) {
              totalBalance += (mod.price_per_topic || 0);
            }
          });
        }
        balance = totalBalance;
      } else if (role === 'moderator' && user) {
        // Fetch personal price_per_topic
        const { data: profile } = await supabase
          .from('profiles')
          .select('price_per_topic')
          .eq('id', user.id)
          .single();

        const { count } = await supabase
          .from('lessons')
          .select('*', { count: 'exact', head: true })
          .eq('created_by', user.id)
          .eq('is_paid', false);

        balance = (count || 0) * (profile?.price_per_topic || 0);
      }

      setStats({
        subjects: subjectCount || 0,
        courses: topicCount || 0,
        topics: lessonCount || 0,
        balance: balance
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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl mx-auto mb-8 animate-fade-up">
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
        label={isAdmin ? "Unpaid Balance" : "Balance"} 
        value={`RWF ${stats.balance.toLocaleString()}`} 
        icon={<DollarSign className="w-5 h-5 text-white" />} 
        color="from-emerald-500 to-teal-500" 
        onClick={() => navigate('/moderator-stats')}
      />
    </div>
  );
};
