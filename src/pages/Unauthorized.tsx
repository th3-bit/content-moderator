import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { FloatingOrbs } from "@/components/FloatingOrbs";
import { ShieldAlert, ArrowLeft, Smartphone } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

const Unauthorized = () => {
  const { signOut, user, role } = useAuth();
  const navigate = useNavigate();

  const handleBackToLogin = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen mesh-background relative overflow-hidden flex items-center justify-center p-4">
      <FloatingOrbs />
      
      <div className="relative z-10 w-full max-w-lg animate-fade-up text-center">
        <div className="mb-8">
          <div className="w-20 h-20 rounded-2xl bg-rose-500/20 backdrop-blur-md flex items-center justify-center shadow-2xl mx-auto mb-4 border border-rose-500/30">
            <ShieldAlert className="w-10 h-10 text-rose-500" />
          </div>
          <h1 className="text-3xl font-bold mb-2">
            <span className="gradient-text">Access Restricted</span>
          </h1>
          <p className="text-muted-foreground italic">Application: Content Moderator</p>
        </div>

        <GlassCard className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="p-4 bg-rose-500/5 rounded-xl border border-rose-500/10">
              <p className="text-foreground font-medium mb-1">Account Role: <span className="capitalize text-rose-400 font-bold">{role || 'Unknown'}</span></p>
              <p className="text-sm text-muted-foreground">
                Current account: <span className="text-foreground/80">{user?.email}</span>
              </p>
            </div>

            <p className="text-muted-foreground leading-relaxed">
              This platform is reserved for **Administrators** and **Content Moderators** only. 
              Student accounts are not permitted to access these management tools.
            </p>

            <div className="flex flex-col items-center gap-4 py-4">
              <div className="flex items-center gap-3 text-primary bg-primary/10 px-4 py-2 rounded-full">
                <Smartphone className="w-5 h-5" />
                <span className="text-sm font-semibold">Please use the Sikola+ Mobile App</span>
              </div>
            </div>
          </div>
          
          <div className="pt-2 flex flex-col sm:flex-row gap-4">
            <GlassButton
              variant="ghost"
              className="flex-1"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </GlassButton>
            
            <GlassButton
              variant="primary"
              className="flex-1 bg-primary/20 hover:bg-primary/30 text-primary border-primary/30"
              onClick={handleBackToLogin}
            >
              Sign in with Staff Account
            </GlassButton>
          </div>
        </GlassCard>
        
        <p className="mt-8 text-xs text-muted-foreground/60 max-w-sm mx-auto">
          If you are a staff member and believe this is an error, please contact your administrator to update your account role.
        </p>
      </div>
    </div>
  );
};

export default Unauthorized;
