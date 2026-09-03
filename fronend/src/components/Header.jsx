import React, { useState } from 'react';
import { ChevronDown, Info, LayoutDashboard, LogOut, Menu, UserRound, X } from 'lucide-react';
import logoImg from '../assets/RaawaAI_logo.png';

const Header = ({ 
  onStart, 
  onHome, 
  onSignIn, 
  onSignOut, 
  onSettings, 
  onReports, 
  onOrganizations, 
  onUpgrade, 
  onProfile, 
  onReviewer, 
  onAbout, 
  onDashboard,
  view, 
  isAuthenticated = false,
  userRole = 'Agent', 
  currentPath = '',
  avatar = '',
  minimal = false
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const isDashboard = view === 'agency-dashboard';
  const isSettings = view === 'settings';
  const isAbout = view === 'about';
  const isHome = view === 'home' || view === 'landing';
  const isSignUp = view === 'signup';
  const isLogIn = view === 'login';
  const showDashboardUI = isAuthenticated || isDashboard || isSettings;
  const showHomeButton = isAbout || isSignUp || isLogIn;
  const isOnSimulator = currentPath === '/simulator';

  return (
    <>
    <header className="sticky top-0 z-50 w-full shrink-0 border-b border-white/[0.07] bg-[#020617]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] w-full max-w-7xl items-center justify-between px-6 lg:px-8">
        <div className="flex items-center shrink-0">
          <div 
            className="group flex cursor-pointer items-center rounded-xl py-2 pr-3 transition-opacity hover:opacity-85"
            onClick={onHome}
          >
            <img
              src={logoImg}
              alt="RaawaAI"
              className="h-9 w-auto object-contain md:h-10"
            />
          </div>
        </div>
        
        {!minimal && <div className="flex items-center gap-3 justify-end shrink-0">
          {showDashboardUI ? (
            <div className="hidden md:flex items-center gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-1 shadow-[0_8px_30px_rgba(0,0,0,0.18)] shrink-0 relative">
              <button 
                onClick={onHome}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all ${isHome ? 'bg-cyan-400/10 text-cyan-300 shadow-inner shadow-cyan-400/10' : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'}`}
              >
                <span>Home</span>
              </button>
              <button 
                onClick={onDashboard}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all ${isDashboard ? 'bg-cyan-400/10 text-cyan-300 shadow-inner shadow-cyan-400/10' : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'}`}
              >
                <LayoutDashboard size={15} strokeWidth={1.8} />
                Agency Dashboard
              </button>
              <button 
                onClick={onAbout}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all ${isAbout ? 'bg-cyan-400/10 text-cyan-300 shadow-inner shadow-cyan-400/10' : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'}`}
              >
                <Info size={15} strokeWidth={1.8} />
                About
              </button>

              <div className="relative">
                <button
                  onClick={() => setAccountOpen((s) => !s)}
                  aria-expanded={accountOpen}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-medium text-slate-200 transition-all hover:border-cyan-300/30 hover:bg-cyan-300/10"
                >
                  {avatar ? (
                    <img src={avatar} alt="Profile" className="h-6 w-6 rounded-full object-cover border border-white/10" />
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border border-cyan-200/20 bg-cyan-300/10 text-cyan-200">
                      <UserRound size={13} />
                    </div>
                  )}
                  <span>Account</span>
                  <ChevronDown size={14} className={`transition-transform ${accountOpen ? 'rotate-180' : ''}`} />
                </button>
 
                {accountOpen && (
                  <div className="absolute right-0 z-50 mt-3 w-52 rounded-2xl border border-white/10 bg-[#0b1329]/95 p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-3 duration-200">
                    <div className="mb-1 rounded-xl border border-cyan-300/10 bg-cyan-300/[0.06] px-3 py-2.5">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Current role</div>
                      <div className="mt-1 flex items-center gap-2 text-sm font-medium text-cyan-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_8px_rgba(103,210,233,0.9)]" />
                        {userRole} access
                      </div>
                    </div>
                    <button onClick={() => { setAccountOpen(false); onProfile && onProfile(); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white"><UserRound size={15} />Profile</button>
                    <button onClick={() => { setAccountOpen(false); onReviewer && onReviewer(); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white"><LayoutDashboard size={15} />Reviewer</button>
                    <div className="border-t border-white/5 my-1.5 mx-2" />
                    <button onClick={() => { setAccountOpen(false); onSignOut && onSignOut(); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-rose-300 transition-colors hover:bg-rose-500/10 hover:text-rose-200"><LogOut size={15} />Sign Out</button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-1 shrink-0">
              <button 
                onClick={onHome}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${isHome ? 'bg-cyan-400/10 text-cyan-300' : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'}`}
              >
                Home
              </button>
              <button 
                onClick={onAbout}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${isAbout ? 'bg-cyan-400/10 text-cyan-300' : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'}`}
              >
                <Info size={15} strokeWidth={1.8} />
                About
              </button>
              <button 
                onClick={onSignIn}
                className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_0_20px_rgba(103,210,233,0.18)] transition-all hover:bg-cyan-200"
              >
                Sign In
              </button>
            </div>
          )}

          {/* Mobile menu toggle */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileOpen((s) => !s)}
              className="rounded-xl border border-white/10 bg-white/[0.06] p-2.5 text-slate-200 transition-colors hover:bg-white/10"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>}
      </div>
    </header>
    {!minimal && mobileOpen && (
      <div className="md:hidden absolute left-0 right-0 top-full bg-[#050816] border-t border-white/5 z-40 animate-in slide-in-from-top-3 duration-200">
        <div className="w-full px-6 py-4 flex flex-col gap-2 transition-all duration-200 ease-out">
           {showDashboardUI ? (
            <>
              <button onClick={() => { setMobileOpen(false); onHome && onHome(); }} className={`text-left px-3 py-2 rounded hover:bg-white/5 transition-colors ${isHome ? 'text-[#69D2E9]' : 'text-white'}`}>Home</button>
              <button onClick={() => { setMobileOpen(false); onDashboard && onDashboard(); }} className={`text-left px-3 py-2 rounded hover:bg-white/5 transition-colors ${isDashboard ? 'text-[#69D2E9]' : 'text-white'}`}>Agency Dashboard</button>
              <button onClick={() => { setMobileOpen(false); onAbout && onAbout(); }} className={`text-left px-3 py-2 rounded hover:bg-white/5 transition-colors ${isAbout ? 'text-[#69D2E9]' : 'text-white'}`}>About</button>
              <button onClick={() => { setMobileOpen(false); onProfile && onProfile(); }} className="text-left px-3 py-2 rounded hover:bg-white/5 text-white">Profile</button>
              <button onClick={() => { setMobileOpen(false); onReviewer && onReviewer(); }} className="text-left px-3 py-2 rounded hover:bg-white/5 text-white">Reviewer</button>
            </>
          ) : (
            <>
              <button onClick={() => { setMobileOpen(false); onHome && onHome(); }} className={`text-left px-3 py-2 rounded hover:bg-white/5 transition-colors ${isHome ? 'text-[#69D2E9]' : 'text-white'}`}>Home</button>
              <button onClick={() => { setMobileOpen(false); onAbout && onAbout(); }} className={`text-left px-3 py-2 rounded hover:bg-white/5 transition-colors ${isAbout ? 'text-[#69D2E9]' : 'text-white'}`}>About</button>
            </>
          )}
          <div className="border-t border-white/5 mt-2 pt-2">
            {showDashboardUI ? (
              <button onClick={() => { setMobileOpen(false); onSignOut && onSignOut(); }} className="text-left px-3 py-2 rounded hover:bg-white/5">Sign Out</button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => { setMobileOpen(false); onSignIn && onSignIn(); }} className="px-3 py-2 rounded hover:bg-[#1a4f63] hover:text-white text-slate-300 font-medium w-full text-center py-2 transition-colors border border-white/10">Sign In</button>
              </div>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default Header;
