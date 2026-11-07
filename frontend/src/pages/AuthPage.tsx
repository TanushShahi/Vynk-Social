import React, { useState } from 'react';
import { ArrowLeft, User, AtSign, Mail, Lock, Eye, EyeOff, Sparkles, QrCode } from 'lucide-react';
import { VynkLogo } from '../components/VynkLogo.js';
import { useAuth } from '../context/AuthContext.js';

export const AuthPage: React.FC = () => {
  const { login, register, demoLogin } = useAuth();
  const [view, setView] = useState<'splash' | 'register' | 'login'>('splash');

  // Form states
  const [name, setName] = useState('');
  const [uid, setUid] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await register(name, email, password, uid);
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // 1. SPLASH SCREEN (Screen 1 from reference image)
  if (view === 'splash') {
    return (
      <div className="relative min-h-screen w-full max-w-md mx-auto flex flex-col justify-between p-6 overflow-hidden bg-[#070913]">
        {/* Ambient Top Glow */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-72 h-72 bg-gradient-to-tr from-cyan-500/20 via-purple-600/30 to-pink-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Logo and Title */}
        <div className="flex flex-col items-center pt-16 z-10 text-center">
          <div className="mb-4">
            <VynkLogo size={68} />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-1.5 font-sans">
            Vynk
          </h1>
          <p className="text-xs font-medium text-slate-300 tracking-wide">
            Real People, Real Moments
          </p>
        </div>

        {/* Hero Mountain Silhouette Art */}
        <div className="relative my-auto flex items-center justify-center py-6">
          <div className="w-full max-w-xs h-56 rounded-3xl overflow-hidden relative shadow-2xl border border-white/10">
            <img
              src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80"
              alt="Real Moments"
              className="w-full h-full object-cover brightness-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070913] via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 text-center">
              <span className="text-[11px] font-semibold text-purple-200 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-purple-500/30">
                ✦ Share moments, not just numbers
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pb-8 z-10 w-full">
          <button
            onClick={() => setView('register')}
            className="w-full py-3.5 rounded-2xl btn-vynk text-sm font-bold shadow-glow-md tracking-wide cursor-pointer"
          >
            Create Account
          </button>

          <button
            onClick={() => setView('login')}
            className="w-full py-3.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-sm font-bold text-white transition-all cursor-pointer"
          >
            Sign In
          </button>

          {/* Quick Demo Login Pill */}
          <div className="pt-2 text-center">
            <div className="text-[11px] text-slate-400 mb-2">Or test immediately with demo creators:</div>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <button
                onClick={() => demoLogin('user_tanush_01')}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-600/25 border border-purple-500/40 text-purple-200 hover:bg-purple-600/40"
              >
                Tanush
              </button>
              <button
                onClick={() => demoLogin('user_aarav_02')}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/[0.06] border border-white/10 text-slate-300 hover:text-white"
              >
                Aarav
              </button>
              <button
                onClick={() => demoLogin('user_riya_03')}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/[0.06] border border-white/10 text-slate-300 hover:text-white"
              >
                Riya
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. JOIN VYNK / REGISTRATION (Screen 2 from reference image)
  if (view === 'register') {
    return (
      <div className="relative min-h-screen w-full max-w-md mx-auto flex flex-col justify-between p-6 bg-[#070913]">
        {/* Top Header */}
        <div className="pt-4">
          <button
            onClick={() => setView('splash')}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>

          {/* Logo & Headline */}
          <div className="flex flex-col items-center mt-3 mb-6">
            <VynkLogo size={52} />
            <h1 className="text-2xl font-bold text-white mt-3">Join Vynk</h1>
            <p className="text-xs text-slate-400 mt-0.5">A new way to connect</p>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-xs text-rose-300 text-center">
            {error}
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleRegister} className="space-y-3.5 flex-1">
          {/* Full Name */}
          <div className="relative">
            <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full Name"
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl glass-input text-xs placeholder-slate-500 font-medium"
            />
          </div>

          {/* Choose your UID */}
          <div className="relative">
            <AtSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={uid}
              onChange={(e) => setUid(e.target.value)}
              placeholder="Choose your UID (e.g. vynk.t7x4k9)"
              className="w-full pl-11 pr-11 py-3.5 rounded-2xl glass-input text-xs placeholder-slate-500 font-medium"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
              <QrCode size={18} />
            </div>
          </div>

          {/* Email */}
          <div className="relative">
            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl glass-input text-xs placeholder-slate-500 font-medium"
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full pl-11 pr-11 py-3.5 rounded-2xl glass-input text-xs placeholder-slate-500 font-medium"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Create Account Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3.5 rounded-2xl btn-vynk text-sm font-bold shadow-glow-md tracking-wide cursor-pointer disabled:opacity-50"
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>

          {/* Social Logins */}
          <div className="pt-4 text-center">
            <span className="text-xs text-slate-500">or continue with</span>
            <div className="flex items-center justify-center gap-4 mt-3">
              <button
                type="button"
                onClick={() => demoLogin('user_tanush_01')}
                className="w-12 h-12 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 flex items-center justify-center text-white transition-all text-sm font-bold"
              >
                G
              </button>
              <button
                type="button"
                onClick={() => demoLogin('user_riya_03')}
                className="w-12 h-12 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 flex items-center justify-center text-white transition-all text-sm font-bold"
              >
                
              </button>
              <button
                type="button"
                onClick={() => demoLogin('user_arjun_04')}
                className="w-12 h-12 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 flex items-center justify-center text-white transition-all text-sm font-bold"
              >
                <Sparkles size={18} className="text-indigo-400" />
              </button>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="py-4 text-center">
          <p className="text-[11px] text-slate-500">
            By continuing, you agree to our{' '}
            <span className="text-slate-400 underline cursor-pointer">Terms</span> &{' '}
            <span className="text-slate-400 underline cursor-pointer">Privacy Policy</span>
          </p>
          <button
            onClick={() => setView('login')}
            className="mt-2 text-xs font-semibold text-purple-400 hover:text-purple-300"
          >
            Already have an account? Sign In
          </button>
        </div>
      </div>
    );
  }

  // 3. SIGN IN SCREEN
  return (
    <div className="relative min-h-screen w-full max-w-md mx-auto flex flex-col justify-between p-6 bg-[#070913]">
      <div className="pt-4">
        <button
          onClick={() => setView('splash')}
          className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="flex flex-col items-center mt-3 mb-6">
          <VynkLogo size={52} />
          <h1 className="text-2xl font-bold text-white mt-3">Welcome Back</h1>
          <p className="text-xs text-slate-400 mt-0.5">Sign in to your Vynk account</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-xs text-rose-300 text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4 flex-1">
        <div className="relative">
          <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email or UID (e.g. vynk.t7x4k9)"
            className="w-full pl-11 pr-4 py-3.5 rounded-2xl glass-input text-xs placeholder-slate-500 font-medium"
          />
        </div>

        <div className="relative">
          <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type={showPassword ? 'text' : 'password'}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full pl-11 pr-11 py-3.5 rounded-2xl glass-input text-xs placeholder-slate-500 font-medium"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-2 py-3.5 rounded-2xl btn-vynk text-sm font-bold shadow-glow-md tracking-wide cursor-pointer disabled:opacity-50"
        >
          {isLoading ? 'Signing In...' : 'Sign In'}
        </button>

        {/* Demo login shortcuts */}
        <div className="pt-6 text-center">
          <span className="text-xs text-slate-500 mb-2 block">Quick Test Login</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => demoLogin('user_tanush_01')}
              className="p-2.5 rounded-xl bg-purple-600/20 border border-purple-500/30 text-xs font-semibold text-purple-200 hover:bg-purple-600/30"
            >
              Tanush (@vynk.t7x4k9)
            </button>
            <button
              type="button"
              onClick={() => demoLogin('user_aarav_02')}
              className="p-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-xs font-semibold text-slate-300 hover:text-white"
            >
              Aarav (@vynk.a8k2m1)
            </button>
          </div>
        </div>
      </form>

      <div className="py-4 text-center">
        <button
          onClick={() => setView('register')}
          className="text-xs font-semibold text-purple-400 hover:text-purple-300"
        >
          Don't have an account? Create one
        </button>
      </div>
    </div>
  );
};
