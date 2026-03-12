import { GlassCard } from "./ui/GlassCard";
import { Trash2, GripVertical, Check, Pencil, Video, Lightbulb, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

interface QuestionData {
  question: string;
  answers: string[];
  correctAnswerIndex: number;
}

interface ExampleData {
  title: string;
  problem: string;
  solution: string;
  keyTakeaway: string;
}

interface ContentItemProps {
  title: string;
  content: string;
  index: number;
  onDelete: () => void;
  onEdit: () => void;
  type: "lesson" | "example" | "question";
  questionData?: QuestionData;
  exampleData?: ExampleData;
  videoLink?: string;
}

export const ContentItem = ({ title, content, index, onDelete, onEdit, type, questionData, exampleData, videoLink }: ContentItemProps) => {
  const { isAdmin } = useAuth();
  const typeColors = {
    lesson: "from-primary/20 to-primary/5",
    example: "from-accent/20 to-accent/5",
    question: "from-secondary/20 to-secondary/5",
  };

  const typeLabels = {
    lesson: "Lesson Header",
    example: "Practical Example",
    question: "Quiz Question",
  };

  const answerLabels = ["A", "B", "C", "D"];

  return (
    <div className="animate-scale-in">
      <GlassCard className="group relative overflow-hidden max-w-full">
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br opacity-50 pointer-events-none",
            typeColors[type]
          )}
        />
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity cursor-grab">
                <GripVertical className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-background/50 border border-border/20 text-muted-foreground">
                    {typeLabels[type]}
                  </span>
                </div>

                {type === "question" && questionData ? (
                  <>
                    <div className="mb-3 p-3 rounded-xl bg-background/30 border border-border/20">
                      <p className="text-xs text-muted-foreground mb-1 font-medium flex items-center gap-1.5">
                        <HelpCircle className="w-3 h-3" /> Question:
                      </p>
                      <p className="font-semibold text-foreground leading-relaxed">
                        {title}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-2">
                      {questionData.answers.map((answer, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-xl text-sm transition-all",
                            idx === questionData.correctAnswerIndex
                              ? "bg-green-500/10 border border-green-500/30 text-green-400"
                              : "bg-muted/30 text-muted-foreground border border-transparent"
                          )}
                        >
                          <span
                            className={cn(
                              "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0",
                              idx === questionData.correctAnswerIndex
                                ? "bg-green-500/20 text-green-400"
                                : "bg-muted/50"
                            )}
                          >
                            {idx === questionData.correctAnswerIndex ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              answerLabels[idx]
                            )}
                          </span>
                          <p className="leading-relaxed flex-1">
                            {answer}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : type === "example" && exampleData ? (
                  <div className="space-y-4">
                    <h4 className="font-extrabold text-foreground text-xl tracking-tight leading-tight break-words">{title}</h4>
                    
                    <div className="relative group/problem">
                      <div className="absolute -left-3 top-0 bottom-0 w-1 bg-primary/30 rounded-full group-hover/problem:bg-primary transition-colors" />
                      <p className="text-[10px] font-black text-primary/60 uppercase tracking-widest mb-1.5 ml-2">Problem Statement</p>
                      <div className="glass-panel p-4 rounded-2xl bg-white/5 border-white/5 shadow-inner">
                        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap break-words overflow-wrap-anywhere">{exampleData.problem}</p>
                      </div>
                    </div>

                    <div className="relative group/solution">
                      <div className="absolute -left-3 top-0 bottom-0 w-1 bg-accent/30 rounded-full group-hover/solution:bg-accent transition-colors" />
                      <p className="text-[10px] font-black text-accent/60 uppercase tracking-widest mb-1.5 ml-2">Step-by-Step Solution</p>
                      <div className="glass-panel p-4 rounded-2xl bg-accent/5 border-accent/10">
                        <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap break-words overflow-wrap-anywhere">{exampleData.solution}</p>
                      </div>
                    </div>

                    {exampleData.keyTakeaway && (
                      <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/10">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0 animate-pulse">
                          <Lightbulb className="w-4 h-4 text-amber-400" />
                        </div>
                        <p className="text-xs font-medium text-amber-200/80 italic leading-snug break-words">{exampleData.keyTakeaway}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <h4 className="font-bold text-foreground text-lg mb-2">
                      {title}
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {content}
                    </p>
                    {videoLink && (
                      <a 
                        href={videoLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-all active:scale-95"
                      >
                        <Video className="w-4 h-4" />
                        WATCH VIDEO LESSON
                      </a>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <button
                onClick={onEdit}
                className="p-2 rounded-xl text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all active:scale-90"
                title="Edit item"
              >
                <Pencil className="w-4 h-4" />
              </button>
              {isAdmin && (
                <button
                  onClick={onDelete}
                  className="p-2 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all active:scale-90"
                  title="Delete item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

