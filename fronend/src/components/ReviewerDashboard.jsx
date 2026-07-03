import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { listReviews, listSimulations, loginReviewer, submitReview } from '../services/accountService';

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

const ReviewerDashboard = ({ onBack }) => {
  const [reviewer, setReviewer] = useState(() => loadReviewerSession());
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [simulations, setSimulations] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [selectedSimulationId, setSelectedSimulationId] = useState('');
  const [reviewForm, setReviewForm] = useState({ rating: '4', reviewText: '' });
  const [statusMessage, setStatusMessage] = useState('');
  const [isSavingReview, setIsSavingReview] = useState(false);

  const selectedSimulation = useMemo(
    () => simulations.find((simulation) => simulation.simulation_id === selectedSimulationId),
    [selectedSimulationId, simulations],
  );

  useEffect(() => {
    if (!reviewer) return;

    let mounted = true;
    const load = async () => {
      try {
        const [simulationsResponse, reviewsResponse] = await Promise.all([
          listSimulations(),
          listReviews({ reviewerEmail: reviewer.email, organizationId: reviewer.organization_id }),
        ]);
        if (!mounted) return;
        setSimulations(simulationsResponse?.simulations || []);
        setReviews(reviewsResponse?.reviews || []);
        if (!selectedSimulationId && simulationsResponse?.simulations?.length) {
          setSelectedSimulationId(simulationsResponse.simulations[0].simulation_id);
        }
      } catch (error) {
        if (mounted) setStatusMessage(error?.message || 'Failed to load reviewer workspace.');
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [reviewer, selectedSimulationId]);

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
    setReviewForm({ rating: '4', reviewText: '' });
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

      const reviewsResponse = await listReviews({ reviewerEmail: reviewer.email, organizationId: reviewer.organization_id });
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
                className="w-full rounded-2xl border border-white/10 bg-slate-900/90 px-4 py-3 text-slate-100 outline-none"
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
                className="w-full rounded-2xl border border-white/10 bg-slate-900/90 px-4 py-3 text-slate-100 outline-none"
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
            <h1 className="mt-3 text-4xl font-bold text-white">Available Simulations</h1>
            <p className="mt-2 text-slate-400">Signed in as {reviewer.name} for {reviewer.organization_name}.</p>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-full border border-white/10 bg-slate-900/80 px-5 py-3 text-sm font-semibold text-white hover:border-cyan-400 transition"
          >
            Sign Out
          </button>
        </div>

        <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-slate-950/20 shadow-xl">
            <div className="mb-8 px-2">
              <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Navigation</p>
            </div>
            <div className="space-y-3">
              <button className="w-full rounded-3xl border border-slate-800 bg-slate-900/90 px-5 py-4 text-left text-sm font-semibold text-white shadow-inner shadow-slate-950/10">
                Organizations
              </button>
              <button className="w-full rounded-3xl border border-cyan-500/20 bg-cyan-500/10 px-5 py-4 text-left text-sm font-semibold text-cyan-200 shadow-lg shadow-cyan-500/10">
                Simulations
              </button>
            </div>
          </aside>

          <main className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-inner shadow-slate-950/20">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                <div className="space-y-4">
                  <span className="inline-flex rounded-full bg-slate-700/80 px-4 py-2 text-xs uppercase tracking-[0.3em] text-slate-300">
                    {simulations.length ? 'Ready for Review' : 'Pending'}
                  </span>
                  <h2 className="text-2xl font-bold text-white">{simulations.length ? 'Pick a simulation and submit feedback' : 'No simulations available'}</h2>
                  <p className="text-slate-400 max-w-3xl">Reviewers can read each simulation, score it, and leave a written review for the organization.</p>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="rounded-3xl border border-white/10 bg-slate-950/80 px-6 py-5 text-center">
                    <span className="block text-5xl font-black text-emerald-400">{reviews.length}</span>
                    <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Your Reviews</span>
                  </div>
                </div>
              </div>
            </div>

            {statusMessage && <div className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-200">{statusMessage}</div>}

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-8 shadow-2xl shadow-slate-950/20 backdrop-blur-xl">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">Review Simulation</h3>
                    <p className="text-sm text-slate-500">Select a simulation from your organization feed.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {simulations.length ? simulations.map((simulation) => (
                    <button
                      key={simulation.simulation_id}
                      type="button"
                      onClick={() => setSelectedSimulationId(simulation.simulation_id)}
                      className={`w-full rounded-3xl border px-5 py-4 text-left transition ${selectedSimulationId === simulation.simulation_id ? 'border-cyan-400/30 bg-cyan-500/10 text-white' : 'border-white/10 bg-slate-900/80 text-slate-300 hover:border-cyan-400/20 hover:bg-slate-900'}`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold">{simulation.concept}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.25em] text-slate-500">{simulation.audience}</div>
                        </div>
                        <div className="text-xs uppercase tracking-[0.25em] text-slate-500">{simulation.backlash_score ?? simulation.backlash_probability ?? '—'}%</div>
                      </div>
                    </button>
                  )) : (
                    <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-8 text-center text-slate-400">
                      There are currently no simulations to review.
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-8 shadow-2xl shadow-slate-950/20 backdrop-blur-xl">
                  <h3 className="text-xl font-bold text-white">Submit a Review</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    {selectedSimulation ? `Reviewing ${selectedSimulation.concept}` : 'Select a simulation to start reviewing.'}
                  </p>

                  <form onSubmit={handleReviewSubmit} className="mt-6 space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-200">Rating</label>
                      <select
                        value={reviewForm.rating}
                        onChange={(event) => setReviewForm((current) => ({ ...current, rating: event.target.value }))}
                        className="w-full rounded-2xl border border-white/10 bg-slate-900/90 px-4 py-3 text-slate-100 outline-none"
                        disabled={!selectedSimulation}
                        required
                      >
                        <option value="1">1 - Very weak</option>
                        <option value="2">2 - Weak</option>
                        <option value="3">3 - Neutral</option>
                        <option value="4">4 - Strong</option>
                        <option value="5">5 - Excellent</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-200">Review Text</label>
                      <textarea
                        value={reviewForm.reviewText}
                        onChange={(event) => setReviewForm((current) => ({ ...current, reviewText: event.target.value }))}
                        className="min-h-[180px] w-full rounded-2xl border border-white/10 bg-slate-900/90 px-4 py-3 text-slate-100 outline-none"
                        placeholder="Write your review here..."
                        disabled={!selectedSimulation}
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!selectedSimulation || isSavingReview}
                      className="w-full rounded-2xl bg-cyan-500 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSavingReview ? 'Submitting...' : 'Submit Review'}
                    </button>
                  </form>
                </div>

                <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-8 shadow-2xl shadow-slate-950/20 backdrop-blur-xl">
                  <h3 className="text-xl font-bold text-white">Your Reviews</h3>
                  <div className="mt-5 space-y-4">
                    {reviews.length ? reviews.map((review) => (
                      <div key={review.record_id} className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <div className="text-sm font-semibold text-white">{review.simulation_id}</div>
                            <div className="mt-1 text-xs uppercase tracking-[0.25em] text-slate-500">Rating: {review.rating}/5</div>
                          </div>
                        </div>
                        <p className="mt-4 text-sm leading-6 text-slate-300">{review.review_text}</p>
                      </div>
                    )) : (
                      <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-8 text-center text-slate-400">
                        No reviews submitted yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default ReviewerDashboard;
