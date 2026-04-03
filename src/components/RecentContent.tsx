/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { GlassCard } from "./ui/GlassCard";
import { BookOpen, Calendar, ChevronRight, Trash2, Layout, Edit, HelpCircle } from "lucide-react";
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
  content?: string;
}

interface RecentContentProps {
  onEdit?: (lesson: RecentLesson) => void;
  searchQuery?: string;
}

export const RecentContent = ({ onEdit, searchQuery = "" }: RecentContentProps) => {
  const { role, isAdmin, subject_access, loading: authLoading } = useAuth();
  const [lessons, setLessons] = useState<RecentLesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      fetchRecentLessons();
    }
  }, [authLoading, role, subject_access]);

  const fetchRecentLessons = async () => {
    try {
      let query = supabase
        .from('lessons')
        .select(`
          id, 
          title, 
          created_at,
          content,
          video_url,
          topic:topics!inner (
            id,
            title,
            subject_id,
            subject:subjects (id, name)
          )
        `)
        .order('created_at', { ascending: false });

      if (role !== 'admin') {
        const accessRows = subject_access || [];
        if (accessRows.length === 0) {
          setLessons([]);
          return;
        }
        query = query.in('topic.subject_id', accessRows);
      }

      const { data, error } = await query.limit(5);

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

  const isLessonIncomplete = (lesson: any) => {
    try {
      if (!lesson.content) return true;
      const slides = typeof lesson.content === 'string' ? JSON.parse(lesson.content) : lesson.content;
      if (!Array.isArray(slides)) return true;
      
      // Flexible check for both legacy 'content' with isExample and new 'example' type
      const examplesCount = slides.filter((s: any) => 
        (s.type === 'content' && (s.isExample === true || s.isExample === 'true')) || 
        s.type === 'example'
      ).length;
      const questionsCount = slides.filter((s: any) => s.type === 'quiz').length;
      
      return examplesCount < 3 || questionsCount < 7;
    } catch (e) {
      return true;
    }
  };

  const hasEmptyFieldsInExamples = (lesson: any) => {
    try {
      if (!lesson || !lesson.content) return false;
      const slides = typeof lesson.content === 'string' ? JSON.parse(lesson.content) : lesson.content;
      if (!Array.isArray(slides)) return false;
      
      const examplesCount = slides.filter((s: any) => {
        const isEx = s.isExample === true || s.isExample === 'true' || s.type === 'example';
        return isEx;
      }).length;

      // Removed quantity check from here to allow green button to disappear even with 1-2 examples
      // if (examplesCount < 3) return true;

      return slides.some((s: any) => {
        const isEx = s.isExample === true || s.isExample === 'true' || s.type === 'example';
        if (isEx) {
          // If using the modern structure (newly saved data)
          if (s.exampleData) {
            const { title, problem, solution, keyTakeaway } = s.exampleData;
            // Mark as "Incomplete" if any box is truly empty or too short
            if (!title?.trim() || title?.trim().length < 2) return true;
            if (!problem?.trim() || problem?.trim().length < 5) return true;
            if (!solution?.trim() || solution?.trim().length < 5) return true;
            if (!keyTakeaway?.trim() || keyTakeaway?.trim().length < 5) return true;
            return false;
          }

          // Legacy fallback: Use robust splitter logic without requiring specific labels
          const content = s.content || "";
          const cleanLabel = (text: string) => {
            return text
              .replace(/^(Problem|Solution|Result|Takeaway|Key Takeaway|💡 Access more examples via the bulb icon):/sig, '')
              .replace(/^💡/g, '')
              .trim();
          };

          const probMatch = content.match(/^(.*?)(?=Solution:|Problem:|$)/si);
          const probTagMatch = content.match(/Problem:(.*?)(?=Solution:|$)/si);
          let probText = (probTagMatch?.[1] || probMatch?.[1] || "").trim();

          const solMatch = content.match(/Solution:(.*?)(?=Key Takeaway:|Takeaway:|💡|$)/si);
          const takeMatch = content.match(/(?:Key Takeaway:|Takeaway:)(.*?)(?=💡|$)/si);

          let solText = (solMatch?.[1] || "").trim();
          let takeText = (takeMatch?.[1] || "").trim();

          // FINAL CHECK: It's only "missing boxes" if we can't find content for Problem/Solution/Takeaway
          return cleanLabel(probText).length < 5 || cleanLabel(solText).length < 5 || cleanLabel(takeText).length < 5;
        }
        return false;
      });
    } catch (e) {
      console.error("Error parsing content for quality check:", e);
      return true;
    }
  };

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
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-foreground truncate">{lesson.title}</h4>
                    {(isLessonIncomplete(lesson) || hasEmptyFieldsInExamples(lesson)) && (
                      <div className="flex items-center gap-2">
                        {isLessonIncomplete(lesson) && (
                          <div className="flex items-center gap-1.5 text-rose-500 animate-pulse bg-rose-500/10 px-2 py-1.5 rounded-lg border border-rose-500/20 shadow-lg shadow-rose-500/10" title="Low Quality: Requires 3+ examples and 7+ quiz questions">
                            <HelpCircle className="w-5 h-5 fill-rose-500/20" />
                            <span className="text-[10px] font-black tracking-tight uppercase px-0.5">Quality Alert</span>
                          </div>
                        )}
                        {hasEmptyFieldsInExamples(lesson) && (
                          <div className="flex items-center justify-center w-7 h-7 bg-emerald-500 border border-emerald-400 rounded-full text-white shadow-lg cursor-help transition-all hover:scale-110" title="Missing field alert">
                            <span className="font-black text-xl leading-none">!</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
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
