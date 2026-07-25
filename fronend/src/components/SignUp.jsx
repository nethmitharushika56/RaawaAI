import React, { useState } from 'react';
import { User, Mail, Building2, Briefcase, Lock, Eye, EyeOff, X, ShieldCheck, ChevronDown, ChevronLeft } from 'lucide-react';
import accountService from '../services/accountService';

const SignUp = ({ onBack, onSignIn, onSignUpSuccess }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const scrollToContent = () => {
    window.scrollBy({ top: 300, behavior: 'smooth' });
  };

  const handleSignUp = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (!termsAccepted) {
      setErrorMessage('You must agree to the terms and conditions before creating an account.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please enter the same password in both fields.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const data = await accountService.signup({
        email,
        password,
        name: fullName,
        company,
        jobTitle,
      });
      // Save credentials & token in localStorage
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('currentUserEmail', data.user.email);
      onSignUpSuccess(data.user.email, password, data.user);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'Signup failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full text-slate-100 flex flex-col font-sans">
      {/* Main content */}
      <main className="flex-grow flex flex-col items-center relative px-6 pt-12 pb-32">
        {/* Close Button */}
        <button 
          onClick={onBack}
          className="absolute top-4 right-12 text-slate-500 hover:text-white transition-colors p-2 z-20"
          aria-label="Close"
        >
          <X size={32} />
        </button>

        {/* Scroll Hint */}
        <button
          onClick={scrollToContent}
          className="fixed bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center text-slate-500 hover:text-[#49C5E0] transition-colors group z-20 animate-bounce"
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2 opacity-50 group-hover:opacity-100 transition-opacity whitespace-nowrap">Scroll for form</span>
          <ChevronDown size={24} />
        </button>

        <div className="w-full max-w-xl bg-white/5 border border-white/10 rounded-3xl p-8 md:p-10 backdrop-blur-xl relative overflow-hidden mt-8">
          {/* Top glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-[#49C5E0]/40 to-transparent"></div>
          
          <div className="flex flex-col items-center mb-6">
            {/* Badge */}
            <div className="flex items-center space-x-2 px-4 py-1 rounded-full bg-[#69D2E9]/10 border border-[#69D2E9]/20 mb-4 font-medium text-[#69D2E9] text-[9px] uppercase tracking-widest">
              <ShieldCheck size={12} />
              <span>Registering as Agent</span>
            </div>
            
            <h2 className="text-xl font-bold text-white mb-2">Create Your Account</h2>
            <p className="text-slate-400 text-xs text-center">Submit simulations and get insights on public sentiment</p>
          </div>

          <form className="space-y-4" onSubmit={handleSignUp}>
            <div className="space-y-4">
              <div className="group">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#69D2E9] transition-colors" size={18} />
                  <input 
                    type="text" 
                    name="name"
                    autoComplete="name"
                    placeholder="Enter your full name" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-[#0a0f1d] border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#69D2E9]/50 focus:border-[#69D2E9]/50 transition-all placeholder:text-slate-700"
                  />
                </div>
              </div>

              <div className="group">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#69D2E9] transition-colors" size={18} />
                  <input 
                    type="email" 
                    name="email"
                    autoComplete="username"
                    placeholder="you@example.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#0a0f1d] border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#69D2E9]/50 focus:border-[#69D2E9]/50 transition-all placeholder:text-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="group">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Company</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#69D2E9] transition-colors" size={18} />
                    <input 
                      type="text" 
                      placeholder="Your company or institution" 
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full bg-[#0a0f1d] border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#69D2E9]/50 focus:border-[#69D2E9]/50 transition-all placeholder:text-slate-700"
                    />
                  </div>
                </div>

                <div className="group">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Job Title</label>
                  <div className="relative">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#69D2E9] transition-colors" size={18} />
                    <input 
                      type="text" 
                      placeholder="e.g., Product Manager" 
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      className="w-full bg-[#0a0f1d] border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#69D2E9]/50 focus:border-[#69D2E9]/50 transition-all placeholder:text-slate-700"
                    />
                  </div>
                </div>
              </div>

              <div className="group">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#69D2E9] transition-colors" size={18} />
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    name="password"
                    autoComplete="new-password"
                    placeholder="Create a strong password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#0a0f1d] border border-white/10 rounded-xl py-3.5 pl-12 pr-12 text-sm focus:outline-none focus:ring-1 focus:ring-[#69D2E9]/50 focus:border-[#69D2E9]/50 transition-all placeholder:text-slate-700"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="group">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#69D2E9] transition-colors" size={18} />
                  <input 
                    type={showConfirmPassword ? 'text' : 'password'} 
                    name="confirm-password"
                    autoComplete="new-password"
                    placeholder="Confirm your password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#0a0f1d] border border-white/10 rounded-xl py-3.5 pl-12 pr-12 text-sm focus:outline-none focus:ring-1 focus:ring-[#69D2E9]/50 focus:border-[#69D2E9]/50 transition-all placeholder:text-slate-700"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            {errorMessage && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {errorMessage}
              </div>
            )}

            <div className="flex items-center space-x-3 mb-6">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => {
                  setTermsAccepted(e.target.checked);
                  if (e.target.checked && errorMessage.includes('terms and conditions')) {
                    setErrorMessage('');
                  }
                }}
                className="w-4 h-4 rounded border-white/10 bg-[#0a0f1d] text-[#69D2E9] focus:ring-offset-0 focus:ring-0"
              />
              <p className="text-[11px] text-slate-400">
                I agree to the <span className="text-[#69D2E9] cursor-pointer hover:underline">Terms of Service</span> and <span className="text-[#69D2E9] cursor-pointer hover:underline">Privacy Policy</span>
              </p>
            </div>

            <button 
              type="submit"
              disabled={!termsAccepted}
              className={`w-full bg-gradient-to-r from-[#1061CC] to-[#49C5E0] text-white font-bold py-4 rounded-xl shadow-lg transition-all ${
                !termsAccepted || isSubmitting ? 'opacity-70 cursor-not-allowed scale-[0.99]' : 'hover:scale-[1.01] active:scale-[0.99]'
              }`}
            >
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </button>

            <div className="text-center mt-6">
              <p className="text-xs text-slate-500">
                Already have an account?{' '}
                <span 
                  onClick={onSignIn}
                  className="text-[#69D2E9] font-bold cursor-pointer hover:underline ml-1"
                >
                  Sign In
                </span>
              </p>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default SignUp;
