"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lock, Mail, Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/api/apiClient";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill out all credentials.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      // FastAPI OAuth2PasswordRequestForm requires form data
      const formData = new FormData();
      formData.append("username", email);
      formData.append("password", password);

      const response: any = await api.post("/auth/login", formData);
      
      // The API client sets localStorage internally, so we just redirect
      if (response.access_token) {
        localStorage.setItem("access_token", response.access_token);
        localStorage.setItem("refresh_token", response.refresh_token || "");
        router.push("/");
      } else {
        setError("Invalid credentials format returned.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to authenticate.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    alert("Redirecting to Google OAuth endpoint...");
  };

  return (
    <div className="bg-bg-surface border border-border-subtle rounded-2xl p-8 shadow-2xl glass-panel relative overflow-hidden">
      
      {/* Brand logo details component */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary-600 to-accent-cyan flex items-center justify-center font-bold text-white text-xl shadow-lg glow-blue mb-3">
          F
        </div>
        <h2 className="text-xl font-bold tracking-tight text-text-primary">Welcome to ForexAI Pro</h2>
        <p className="text-xs text-text-secondary mt-1.5">Sign in to access real-time trading recommendations</p>
      </div>

      {error && (
        <div className="bg-bearish/10 border border-bearish/20 text-bearish text-xs font-semibold px-4 py-3 rounded-lg mb-4 text-center">
          {error}
        </div>
      )}

      {/* Internal Credential Login Forms */}
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Email input field */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold tracking-widest text-text-secondary">Email Address</label>
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

        {/* Password input field */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-[10px] uppercase font-bold tracking-widest text-text-secondary">Password Space</label>
            <span className="text-[10px] text-primary-400 hover:underline cursor-pointer">Forgot?</span>
          </div>
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
        </div>

        {/* Primary CTA login trigger */}
        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-primary-600 to-primary-500 text-white font-bold text-xs uppercase tracking-widest py-3 rounded-lg shadow-xl hover:from-primary-500 hover:to-primary-400 focus:outline-none transition duration-205 mt-2 flex justify-center items-center gap-2 cursor-pointer shadow-glow-blue disabled:opacity-50"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <span>Sign In</span>
          )}
        </button>

      </form>

      {/* Alternative Social Logins options */}
      <div className="relative my-6 text-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border-default"></div>
        </div>
        <span className="bg-bg-surface px-3 text-[10px] font-bold uppercase tracking-widest text-text-muted relative z-10">or</span>
      </div>

      <button 
        type="button"
        onClick={handleGoogleLogin}
        className="w-full bg-transparent border border-border-default hover:bg-bg-card text-text-primary py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold transition duration-150 cursor-pointer"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path fill="#EA4335" d="M12 5.04c1.7 0 3.2.6 4.4 1.8l3.3-3.3C17.7 1.5 15 1 12 1 7.3 1 3.4 3.7 1.6 7.6l3.9 3C6.4 7.6 8.9 5.04 12 5.04z" />
          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.1-2 3.7-4.9 3.7-8.7z" />
          <path fill="#FBBC05" d="M5.5 14.6c-.3-.8-.4-1.7-.4-2.6s.1-1.8.4-2.6l-3.9-3C.6 8.5 0 10.2 0 12s.6 3.5 1.6 5.6l3.9-3z" />
          <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.6-2.5-6.5-5.6l-3.9 3C3.4 20.3 7.3 23 12 23z" />
        </svg>
        <span>Continue with Google</span>
      </button>

      {/* Account enrollment pointer */}
      <div className="mt-8 text-center text-xs">
        <span className="text-text-secondary">Do not have an account? </span>
        <Link 
          href="/register" 
          className="text-primary-400 hover:text-primary-500 font-bold hover:underline"
        >
          Register here
        </Link>
      </div>

    </div>
  );
}
