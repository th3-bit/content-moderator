/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, XCircle, Loader2, BookMarked, Layers, BookOpen } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Subject {
  id: string;
  name: string;
  color?: string;
}

interface Topic {
  id: string;
  title: string;
  subject_id: string;
  subject?: Subject;
}

interface Lesson {
  id: string;
  title: string;
  topic_id: string;
  topic?: Topic;
}

export const GlobalSearch = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{
    subjects: Subject[];
    courses: Topic[];
    lessons: Lesson[];
  } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setShowSearchResults(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (debouncedSearchQuery.length > 2) {
      handleGlobalSearch(debouncedSearchQuery);
    } else {
      setSearchResults(null);
      setShowSearchResults(false);
    }
  }, [debouncedSearchQuery]);

  const handleGlobalSearch = async (query: string) => {
    setIsSearching(true);
    setShowSearchResults(true);
    try {
      // Search Subjects
      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('*')
        .ilike('name', `%${query}%`)
        .limit(5);

      // Search Courses (topics table)
      const { data: coursesData } = await supabase
        .from('topics')
        .select('*, subject:subjects(*)')
        .ilike('title', `%${query}%`)
        .limit(5);

      // Search Topics (lessons table)
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('*, topic:topics(*, subject:subjects(*))')
        .ilike('title', `%${query}%`)
        .limit(5);

      setSearchResults({
        subjects: subjectsData || [],
        courses: (coursesData as any) || [],
        lessons: (lessonsData as any) || []
      });
    } catch (error) {
      console.error("Global search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const jumpToContent = (type: 'subject' | 'course' | 'lesson', item: any) => {
    setShowSearchResults(false);
    setSearchQuery("");
    
    let url = "/content";
    if (type === 'subject') {
      url += `?subjectId=${item.id}`;
    } else if (type === 'course') {
      url += `?subjectId=${item.subject_id}&courseId=${item.id}`;
    } else if (type === 'lesson') {
      url += `?subjectId=${item.topic.subject_id}&courseId=${item.topic_id}&lessonId=${item.id}`;
    }
    
    navigate(url);
  };

  return (
    <div ref={searchRef} className="relative w-64 group/search">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input
        ref={searchInputRef}
        type="text"
        placeholder="Global Search..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onFocus={() => searchQuery.length > 2 && setShowSearchResults(true)}
        className="glass-input pl-10 pr-12 w-full text-sm py-1.5 focus:ring-primary/30 h-9"
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
        {!searchQuery && (
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        )}
        {searchQuery && (
          <button 
            onClick={() => { setSearchQuery(""); setShowSearchResults(false); }}
            className="p-0.5 hover:bg-white/10 rounded-full transition-colors"
            title="Clear search"
          >
            <XCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      {showSearchResults && (
        <div className="absolute top-[calc(100%+8px)] right-0 w-[400px] glass-panel-strong shadow-2xl z-[9999] p-1 animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-[70vh] overflow-y-auto custom-scrollbar p-2">
            {isSearching ? (
              <div className="py-8 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-sm font-medium">Searching across all content...</p>
              </div>
            ) : (!searchResults?.subjects.length && !searchResults?.courses.length && !searchResults?.lessons.length) ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No results found for "{searchQuery}"</p>
                </div>
            ) : (
              <div className="space-y-4">
                {searchResults.subjects.length > 0 && (
                  <div>
                    <h4 className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground px-2 mb-1 flex items-center gap-1.5">
                      <BookMarked className="w-3 h-3" /> Subjects
                    </h4>
                    <div className="space-y-0.5">
                      {searchResults.subjects.map(s => (
                        <button
                          key={s.id}
                          onClick={() => jumpToContent('subject', s)}
                          className="w-full text-left p-2 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-3 group"
                        >
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ 
                              "--subject-color": s.color || '#3B82F6',
                              backgroundColor: "var(--subject-color)" 
                            } as React.CSSProperties} 
                          />
                          <span className="text-sm font-medium group-hover:text-primary transition-colors">{s.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {searchResults.courses.length > 0 && (
                  <div>
                    <h4 className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground px-2 mb-1 flex items-center gap-1.5">
                      <Layers className="w-3 h-3" /> Courses
                    </h4>
                    <div className="space-y-0.5">
                      {searchResults.courses.map(c => (
                        <button
                          key={c.id}
                          onClick={() => jumpToContent('course', c)}
                          className="w-full text-left p-2 hover:bg-white/10 rounded-lg transition-colors group"
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-medium group-hover:text-accent transition-colors">{c.title}</span>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">in {c.subject?.name || 'Unknown'}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {searchResults.lessons.length > 0 && (
                  <div>
                    <h4 className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground px-2 mb-1 flex items-center gap-1.5">
                      <BookOpen className="w-3 h-3" /> Topics
                    </h4>
                    <div className="space-y-0.5">
                      {searchResults.lessons.map(l => (
                        <button
                          key={l.id}
                          onClick={() => jumpToContent('lesson', l)}
                          className="w-full text-left p-2 hover:bg-white/10 rounded-lg transition-colors group"
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-medium group-hover:text-secondary transition-colors">{l.title}</span>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                              in {l.topic?.title} ({l.topic?.subject?.name})
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="p-2 border-t border-white/5 bg-white/5 rounded-b-xl flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Click to navigate</span>
            <span>{isSearching ? 'Searching...' : 'Search complete'}</span>
          </div>
        </div>
      )}
    </div>
  );
};
