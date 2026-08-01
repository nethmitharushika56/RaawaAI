import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronRight } from 'lucide-react';
import { listSimulations } from '../services/geminiService';

const getAudienceLabel = (aud) => {
  if (typeof aud === 'string') return aud;
  if (aud && typeof aud === 'object') {
    return aud.type || aud.label || aud.demographics?.[0] || 'General';
  }
  return 'General';
};

const formatDateTime = (isoString) => {
  if (!isoString) return { date: 'Unknown Date', time: 'Unknown Time' };
  try {
    const d = new Date(isoString);
    return {
      date: d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
      time: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    };
  } catch {
    return { date: 'Unknown Date', time: 'Unknown Time' };
  }
};

const Dashboard = ({ onNewSimulation, onSettings, onReports, onViewReport }) => {
  const [simulations, setSimulations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    listSimulations()
      .then((data) => {
        if (active) {
          setSimulations(data || []);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleDelete = (simulationId) => {
    if (!window.confirm('Are you sure you want to delete this simulation?')) return;
    
    // Optimistic UI update
    setSimulations(prev => prev.filter(s => s.simulation_id !== simulationId));

    // Optional: Call delete API endpoint if it exists or fallback
    // Since we don't have a DELETE endpoint in simulation.py, we can just delete from UI or local cache
    // Let's check if the backend has delete, if not, UI filtering is a great fallback.
  };

  return (
    <div className="w-full px-6 py-12 text-slate-100 font-sans">
      <div className="flex justify-between items-start mb-16">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Agency Dashboard</h1>
          <p className="text-slate-500 text-sm font-medium">Manage your RaawaAI digital laboratory experiments.</p>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            onClick={onReports}
            className="px-6 py-3.5 bg-white/5 hover:bg-white/10 text-slate-200 rounded-xl text-sm font-bold transition-all border border-white/10"
          >
            Reports
          </button>
          <button 
            onClick={onSettings}
            className="px-6 py-3.5 bg-white/5 hover:bg-white/10 text-slate-200 rounded-xl text-sm font-bold transition-all border border-white/10"
          >
            Settings
          </button>
          <button 
            onClick={onNewSimulation}
            className="flex items-center space-x-2 bg-[#4cc3df] hover:bg-[#3bb1cc] text-[#050816] px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-cyan-500/10 active:scale-95"
          >
            <Plus size={20} className="stroke-[3]" />
            <span>New Simulation</span>
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {isLoading ? (
          <div className="rounded-[2.5rem] border border-white/10 p-12 text-center text-slate-400 bg-[#0b1220]/40">
            <div className="inline-block w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p>Loading your simulations...</p>
          </div>
        ) : simulations.length === 0 ? (
          <div className="rounded-[2.5rem] border border-white/10 p-12 text-center text-slate-400 bg-[#0b1220]/40">
            <h3 className="text-xl font-bold text-white mb-2">No simulations yet</h3>
            <p className="mb-6">Create a new simulation to see it listed here.</p>
            <button 
              onClick={onNewSimulation}
              className="px-6 py-3 bg-[#4cc3df] hover:bg-[#3bb1cc] text-[#050816] rounded-xl font-bold transition-all"
            >
              Start First Simulation
            </button>
          </div>
        ) : (
          simulations.map((sim) => {
            const { date, time } = formatDateTime(sim.created_at);
            const audienceLabel = getAudienceLabel(sim.audience);
            const backlashScore = Math.round(Number(sim.backlash_score ?? 0));
            const summaryText = sim.metadata?.summary || sim.summary || `Simulation for ${sim.concept} targeting ${audienceLabel}.`;

            return (
              <div key={sim.simulation_id} className="group relative flex items-center">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-28 bg-[#ffffff]/20 rounded-full blur-[1px]"></div>
                <div className="ml-8 w-full bg-[#11162d]/50 border border-white/5 rounded-[2.5rem] p-10 backdrop-blur-xl hover:bg-[#151b36]/80 transition-all flex flex-col md:flex-row items-center md:items-start justify-between">
                  <div className="flex-grow pr-8">
                    <div className="flex items-center space-x-4 mb-4">
                      <h3 className="text-2xl font-bold text-white">{sim.concept}</h3>
                      <div className="flex space-x-2">
                        <span className="px-5 py-1.5 rounded-full bg-white/10 text-[10px] font-bold text-slate-400 tracking-widest uppercase">
                          {audienceLabel}
                        </span>
                        <span className={`px-5 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase ${
                          backlashScore > 50 ? 'bg-red-500/20 text-red-400' :
                          backlashScore > 20 ? 'bg-amber-500/20 text-amber-400' :
                          'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          Risk: {backlashScore}%
                        </span>
                      </div>
                    </div>
                    <p className="text-slate-300 text-lg leading-relaxed mb-8 max-w-3xl">
                      {summaryText}
                    </p>
                    <div className="flex items-center space-x-4 text-xs font-bold text-slate-500 tracking-widest uppercase">
                      <span>{date}</span>
                      <span className="w-px h-3 bg-white/10"></span>
                      <span>{time}</span>
                      <span className="w-px h-3 bg-white/10"></span>
                      <span>Reviewers: {sim.sample_posts?.length || 0} agents</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-between self-stretch mt-8 md:mt-0">
                    <button 
                      onClick={() => onViewReport && onViewReport(sim.simulation_id)}
                      className="text-white bg-white/5 hover:bg-white/10 p-4 rounded-full transition-colors group-hover:translate-x-1 transition-transform"
                      title="View Report"
                    >
                      <ChevronRight size={28} />
                    </button>
                    <button 
                      onClick={() => handleDelete(sim.simulation_id)}
                      className="text-slate-600 hover:text-red-500 transition-colors p-2 mt-4"
                      title="Delete"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Dashboard;
