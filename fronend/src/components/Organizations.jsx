import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { listOrganizations, listReviewers, registerReviewer } from '../services/accountService';

const Organizations = ({ onBack, onCreateOrg }) => {
  const [activeTab, setActiveTab] = useState('Corporates');
  const [organizations, setOrganizations] = useState([]);
  const [reviewers, setReviewers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingReviewer, setIsSavingReviewer] = useState(false);
  const [message, setMessage] = useState('');
  const [reviewerForm, setReviewerForm] = useState({
    organizationId: '',
    name: '',
    email: '',
    password: '',
  });

  useEffect(() => {
    let mounted = true;
    const ownerEmail = localStorage.getItem('currentUserEmail') || '';

    const load = async () => {
      setIsLoading(true);
      try {
        const [organizationsResponse, reviewersResponse] = await Promise.all([
          listOrganizations(),
          listReviewers({ ownerEmail }),
        ]);

        if (!mounted) return;
        setOrganizations(organizationsResponse?.organizations || []);
        setReviewers(reviewersResponse?.reviewers || []);
        if (!reviewerForm.organizationId && organizationsResponse?.organizations?.length) {
          setReviewerForm((current) => ({
            ...current,
            organizationId: organizationsResponse.organizations[0].record_id,
          }));
        }
      } catch (error) {
        if (mounted) {
          setMessage(error?.message || 'Failed to load organizations.');
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const reviewersByOrg = useMemo(() => {
    return reviewers.reduce((accumulator, reviewer) => {
      const key = reviewer.organization_id || 'unknown';
      accumulator[key] = [...(accumulator[key] || []), reviewer];
      return accumulator;
    }, {});
  }, [reviewers]);

  const handleReviewerSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setIsSavingReviewer(true);

    try {
      const selectedOrganization = organizations.find((item) => item.record_id === reviewerForm.organizationId);
      if (!selectedOrganization) {
        throw new Error('Select an organization before registering a reviewer.');
      }

      await registerReviewer({
        organization_id: selectedOrganization.record_id,
        organization_name: selectedOrganization.name,
        organization_owner_email: selectedOrganization.owner_email,
        name: reviewerForm.name,
        email: reviewerForm.email,
        password: reviewerForm.password,
      });

      const reviewersResponse = await listReviewers({ ownerEmail: localStorage.getItem('currentUserEmail') || '' });
      setReviewers(reviewersResponse?.reviewers || []);
      setReviewerForm((current) => ({
        ...current,
        name: '',
        email: '',
        password: '',
      }));
      setMessage('Reviewer registered successfully. They can now log in on the Reviewer page.');
    } catch (error) {
      setMessage(error?.message || 'Failed to register reviewer.');
    } finally {
      setIsSavingReviewer(false);
    }
  };

  const categories = ['Government', 'Corporates', 'NGOs', 'PR Agencies'];

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center space-x-2 text-white hover:text-slate-200 transition-colors group"
        >
          <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Back to Agency Dashboard</span>
        </button>

        <div className="flex items-center justify-between gap-4">
          <h1 className="text-4xl font-bold text-white">Your Organizations</h1>
          <button
            type="button"
            onClick={onCreateOrg}
            className="inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400"
          >
            <span className="text-xl">+</span>
            New Organization
          </button>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[280px_1fr]">
        <aside className="space-y-3 rounded-[2rem] border border-white/10 bg-white/5 p-4 shadow-2xl shadow-slate-950/10 backdrop-blur-xl">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveTab(cat)}
              className={`flex w-full items-center justify-between rounded-3xl px-5 py-4 text-left text-sm font-semibold transition ${
                activeTab === cat
                  ? 'bg-cyan-500/10 text-cyan-300 ring-1 ring-cyan-400/20'
                  : 'bg-transparent text-slate-400 hover:bg-slate-900/70 hover:text-white'
              }`}
            >
              <span>{cat}</span>
              {activeTab === cat && <span className="text-cyan-300">◀</span>}
            </button>
          ))}
        </aside>

        <main className="space-y-6 rounded-[2rem] border border-white/10 bg-slate-950/70 p-8 shadow-2xl shadow-slate-950/20 backdrop-blur-xl">
          {activeTab === 'Corporates' ? (
            <div className="space-y-6">
              <div className="rounded-[2rem] bg-slate-900/80 p-8 shadow-inner shadow-slate-950/20">
                <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-4">
                    <h2 className="text-3xl font-bold text-white tracking-tight">
                      {isLoading ? 'Loading organizations...' : organizations.length ? 'Organization Overview' : 'No organizations yet'}
                    </h2>
                    <p className="max-w-3xl text-sm leading-7 text-slate-300">
                      Use this panel to create organizations and register reviewers who can sign in and submit feedback.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {organizations.map((organization) => (
                    <div key={organization.record_id} className="rounded-3xl border border-white/10 bg-slate-950/80 p-5">
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{organization.sector}</p>
                      <h3 className="mt-3 text-xl font-bold text-white">{organization.name}</h3>
                      <p className="mt-2 text-sm text-slate-400">{organization.community}</p>
                      <div className="mt-5 flex items-center justify-between text-xs uppercase tracking-[0.25em] text-slate-500">
                        <span>Reviewers</span>
                        <span>{(reviewersByOrg[organization.record_id] || []).length}</span>
                      </div>
                    </div>
                  ))}
                  {!organizations.length && !isLoading && (
                    <div className="rounded-3xl border border-dashed border-white/10 bg-slate-950/50 p-8 text-sm text-slate-400">
                      No organizations registered yet. Create one first, then add reviewers to it.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[2rem] border border-cyan-500/15 bg-cyan-500/5 p-8 shadow-xl shadow-cyan-950/10">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">Reviewer Registration</p>
                    <h3 className="mt-3 text-2xl font-bold text-white">Add a reviewer to an organization</h3>
                    <p className="mt-2 text-sm text-slate-300">The reviewer can log in with the credentials you create here and submit reviews later.</p>
                  </div>
                  <div className="text-xs uppercase tracking-[0.25em] text-slate-500">
                    {reviewers.length} registered reviewer{reviewers.length === 1 ? '' : 's'}
                  </div>
                </div>

                <form onSubmit={handleReviewerSubmit} className="mt-8 grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-slate-200">Organization</label>
                    <select
                      value={reviewerForm.organizationId}
                      onChange={(event) => setReviewerForm((current) => ({ ...current, organizationId: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none"
                      required
                    >
                      <option value="">Select organization</option>
                      {organizations.map((organization) => (
                        <option key={organization.record_id} value={organization.record_id}>{organization.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-200">Reviewer Name</label>
                    <input
                      value={reviewerForm.name}
                      onChange={(event) => setReviewerForm((current) => ({ ...current, name: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none"
                      placeholder="Enter reviewer name"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-200">Reviewer Email</label>
                    <input
                      type="email"
                      value={reviewerForm.email}
                      onChange={(event) => setReviewerForm((current) => ({ ...current, email: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none"
                      placeholder="reviewer@example.com"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-slate-200">Password</label>
                    <input
                      type="password"
                      value={reviewerForm.password}
                      onChange={(event) => setReviewerForm((current) => ({ ...current, password: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none"
                      placeholder="Create login password"
                      required
                    />
                  </div>

                  {message && <div className="md:col-span-2 rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-200">{message}</div>}

                  <div className="md:col-span-2 flex items-center justify-end">
                    <button
                      type="submit"
                      disabled={isSavingReviewer || !organizations.length}
                      className="rounded-full bg-cyan-500 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSavingReviewer ? 'Registering...' : 'Register Reviewer'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-8 shadow-2xl shadow-slate-950/20 backdrop-blur-xl">
                <h3 className="text-xl font-bold text-white">Registered reviewers</h3>
                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {reviewers.length ? reviewers.map((reviewer) => (
                    <div key={reviewer.record_id} className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{reviewer.organization_name}</p>
                      <h4 className="mt-3 text-lg font-bold text-white">{reviewer.name}</h4>
                      <p className="mt-1 text-sm text-slate-400">{reviewer.email}</p>
                    </div>
                  )) : (
                    <div className="rounded-3xl border border-dashed border-white/10 bg-slate-900/50 p-8 text-sm text-slate-400">
                      No reviewers registered yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-[2rem] border border-dashed border-white/10 bg-slate-900/70 p-16 text-center text-slate-400">
              No organizations registered under <span className="font-semibold text-white">{activeTab}</span> yet.
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Organizations;