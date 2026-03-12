/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GlassButton } from "@/components/ui/GlassButton";
import { FloatingOrbs } from "@/components/FloatingOrbs";
import { 
  ArrowLeft, 
  Trophy,
  Loader2, 
  Trash2, 
  Edit2, 
  Plus,
  Save,
  X,
  Timer,
  Brain,
  RotateCcw,
  Zap,
  Flame,
  Dumbbell
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";

interface PracticeMode {
  id: number;
  title: string;
  description: string;
  icon_name: string;
  color: string;
  xp_reward: string;
}

const iconMap: Record<string, any> = {
  Timer,
  Brain,
  RotateCcw,
  Trophy,
  Zap,
  Flame,
  Dumbbell
};

export const PracticeModes = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [modes, setModes] = useState<PracticeMode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentMode, setCurrentMode] = useState<Partial<PracticeMode>>({});

  useEffect(() => {
    fetchModes();
  }, []);

  const fetchModes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('practice_modes')
      .select('*')
      .order('id');
    
    if (error) {
      toast.error("Failed to load modes");
    } else {
      setModes(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this mode?")) return;

    const { error } = await supabase.from('practice_modes').delete().eq('id', id);
    if (error) {
      toast.error("Failed to delete mode");
    } else {
      setModes(modes.filter(m => m.id !== id));
      toast.success("Mode deleted");
    }
  };

  const handleEdit = (mode: PracticeMode) => {
    setCurrentMode(mode);
    setIsEditing(true);
  };

  const handleAddNew = () => {
    setCurrentMode({
      title: "",
      description: "",
      icon_name: "Timer",
      color: "#FACC15",
      xp_reward: "+20 XP"
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!currentMode.title || !currentMode.description) {
      toast.error("Please fill in required fields");
      return;
    }

    const { error } = currentMode.id 
      ? await supabase.from('practice_modes').update(currentMode).eq('id', currentMode.id)
      : await supabase.from('practice_modes').insert([currentMode]);

    if (error) {
      toast.error("Failed to save mode");
    } else {
      toast.success("Mode saved successfully");
      setIsEditing(false);
      fetchModes();
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingOrbs />
      
      <div className="relative z-10 p-6 max-w-6xl mx-auto space-y-6">
        <header className="animate-fade-up">
          <div className="glass-panel-strong px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <GlassButton variant="ghost" size="sm" onClick={() => navigate("/content")}>
                  <ArrowLeft className="w-4 h-4" />
                </GlassButton>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-lg">
                    <Trophy className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-foreground">
                      <span className="gradient-text">Practice Modes</span>
                    </h1>
                    <p className="text-xs text-muted-foreground">Manage app learning modes</p>
                  </div>
                </div>
              </div>
              <GlassButton onClick={handleAddNew}>
                <Plus className="w-4 h-4 mr-2" /> Add Mode
              </GlassButton>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-up">
            {modes.map((mode) => {
              const Icon = iconMap[mode.icon_name] || Trophy;
              return (
                <div key={mode.id} className="glass-panel p-6 relative group hover:scale-[1.02] transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${mode.color}20` }}
                    >
                      <Icon size={24} color={mode.color} />
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/50 backdrop-blur-md rounded-lg p-1">
                      <button 
                        onClick={() => handleEdit(mode)}
                        className="p-2 hover:text-primary transition-colors"
                        title="Edit Mode"
                      >
                        <Edit2 size={16} />
                      </button>
                      {isAdmin && (
                        <button 
                          onClick={() => handleDelete(mode.id)}
                          className="p-2 hover:text-destructive transition-colors"
                          title="Delete Mode"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold mb-2">{mode.title}</h3>
                  <p className="text-muted-foreground text-sm mb-4 h-10 line-clamp-2">{mode.description}</p>
                  
                  <div className="flex gap-2">
                    <span 
                      className="px-2 py-1 rounded text-xs font-bold"
                      style={{ backgroundColor: `${mode.color}20`, color: mode.color }}
                    >
                      {mode.xp_reward}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Edit Modal (using fixed positioning for simplicity) */}
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="glass-panel w-full max-w-md p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">
                  {currentMode.id ? "Edit Mode" : "New Mode"}
                </h2>
                <button onClick={() => setIsEditing(false)} className="hover:text-destructive" title="Close">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input 
                    value={currentMode.title} 
                    onChange={e => setCurrentMode({...currentMode, title: e.target.value})} 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input 
                    value={currentMode.description} 
                    onChange={e => setCurrentMode({...currentMode, description: e.target.value})} 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Icon Name</Label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={currentMode.icon_name}
                      onChange={e => setCurrentMode({...currentMode, icon_name: e.target.value})}
                      aria-label="Select icon"
                    >
                      {Object.keys(iconMap).map(icon => (
                        <option key={icon} value={icon}>{icon}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Color (Hex)</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={currentMode.color} 
                        onChange={e => setCurrentMode({...currentMode, color: e.target.value})} 
                      />
                      <div 
                        className="w-10 h-10 rounded border"
                        style={{ backgroundColor: currentMode.color }}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>XP Reward</Label>
                  <Input 
                    value={currentMode.xp_reward} 
                    onChange={e => setCurrentMode({...currentMode, xp_reward: e.target.value})} 
                    placeholder="+20 XP"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <GlassButton variant="ghost" onClick={() => setIsEditing(false)}>
                  Cancel
                </GlassButton>
                <GlassButton onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" /> Save
                </GlassButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PracticeModes;
