import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassInput } from "@/components/ui/GlassInput";
import { FloatingOrbs } from "@/components/FloatingOrbs";
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) throw error;

      setSubmitted(true);
      toast.success("Password reset link sent!");
    } catch (err: any) {
      console.error("Reset error:", err);
      toast.error(err.message || "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen mesh-background relative overflow-hidden flex items-center justify-center p-4">
      <FloatingOrbs />
      
      <div className="relative z-10 w-full max-w-md animate-fade-up">
        <div className="text-center mb-8">
          <Link 
            to="/login"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Login
          </Link>
          <h1 className="text-3xl font-bold mb-2">
            <span className="gradient-text">Reset Password</span>
          </h1>
          <p className="text-muted-foreground">We'll send you a recovery link</p>
        </div>

        <GlassCard className="p-8">
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <GlassInput
                    type="email"
                    placeholder="name@example.com"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <GlassButton
                type="submit"
                variant="primary"
                className="w-full py-6 text-base font-semibold"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  "Send Reset Link"
                )}
              </GlassButton>
            </form>
          ) : (
            <div className="text-center space-y-4 py-4 animate-fade-up">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold">Check your email</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                If an account exists for <span className="text-foreground font-medium">{email}</span>, 
                you will receive a password reset link shortly.
              </p>
              <GlassButton
                variant="ghost"
                className="mt-4"
                onClick={() => setSubmitted(false)}
              >
                Try different email
              </GlassButton>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
};

export default ForgotPassword;
