import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, X, ChevronDown, ChevronLeft } from 'lucide-react';
import accountService from '../services/accountService';

const Login = ({ onBack, onSignUp, onSignInSuccess }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage('');
    
    try {
      const data = await accountService.login(email, password);
      // Save credentials & token in localStorage
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('currentUserEmail', data.user.email);
      onSignInSuccess(data.user.email, password);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full text-slate-100 flex flex-col font-sans">
      <main className="flex-grow flex flex-col items-center relative px-6 pt-12 pb-32">
        <button
          onClick={onBack}
          className="absolute top-4 right-12 text-slate-500 hover:text-white transition-colors p-2 z-20"
          aria-label="Close"
        >
          <X size={32} />
        </button>

        <div className="w-full max-w-[480px] flex flex-col items-center mt-8 bg-white/5 border border-white/10 rounded-3xl p-8 md:p-10 backdrop-blur-xl relative overflow-hidden">
          {/* Top glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-[#49C5E0]/40 to-transparent"></div>

          <h1 className="text-3xl font-medium mb-2 tracking-tight">Welcome Back</h1>
          <p className="text-blue-500 text-sm mb-10 font-medium">Sign in to your account to continue</p>

          <form className="w-full space-y-5" onSubmit={handleSignIn}>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">Email</label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                  <Mail className="w-5 h-5" />
                </span>
                <input
                  type="email"
                  name="email"
                  autoComplete="username"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#050816] border border-slate-800 rounded-lg py-3 pl-12 pr-4 focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">Password</label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                  <Lock className="w-5 h-5" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#050816] border border-slate-800 rounded-lg py-3 pl-12 pr-12 focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all placeholder:text-slate-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-slate-400">
                <input type="checkbox" className="w-4 h-4 rounded border-white/10 bg-[#0a0f1d]" />
                Remember me
              </label>
            </div>

            {errorMessage && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full bg-gradient-to-r from-[#1061CC] to-[#49C5E0] text-white font-bold py-3.5 rounded-lg shadow-lg transition-all ${
                isSubmitting ? 'opacity-70 cursor-not-allowed scale-[0.99]' : 'hover:scale-[1.01] active:scale-[0.99]'
              }`}
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>

            <div className="text-center text-sm pt-1">
              <span className="text-slate-400">Don't have an account? </span>
              <button
                type="button"
                onClick={onSignUp}
                className="text-blue-500 hover:underline font-medium"
              >
                Sign up
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default Login;
