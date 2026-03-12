import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { FloatingOrbs } from "@/components/FloatingOrbs";
import { Clock, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

const AwaitingApproval = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen mesh-background relative overflow-hidden flex items-center justify-center p-4">
      <FloatingOrbs />
      
      <div className="relative z-10 w-full max-w-md animate-fade-up">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white/10 backdrop-blur-md flex items-center justify-center shadow-2xl mx-auto mb-4 border border-white/20">
            <Clock className="w-10 h-10 text-primary animate-pulse" />
          </div>
          <h1 className="text-3xl font-bold mb-2">
            <span className="gradient-text">Account Pending</span>
          </h1>
          <p className="text-muted-foreground">Thank you for registering, {user?.user_metadata?.full_name || 'Moderator'}!</p>
        </div>

        <GlassCard className="p-8 text-center space-y-6">
          <p className="text-muted-foreground leading-relaxed">
            Your account is currently awaiting approval from an administrator. 
            Once approved, you will have access to the moderator tools.
          </p>
          
          <div className="pt-4">
            <p className="text-xs text-muted-foreground mb-4 italic">
              Please check back soon or contact your supervisor.
            </p>
            
            <GlassButton
              variant="ghost"
              className="w-full text-destructive hover:bg-destructive/10"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </GlassButton>
          </div>
        </GlassCard>
        
        <p className="text-center mt-8 text-xs text-muted-foreground/60">
          This process ensures the security and integrity of our educational content.
        </p>
      </div>
    </div>
  );
};

export default AwaitingApproval;
