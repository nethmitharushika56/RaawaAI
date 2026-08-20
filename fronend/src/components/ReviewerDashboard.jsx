import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, BrainCircuit, Flame, BarChart3, Star, Building, Users, MessageSquare } from 'lucide-react';
import { listReviews, listSimulations, loginReviewer, submitReview, listOrganizations, listReviewers } from '../services/accountService';

const REVIEWER_SESSION_KEY = 'currentReviewerSession';

const loadReviewerSession = () => {
  const raw = localStorage.getItem(REVIEWER_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const getAudienceLabel = (aud) => {
  if (typeof aud === 'string') return aud;
  if (aud && typeof aud === 'object') {
    return aud.type || aud.label || aud.demographics?.[0] || 'General';
  }
  return 'General';
};

const getSummaryText = (summary, concept, audienceLabel) => {
  if (typeof summary === 'string') return summary;
  if (summary && typeof summary === 'object') {
    if (summary.total_events !== undefined) {
      const negPercent = Math.round((summary.negative_ratio || 0) * 100);
      const avgSent = Math.round((summary.average_sentiment || 0) * 100);
      return `Simulation analyzed ${summary.total_events} events for "${concept}" targeting ${audienceLabel}. Average sentiment was ${avgSent > 0 ? '+' : ''}${avgSent} with a ${negPercent}% negative reaction ratio.`;
    }
    return JSON.stringify(summary);
  }
  return `Simulation for "${concept}" targeting ${audienceLabel}.`;
};

const ReviewerDashboard = ({ onBack }) => {
  const [reviewer, setReviewer] = useState(() => loadReviewerSession());
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [simulations, setSimulations] = useState([]);
  const [reviews, setReviews] = useState([]); // Reviews for the selected simulation
  const [selectedSimulationId, setSelectedSimulationId] = useState('');
  const [reviewForm, setReviewForm] = useState({ rating: 4, reviewText: '' });
  const [statusMessage, setStatusMessage] = useState('');
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [activeTab, setActiveTab] = useState('Simulations'); // 'Simulations' or 'Organization Info'
  const [orgDetails, setOrgDetails] = useState(null);
  const [orgReviewers, setOrgReviewers] = useState([]);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);

  const selectedSimulation = useMemo(
    () => simulations.find((simulation) => simulation.simulation_id === selectedSimulationId),
    [selectedSimulationId, simulations],
  );

  // Load basic workspace data (simulations, organization details, other reviewers) on mount/auth
  useEffect(() => {
    if (!reviewer) return;

    let mounted = true;
    const loadWorkspace = async () => {
      setIsLoadingWorkspace(true);
      try {
        const [simulationsResponse, orgsResponse, reviewersResponse] = await Promise.all([
          listSimulations(),
          listOrganizations(),
          listReviewers({ organizationId: reviewer.organization_id }),
        ]);

        if (!mounted) return;

        setSimulations(simulationsResponse?.simulations || []);
        
        // Find matching organization
        const matchedOrg = orgsResponse?.organizations?.find(
          (o) => o.record_id === reviewer.organization_id
        );
        if (matchedOrg) {
          setOrgDetails(matchedOrg);
        }

        setOrgReviewers(reviewersResponse?.reviewers || []);

        if (simulationsResponse?.simulations?.length) {
          setSelectedSimulationId(simulationsResponse.simulations[0].simulation_id);
        }
      } catch (error) {
        if (mounted) setStatusMessage(error?.message || 'Failed to load reviewer workspace.');
      } finally {
        if (mounted) setIsLoadingWorkspace(false);
      }
    };

    loadWorkspace();
    return () => {
      mounted = false;
    };
  }, [reviewer]);

  // Load reviews for the selected simulation whenever it changes
  useEffect(() => {
    if (!selectedSimulationId) return;

    let mounted = true;
    const fetchSimulationReviews = async () => {
      try {
        const reviewsResponse = await listReviews({ simulationId: selectedSimulationId });
        if (mounted) {
          setReviews(reviewsResponse?.reviews || []);
        }
      } catch (error) {
        console.error('Failed to load reviews for simulation:', error);
      }
    };

    fetchSimulationReviews();
    return () => {
      mounted = false;
    };
  }, [selectedSimulationId]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      const response = await loginReviewer({
        email: loginForm.email,
        password: loginForm.password,
      });
      const loggedInReviewer = response?.reviewer;
      if (!loggedInReviewer) {
        throw new Error('Reviewer login failed.');
      }

      localStorage.setItem(REVIEWER_SESSION_KEY, JSON.stringify(loggedInReviewer));
      setReviewer(loggedInReviewer);
      setLoginForm({ email: '', password: '' });
      setStatusMessage(`Signed in for ${loggedInReviewer.organization_name}.`);
    } catch (error) {
      setLoginError(error?.message || 'Failed to sign in.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem(REVIEWER_SESSION_KEY);
    setReviewer(null);
    setSimulations([]);
    setReviews([]);
    setSelectedSimulationId('');
    setOrgDetails(null);
    setOrgReviewers([]);
    setReviewForm({ rating: 4, reviewText: '' });
  };

  const handleReviewSubmit = async (event) => {
    event.preventDefault();
    if (!reviewer || !selectedSimulation) return;

    setIsSavingReview(true);
    setStatusMessage('');

    try {
      await submitReview({
        simulation_id: selectedSimulation.simulation_id,
        reviewer_email: reviewer.email,
        reviewer_name: reviewer.name,
        organization_id: reviewer.organization_id,
        organization_name: reviewer.organization_name,
        rating: Number(reviewForm.rating),
        review_text: reviewForm.reviewText,
      });

      // Reload reviews for this simulation
      const reviewsResponse = await listReviews({ simulationId: selectedSimulation.simulation_id });
      setReviews(reviewsResponse?.reviews || []);
      setReviewForm((current) => ({ ...current, reviewText: '' }));
      setStatusMessage('Review submitted successfully.');
    } catch (error) {
      setStatusMessage(error?.message || 'Failed to submit review.');
    } finally {
      setIsSavingReview(false);
    }
  };

  if (!reviewer) {
    return (
      <div className="w-full px-6 py-10">
        <div className="mx-auto max-w-xl rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 shadow-2xl shadow-slate-950/20">
          <button
            type="button"
            onClick={onBack}
            className="mb-8 flex items-center space-x-2 text-white hover:text-slate-200 transition-colors group"
          >
            <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back</span>
          </button>

          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Reviewer Sign In</p>
          <h1 className="mt-3 text-4xl font-bold text-white">Access your review workspace</h1>
          <p className="mt-4 text-slate-400">Use the reviewer account registered by your organization owner.</p>

          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">Email</label>
              <input
                type="email"
                value={loginForm.email}
                onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-slate-900/90 px-4 py-3 text-slate-100 outline-none focus:border-cyan-500 transition-colors"
                placeholder="reviewer@example.com"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">Password</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-slate-900/90 px-4 py-3 text-slate-100 outline-none focus:border-cyan-500 transition-colors"
                placeholder="Enter password"
                required
              />
            </div>

            {loginError && <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{loginError}</div>}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full rounded-2xl bg-cyan-500 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoggingIn ? 'Signing in...' : 'Sign In as Reviewer'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-6 py-10">
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Reviewer Dashboard</p>
            <h1 className="mt-3 text-4xl font-bold text-white">Review Workspace</h1>
            <p className="mt-2 text-slate-400">Signed in as <span className="text-cyan-300 font-semibold">{reviewer.name}</span> for <span className="text-white font-semibold">{reviewer.organization_name}</span>.</p>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-full border border-white/10 bg-slate-900/80 px-5 py-3 text-sm font-semibold text-white hover:border-cyan-400 hover:text-cyan-300 transition"
          >
            Sign Out
          </button>
        </div>

        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          <aside className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-slate-950/20 shadow-xl self-start">
            <div className="mb-6 px-2">
              <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Navigation</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => setActiveTab('Simulations')}
                className={`w-full rounded-3xl px-5 py-4 text-left text-sm font-semibold transition flex items-center space-x-3 ${activeTab === 'Simulations' ? 'border border-cyan-500/20 bg-cyan-500/10 text-cyan-200 shadow-lg shadow-cyan-500/10' : 'border border-transparent text-slate-400 hover:text-white hover:bg-slate-900/40'}`}
              >
                <BarChart3 size={16} />
                <span>Simulations</span>
              </button>
              <button
                onClick={() => setActiveTab('Organization Info')}
                className={`w-full rounded-3xl px-5 py-4 text-left text-sm font-semibold transition flex items-center space-x-3 ${activeTab === 'Organization Info' ? 'border border-cyan-500/20 bg-cyan-500/10 text-cyan-200 shadow-lg shadow-cyan-500/10' : 'border border-transparent text-slate-400 hover:text-white hover:bg-slate-900/40'}`}
              >
                <Building size={16} />
                <span>Organization Info</span>
              </button>
            </div>
          </aside>

          <main className="space-y-6">
            {statusMessage && <div className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-200">{statusMessage}</div>}

            {activeTab === 'Simulations' ? (
              <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
                {/* Left feed list of simulations */}
                <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-2xl shadow-slate-950/20 backdrop-blur-xl self-start space-y-4">
                  <div className="px-2">
                    <h3 className="text-lg font-bold text-white">Simulations</h3>
                    <p className="text-xs text-slate-500">Pick a concept to review.</p>
                  </div>

                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                    {simulations.length ? simulations.map((simulation) => (
                      <button
                        key={simulation.simulation_id}
                        type="button"
                        onClick={() => setSelectedSimulationId(simulation.simulation_id)}
                        className={`w-full rounded-2xl border p-4 text-left transition flex flex-col space-y-2 ${selectedSimulationId === simulation.simulation_id ? 'border-cyan-400/30 bg-cyan-500/10 text-white' : 'border-white/15 bg-slate-900/40 text-slate-300 hover:border-cyan-400/20 hover:bg-slate-900/80'}`}
                      >
                        <div className="text-sm font-semibold truncate w-full">{simulation.concept}</div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="uppercase tracking-widest text-slate-400 truncate max-w-[120px]">{getAudienceLabel(simulation.audience)}</span>
                          <span className="font-bold text-cyan-300">{simulation.backlash_score ?? simulation.metadata?.backlash_probability ?? '—'}% Risk</span>
                        </div>
                      </button>
                    )) : (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/30 p-6 text-center text-slate-400 text-sm">
                        No simulations available.
                      </div>
                    )}
                  </div>
                </div>

                {/* Main simulation review panel */}
                <div className="space-y-6">
                  {selectedSimulation ? (
                    <>
                      {/* Top Header Card */}
                      <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-inner shadow-slate-950/20 space-y-4">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <span className="inline-flex rounded-full bg-cyan-500/10 border border-cyan-500/20 px-3.5 py-1.5 text-[10px] uppercase tracking-[0.25em] text-cyan-300 font-semibold mb-2">
                              Active Concept Review
                            </span>
                            <h2 className="text-3xl font-bold text-white tracking-tight leading-snug">{selectedSimulation.concept}</h2>
                            <p className="mt-1 text-sm text-slate-400">Target Audience: <span className="text-slate-200 font-semibold">{getAudienceLabel(selectedSimulation.audience)}</span></p>
                          </div>
                          {selectedSimulation.created_at && (
                            <span className="text-xs text-slate-500 mt-2">
                              {new Date(selectedSimulation.created_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Stats Section */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 flex items-center justify-between shadow-lg">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Backlash Probability</p>
                            <h4 className="text-3xl font-black text-rose-400 mt-2">{selectedSimulation.backlash_score ?? selectedSimulation.metadata?.backlash_probability ?? '—'}%</h4>
                            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">
                              {(selectedSimulation.backlash_score ?? selectedSimulation.metadata?.backlash_probability) > 60 ? 'CRITICAL RISK' : 'STABLE'}
                            </p>
                          </div>
                          <div className="h-12 w-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                            <Flame size={24} />
                          </div>
                        </div>

                        <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 flex items-center justify-between shadow-lg">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Sentiment Score</p>
                            <h4 className={`text-3xl font-black mt-2 ${(selectedSimulation.metadata?.sentiment_score ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {(selectedSimulation.metadata?.sentiment_score ?? 0) >= 0 ? '+' : ''}{selectedSimulation.metadata?.sentiment_score ?? 0}
                            </h4>
                            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">Hugging Face Aggregate</p>
                          </div>
                          <div className="h-12 w-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-300">
                            <BrainCircuit size={24} />
                          </div>
                        </div>
                      </div>

                      {/* Intelligence Summary */}
                      <div className="rounded-[2.5rem] border border-white/10 bg-slate-950/70 p-8 shadow-2xl backdrop-blur-md space-y-4">
                        <h3 className="text-xl font-bold text-white flex items-center">
                          <span className="bg-gradient-to-t from-cyan-600 to-cyan-400 w-2 h-6 rounded-full mr-4 shadow-lg"></span>
                          Simulation Intelligence Summary
                        </h3>
                        <p className="text-slate-300 text-sm leading-relaxed font-medium italic opacity-90 pl-1">
                          "{getSummaryText(selectedSimulation.metadata?.summary || selectedSimulation.summary, selectedSimulation.concept, getAudienceLabel(selectedSimulation.audience))}"
                        </p>
                      </div>

                      {/* Pulse Feed / Sample Reactions */}
                      <div className="rounded-[2.5rem] border border-white/10 bg-slate-950/70 p-8 shadow-2xl backdrop-blur-md space-y-6">
                        <h3 className="text-xl font-bold text-white flex items-center">
                          <span className="bg-gradient-to-t from-emerald-600 to-emerald-400 w-2 h-6 rounded-full mr-4 shadow-lg"></span>
                          Simulated Pulse reactions
                        </h3>
                        <div className="space-y-4 max-h-[380px] overflow-y-auto pr-2">
                          {(selectedSimulation.sample_posts || selectedSimulation.reactions || []).map((item, index) => {
                            const pName = item.personaName || item.persona || `Persona ${index + 1}`;
                            const isNeg = item.sentiment === 'negative';
                            const isPos = item.sentiment === 'positive';
                            return (
                              <div key={item.id || index} className="rounded-2xl border border-white/5 bg-slate-900/60 p-4 transition-all hover:bg-slate-900/80">
                                <div className="flex items-center justify-between gap-4">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10">
                                      <img src={`https://picsum.photos/seed/${pName}/60/60`} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                      <div className="text-sm font-bold text-white">{pName}</div>
                                      <div className="text-[9px] uppercase tracking-widest text-slate-500 mt-0.5">Tone: {item.tone || 'analytical'}</div>
                                    </div>
                                  </div>
                                  <span className={`text-[9px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider ${isPos ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : isNeg ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}>
                                    {item.sentiment || 'neutral'}
                                  </span>
                                </div>
                                <p className="mt-3 text-xs leading-relaxed text-slate-300">
                                  {item.postContent || item.post || item.comments || 'No comment recorded.'}
                                </p>
                              </div>
                            );
                          })}
                          {!(selectedSimulation.sample_posts || selectedSimulation.reactions || []).length && (
                            <p className="text-slate-500 text-sm text-center py-6">No reactions simulated for this concept.</p>
                          )}
                        </div>
                      </div>

                      {/* Submit Review & Previous Reviews side-by-side or stacked */}
                      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                        {/* Comments / Submit Review */}
                        <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-8 shadow-2xl backdrop-blur-xl space-y-6">
                          <div>
                            <h3 className="text-xl font-bold text-white">Add Reviewer Comment</h3>
                            <p className="text-xs text-slate-500 mt-1">Provide feedback and evaluate resonance.</p>
                          </div>

                          <form onSubmit={handleReviewSubmit} className="space-y-4">
                            <div>
                              <label className="mb-2 block text-sm font-semibold text-slate-200">Rating</label>
                              <div className="flex items-center space-x-2 bg-slate-900/60 p-3 rounded-2xl border border-white/15">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => setReviewForm((current) => ({ ...current, rating: star }))}
                                    className="p-1 hover:scale-110 transition-transform"
                                  >
                                    <Star
                                      size={24}
                                      fill={star <= reviewForm.rating ? '#eab308' : 'none'}
                                      stroke={star <= reviewForm.rating ? '#eab308' : '#64748b'}
                                    />
                                  </button>
                                ))}
                                <span className="ml-4 text-xs font-semibold text-slate-400">
                                  {reviewForm.rating === 1 && '1 - Very weak'}
                                  {reviewForm.rating === 2 && '2 - Weak'}
                                  {reviewForm.rating === 3 && '3 - Neutral'}
                                  {reviewForm.rating === 4 && '4 - Strong'}
                                  {reviewForm.rating === 5 && '5 - Excellent'}
                                </span>
                              </div>
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-semibold text-slate-200">Review Comments</label>
                              <textarea
                                value={reviewForm.reviewText}
                                onChange={(event) => setReviewForm((current) => ({ ...current, reviewText: event.target.value }))}
                                className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-slate-900/90 px-4 py-3 text-slate-100 outline-none focus:border-cyan-500 transition-colors"
                                placeholder="Type your notes or feedback on the simulation backlash and sentiment findings..."
                                required
                              />
                            </div>

                            <button
                              type="submit"
                              disabled={isSavingReview}
                              className="w-full rounded-2xl bg-cyan-500 px-6 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center space-x-2"
                            >
                              <MessageSquare size={16} />
                              <span>{isSavingReview ? 'Submitting...' : 'Submit Feedback'}</span>
                            </button>
                          </form>
                        </div>

                        {/* Existing Reviews list */}
                        <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-8 shadow-2xl backdrop-blur-xl space-y-6">
                          <div>
                            <h3 className="text-xl font-bold text-white">Reviewer Feedback Log</h3>
                            <p className="text-xs text-slate-500 mt-1">Comments submitted for this concept.</p>
                          </div>

                          <div className="space-y-4 max-h-[360px] overflow-y-auto pr-2">
                            {reviews.length ? reviews.map((review) => (
                              <div key={review.record_id} className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 space-y-3">
                                <div className="flex items-center justify-between gap-4">
                                  <div>
                                    <div className="text-xs font-bold text-slate-200">{review.reviewer_name}</div>
                                    <div className="text-[9px] text-slate-500 mt-0.5">{review.reviewer_email}</div>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        size={12}
                                        fill={star <= review.rating ? '#eab308' : 'none'}
                                        stroke={star <= review.rating ? '#eab308' : '#64748b'}
                                      />
                                    ))}
                                  </div>
                                </div>
                                <p className="text-xs text-slate-300 leading-relaxed italic bg-slate-950/30 p-3 rounded-xl border border-white/[0.02]">
                                  "{review.review_text}"
                                </p>
                                {review.created_at && (
                                  <div className="text-[9px] text-slate-500 text-right">
                                    {new Date(review.created_at).toLocaleDateString()} at {new Date(review.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                )}
                              </div>
                            )) : (
                              <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/10 p-8 text-center text-slate-400 text-xs">
                                No comments or ratings submitted yet. Be the first to add feedback!
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-[2rem] border border-dashed border-white/10 bg-slate-900/40 p-16 text-center text-slate-400">
                      {isLoadingWorkspace ? 'Loading workspace...' : 'Select a simulation from the feed list to inspect and review.'}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Organization Info View */
              <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-[2.5rem] border border-white/10 bg-slate-950/70 p-8 shadow-2xl backdrop-blur-xl space-y-6">
                  <div>
                    <span className="inline-flex rounded-full bg-cyan-500/10 border border-cyan-500/20 px-3.5 py-1.5 text-[10px] uppercase tracking-[0.25em] text-cyan-300 font-semibold mb-2">
                      Corporate details
                    </span>
                    <h2 className="text-3xl font-bold text-white tracking-tight">{orgDetails ? orgDetails.name : reviewer.organization_name}</h2>
                    <p className="text-sm text-slate-400 mt-1">Entity ID: <span className="text-slate-200 font-mono text-xs">{reviewer.organization_id}</span></p>
                  </div>

                  <hr className="border-white/5" />

                  {orgDetails ? (
                    <div className="space-y-6 text-sm text-slate-300">
                      <div>
                        <h4 className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-1">Corporate Description</h4>
                        <p className="leading-relaxed">{orgDetails.description || 'No description provided.'}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-1">Sector</h4>
                          <p className="text-white font-medium">{orgDetails.sector || 'N/A'}</p>
                        </div>
                        <div>
                          <h4 className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-1">Target Community</h4>
                          <p className="text-white font-medium">{orgDetails.community || 'N/A'}</p>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-1">Registered Owner</h4>
                        <p className="text-white font-medium">{orgDetails.owner_email || reviewer.organization_owner_email}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">No detailed organization meta-data found in database.</p>
                  )}
                </div>

                <div className="rounded-[2.5rem] border border-white/10 bg-slate-950/70 p-8 shadow-2xl backdrop-blur-xl space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center">
                      <Users className="text-cyan-400 mr-3" size={20} />
                      Organization Reviewers
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Review colleagues registered under the same corporate workspace.</p>
                  </div>

                  <div className="space-y-3">
                    {orgReviewers.length ? orgReviewers.map((other) => (
                      <div key={other.record_id} className={`p-4 rounded-2xl border ${other.email === reviewer.email ? 'border-cyan-500/20 bg-cyan-500/5' : 'border-white/5 bg-slate-900/30'}`}>
                        <div className="text-sm font-bold text-white flex items-center justify-between">
                          <span>{other.name}</span>
                          {other.email === reviewer.email && <span className="text-[9px] bg-cyan-500/20 text-cyan-300 font-black px-2 py-0.5 rounded uppercase tracking-wider">You</span>}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">{other.email}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-2">Role: {other.role || 'Reviewer'}</div>
                      </div>
                    )) : (
                      <p className="text-xs text-slate-500 italic">No other reviewers found.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default ReviewerDashboard;

