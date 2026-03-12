import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassInput } from "@/components/ui/GlassInput";
import { FloatingOrbs } from "@/components/FloatingOrbs";
import { Mail, Lock, UserPlus, Loader2, AlertCircle, User, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";

const SignUp = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  const startResendTimer = () => {
    setResendTimer(60);
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Sign up user in Auth
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            app_name: 'content_moderator',
          },
        },
      });

      if (authError) throw authError;
      
      // If we get here and OTP is required, show the OTP screen
      setShowOtp(true);
      startResendTimer();
      toast.info("Verification code sent! Please check your email.");
    } catch (err: any) {
      console.error("SignUp error:", err);
      setError(err.message || "Registration failed");
      toast.error(err.message || "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpValue.length !== 8) {
      toast.error("Please enter a valid 8-digit code");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otpValue,
        type: 'signup',
      });

      if (verifyError) throw verifyError;

      toast.success("Email confirmed! Your account is now awaiting administrator approval.");
      navigate("/awaiting-approval");
    } catch (err: any) {
      console.error("Verification error:", err);
      setError(err.message || "Verification failed");
      toast.error(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendTimer > 0) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) throw error;

      startResendTimer();
      toast.success("New code sent to your email!");
    } catch (err: any) {
      console.error("Resend error:", err);
      toast.error(err.message || "Failed to resend code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen mesh-background relative overflow-hidden flex items-center justify-center p-4">
      <FloatingOrbs />
      
      <div className="relative z-10 w-full max-w-md animate-fade-up">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white/10 backdrop-blur-md flex items-center justify-center shadow-2xl mx-auto mb-4 border border-white/20">
            <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-bold mb-2">
            <span className="gradient-text">Create Account</span>
          </h1>
          <p className="text-muted-foreground">Moderator Access Request</p>
        </div>

        <GlassCard className="p-8">
          {!showOtp ? (
            <form onSubmit={handleSignUp} className="space-y-5">
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <GlassInput
                    type="text"
                    placeholder="John Doe"
                    className="pl-10"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              </div>

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

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <GlassInput
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-10 pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <GlassButton
                type="submit"
                variant="primary"
                className="w-full py-6 text-base font-semibold mt-4"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <UserPlus className="w-5 h-5 mr-2" />
                )}
                Create Moderator Account
              </GlassButton>
            </form>
          ) : (
            <div className="space-y-6 animate-fade-up">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold mb-2 text-foreground">Verify your email</h2>
                <p className="text-sm text-muted-foreground flex flex-col gap-1">
                  <span>We've sent an 8-digit code to</span>
                  <span className="font-semibold text-foreground italic">{email}</span>
                </p>
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div className="flex flex-col items-center gap-4">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">OTP Code</Label>
                  <InputOTP
                    maxLength={8}
                    value={otpValue}
                    onChange={(value) => setOtpValue(value)}
                  >
                    <InputOTPGroup className="gap-2">
                      <InputOTPSlot index={0} className="w-10 h-12 text-lg font-bold rounded-xl border-white/20 bg-white/5 border-2 shadow-inner" />
                      <InputOTPSlot index={1} className="w-10 h-12 text-lg font-bold rounded-xl border-white/20 bg-white/5 border-2 shadow-inner" />
                      <InputOTPSlot index={2} className="w-10 h-12 text-lg font-bold rounded-xl border-white/20 bg-white/5 border-2 shadow-inner" />
                      <InputOTPSlot index={3} className="w-10 h-12 text-lg font-bold rounded-xl border-white/20 bg-white/5 border-2 shadow-inner" />
                      <InputOTPSlot index={4} className="w-10 h-12 text-lg font-bold rounded-xl border-white/20 bg-white/5 border-2 shadow-inner" />
                      <InputOTPSlot index={5} className="w-10 h-12 text-lg font-bold rounded-xl border-white/20 bg-white/5 border-2 shadow-inner" />
                      <InputOTPSlot index={6} className="w-10 h-12 text-lg font-bold rounded-xl border-white/20 bg-white/5 border-2 shadow-inner" />
                      <InputOTPSlot index={7} className="w-10 h-12 text-lg font-bold rounded-xl border-white/20 bg-white/5 border-2 shadow-inner" />
                    </InputOTPGroup>
                  </InputOTP>
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
                    "Verify & Request Access"
                  )}
                </GlassButton>

                <div className="text-center space-y-4">
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Didn't receive the code?</p>
                    <button
                      type="button"
                      disabled={resendTimer > 0 || loading}
                      onClick={handleResendCode}
                      className={`text-sm font-semibold transition-all ${
                        resendTimer > 0 
                        ? 'text-muted-foreground cursor-not-allowed' 
                        : 'text-primary hover:text-primary/80 hover:scale-105'
                      }`}
                    >
                      {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowOtp(false)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/5 border border-white/5 hover:border-white/10"
                  >
                    Change email address
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="mt-8 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link to="/login" className="text-primary font-semibold hover:underline">Sign In</Link>
          </div>
        </GlassCard>
        
        <p className="text-center mt-8 text-xs text-muted-foreground/60 leading-relaxed px-4">
          By signing up, you agree to the moderator terms and conditions. Your access level will be determined by the account administrator.
        </p>
      </div>
    </div>
  );
};

export default SignUp;
