import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassInput } from "@/components/ui/GlassInput";
import { GlassTextarea } from "@/components/ui/GlassTextarea";
import { FloatingOrbs } from "@/components/FloatingOrbs";
import { ArrowLeft, Save, Sparkles, Key, MessageSquare, Cpu } from "lucide-react";
import { toast } from "sonner";
import { getOpenAIConfig, saveOpenAIConfig, OpenAIConfig } from "@/lib/openai";

const AiSettings = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<OpenAIConfig>({
    apiKey: "",
    systemPrompt: "You are an expert Senior Curriculum Developer for SIKOLA. Transform academic topics into interactive mobile lessons. REQUIRED: At least 3 Examples (Problem/Solution/Takeaway) and at least 7 Multiple Choice Questions. CRITICAL: Shuffle the correct answer indices (A, B, C, D) so they are not the same for all questions. Provide an estimated duration (5-60 mins). Return valid JSON.",
    model: "gpt-3.5-turbo-0125"
  });

  useEffect(() => {
    const saved = getOpenAIConfig();
    if (saved) {
      setConfig(saved);
    }
  }, []);

  const handleSave = () => {
    if (!config.apiKey) {
      toast.error("Please enter an API key");
      return;
    }
    saveOpenAIConfig(config);
    toast.success("AI Configuration saved locally!");
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingOrbs />
      
      <div className="relative z-10 p-6 max-w-2xl mx-auto space-y-6">
        <header className="animate-fade-up">
          <div className="glass-panel-strong px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <GlassButton variant="ghost" size="sm" onClick={() => navigate("/")}>
                  <ArrowLeft className="w-4 h-4" />
                </GlassButton>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-primary/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-foreground">
                      <span className="gradient-text">AI Connection</span>
                    </h1>
                    <p className="text-xs text-muted-foreground">Configure your ChatGPT integration</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="animate-fade-up delay-100">
          <GlassCard hover={false}>
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-foreground font-semibold">
                  <Key className="w-4 h-4 text-primary" />
                  <h3>API Configuration</h3>
                </div>
                
                <GlassInput 
                  label="OpenAI API Key" 
                  placeholder="sk-..." 
                  type="password"
                  value={config.apiKey}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                />
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Cpu className="w-4 h-4" /> AI Model
                  </label>
                  <select
                    title="Select AI Model"
                    value={config.model}
                    onChange={(e) => setConfig({ ...config, model: e.target.value })}
                    className="w-full bg-background/50 backdrop-blur-sm border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-foreground"
                  >
                    <option value="gpt-4o-mini">GPT-4o Mini (Recommended: Best Value)</option>
                    <option value="gpt-4o">GPT-4o (Most Intelligent)</option>
                    <option value="gpt-3.5-turbo-0125">GPT-3.5 Turbo (Legacy Fast)</option>
                    <option value="gpt-4-turbo-preview">GPT-4 Turbo (Legacy Smart)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-border/50">
                <div className="flex items-center gap-2 text-foreground font-semibold">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <h3>Training Instructions</h3>
                </div>
                
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Paste the instructions from your "Trained GPT" here. This tells the AI how to structure the lessons and what tone to use.
                </p>

                <GlassTextarea 
                  label="System Prompt" 
                  placeholder="Paste your GPT instructions here..." 
                  className="min-h-[200px]"
                  value={config.systemPrompt}
                  onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
                />
              </div>

              <div className="flex justify-end pt-4">
                <GlassButton variant="primary" onClick={handleSave} className="w-full sm:w-auto">
                  <Save className="w-4 h-4 mr-2" />
                  Save AI Config
                </GlassButton>
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="glass-panel p-4 rounded-xl text-xs text-muted-foreground flex items-start gap-3 border-yellow-500/20 bg-yellow-500/5">
          <div className="w-5 h-5 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-yellow-500">i</span>
          </div>
          <p>
            Your API Key is stored only in your browser's local storage. We never send it to any server except OpenAI. 
            If you clear your browser cache, you will need to enter it again.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AiSettings;
