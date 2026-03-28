import { GlassButton } from "./ui/GlassButton";
import { Layers, ArrowLeft, Save, Sun, Moon, Search, Users, BookOpen, Wand2, LogOut, User } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GlassInput } from "./ui/GlassInput";
import { GlobalSearch } from "./GlobalSearch";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  subject?: string;
  topic?: string;
  onBack?: () => void;
  onSave?: () => void;
  previewTitle?: string;
}

export const Header = ({ subject, topic, onBack, onSave, previewTitle }: HeaderProps) => {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { user, role, signOut, isAdmin, pendingRequestsCount } = useAuth();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleSignOut = async () => {
    const toastId = toast.loading("Logging out...");
    try {
      await signOut();
      toast.success("Logged out successfully", { id: toastId });
      // Use a small delay to allow the toast to be seen before hard redirect
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
    } catch (error) {
      toast.error("Logout failed", { id: toastId });
    }
  };

  return (
    <header className="relative z-50 animate-fade-up">
      <div className="glass-panel-strong !overflow-visible px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <GlassButton variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4" />
              </GlassButton>
            )}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-lg">
                <img src="/logo.jpg" alt="Teachers Content Generator" className="w-full h-full object-cover" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">
                  {subject && topic ? (
                    <>
                      <span className="gradient-text">{subject}</span>
                      <span className="text-muted-foreground mx-2">/</span>
                      <span>{topic}</span>
                    </>
                  ) : (
                    <span className="gradient-text">Content Builder</span>
                  )}
                </h1>
                {!subject && (
                  <p className="text-xs text-muted-foreground">Welcome, {user?.user_metadata?.full_name || user?.email}</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <GlobalSearch />
            
            {/* Content Explorer Link */}
            <GlassButton variant="ghost" size="sm" onClick={() => navigate("/content")} title="Content Explorer">
              <BookOpen className="w-5 h-5" />
            </GlassButton>
 
            {/* User Management Link - Admin only */}
            {isAdmin && (
              <GlassButton variant="ghost" size="sm" onClick={() => navigate("/users")} title="User Management" className="relative">
                <Users className="w-5 h-5" />
                {pendingRequestsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-[10px] font-bold text-white rounded-full flex items-center justify-center border-2 border-background animate-in zoom-in duration-300">
                    {pendingRequestsCount}
                  </span>
                )}
              </GlassButton>
            )}

            <GlassButton variant="ghost" size="sm" onClick={() => navigate("/settings/ai")} title="AI Connection">
              <Wand2 className="w-5 h-5" />
            </GlassButton>
            
            <GlassButton variant="ghost" size="sm" onClick={toggleTheme} title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}>
              {theme === "dark" ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </GlassButton>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <GlassButton variant="ghost" size="sm" className="relative h-10 w-10 rounded-full">
                  <User className="w-5 h-5" />
                </GlassButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 glass-panel border-white/20" align="end">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-foreground">{user?.user_metadata?.full_name || 'User'}</p>
                    <p className="text-xs leading-none text-muted-foreground capitalize">{role}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive hover:bg-destructive/10 focus:bg-destructive/10 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {subject && topic && (
              <GlassButton variant="primary" size="sm" onClick={onSave}>
                <span className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Save Progress
                </span>
              </GlassButton>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
