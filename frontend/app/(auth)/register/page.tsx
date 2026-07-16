"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";

export default function Register() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [strength, setStrength] = useState(0);
  const [strengthText, setStrengthText] = useState("Weak");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Monitor password values to live calculate password strength indicator
  useEffect(() => {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    setStrength(score);
    if (score <= 1) setStrengthText("Weak");
    else if (score === 2) setStrengthText("Fair");
    else if (score === 3) setStrengthText("Good");
    else setStrengthText("Strong");
  }, [password]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill out all fields.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (strength < 3) {
      setError("Password strength too weak. Meet constraints.");
      return;
    }

    setError("");
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      router.push("/login");
    }, 1500);
  };

  return (
    <div className="bg-bg-surface border border-border-subtle rounded-2xl p-8 shadow-2xl glass-panel relative overflow-hidden">
      
      {/* Heading */}
      <div className="flex flex-col items-center text-center mb-8">
        <h2 className="text-xl font-bold tracking-tight text-text-primary text-center">Create your Account</h2>
        <p className="text-xs text-text-secondary mt-1.5">Join ForexAI Pro to analyze charts with AI.</p>
      </div>

      {error && (
        <div className="bg-bearish/10 border border-bearish/20 text-bearish text-xs font-semibold px-4 py-3 rounded-lg mb-4 text-center">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Name input */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold tracking-widest text-text-secondary">Full Name</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-text-muted">
              <User className="w-4 h-4" />
            </span>
            <input 
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full bg-bg-card border border-border-default rounded-lg pl-9 pr-4 py-2.5 text-xs text-text-primary placeholder:text-text-muted focus:border-primary-500 focus:outline-none transition duration-150"
            />
          </div>
        </div>

        {/* Email input */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold tracking-widest text-text-secondary font-medium">Email Address</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-text-muted">
              <Mail className="w-4 h-4" />
            </span>
            <input 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. trader@forexai.pro"
              className="w-full bg-bg-card border border-border-default rounded-lg pl-9 pr-4 py-2.5 text-xs text-text-primary placeholder:text-text-muted focus:border-primary-500 focus:outline-none transition duration-150"
            />
          </div>
        </div>

        {/* Password input */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold tracking-widest text-text-secondary">Password</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-text-muted">
              <Lock className="w-4 h-4" />
            </span>
            <input 
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-bg-card border border-border-default rounded-lg pl-9 pr-10 py-2.5 text-xs text-text-primary placeholder:text-text-muted focus:border-primary-500 focus:outline-none transition duration-150"
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-3 flex items-center text-text-muted hover:text-text-secondary"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          
          {/* Password strength visual indicator */}
          {password.length > 0 && (
            <div className="mt-2 space-y-1">
              <div className="flex justify-between items-center text-[9px] font-bold text-text-muted">
                <span>Strength:</span>
                <span className={`uppercase 
                  ${strength <= 1 && "text-bearish"}
                  ${strength === 2 && "text-neutral-warning"}
                  ${strength >= 3 && "text-bullish"}`}
                >
                  {strengthText}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1 h-1 bg-bg-card rounded-full overflow-hidden border border-border-subtle">
                <div className={`h-full rounded-full transition-all duration-300 ${strength >= 1 ? "bg-bearish" : "bg-transparent"}`} />
                <div className={`h-full rounded-full transition-all duration-300 ${strength >= 2 ? "bg-neutral-warning" : "bg-transparent"}`} />
                <div className={`h-full rounded-full transition-all duration-300 ${strength >= 3 ? "bg-bullish" : "bg-transparent"}`} />
                <div className={`h-full rounded-full transition-all duration-300 ${strength >= 4 ? "bg-bullish" : "bg-transparent"}`} />
              </div>
            </div>
          )}
        </div>

        {/* Confirm password */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold tracking-widest text-[#94A3B8]">Confirm Password</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-text-muted">
              <Lock className="w-4 h-4" />
            </span>
            <input 
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-bg-card border border-border-default rounded-lg pl-9 pr-4 py-2.5 text-xs text-text-primary placeholder:text-text-muted focus:border-primary-500 focus:outline-none transition duration-150"
            />
          </div>
        </div>

        {/* Action Button */}
        <button 
          type="submit"
          className="w-full bg-gradient-to-r from-primary-600 to-primary-500 text-white font-bold text-xs uppercase tracking-widest py-3 rounded-lg shadow-xl hover:from-primary-500 hover:to-primary-400 focus:outline-none transition duration-200 mt-2 flex justify-center items-center gap-2 cursor-pointer shadow-glow-blue disabled:opacity-50"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <span>Create Account</span>
          )}
        </button>

      </form>

      {/* Account redirect */}
      <div className="mt-8 text-center text-xs">
        <span className="text-text-secondary">Already have an account? </span>
        <Link 
          href="/login" 
          className="text-primary-400 hover:text-primary-500 font-bold hover:underline"
        >
          Sign In here
        </Link>
      </div>

    </div>
  );
}
