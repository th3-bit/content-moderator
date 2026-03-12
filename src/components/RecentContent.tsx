/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { GlassCard } from "./ui/GlassCard";
import { BookOpen, Calendar, ChevronRight, Trash2, Layout, Edit } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

interface RecentLesson {
  id: string;
  title: string;
  created_at: string;
  topic: {
    title: string;
    subject: {
      name: string;
    };
  };
}

interface RecentContentProps {
  onEdit?: (lesson: RecentLesson) => void;
  searchQuery?: string;
}

export const RecentContent = ({ onEdit, searchQuery = "" }: RecentContentProps) => {
  const { isAdmin } = useAuth();
  const [lessons, setLessons] = useState<RecentLesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentLessons();
  }, []);

  const fetchRecentLessons = async () => {
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select(`
          id, 
          title, 
          created_at,
          content,
          video_url,
          topic:topics (
            id,
            title,
            subject:subjects (id, name)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setLessons((data as any) || []);
    } catch (error) {
      console.error("Error fetching recent lessons:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('lessons').delete().eq('id', id);
      if (error) throw error;
      setLessons(lessons.filter(l => l.id !== id));
      toast.success("Lesson deleted successfully");
    } catch (error: any) {
      toast.error(`Failed to delete: ${error.message}`);
    }
  };

  const filteredLessons = lessons.filter(lesson => {
    const query = searchQuery.toLowerCase();
    return (
      lesson.title?.toLowerCase().includes(query) ||
      lesson.topic?.title?.toLowerCase().includes(query) ||
      lesson.topic?.subject?.name?.toLowerCase().includes(query)
    );
  });

  if (loading) return null;
  if (lessons.length === 0) return null;

  return (
    <div className="w-full max-w-4xl mx-auto mt-12 animate-fade-up">
      {/* ... header ... */}
      <div className="flex items-center gap-2 mb-4 px-2">
        <Layout className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-bold text-foreground">Recently Created Content</h3>
      </div>
      
      <div className="space-y-3">
        {filteredLessons.map((lesson) => (
          <GlassCard key={lesson.id} className="group p-4" hover={true}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                {/* ... existing icon and text ... */}
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-foreground truncate">{lesson.title}</h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <span className="text-primary/80">{lesson.topic?.subject?.name}</span>
                    <span>•</span>
                    <span>{lesson.topic?.title}</span>
                    {/* ... date ... */}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onEdit?.(lesson)}
                  className="p-2 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
                  title="Edit lesson"
                >
                  <Edit className="w-4 h-4" />
                </button>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(lesson.id)}
                    className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
                    title="Delete lesson"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <div className="p-2 rounded-lg bg-background/50 group-hover:bg-primary/20 transition-all">
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                </div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
};
