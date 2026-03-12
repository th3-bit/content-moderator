/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { SubjectTopicForm } from "@/components/SubjectTopicForm";
import { ContentBuilder } from "@/components/ContentBuilder";
import { FloatingOrbs } from "@/components/FloatingOrbs";
import { DashboardStats } from "@/components/DashboardStats";
import { RecentContent } from "@/components/RecentContent";

interface SelectionData {
  id: string;
  name?: string;
  title?: string;
}

const Index = () => {
  const navigate = useNavigate();
  const [subject, setSubject] = useState<SelectionData | null>(null);
  const [topic, setTopic] = useState<SelectionData | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingLesson, setEditingLesson] = useState<any>(null);

  const handleStart = (newSubject: SelectionData, newTopic: SelectionData) => {
    setSubject(newSubject);
    setTopic(newTopic);
    setIsStarted(true);
    setEditingLesson(null); // Reset editing loop
  };

  const handleEdit = (lesson: any) => {
    // When editing, we need to set subject and topic from the lesson data
    if (lesson.topic && lesson.topic.subject) {
      setSubject({ id: lesson.topic.subject.id, name: lesson.topic.subject.name });
      setTopic({ id: lesson.topic.id, title: lesson.topic.title });
      setEditingLesson(lesson);
      setIsStarted(true);
    }
  };

  const handleBack = () => {
    setIsStarted(false);
    setSubject(null);
    setTopic(null);
    setEditingLesson(null);
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen mesh-background relative overflow-hidden">
      <FloatingOrbs />
      
      <div className="relative z-10">
        <div className="container max-w-6xl mx-auto px-4 py-6 space-y-8">
          <Header
            subject={isStarted ? subject?.name : undefined}
            topic={isStarted ? topic?.title : undefined}
            previewTitle={editingLesson ? `Editing: ${editingLesson.title}` : undefined}
            onBack={isStarted ? handleBack : undefined}
          />

          <main className="py-8">
            {!isStarted ? (
              <div className="flex flex-col items-center">
                {/* ... (existing intro) ... */}
                <div className="text-center mb-12 animate-fade-up">
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4">
                    <span className="gradient-text">Build Beautiful</span>
                    <br />
                    <span className="text-foreground">Learning Content</span>
                  </h1>
                  <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                    Create engaging lessons, examples, and questions with our
                    intuitive content builder. Perfect for educators and learners.
                  </p>
                </div>
                
                <DashboardStats />
                
                <SubjectTopicForm onSubmit={handleStart} />

                <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-4">
                   <button 
                     onClick={() => navigate('/content')}
                     className="text-primary hover:underline text-sm font-medium flex items-center gap-2"
                   >
                     View & Manage All Courses <ChevronRight className="w-4 h-4" />
                   </button>
                   
                   <button 
                     onClick={() => navigate('/crm')}
                     className="bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2"
                   >
                     View More Detailed CRM & Analytics <ChevronRight className="w-3.5 h-3.5" />
                   </button>
                </div>

                <RecentContent onEdit={handleEdit} searchQuery={searchQuery} />
              </div>
            ) : (
              <ContentBuilder 
                subject={subject!} 
                topic={topic!} 
                searchQuery={searchQuery} 
                initialData={editingLesson}
                onComplete={handleBack}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Index;

