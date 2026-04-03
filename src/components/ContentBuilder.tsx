/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, forwardRef, useImperativeHandle } from "react";
import { GlassCard } from "./ui/GlassCard";
import { GlassInput } from "./ui/GlassInput";
import { GlassTextarea } from "./ui/GlassTextarea";
import { GlassButton } from "./ui/GlassButton";
import { BookOpen, Lightbulb, HelpCircle, Plus, Sparkles, Check, ArrowRight, Save, Video, Loader2, Wand2, Clock, MessageSquare, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { generateLessonContent, getOpenAIConfig } from "@/lib/openai";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

interface QuestionData {
  question: string;
  answers: string[];
  correctAnswerIndex: number;
}

interface ExampleData {
  title: string;
  problem: string;
  solution: string;
  takeaway_what?: string;
  takeaway_why?: string;
  keyTakeaway?: string; // Legacy support
}

interface ContentEntry {
  id: string;
  type: "intro" | "content" | "video" | "example" | "quiz";
  title?: string;
  content?: string;
  videoUrl?: string;
  questionData?: QuestionData;
  exampleData?: ExampleData;
}

interface ContentBuilderProps {
  subject: { id: string; name?: string };
  topic: { id: string; title?: string };
  searchQuery?: string;
  initialData?: any;
  onComplete?: () => void;
}

export const ContentBuilder = forwardRef(({ subject, topic, searchQuery = "", initialData, onComplete }: ContentBuilderProps, ref) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Expose save method to parent
  useImperativeHandle(ref, () => ({
    save: handleSaveLesson
  }));
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiDirectSave, setAiDirectSave] = useState(false);
  
  // Wizard flow state
  const [wizardStep, setWizardStep] = useState<"info" | "video" | "examples" | "questions" | "duration" | "complete">("info");

  // Validation Error Modal
  const [validationError, setValidationError] = useState<string | null>(null);

  // Step 1: Info
  const [title, setTitle] = useState(initialData?.title || "");
  const parsedContent = initialData?.content ? (typeof initialData.content === 'string' ? JSON.parse(initialData.content) : initialData.content) : [];
  
  const initIntro = parsedContent.find((s: any) => s.type === 'intro');
  const initCore = parsedContent.find((s: any) => s.type === 'content' && s.title === 'Explanation');
  const initVideo = parsedContent.find((s: any) => s.type === 'video');
  const initExamples = parsedContent.filter((s: any) => s.type === 'content' && s.title !== 'Explanation' && !s.title.startsWith('Coming Soon')); 
  const initQuestions = parsedContent.filter((s: any) => s.type === 'quiz');

  const [intro, setIntro] = useState(initIntro?.content || "");
  const [coreContent, setCoreContent] = useState(initCore?.content || "");

  // Step 2: Video
  const [videoLink, setVideoLink] = useState(initialData?.video_url || initVideo?.videoUrl || "");

  // Step 3: Examples
  const [examples, setExamples] = useState<ContentEntry[]>(() => {
    if (!initExamples) return [];
    
    return initExamples.map((ex: any, idx: number) => {
      if (ex.exampleData) return { ...ex, id: `ex-${idx}` };

      const content = ex.content || "";
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

      return {
        id: `ex-${idx}`,
        type: "example",
        title: ex.title,
        exampleData: {
          title: ex.title,
          problem: cleanLabel(probText),
          solution: cleanLabel(solText),
          keyTakeaway: cleanLabel(takeText)
        }
      };
    });
  });

  const [exTitle, setExTitle] = useState("");
  const [exProblem, setExProblem] = useState("");
  const [exSolution, setExSolution] = useState("");
  const [exTakeaway, setExTakeaway] = useState("");

  // Step 4: Questions
  const [questions, setQuestions] = useState<ContentEntry[]>(() => {
    if (!initQuestions) return [];
    return initQuestions.map((q: any, idx: number) => ({
      id: `q-${idx}`,
      type: "quiz",
      questionData: {
        question: q.question,
        answers: q.options || [],
        correctAnswerIndex: q.correctAnswer
      }
    }));
  });
  
  const [qText, setQText] = useState("");
  const [qAnswers, setQAnswers] = useState(["", "", "", ""]);
  const [qCorrectIndex, setQCorrectIndex] = useState<number | null>(null);

  // Step 5: Duration
  const [duration, setDuration] = useState<number>(initialData?.duration || 10);

  const handleAiGenerate = async () => {
    const config = getOpenAIConfig();
    if (!config || !config.apiKey) {
      toast.error("AI not configured. Please set your API key in AI Settings.");
      return;
    }

    setAiGenerating(true);
    try {
      const data = await generateLessonContent(topic.title || "Course", config, aiPrompt);
      if (data.title) setTitle(data.title);
      if (data.intro) setIntro(data.intro);
      if (data.coreContent) setCoreContent(data.coreContent);
      
      let mappedExamples: ContentEntry[] = [];
      if (data.examples && Array.isArray(data.examples)) {
        mappedExamples = data.examples.map((ex: any, idx: number) => ({
          id: `ai-ex-${Date.now()}-${idx}`,
          type: "example",
          title: ex.title,
          content: ex.problem,
          exampleData: {
            title: ex.title,
            problem: ex.problem,
            solution: ex.solution,
            keyTakeaway: ex.takeaway_what || ex.keyTakeaway
          }
        }));
        setExamples(mappedExamples);
      }

      let mappedQuestions: ContentEntry[] = [];
      if (data.questions && Array.isArray(data.questions)) {
        mappedQuestions = data.questions.map((q: any, idx: number) => ({
          id: `ai-q-${Date.now()}-${idx}`,
          type: "quiz",
          title: "Quick Quiz",
          content: "Test your knowledge",
          questionData: q
        }));
        setQuestions(mappedQuestions);
      }

      toast.success("AI Content Generated Successfully!");

      if (aiDirectSave) {
        toast.info("Saving content to database...");
        await performSaveLesson({
          title: data.title || title,
          intro: data.intro || intro,
          coreContent: data.coreContent || coreContent,
          examples: mappedExamples,
          questions: mappedQuestions,
          videoUrl: videoLink,
          duration: duration
        });
      }
    } catch (error: any) {
      toast.error(`AI Error: ${error.message}`);
    } finally {
      setAiGenerating(false);
    }
  };

  const hasBasicInfo = title.trim().length > 0 && intro.trim().length > 0 && coreContent.trim().length > 0;
  const hasVideo = videoLink.trim().length > 0;
  const isContentValid = examples.length >= 3 && questions.length >= 7 && hasBasicInfo && hasVideo;

  const performSaveLesson = async (dataOverride?: any) => {
    const sExamples = dataOverride?.examples || examples;
    const sQuestions = dataOverride?.questions || questions;
    const sTitle = dataOverride?.title || title;
    const sIntro = dataOverride?.intro || intro;
    const sCore = dataOverride?.coreContent || coreContent;
    const sVideo = dataOverride?.videoUrl !== undefined ? dataOverride.videoUrl : videoLink;

    // Soft Quality Check: Warn but DON'T block the save
    if (sExamples.length < 3 || sQuestions.length < 7 || !sTitle.trim() || !sIntro.trim() || !sCore.trim() || !sVideo.trim()) {
      toast.warning("Topic saved, but it still has quality issues (needs 3+ examples, 7+ questions, and a video)!");
      setValidationError("Quality Note: Topic is incomplete (needs 3+ examples, 7+ questions, and a video).");
    } else {
      setValidationError(null);
    }
    const sDuration = dataOverride?.duration || duration;

    const slides = [];
    slides.push({
      type: "intro",
      title: sTitle,
      content: sIntro || "Tap next to start this lesson!"
    });

    slides.push({
      type: "content",
      title: "Explanation",
      content: sCore
    });

    if (sVideo.trim()) {
      slides.push({
        type: "video",
        title: "Video Tutorial",
        videoUrl: sVideo,
        content: "Watch this walkthrough for a deeper understanding."
      });
    }

    sExamples.forEach((ex: any) => {
      const sol = ex.exampleData?.solution || "";
      const take = ex.exampleData?.keyTakeaway || "";
      const consolidated = `${ex.exampleData?.problem}\n\n${sol}\n\n${take}`;

      slides.push({
        type: "content", 
        isExample: true,
        title: ex.title,
        content: consolidated.trim(),
        exampleData: ex.exampleData 
      });
    });

    sQuestions.forEach((q: any) => {
      slides.push({
        type: "quiz",
        question: q.questionData?.question,
        options: q.questionData?.answers,
        correctAnswer: q.questionData?.correctAnswerIndex
      });
    });

    const lessonData = {
      topic_id: topic.id,
      title: sTitle,
      content: JSON.stringify(slides),
      video_url: sVideo,
      duration: sDuration,
      created_by: user?.id
    };

    let error;
    if (initialData?.id) {
       const result = await supabase.from('lessons').update(lessonData).eq('id', initialData.id);
       error = result.error;
    } else {
       const result = await supabase.from('lessons').insert([lessonData]);
       error = result.error;
    }

    if (error) throw error;
    setWizardStep("complete");
    return true;
  };

  const handleSaveLesson = async () => {
    setLoading(true);
    try {
      await performSaveLesson();
      toast.success(initialData?.id ? "Topic updated successfully!" : "Topic saved successfully!");
    } catch (error: any) {
      toast.error(`Error saving: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const [editingExampleId, setEditingExampleId] = useState<string | null>(null);

  const handleNextStep = () => {
    if (wizardStep === "info") {
      setWizardStep("video");
    } else if (wizardStep === "video") {
      setWizardStep("examples");
    } else if (wizardStep === "examples") {
      setWizardStep("questions");
    } else if (wizardStep === "questions") {
      setWizardStep("duration");
    }
  };

  const handleAddExample = () => {
    const emptyFields = [];
    if (!exTitle.trim()) emptyFields.push("Example Title");
    if (!exProblem.trim()) emptyFields.push("Problem");
    if (!exSolution.trim()) emptyFields.push("Solution");
    if (!exTakeaway.trim()) emptyFields.push("Key Takeaway");

    if (emptyFields.length > 0) {
      setValidationError(`Please fill in the following field(s): ${emptyFields.join(", ")}`);
      return;
    }

    const consolidatedContent = `${exProblem}\n\n${exSolution}\n\n${exTakeaway}`;

    if (editingExampleId) {
      setExamples(examples.map(ex => {
        if (ex.id === editingExampleId) {
          return {
            ...ex,
            title: exTitle,
            content: consolidatedContent,
            exampleData: {
              title: exTitle,
              problem: exProblem,
              solution: exSolution,
              keyTakeaway: exTakeaway
            }
          };
        }
        return ex;
      }));
      setEditingExampleId(null);
      toast.success("Example updated!");
    } else {
      const newExample: ContentEntry = {
        id: Date.now().toString(),
        type: "example",
        title: exTitle,
        content: consolidatedContent,
        exampleData: {
          title: exTitle,
          problem: exProblem,
          solution: exSolution,
          keyTakeaway: exTakeaway
        }
      };
      setExamples([...examples, newExample]);
      toast.success("Example added!");
    }
    
    setExTitle("");
    setExProblem("");
    setExSolution("");
    setExTakeaway("");
  };

  const handleEditExample = (ex: ContentEntry) => {
    setEditingExampleId(ex.id);
    setExTitle(ex.exampleData?.title || ex.title || "");
    
    if (!ex.exampleData) {
      const content = ex.content || "";
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

      setExProblem(cleanLabel(probText));
      setExSolution(cleanLabel(solText));
      setExTakeaway(cleanLabel(takeText));
    } else {
      setExProblem(ex.exampleData.problem || "");
      setExSolution(ex.exampleData.solution || "");
      setExTakeaway(ex.exampleData.keyTakeaway || "");
    }
  };

  const handleDeleteExample = (id: string) => {
    setExamples(examples.filter(ex => ex.id !== id));
    if (editingExampleId === id) {
      handleCancelEdit();
    }
    toast.success("Example deleted");
  };

  const handleCancelEdit = () => {
    setEditingExampleId(null);
    setExTitle("");
    setExProblem("");
    setExSolution("");
    setExTakeaway("");
  };

  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  const handleAddQuestion = () => {
    if (!qText.trim()) { setValidationError("Please enter the question text."); return; }
    if (qAnswers.some(a => !a.trim())) { setValidationError("Please fill in all 4 answer options."); return; }
    if (qCorrectIndex === null) { setValidationError("Please select the correct answer."); return; }

    if (editingQuestionId) {
      setQuestions(questions.map(q => {
        if (q.id === editingQuestionId) {
          return {
            ...q,
            questionData: {
              question: qText,
              answers: qAnswers,
              correctAnswerIndex: qCorrectIndex
            }
          };
        }
        return q;
      }));
      setEditingQuestionId(null);
      toast.success("Question updated!");
    } else {
      const newQuestion: ContentEntry = {
        id: Date.now().toString(),
        type: "quiz",
        title: "Quick Quiz",
        content: "Test your knowledge",
        questionData: {
          question: qText,
          answers: qAnswers,
          correctAnswerIndex: qCorrectIndex
        }
      };
      setQuestions([...questions, newQuestion]);
      toast.success("Question added!");
    }

    setQText("");
    setQAnswers(["", "", "", ""]);
    setQCorrectIndex(null);
  };

  const handleEditQuestion = (q: ContentEntry) => {
    if (!q.questionData) return;
    setEditingQuestionId(q.id);
    setQText(q.questionData.question);
    setQAnswers([...q.questionData.answers]);
    setQCorrectIndex(q.questionData.correctAnswerIndex);
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
    if (editingQuestionId === id) {
      handleCancelQuestionEdit();
    }
    toast.success("Question deleted");
  };

  const handleCancelQuestionEdit = () => {
    setEditingQuestionId(null);
    setQText("");
    setQAnswers(["", "", "", ""]);
    setQCorrectIndex(null);
  };

  const handleStartNew = () => {
    if (onComplete) {
       onComplete();
       return;
    }
    setTitle("");
    setIntro("");
    setCoreContent("");
    setVideoLink("");
    setExamples([]);
    setQuestions([]);
    setDuration(10);
    setWizardStep("info");
  };

  return (
    <div className="space-y-8 animate-fade-up-delay-2">
      <div className="glass-panel p-6 rounded-2xl border-primary/20 bg-primary/5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium text-primary flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> What specifically do you want to generate?
            </label>
            <textarea
              className="w-full bg-background/50 backdrop-blur-md border border-primary/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px] transition-all"
              placeholder="e.g. Focus on practical double-entry examples..."
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
            />
          </div>
          <div className="flex flex-col justify-end gap-3 sm:min-w-[200px]">
            <div className="flex items-center gap-3 px-2">
              <input 
                type="checkbox" 
                id="direct-save" 
                checked={aiDirectSave}
                onChange={(e) => setAiDirectSave(e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              <label htmlFor="direct-save" className="text-xs font-semibold cursor-pointer text-muted-foreground">
                Save Directly to Database
              </label>
            </div>
            <GlassButton 
              variant="accent" 
              onClick={handleAiGenerate} 
              disabled={aiGenerating}
              className="group relative overflow-hidden w-full h-12"
            >
              {aiGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
              )}
              {aiGenerating ? 'Generating...' : 'Generate & Save'}
            </GlassButton>
          </div>
        </div>
      </div>

      {wizardStep !== "complete" && (
        <div className="glass-panel p-4 rounded-xl flex items-center justify-between text-sm overflow-x-auto">
           <button onClick={() => setWizardStep('info')} className={`px-3 py-1 rounded-lg whitespace-nowrap transition-all ${wizardStep === 'info' ? 'bg-primary/20 text-primary font-medium' : 'text-muted-foreground'}`}>1. Course</button>
           <ArrowRight className="w-4 h-4 text-muted-foreground/50" />
           <button onClick={() => setWizardStep('video')} className={`px-3 py-1 rounded-lg whitespace-nowrap transition-all ${wizardStep === 'video' ? 'bg-primary/20 text-primary font-medium' : 'text-muted-foreground'}`}>2. Video</button>
           <ArrowRight className="w-4 h-4 text-muted-foreground/50" />
           <button onClick={() => setWizardStep('examples')} className={`px-3 py-1 rounded-lg whitespace-nowrap transition-all ${wizardStep === 'examples' ? 'bg-primary/20 text-primary font-medium' : 'text-muted-foreground'}`}>3. Examples</button>
           <ArrowRight className="w-4 h-4 text-muted-foreground/50" />
           <button onClick={() => setWizardStep('questions')} className={`px-3 py-1 rounded-lg whitespace-nowrap transition-all ${wizardStep === 'questions' ? 'bg-primary/20 text-primary font-medium' : 'text-muted-foreground'}`}>4. Quiz</button>
           <ArrowRight className="w-4 h-4 text-muted-foreground/50" />
           <button onClick={() => setWizardStep('duration')} className={`px-3 py-1 rounded-lg whitespace-nowrap transition-all ${wizardStep === 'duration' ? 'bg-primary/20 text-primary font-medium' : 'text-muted-foreground'}`}>5. Meta</button>
        </div>
      )}

      <GlassCard className={`mx-auto ${wizardStep === 'examples' ? 'max-w-6xl' : 'max-w-3xl'}`} hover={false}>
        <div className="space-y-6">
          {wizardStep === "info" && (
            <>
              <h3 className="text-lg font-semibold flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary"/> Step 1: Topic Overview</h3>
              <GlassInput label="Topic Title" placeholder="e.g. Introduction to Algebra" value={title} onChange={e => setTitle(e.target.value)} />
              <GlassTextarea label="What you will learn" placeholder="Briefly explain the goal..." value={intro} onChange={e => setIntro(e.target.value)} />
              <GlassTextarea label="Core Content" placeholder="Detailed explanation..." className="min-h-[150px]" value={coreContent} onChange={e => setCoreContent(e.target.value)} />
              <GlassButton variant="primary" onClick={handleNextStep} className="w-full">Next Step <ArrowRight className="w-4 h-4 ml-2"/></GlassButton>
            </>
          )}

          {wizardStep === "video" && (
            <>
              <h3 className="text-lg font-semibold flex items-center gap-2"><Video className="w-5 h-5 text-primary"/> Step 2: Media</h3>
              <GlassInput label="YouTube Video Link" placeholder="https://youtube.com/..." value={videoLink} onChange={e => setVideoLink(e.target.value)} />
              <div className="flex gap-3">
                 <GlassButton variant="ghost" onClick={() => setWizardStep("info")} className="flex-1">Back</GlassButton>
                 <GlassButton variant="primary" onClick={handleNextStep} className="flex-1">Next Step <ArrowRight className="w-4 h-4 ml-2"/></GlassButton>
              </div>
            </>
          )}

          {wizardStep === "examples" && (
            <>
              <h3 className="text-lg font-semibold flex items-center gap-2"><Lightbulb className="w-5 h-5 text-primary"/> Step 3: Examples ({examples.length})</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-4 bg-muted/10 rounded-xl space-y-3 h-fit">
                   <h4 className="font-medium text-sm text-muted-foreground">
                     {editingExampleId ? "Edit Example" : "Add New Example"}
                   </h4>
                   <GlassInput label="Title" value={exTitle} onChange={e => setExTitle(e.target.value)} />
                   <GlassTextarea label="Problem" value={exProblem} onChange={e => setExProblem(e.target.value)} />
                   <GlassTextarea label="Solution" value={exSolution} onChange={e => setExSolution(e.target.value)} />
                   <GlassTextarea label="Key Takeaway" value={exTakeaway} onChange={e => setExTakeaway(e.target.value)} />
                   
                   <div className="flex gap-2 pt-2">
                     {editingExampleId && <GlassButton variant="ghost" onClick={handleCancelEdit} className="flex-1">Cancel</GlassButton>}
                     <GlassButton variant="accent" onClick={handleAddExample} className="flex-1">
                        {editingExampleId ? <Save className="w-4 h-4 mr-2"/> : <Plus className="w-4 h-4 mr-2"/>}
                        {editingExampleId ? "Update Example" : "Add Example"}
                     </GlassButton>
                   </div>
                </div>

                <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
                  {examples.length === 0 ? (
                    <div className="text-center p-8 border border-dashed rounded-xl text-muted-foreground text-sm">No examples added.</div>
                  ) : (
                    examples.map((ex) => (
                      <div key={ex.id} className={`glass-panel p-3 transition-all ${editingExampleId === ex.id ? 'border-primary/50' : ''}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h5 className="font-bold text-sm">{ex.title}</h5>
                            <p className="text-xs text-muted-foreground line-clamp-2">{ex.exampleData?.problem}</p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                             <button onClick={() => handleEditExample(ex)} className="p-1.5 text-primary hover:bg-white/10 rounded-md"><Wand2 className="w-3.5 h-3.5" /></button>
                             <button onClick={() => handleDeleteExample(ex.id)} className="p-1.5 text-destructive hover:bg-white/10 rounded-md"><Plus className="w-3.5 h-3.5 rotate-45" /></button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                 <GlassButton variant="ghost" onClick={() => setWizardStep("video")} className="flex-1">Back</GlassButton>
                 <GlassButton variant="primary" onClick={handleNextStep} className="flex-1">Next Step <ArrowRight className="w-4 h-4 ml-2"/></GlassButton>
              </div>
            </>
          )}

          {wizardStep === "questions" && (
            <>
              <h3 className="text-lg font-semibold flex items-center gap-2"><HelpCircle className="w-5 h-5 text-primary"/> Step 4: Quiz ({questions.length})</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-4 bg-muted/10 rounded-xl space-y-3 h-fit">
                   <h4 className="font-medium text-sm text-muted-foreground">
                     {editingQuestionId ? "Edit Question" : "Add New Question"}
                   </h4>
                   <GlassTextarea label="Question" value={qText} onChange={e => setQText(e.target.value)} />
                    <div className="flex flex-col gap-3">
                      {qAnswers.map((ans, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                           <button 
                             onClick={() => setQCorrectIndex(idx)} 
                             className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center font-bold transition-all ${qCorrectIndex === idx ? 'bg-primary text-primary-foreground border-primary' : 'border-border'}`}
                           >
                             {String.fromCharCode(65+idx)}
                           </button>
                           <input 
                             className="flex-1 bg-background/50 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" 
                             placeholder={`Option ${String.fromCharCode(65+idx)}`} 
                             value={ans} 
                             onChange={e => {
                               const newAns = [...qAnswers]; 
                               newAns[idx] = e.target.value; 
                               setQAnswers(newAns);
                             }} 
                           />
                        </div>
                      ))}
                    </div>
                   <div className="flex gap-2 pt-2">
                     {editingQuestionId && <GlassButton variant="ghost" onClick={handleCancelQuestionEdit} className="flex-1">Cancel</GlassButton>}
                     <GlassButton variant="accent" onClick={handleAddQuestion} className="flex-1">
                        {editingQuestionId ? <Save className="w-4 h-4 mr-2"/> : <Plus className="w-4 h-4 mr-2"/>}
                        {editingQuestionId ? "Update Question" : "Add Question"}
                     </GlassButton>
                   </div>
                </div>

                <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
                  {questions.length === 0 ? (
                    <div className="text-center p-8 border border-dashed rounded-xl text-muted-foreground text-sm">No questions added.</div>
                  ) : (
                    questions.map((q, idx) => (
                      <div key={q.id} className="glass-panel p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h5 className="font-bold text-sm mb-1">Q{idx + 1}: {q.questionData?.question}</h5>
                            <div className="grid grid-cols-2 gap-1 text-[10px]">
                              {q.questionData?.answers.map((ans, aIdx) => (
                                <div key={aIdx} className={q.questionData?.correctAnswerIndex === aIdx ? 'text-green-500 font-bold' : 'text-muted-foreground'}>
                                  {String.fromCharCode(65+aIdx)}. {ans}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                             <button onClick={() => handleEditQuestion(q)} className="p-1.5 text-primary hover:bg-white/10 rounded-md"><Wand2 className="w-3.5 h-3.5" /></button>
                             <button onClick={() => handleDeleteQuestion(q.id)} className="p-1.5 text-destructive hover:bg-white/10 rounded-md"><Plus className="w-3.5 h-3.5 rotate-45" /></button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                 <GlassButton variant="ghost" onClick={() => setWizardStep("examples")} className="flex-1">Back</GlassButton>
                 <GlassButton variant="primary" onClick={handleNextStep} className="flex-1">Next Step <ArrowRight className="w-4 h-4 ml-2"/></GlassButton>
              </div>
            </>
          )}

          {wizardStep === "duration" && (
            <>
              <h3 className="text-lg font-semibold flex items-center gap-2"><Clock className="w-5 h-5 text-primary"/> Step 5: Meta</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-6">
                {[5, 10, 15, 20, 25, 30].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setDuration(mins)}
                    className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center ${duration === mins ? 'bg-primary text-primary-foreground border-primary shadow-lg scale-105 font-bold' : 'bg-background/50 border-border'}`}
                  >
                    <span className="text-lg">{mins}</span>
                    <span className="text-[10px] uppercase opacity-70">Mins</span>
                  </button>
                ))}
              </div>

              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-2 mb-6">
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2 mb-3"><Check className="w-3 h-3" /> Quality Checklist</h4>
                <div className={cn("text-xs flex items-center gap-2", hasBasicInfo ? "text-green-500" : "text-destructive font-medium")}><Check className="w-3 h-3" /> Topic Info</div>
                <div className={cn("text-xs flex items-center gap-2", hasVideo ? "text-green-500" : "text-destructive font-medium")}><Check className="w-3 h-3" /> YouTube Link</div>
                <div className={cn("text-xs flex items-center gap-2", examples.length >= 3 ? "text-green-500" : "text-destructive font-medium")}><Check className="w-3 h-3" /> 3+ Examples</div>
                <div className={cn("text-xs flex items-center gap-2", questions.length >= 7 ? "text-green-500" : "text-destructive font-medium")}><Check className="w-3 h-3" /> 7+ Questions</div>
              </div>

              <div className="flex gap-3">
                 <GlassButton variant="ghost" onClick={() => setWizardStep("questions")} className="flex-1">Back</GlassButton>
                 <GlassButton variant="accent" onClick={() => performSaveLesson()} disabled={loading} className="flex-[2]">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Save className="w-4 h-4 mr-2"/>}
                    {initialData ? 'Update Lesson' : 'Complete & Save'}
                 </GlassButton>
              </div>
            </>
          )}

          {wizardStep === "complete" && (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center"><Check className="w-8 h-8 text-green-400" /></div>
                <h3 className="text-lg font-semibold mb-2">{initialData ? 'Updated!' : 'Saved!'}</h3>
                <GlassButton variant="primary" onClick={handleStartNew} className="w-full">Return</GlassButton>
              </div>
          )}
        </div>
      </GlassCard>

      {validationError && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-panel max-w-sm p-6 text-center shadow-2xl">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Notice</h3>
            <p className="text-sm text-foreground/80 mb-6">{validationError}</p>
            <GlassButton variant="accent" className="w-full" onClick={() => setValidationError(null)}>Close</GlassButton>
          </div>
        </div>
      )}
    </div>
  );
});