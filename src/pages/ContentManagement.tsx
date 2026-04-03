/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { FloatingOrbs } from "@/components/FloatingOrbs";
import { 
  ArrowLeft, 
  BookMarked, 
  Layers, 
  BookOpen, 
  Trash2, 
  Edit2, 
  Loader2, 
  ChevronRight,
  Plus,
  Wand2,
  ArrowUp,
  ArrowDown,
  Copy,
  ClipboardCheck,
  Lock,
  HelpCircle,
  Search,
  GripVertical
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { GlassInput } from "@/components/ui/GlassInput";
import { ContentBuilder } from "@/components/ContentBuilder";
import { GlobalSearch } from "@/components/GlobalSearch";
import { useAuth } from "@/context/AuthContext";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableRowProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

function SortableRow({ id, children, className, style, onClick }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const combinedStyle: React.CSSProperties = {
    ...style,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: (isDragging ? 'relative' : 'static') as any,
    zIndex: isDragging ? 50 : ('auto' as any),
  };
  return (
    <div ref={setNodeRef} style={combinedStyle} className={cn(className, "flex flex-row items-stretch overflow-hidden")} onClick={onClick}>
      <div {...attributes} {...listeners} className="flex items-center justify-center px-1 cursor-grab active:cursor-grabbing hover:bg-white/10 transition-colors z-10" onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}>
        <GripVertical className="w-4 h-4 text-muted-foreground opacity-50 hover:opacity-100" />
      </div>
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}

import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { SUBJECT_COLORS } from "@/components/SubjectTopicForm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Subject {
  id: string;
  name: string;
  color?: string;
  order_index?: number;
  topics?: Topic[];
}

interface Topic {
  id: string;
  title: string;
  subject_id: string;
  order_index?: number;
  lessons?: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  topic_id: string;
  duration?: number;
  content?: any;
  video_url?: string;
  is_incomplete?: boolean;
}

export const ContentManagement = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  const handleSelectSubject = (id: string) => {
    setSelectedSubjectId(id);
    fetchTopics(id);
    setSelectedTopicId(null);
    setSelectedLessonId(null);
    const params = new URLSearchParams(searchParams.toString());
    params.set('subjectId', id);
    params.delete('courseId');
    params.delete('lessonId');
    setSearchParams(params, { replace: true });
  };

  const handleSelectTopic = (id: string) => {
    setSelectedTopicId(id);
    fetchLessons(id);
    setSelectedLessonId(null);
    const params = new URLSearchParams(searchParams.toString());
    if (selectedSubjectId) params.set('subjectId', selectedSubjectId);
    params.set('courseId', id);
    params.delete('lessonId');
    setSearchParams(params, { replace: true });
  };

  const handleSelectLesson = (id: string) => {
    setSelectedLessonId(id);
    const params = new URLSearchParams(searchParams.toString());
    if (selectedSubjectId) params.set('subjectId', selectedSubjectId);
    if (selectedTopicId) params.set('courseId', selectedTopicId);
    params.set('lessonId', id);
    setSearchParams(params, { replace: true });
  };

  // Helper to get active subject color
  const activeSubjectColor = subjects.find(s => s.id === selectedSubjectId)?.color || '#3B82F6';

  // Creation State
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showTopicBuilder, setShowTopicBuilder] = useState(false);

  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectColor, setNewSubjectColor] = useState(SUBJECT_COLORS[0].value);
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  // Renaming State
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [editingCourse, setEditingCourse] = useState<Topic | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  // Clipboard State
  const [clipboard, setClipboard] = useState<{ 
    type: 'course' | 'topic', 
    id: string, 
    name: string 
  } | null>(null);

  const [isPasting, setIsPasting] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Handle Deep Linking from Global Search
  useEffect(() => {
    const handleNavigation = async () => {
      const subjectId = searchParams.get('subjectId');
      const courseId = searchParams.get('courseId');
      const lessonId = searchParams.get('lessonId');

      if (subjectId) {
        setSelectedSubjectId(subjectId);
        await fetchTopics(subjectId);
        
        if (courseId) {
          setSelectedTopicId(courseId);
          await fetchLessons(courseId);
          
          if (lessonId) {
            setTimeout(() => {
              const element = document.getElementById(`lesson-${lessonId}`);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('bg-primary/20', 'ring-2', 'ring-primary');
                setTimeout(() => element.classList.remove('bg-primary/20', 'ring-2', 'ring-primary'), 3000);
              }
            }, 500);
          } else {
             setTimeout(() => {
              document.getElementById(`course-${courseId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
          }
        } else {
          setTimeout(() => {
            document.getElementById(`subject-${subjectId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 300);
        }
      }
    };

    handleNavigation();
  }, [searchParams]);

  const fetchInitialData = async () => {
    setLoading(true);
    let query = supabase.from('subjects').select('*, topics(*, lessons(*))').order('order_index', { ascending: true }).order('created_at', { ascending: true });
    
    if (!isAdmin && user) {
      const { data: profile } = await supabase.from('profiles').select('subject_access').eq('id', user.id).single();
      const accessRows = profile?.subject_access || [];
      
      if (accessRows.length === 0) {
        setSubjects([]);
        setLoading(false);
        return;
      }
      query = query.in('id', accessRows);
    }

    const { data: subjectData } = await query;
    
    // Process subjects to ensure lessons are sorted and structure is clean
    const nestedData = (subjectData || []).map(s => ({
      ...s,
      topics: (s.topics || []).sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0)).map((t: any) => ({
        ...t,
        lessons: (t.lessons || []).sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
      }))
    }));

    setSubjects(nestedData);
    setLoading(false);
  };

  const fetchTopics = async (subjId: string) => {
    // Eagerly load all lessons for roll-up indicators
    const { data } = await supabase
      .from('topics')
      .select('*, lessons(*)')
      .eq('subject_id', subjId)
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: true });
    
    // Sort lessons inside topics because Supabase might not preserve order in nested select
    const sortedTopics = (data || []).map(t => ({
      ...t,
      lessons: t.lessons?.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
    }));

    setTopics(sortedTopics);
    setLessons([]);
    setSelectedTopicId(null);
  };

  const fetchLessons = async (topId: string) => {
    const { data } = await supabase.from('lessons').select('*').eq('topic_id', topId).order('order_index', { ascending: true }).order('created_at', { ascending: true });
    setLessons(data || []);
  };

  const handleDeleteSubject = async (id: string) => {
    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (error) toast.error("Cannot delete subject with existing topics");
    else {
      setSubjects(subjects.filter(s => s.id !== id));
      if (selectedSubjectId === id) {
        setSelectedSubjectId(null);
        setTopics([]);
      }
      toast.success("Subject deleted");
    }
  };

  const handleDeleteTopic = async (id: string) => {
    const { error } = await supabase.from('topics').delete().eq('id', id);
    if (error) toast.error("Cannot delete course with existing topics");
    else {
      setTopics(topics.filter(t => t.id !== id));
      if (selectedTopicId === id) {
        setSelectedTopicId(null);
        setLessons([]);
      }
      toast.success("Course deleted");
    }
  };

  const handleDeleteLesson = async (id: string) => {
    const { error } = await supabase.from('lessons').delete().eq('id', id);
    if (error) toast.error("Failed to delete topic");
    else {
      setLessons(lessons.filter(l => l.id !== id));
      toast.success("Topic deleted");
    }
  };

  const handleUpdateSubject = async () => {
    if (!editingSubject || !editName.trim()) return;
    const { error } = await supabase
      .from('subjects')
      .update({ 
        name: editName.trim(),
        color: editColor 
      })
      .eq('id', editingSubject.id);

    if (error) toast.error("Failed to update subject");
    else {
      setSubjects(subjects.map(s => s.id === editingSubject.id ? { ...s, name: editName.trim(), color: editColor } : s));
      setEditingSubject(null);
      setEditName("");
      setEditColor("");
      toast.success("Subject updated");
    }
  };

  const handleRenameCourse = async () => {
    if (!editingCourse || !editName.trim()) return;
    const { error } = await supabase
      .from('topics')
      .update({ title: editName.trim() })
      .eq('id', editingCourse.id);

    if (error) toast.error("Failed to rename course");
    else {
      setTopics(topics.map(t => t.id === editingCourse.id ? { ...t, title: editName.trim() } : t));
      setEditingCourse(null);
      setEditName("");
      toast.success("Course renamed");
    }
  };

  const handleCopyCourse = (course: Topic) => {
    setClipboard({ type: 'course', id: course.id, name: course.title });
    toast.success(`Copied course: ${course.title}`);
  };

  const handleCopyTopic = (topic: Lesson) => {
    setClipboard({ type: 'topic', id: topic.id, name: topic.title });
    toast.success(`Copied topic: ${topic.title}`);
  };

  const handlePasteCourse = async () => {
    if (!clipboard || clipboard.type !== 'course' || !selectedSubjectId || isPasting) return;
    
    setIsPasting(true);
    const toastId = toast.loading("Duplicating course...");

    try {
      // 1. Fetch original course
      const { data: originalCourse, error: courseFetchError } = await supabase
        .from('topics')
        .select('*')
        .eq('id', clipboard.id)
        .single();

      if (courseFetchError) throw courseFetchError;

      // 2. Create new course
      const { data: newCourse, error: courseCreateError } = await supabase
        .from('topics')
        .insert([{ 
          title: `${originalCourse.title} (Copy)`, 
          subject_id: selectedSubjectId,
          created_by: user?.id
        }])
        .select()
        .single();

      if (courseCreateError) throw courseCreateError;

      // 3. Fetch original lessons
      const { data: originalLessons, error: lessonsFetchError } = await supabase
        .from('lessons')
        .select('*')
        .eq('topic_id', clipboard.id);

      if (lessonsFetchError) throw lessonsFetchError;

      // 4. Duplicate lessons (Topics)
      if (originalLessons && originalLessons.length > 0) {
        const newLessons = originalLessons.map(l => ({
          topic_id: newCourse.id,
          title: l.title,
          content: l.content,
          video_url: l.video_url,
          duration: l.duration,
          created_by: user?.id
        }));

        const { error: lessonsCreateError } = await supabase
          .from('lessons')
          .insert(newLessons);

        if (lessonsCreateError) throw lessonsCreateError;
      }

      await fetchTopics(selectedSubjectId);
      toast.success("Course successfully duplicated", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to duplicate course", { id: toastId });
    } finally {
      setIsPasting(false);
    }
  };

  const handlePasteTopic = async () => {
    if (!clipboard || clipboard.type !== 'topic' || !selectedTopicId || isPasting) return;

    setIsPasting(true);
    const toastId = toast.loading("Duplicating topic...");

    try {
      const { data: originalLesson, error: lessonFetchError } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', clipboard.id)
        .single();

      if (lessonFetchError) throw lessonFetchError;

      const { error: lessonCreateError } = await supabase
        .from('lessons')
        .insert([{
          topic_id: selectedTopicId,
          title: `${originalLesson.title} (Copy)`,
          content: originalLesson.content,
          video_url: originalLesson.video_url,
          duration: originalLesson.duration,
          created_by: user?.id
        }]);

      if (lessonCreateError) throw lessonCreateError;

      await fetchLessons(selectedTopicId);
      toast.success("Topic successfully duplicated", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to duplicate topic", { id: toastId });
    } finally {
      setIsPasting(false);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEndSubjects = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = subjects.findIndex((s) => s.id === active.id);
      const newIndex = subjects.findIndex((s) => s.id === over?.id);
      
      const newSubjects = arrayMove(subjects, oldIndex, newIndex);
      setSubjects(newSubjects);

      try {
        const updates = newSubjects.map((s, i) => ({ id: s.id, order_index: i }));
        const results = await Promise.all(
          updates.map(update => supabase.from('subjects').update({ order_index: update.order_index }).eq('id', update.id))
        );
        const errors = results.filter(r => r.error).map(r => r.error);
        if (errors.length > 0) throw errors[0];
      } catch (err: any) {
        toast.error(err.message || "Failed to save subject order");
        console.error(err);
        fetchInitialData();
      }
    }
  };

  const handleDragEndTopics = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = topics.findIndex((t) => t.id === active.id);
      const newIndex = topics.findIndex((t) => t.id === over?.id);
      
      const newTopics = arrayMove(topics, oldIndex, newIndex);
      setTopics(newTopics);

      try {
        const updates = newTopics.map((t, i) => ({ id: t.id, order_index: i }));
        const results = await Promise.all(
          updates.map(update => supabase.from('topics').update({ order_index: update.order_index }).eq('id', update.id))
        );
        const errors = results.filter(r => r.error).map(r => r.error);
        if (errors.length > 0) throw errors[0];
      } catch (err: any) {
        toast.error(err.message || "Failed to save course order");
        console.error(err);
        if (selectedSubjectId) fetchTopics(selectedSubjectId);
      }
    }
  };

  const handleDragEndLessons = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = lessons.findIndex((l) => l.id === active.id);
      const newIndex = lessons.findIndex((l) => l.id === over?.id);
      
      const newLessons = arrayMove(lessons, oldIndex, newIndex);
      setLessons(newLessons);

      try {
        const updates = newLessons.map((l, i) => ({ id: l.id, order_index: i }));
        const results = await Promise.all(
          updates.map(update => supabase.from('lessons').update({ order_index: update.order_index }).eq('id', update.id))
        );
        const errors = results.filter(r => r.error).map(r => r.error);
        if (errors.length > 0) throw errors[0];
      } catch (err: any) {
        toast.error(err.message || "Failed to save topic order");
        console.error(err);
        if (selectedTopicId) fetchLessons(selectedTopicId);
      }
    }
  };

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

  const handleCreateSubject = async () => {
    if (!newSubjectName.trim()) return;
    const nextOrder = subjects.length > 0 ? Math.max(...subjects.map(s => s.order_index || 0)) + 1 : 0;
    const { data, error } = await supabase.from('subjects').insert([{ name: newSubjectName, color: newSubjectColor, created_by: user?.id, order_index: nextOrder }]).select();
    if (error) toast.error("Error creating subject");
    else {
        setSubjects([...subjects, data[0]]);
        setNewSubjectName("");
        setNewSubjectColor(SUBJECT_COLORS[0].value);
        setShowSubjectModal(false);
        toast.success("Subject created");
    }
  };

  const handleCreateCourse = async () => {
    if (!newCourseTitle.trim() || !selectedSubjectId) return;
    const nextOrder = topics.length > 0 ? Math.max(...topics.map(t => t.order_index || 0)) + 1 : 0;
    const { data, error } = await supabase.from('topics').insert([{ title: newCourseTitle, subject_id: selectedSubjectId, created_by: user?.id, order_index: nextOrder }]).select();
    if (error) toast.error("Error creating course");
    else {
        setTopics([...topics, data[0]]);
        setNewCourseTitle("");
        setShowCourseModal(false);
        toast.success("Course created");
    }
  };

  if (showTopicBuilder && selectedSubjectId && selectedTopicId) {
      const subject = subjects.find(s => s.id === selectedSubjectId) || { id: selectedSubjectId };
      const topic = topics.find(t => t.id === selectedTopicId) || { id: selectedTopicId };
      
      return (
        <div className="min-h-screen relative p-6">
            <FloatingOrbs />
            <div className="relative z-10 max-w-4xl mx-auto">
                <GlassButton onClick={() => setShowTopicBuilder(false)} variant="ghost" className="mb-4">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Explorer
                </GlassButton>
                <ContentBuilder 
                    subject={subject} 
                    topic={topic} // This is actually the Course
                    initialData={editingLesson || undefined}
                    onComplete={() => {
                        setShowTopicBuilder(false);
                        setEditingLesson(null);
                        fetchInitialData(); // FULL REFRESH: This clears the green buttons in the sidebar instantly
                    }} 
                />
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingOrbs />
      
      <div className="relative z-10 p-6 max-w-6xl mx-auto space-y-6">
        <header className="relative z-50 animate-fade-up">
          <div className="glass-panel-strong !overflow-visible px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <GlassButton variant="ghost" size="sm" onClick={() => navigate("/")}>
                   <ArrowLeft className="w-4 h-4" />
                </GlassButton>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-lg">
                    <img src="/logo.jpg" alt="Teachers Content Generator" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-foreground">
                      <span className="gradient-text">Content Explorer</span>
                    </h1>
                    <p className="text-xs text-muted-foreground">Browse and manage your educational hierarchy</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <GlobalSearch />
                
                <div className="flex items-center gap-2">
                  <GlassButton variant="ghost" size="sm" onClick={() => navigate("/settings/ai")} title="AI Connection">
                    <Wand2 className="w-5 h-5" />
                  </GlassButton>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-up animation-delay-100">
          {/* Column 1: Subjects */}
          <GlassCard className="flex flex-col h-[75vh]">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-2">
                <BookMarked className="w-5 h-5 text-primary" />
                <h2 className="font-bold">Subjects</h2>
              </div>
              <GlassButton size="sm" onClick={() => setShowSubjectModal(true)}>
                <Plus className="w-4 h-4" />
              </GlassButton>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-[64px] w-full border-l-4 border-white/5" />
                  ))}
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndSubjects}>
                  <SortableContext items={subjects.map(s => s.id)} strategy={verticalListSortingStrategy}>
                    {subjects.map((s) => (
                      <SortableRow 
                        key={s.id}
                        id={s.id}
                        onClick={() => handleSelectSubject(s.id)}
                        className={cn(
                          "group glass-panel py-3 pr-3 pl-1 cursor-pointer transition-all border-l-4",
                      selectedSubjectId === s.id ? "ring-1 ring-primary-light shadow-lg" : "hover:bg-white/5"
                    )}
                    style={{ 
                      borderLeftColor: s.color || '#3B82F6',
                      backgroundColor: selectedSubjectId === s.id ? `${s.color || '#3B82F6'}25` : undefined,
                      borderColor: selectedSubjectId === s.id ? `${s.color || '#3B82F6'}50` : undefined
                    }}
                  >
                    <div className="relative flex items-center justify-between min-h-[40px] w-full">
                      <div className="flex flex-1 items-center justify-between min-w-0 pr-2">
                        <span className="font-medium text-sm truncate flex-1 block" title={s.name}>{s.name}</span>
                        {(s.topics?.some(t => t.lessons?.some(l => isLessonIncomplete(l))) || s.topics?.some(t => t.lessons?.some(l => hasEmptyFieldsInExamples(l)))) && (
                          <div className="flex items-center gap-1.5 ml-2">
                            {s.topics?.some(t => t.lessons?.some(l => isLessonIncomplete(l))) && (
                              <HelpCircle className="w-3.5 h-3.5 text-rose-500 animate-pulse fill-rose-500/10 cursor-help" title="Some courses in this subject are incomplete" />
                            )}
                            {s.topics?.some(t => t.lessons?.some(l => hasEmptyFieldsInExamples(l))) && (
                              <div className="flex items-center justify-center w-4 h-4 bg-emerald-500 border border-emerald-400 rounded-full text-white shadow-lg cursor-help transition-all hover:scale-110" title="Some topics in this subject have missing fields">
                                <span className="font-black text-[8px] leading-none">!</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-background/80 backdrop-blur-md p-1.5 rounded-lg border border-white/10 shadow-xl z-20">
                        <Popover onOpenChange={(open) => {
                          if (open) {
                            setEditName(s.name);
                            setEditColor(s.color || '#3B82F6');
                            setEditingSubject(s);
                          }
                        }}>
                          <PopoverTrigger onClick={(e) => e.stopPropagation()}>
                            <div className="p-1 hover:bg-white/10 rounded cursor-pointer transition-colors" title="Edit Subject">
                              <Edit2 className="w-3.5 h-3.5" />
                            </div>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 glass-panel-strong p-4" side="right" onClick={(e) => e.stopPropagation()}>
                            <div className="space-y-4">
                              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                                <h4 className="font-semibold text-sm">Edit Subject</h4>
                                <div 
                                  className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors"
                                  style={{ backgroundColor: `${editColor}20`, color: editColor, border: `1px solid ${editColor}40` }}
                                >
                                  Preview
                                </div>
                              </div>

                              <div 
                                className="p-3 rounded-lg border border-white/10 bg-white/5 text-center transition-all duration-300"
                                style={{ borderLeft: `4px solid ${editColor}` }}
                              >
                                <span className="font-bold text-lg" style={{ color: editColor }}>
                                  {editName || s.name}
                                </span>
                              </div>

                              <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Name</label>
                                <GlassInput 
                                  value={editName} 
                                  onChange={(e) => setEditName(e.target.value)}
                                  placeholder={s.name}
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Color</label>
                                <div className="grid grid-cols-6 gap-2">
                                  {SUBJECT_COLORS.map((color) => (
                                    <button
                                      key={color.value}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditColor(color.value);
                                      }}
                                      className={cn(
                                        "w-6 h-6 rounded-full transition-transform hover:scale-110",
                                        editColor === color.value ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110" : "opacity-70 hover:opacity-100"
                                      )}
                                      style={{ backgroundColor: color.value }}
                                      title={color.name}
                                    />
                                  ))}
                                </div>
                              </div>
                              <GlassButton className="w-full" size="sm" onClick={handleUpdateSubject}>Save Changes</GlassButton>
                            </div>
                          </PopoverContent>
                        </Popover>
                        {isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger onClick={(e) => e.stopPropagation()}>
                              <div className="p-1 hover:bg-destructive/20 text-destructive rounded transition-colors" title="Delete Subject">
                                <Trash2 className="w-3.5 h-3.5" />
                              </div>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="glass-panel-strong border-white/10">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete subject?</AlertDialogTitle>
                                <AlertDialogDescription>This will permanently delete "{s.name}" and ALL courses/topics inside it.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteSubject(s.id)} className="bg-destructive hover:bg-destructive/80">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </SortableRow>
                ))}
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </GlassCard>

          {/* Column 2: Courses */}
          <GlassCard className="flex flex-col h-[75vh]">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-accent" />
                <h2 className="font-bold">Courses</h2>
              </div>
              <div className="flex gap-1">
                <GlassButton size="sm" onClick={handlePasteCourse} disabled={!clipboard || clipboard.type !== 'course' || !selectedSubjectId || isPasting} title="Paste Course">
                  <ClipboardCheck className="w-4 h-4" />
                </GlassButton>
                <GlassButton size="sm" onClick={() => setShowCourseModal(true)} disabled={!selectedSubjectId}>
                  <Plus className="w-4 h-4" />
                </GlassButton>
              </div>
            </div>
            
            {!selectedSubjectId ? (
              <div className="flex-1 flex items-center justify-center p-8 text-center text-muted-foreground group">
                <div className="flex flex-col items-center gap-3 opacity-40 group-hover:opacity-60 transition-opacity">
                  <Layers className="w-12 h-12 stroke-[1px]" />
                  <p className="text-sm italic">Select a subject to view courses</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-[64px] w-full" />
                    ))}
                  </div>
                ) : topics.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-40">
                    <Plus className="w-8 h-8 mb-2" />
                    <p className="text-xs italic">No courses yet</p>
                  </div>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndTopics}>
                    <SortableContext items={topics.map(t => t.id)} strategy={verticalListSortingStrategy}>
                      {topics.map((t) => (
                        <SortableRow 
                          key={t.id}
                          id={t.id}
                          onClick={() => handleSelectTopic(t.id)}
                          className={cn(
                            "group glass-panel py-3 pr-3 pl-1 cursor-pointer transition-all",
                        selectedTopicId === t.id ? "ring-1 ring-primary-light shadow-lg" : "hover:bg-white/5"
                      )}
                      style={{
                        backgroundColor: selectedTopicId === t.id ? `${activeSubjectColor}25` : undefined,
                        borderColor: selectedTopicId === t.id ? `${activeSubjectColor}50` : undefined,
                        borderLeft: `3px solid ${activeSubjectColor}`
                      }}
                    >
                        <div className="relative flex items-center justify-between min-h-[40px] w-full">
                          <div className="flex flex-1 items-center justify-between min-w-0 pr-2">
                             <span className="font-medium text-sm truncate block flex-1" title={t.title}>{t.title}</span>
                             {(t.lessons?.some(l => isLessonIncomplete(l)) || t.lessons?.some(l => hasEmptyFieldsInExamples(l))) && (
                               <div className="flex items-center gap-1.5 ml-2">
                                 {t.lessons?.some(l => isLessonIncomplete(l)) && (
                                   <HelpCircle className="w-4 h-4 text-rose-500 animate-pulse fill-rose-500/10 cursor-help" title="Course has incomplete topics" />
                                 )}
                                 {t.lessons?.some(l => hasEmptyFieldsInExamples(l)) && (
                                   <div className="flex items-center justify-center w-5 h-5 bg-emerald-500 border border-emerald-400 rounded-full text-white shadow-lg cursor-help transition-all hover:scale-110" title="Course has topics with missing fields">
                                     <span className="font-black text-[10px] leading-none">!</span>
                                   </div>
                                 )}
                               </div>
                             )}
                          </div>
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-background/80 backdrop-blur-md p-1.5 rounded-lg border border-white/10 shadow-xl z-20">
                          <button onClick={(e) => { e.stopPropagation(); handleCopyCourse(t); }} className="p-1 hover:bg-white/10 rounded transition-colors" title="Copy Course">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <Popover>
                            <PopoverTrigger onClick={(e) => e.stopPropagation()}>
                              <div className="p-1 hover:bg-white/10 rounded cursor-pointer transition-colors" title="Rename Course">
                                <Edit2 className="w-3.5 h-3.5" />
                              </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 glass-panel-strong p-4" side="right" onClick={(e) => e.stopPropagation()}>
                              <div className="space-y-3">
                                <h4 className="font-semibold text-sm">Rename Course</h4>
                                <div className="flex gap-2">
                                  <GlassInput 
                                    value={editName} 
                                    onChange={(e) => setEditName(e.target.value)}
                                    placeholder={t.title}
                                  />
                                  <GlassButton size="sm" onClick={() => { setEditingCourse(t); handleRenameCourse(); }}>Save</GlassButton>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                          {isAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger onClick={(e) => e.stopPropagation()}>
                                <div className="p-1 hover:bg-destructive/20 text-destructive rounded transition-colors" title="Delete Course">
                                <Trash2 className="w-3.5 h-3.5" />
                                </div>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="glass-panel-strong border-white/10">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete course?</AlertDialogTitle>
                                  <AlertDialogDescription>This will permanently delete "{t.title}" and ALL topics inside it.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteTopic(t.id)} className="bg-destructive hover:bg-destructive/80">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    </SortableRow>
                  ))}
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            )}
          </GlassCard>

          {/* Column 3: Topics (Lessons) */}
          <GlassCard className="flex flex-col h-[75vh]">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-secondary" />
                <h2 className="font-bold">Topics</h2>
              </div>
              <div className="flex gap-1">
                <GlassButton size="sm" onClick={handlePasteTopic} disabled={!clipboard || clipboard.type !== 'topic' || !selectedTopicId || isPasting} title="Paste Topic">
                  <ClipboardCheck className="w-4 h-4" />
                </GlassButton>
                <GlassButton size="sm" onClick={() => setShowTopicBuilder(true)} disabled={!selectedTopicId}>
                  <Plus className="w-4 h-4" />
                </GlassButton>
              </div>
            </div>
            
            {!selectedTopicId ? (
              <div className="flex-1 flex items-center justify-center p-8 text-center text-muted-foreground group">
                <div className="flex flex-col items-center gap-3 opacity-40 group-hover:opacity-60 transition-opacity">
                  <BookOpen className="w-12 h-12 stroke-[1px]" />
                  <p className="text-sm italic">Select a course to view topics</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-[50px] w-full" />
                    ))}
                  </div>
                ) : lessons.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-40">
                    <Plus className="w-8 h-8 mb-2" />
                    <p className="text-xs italic">No topics yet</p>
                  </div>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndLessons}>
                    <SortableContext items={lessons.map(l => l.id)} strategy={verticalListSortingStrategy}>
                      {lessons.map((l) => (
                        <SortableRow 
                          key={l.id}
                          id={l.id}
                          onClick={() => handleSelectLesson(l.id)}
                          className={cn(
                              "group glass-panel py-3 pr-3 pl-1 hover:bg-foreground/5 transition-all relative flex flex-col justify-center min-h-[50px] cursor-pointer",
                        selectedLessonId === l.id && "ring-1 ring-primary-light shadow-lg"
                    )}
                    style={{
                        backgroundColor: selectedLessonId === l.id ? `${activeSubjectColor}25` : undefined,
                        borderColor: selectedLessonId === l.id ? `${activeSubjectColor}50` : undefined,
                        borderLeft: `3px solid ${activeSubjectColor}`
                    }}
                  >
                    <div className="flex-1 min-w-0 pr-2">
                       <div className="flex items-center gap-2">
                         <span className="font-medium text-sm truncate block" title={l.title}>{l.title}</span>
                         {(isLessonIncomplete(l) || hasEmptyFieldsInExamples(l)) && (
                           <div className="flex items-center gap-1.5 ml-auto translate-x-1">
                             {isLessonIncomplete(l) && (
                               <HelpCircle className="w-5 h-5 text-rose-500 animate-pulse fill-rose-500/10 cursor-help" title="Low Quality: Requires 3+ examples and 7+ quiz questions" />
                             )}
                             {hasEmptyFieldsInExamples(l) && (
                               <div className="flex items-center justify-center w-6 h-6 bg-emerald-500 border border-emerald-400 rounded-full text-white shadow-lg cursor-help transition-all hover:scale-110" title="Missing field alert: One or more example fields are empty">
                                 <span className="font-black text-sm leading-none">!</span>
                               </div>
                             )}
                           </div>
                         )}
                       </div>
                       {l.duration && (
                        <span className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> {l.duration} min content
                        </span>
                      )}
                    </div>
                    
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-background/80 backdrop-blur-md p-1.5 rounded-lg border border-white/10 shadow-xl z-20">
                        <button onClick={(e) => { e.stopPropagation(); handleCopyTopic(l); }} className="p-1 hover:bg-white/10 rounded transition-colors" title="Copy Topic">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => { setEditingLesson(l); setShowTopicBuilder(true); }}
                          className="p-1 hover:bg-white/10 rounded transition-colors"
                          title="Edit Topic"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger onClick={(e) => e.stopPropagation()}>
                              <div className="p-1 hover:bg-destructive/20 text-destructive rounded transition-colors" title="Delete Topic">
                                <Trash2 className="w-3.5 h-3.5" />
                              </div>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="glass-panel-strong border-white/10">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete topic?</AlertDialogTitle>
                                <AlertDialogDescription>Are you sure you want to delete "{l.title}"? This cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteLesson(l.id)} className="bg-destructive hover:bg-destructive/80">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                    </div>
                  </SortableRow>
                  ))}
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Modals */}
        <Dialog open={showSubjectModal} onOpenChange={setShowSubjectModal}>
          <DialogContent className="glass-panel-strong border-white/10">
            <DialogHeader>
              <DialogTitle>Add New Subject</DialogTitle>
              <DialogDescription>Create a top-level education category.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Subject Name</label>
                <GlassInput 
                  placeholder="e.g., Mathematics" 
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  autoFocus
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Pick a Color</label>
                <div className="grid grid-cols-6 gap-2">
                  {SUBJECT_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setNewSubjectColor(color.value)}
                      className={cn(
                        "w-8 h-8 rounded-full transition-all",
                        newSubjectColor === color.value ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110 shadow-lg" : "opacity-60 hover:opacity-100 hover:scale-105"
                      )}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <GlassButton variant="ghost" onClick={() => setShowSubjectModal(false)}>Cancel</GlassButton>
              <GlassButton onClick={handleCreateSubject}>Create Subject</GlassButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showCourseModal} onOpenChange={setShowCourseModal}>
          <DialogContent className="glass-panel-strong border-white/10">
            <DialogHeader>
              <DialogTitle>Add New Course</DialogTitle>
              <DialogDescription>Add a course to {subjects.find(s => s.id === selectedSubjectId)?.name}.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <GlassInput 
                placeholder="Course Title (e.g., Algebra I)" 
                value={newCourseTitle}
                onChange={(e) => setNewCourseTitle(e.target.value)}
                autoFocus
              />
            </div>
            <DialogFooter>
              <GlassButton variant="ghost" onClick={() => setShowCourseModal(false)}>Cancel</GlassButton>
              <GlassButton onClick={handleCreateCourse}>Create Course</GlassButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ContentManagement;
