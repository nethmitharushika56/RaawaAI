import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Hero from './components/Hero';
import Login from './components/Login';
import SignUp from './components/SignUp';
import AgencyDashboard from './components/AgencyDashboard';
import SimulationForm from './components/SimulationForm';
import Organizations from './components/Organizations';
import NewOrganization from './components/NewOrganization';
import Reports from './components/Reports';
import StrategicReport from './components/StrategicReport';
import OptimizationReport from './components/OptimizationReport';
import Upgrade from './components/Upgrade';
import ReviewerDashboard from './components/ReviewerDashboard';
import Profile from './components/Profile';
import Settings from './components/Settings';
import About from './components/About';
import ChangePlan from './components/ChangePlan';
import PaymentMethods from './components/PaymentMethods';
import SimulationResultWindow from './components/SimulationResultWindow';
import ReportViewer from './components/ReportViewer';
import Footer from './components/Footer';
import InteractiveBackground from './components/InteractiveBackground';
import { saveProfile } from './services/accountService';
import { runSimulation, saveSimulationId, saveSimulationResult, getReport } from './services/geminiService';
import { ChevronLeft } from 'lucide-react';

const normalizeEmail = (value) => (value || '').trim().toLowerCase();

const App = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [lastView, setLastView] = useState('/agency-dashboard');
  const [userRole] = useState('Agent');

  const [isLoading, setIsLoading] = useState(false);

  const [, setShowSavePassword] = useState(false);
  const [, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [avatar, setAvatar] = useState('');
  const [report, setReport] = useState(null);

  const getProfileKey = (email) => `profile:${normalizeEmail(email)}`;
  const saveProfileForUser = (email, profileData) => {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return;

    const nextProfile = {
      name: profileData?.name || '',
      email: normalizeEmail(profileData?.email) || normalizedEmail,
      phone: profileData?.phone || '',
      company: profileData?.company || '',
      jobTitle: profileData?.jobTitle || '',
      description: profileData?.description || '',
    };

    localStorage.setItem(getProfileKey(normalizedEmail), JSON.stringify(nextProfile));
    localStorage.setItem('currentUserEmail', normalizedEmail);

    void saveProfile(nextProfile).catch((err) => {
      console.warn('Profile sync skipped during signup:', err?.message || err);
    });
  };

  const requireAuth = (element) => {
    if (isAuthenticated) return element;
    return <Navigate to="/login" state={{ from: location }} replace />;
  };

  useEffect(() => {
    const handleNavigateMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (location.pathname === '/simulation-result') return;
      if (event.data?.type === 'raawaai:navigate' && event.data.path) {
        navigate(event.data.path, { replace: true });
      }
    };

    window.addEventListener('message', handleNavigateMessage);
    return () => window.removeEventListener('message', handleNavigateMessage);
  }, [navigate, location.pathname]);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const email = localStorage.getItem('currentUserEmail');
    if (token && email) {
      setIsAuthenticated(true);
      setUserEmail(email);
      const saved = localStorage.getItem(`profile:${normalizeEmail(email)}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed?.avatar) {
            setAvatar(parsed.avatar);
          }
        } catch {
          setAvatar('');
        }
      }
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const raw = sessionStorage.getItem('pendingSimulation');
    if (!raw) return;

    try {
      const pending = JSON.parse(raw);
      if (pending?.concept) {
        sessionStorage.removeItem('pendingSimulation');
        handleStartSimulation(pending.concept, pending.audience);
      }
    } catch {
      sessionStorage.removeItem('pendingSimulation');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const handleStartSimulation = async (concept, audience) => {
    if (!isAuthenticated) {
      sessionStorage.setItem('pendingSimulation', JSON.stringify({ concept, audience }));
      navigate('/login', { state: { from: { pathname: '/simulator' } }, replace: true });
      return;
    }

    const resultWindow = window.open('/simulation-result', '_blank');

    setIsLoading(true);

    try {
      const data = await runSimulation(concept, audience);
      saveSimulationResult(data);
      if (data?.simulation_id) {
        saveSimulationId(data.simulation_id);
      }
      if (resultWindow && !resultWindow.closed) {
        resultWindow.focus();
      }
    } catch (error) {
      console.error(error);
      alert('Failed to run simulation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    setIsAuthenticated(false);
    setReport(null);
    setAvatar('');
    localStorage.removeItem('currentUserEmail');
    localStorage.removeItem('authToken');
    navigate('/');
  };

  // Determine standard layout view parameter dynamically based on active route path
  let view = isAuthenticated ? 'agency-dashboard' : 'landing';
  if (location.pathname === '/') {
    view = 'home';
  } else if (location.pathname === '/about') {
    view = 'about';
  } else if (location.pathname === '/settings' || location.pathname.startsWith('/settings/')) {
    view = 'settings';
  } else if (location.pathname === '/agency-dashboard') {
    view = 'agency-dashboard';
  } else if (location.pathname === '/login') {
    view = 'login';
  } else if (location.pathname === '/signup') {
    view = 'signup';
  } else if (location.pathname === '/simulator') {
    view = 'simulator';
  } else if (location.pathname === '/reports' || location.pathname.startsWith('/reports/')) {
    view = 'reports';
  } else if (location.pathname === '/profile') {
    view = 'profile';
  } else if (location.pathname === '/reviewer') {
    view = 'reviewer';
  } else if (location.pathname === '/upgrade') {
    view = 'upgrade';
  } else if (location.pathname === '/simulation-result') {
    view = 'simulation-result';
  } else if (location.pathname === '/organizations' || location.pathname.startsWith('/organizations/')) {
    view = 'organizations';
  }

  const isReviewerOrSimulationResult = location.pathname === '/simulation-result' || location.pathname === '/reviewer';

  return (
    <div className="min-h-screen text-white flex flex-col relative animate-fade-in">
      {/* Interactive Canvas Particle Background & Grid Overlay */}
      <InteractiveBackground />
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden bg-transparent">
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-grid-pattern opacity-70"></div>
        {/* Radial gradient mask for grid to fade near edges */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-[#020617]"></div>
      </div>

      {!isReviewerOrSimulationResult && (
        <Header
          view={view}
          minimal={location.pathname === '/'}
          isAuthenticated={isAuthenticated}
          userRole={userRole}
          avatar={avatar}
          currentPath={location.pathname}
          onHome={() => navigate('/')}
          onDashboard={() => navigate('/agency-dashboard')}
          onStart={() => navigate('/simulator')}
          onSignIn={() => navigate('/login')}
          onSignOut={handleSignOut}
          onAbout={() => navigate('/about')}
          onSettings={() => {
            setLastView(location.pathname);
            navigate('/settings');
          }}
          onReports={() => navigate('/reports')}
          onOrganizations={() => navigate('/organizations')}
          onUpgrade={() => navigate('/upgrade')}
          onProfile={() => navigate('/profile')}
          onReviewer={() => navigate('/reviewer')}
        />
      )}

      <main className="flex-grow relative z-10">
        <Routes>
          <Route path="/home" element={<Navigate to="/" replace />} />

          <Route
            path="/"
            element={
              <div className="w-full px-6">
                <Hero
                  onStart={() => {
                    if (isAuthenticated) {
                      navigate('/simulator');
                    } else {
                      navigate('/login', { state: { from: { pathname: '/simulator' } } });
                    }
                  }}
                  onReview={() => navigate('/reviewer')}
                />
              </div>
            }
          />

          <Route
            path="/about"
            element={<div className="max-w-7xl mx-auto px-6"><About /></div>}
          />

          <Route
            path="/login"
            element={
              <Login
                onBack={() => navigate('/')}
                onSignUp={() => navigate('/signup')}
                onReviewerSignIn={() => navigate('/reviewer')}
                onSignInSuccess={(email, password) => {
                  setUserEmail(email);
                  setUserPassword(password);
                  setIsAuthenticated(true);
                  localStorage.setItem('currentUserEmail', normalizeEmail(email));
                  const saved = localStorage.getItem(`profile:${normalizeEmail(email)}`);
                  if (saved) {
                    try {
                      const parsed = JSON.parse(saved);
                      setAvatar(parsed?.avatar || '');
                    } catch {
                      setAvatar('');
                    }
                  } else {
                    setAvatar('');
                  }
                  const redirectTo = location.state?.from?.pathname || '/agency-dashboard';
                  navigate(redirectTo, { replace: true });
                  setShowSavePassword(true);
                }}
              />
            }
          />

          <Route
            path="/signup"
            element={
              <SignUp
                onBack={() => navigate('/')}
                onSignIn={() => navigate('/login')}
                onReviewerSignIn={() => navigate('/reviewer')}
                onSignUpSuccess={(email, password, profileData) => {
                  setUserEmail(email);
                  setUserPassword(password);
                  setIsAuthenticated(true);
                  saveProfileForUser(email, {
                    name: profileData?.name,
                    email,
                    company: profileData?.company,
                    jobTitle: profileData?.jobTitle,
                  });
                  const redirectTo = location.state?.from?.pathname || '/agency-dashboard';
                  navigate(redirectTo, { replace: true });
                  setShowSavePassword(true);
                }}
              />
            }
          />

          <Route 
            path="/agency-dashboard" 
            element={requireAuth(
              <AgencyDashboard 
                onNewSimulation={() => navigate('/simulator')} 
                onSettings={() => { setLastView('/agency-dashboard'); navigate('/settings'); }} 
                onReports={() => navigate('/reports')} 
                onViewReport={async (id) => {
                  try {
                    const data = await getReport(id);
                    setReport(data);
                  } catch {
                    alert('Failed to load report.');
                  }
                }}
              />
            )} 
          />
          <Route path="/settings/*" element={requireAuth(<Settings onBack={() => navigate(lastView || '/agency-dashboard')} />)} />
          <Route path="/profile/subs/change-plan" element={requireAuth(<div className="w-full px-6 py-8 min-h-[calc(100vh-80px)]"><ChangePlan onBack={() => navigate('/profile', { state: { section: 'subs' } })} /></div>)} />
          <Route path="/profile/subs/payment-methods" element={requireAuth(<div className="w-full px-6 py-8 min-h-[calc(100vh-80px)]"><PaymentMethods onBack={() => navigate('/profile', { state: { section: 'subs' } })} /></div>)} />
          <Route path="/profile" element={requireAuth(<div className="w-full px-6 py-8 min-h-[calc(100vh-80px)]"><Profile currentPassword={userPassword} onPasswordChanged={setUserPassword} onProfileUpdated={(p) => setAvatar(p?.avatar || '')} /></div>)} />
          <Route path="/organizations" element={requireAuth(<div className="w-full px-6 py-8 min-h-[calc(100vh-80px)]"><Organizations onBack={() => navigate('/simulator')} onCreateOrg={() => navigate('/organizations/new')} /></div>)} />
          <Route path="/organizations/new" element={requireAuth(<div className="w-full px-6 py-8 min-h-[calc(100vh-80px)]"><NewOrganization onBack={() => navigate('/organizations')} /></div>)} />

          <Route
            path="/simulator"
            element={requireAuth(
              <div className="max-w-7xl mx-auto px-6 py-8 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 min-h-[calc(100vh-80px)]">
                <button
                  type="button"
                  onClick={() => navigate(isAuthenticated ? '/agency-dashboard' : '/')}
                  className="flex items-center space-x-2 text-white hover:text-slate-200 transition-colors group"
                >
                  <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                  <span className="text-sm font-medium">Back to Agency Dashboard</span>
                </button>

                <div className="text-center mb-8">
                  <h1 className="text-5xl font-black mb-4 tracking-tight bg-gradient-to-r from-[#69D2E9] to-[#3498DB] bg-clip-text text-transparent">RaawaAI</h1>
                  <p className="text-slate-500 font-medium text-lg uppercase tracking-widest">
                    Predicting Human Resonance via Multi-Agent Personas
                  </p>
                </div>

                <SimulationForm onSubmit={handleStartSimulation} isLoading={isLoading} />
              </div>
            )}
          />

          <Route 
            path="/reports" 
            element={requireAuth(
              <div className="w-full px-6 py-8 min-h-[calc(100vh-80px)]">
                <Reports 
                  onBack={() => navigate('/agency-dashboard')} 
                  onViewReport={async (id) => {
                    try {
                      const data = await getReport(id);
                      setReport(data);
                    } catch {
                      alert('Failed to load report.');
                    }
                  }} 
                  onOptimizeConcept={() => {
                    navigate('/simulator');
                  }} 
                />
              </div>
            )} 
          />
          <Route path="/reports/strategic" element={requireAuth(<div className="w-full px-6 py-8 min-h-[calc(100vh-80px)]"><StrategicReport onBack={() => navigate('/reports')} /></div>)} />
          <Route path="/reports/optimization" element={requireAuth(<div className="w-full px-6 py-8 min-h-[calc(100vh-80px)]"><OptimizationReport onBack={() => navigate('/reports')} /></div>)} />
          <Route path="/upgrade" element={requireAuth(<div className="w-full px-6 py-8 min-h-[calc(100vh-80px)]"><Upgrade onBack={() => navigate('/simulator')} /></div>)} />
          <Route path="/reviewer" element={<div className="w-full px-6 py-8 min-h-[calc(100vh-80px)]"><ReviewerDashboard onBack={() => navigate('/simulator')} /></div>} />
          <Route path="/simulation-result" element={<SimulationResultWindow onClose={() => navigate('/agency-dashboard')} />} />
          <Route path="/reviewer" element={<div className="w-full px-6 py-8 min-h-[calc(100vh-80px)]"><ReviewerDashboard onBack={() => navigate(-1)} /></div>} />
          <Route path="/simulation-result" element={<SimulationResultWindow onClose={() => navigate('/simulator')} />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {!isReviewerOrSimulationResult && <Footer />}

      {/* Decorative Background Elements */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-20 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/5 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/5 blur-[150px] rounded-full"></div>
      </div>
      {report && <ReportViewer report={report} onClose={() => setReport(null)} />}
    </div>
  );
};

export default App;
