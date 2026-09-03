import React, { useState, useEffect } from 'react';
import { ChevronLeft, BarChart3, Brain, FileText, Download } from 'lucide-react';
import { listSimulations, getReport } from '../services/simulationService';

const getAudienceLabel = (aud) => {
  if (typeof aud === 'string') return aud;
  if (aud && typeof aud === 'object') {
    return aud.type || aud.label || aud.demographics?.[0] || 'General';
  }
  return 'General';
};

const formatReportDate = (isoString) => {
  if (!isoString) return 'Unknown Date';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return 'Unknown Date';
  }
};

const Reports = ({ onBack, onViewReport, onOptimizeConcept }) => {
  const [simulations, setSimulations] = useState([]);
  const [selectedSim, setSelectedSim] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  useEffect(() => {
    let active = true;
    listSimulations()
      .then((data) => {
        if (!active) return;
        setSimulations(data || []);
        setIsLoading(false);
        if (data && data.length > 0) {
          // Default to latest simulation
          setSelectedSim(data[0]);
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

  // Fetch report details when selected simulation changes
  useEffect(() => {
    if (!selectedSim) {
      setSelectedReport(null);
      return;
    }

    let active = true;
    setIsLoadingReport(true);
    getReport(selectedSim.simulation_id)
      .then((rep) => {
        if (active) {
          setSelectedReport(rep);
          setIsLoadingReport(false);
        }
      })
      .catch((err) => {
        console.error(err);
        if (active) {
          setSelectedReport(null);
          setIsLoadingReport(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedSim]);

  // Aggregate metrics
  const totalCount = simulations.length;
  const avgBacklash = totalCount > 0 
    ? Math.round(simulations.reduce((sum, s) => sum + (Number(s.backlash_score) || 0), 0) / totalCount)
    : 0;

  const avgSentiment = totalCount > 0 
    ? Math.round(simulations.reduce((sum, s) => sum + (Number(s.metadata?.sentiment_score ?? s.sentiment_score ?? 50)), 0) / totalCount)
    : 50;

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

        <div className="space-y-2 text-right sm:text-left">
          <h1 className="text-4xl font-bold text-white">Reports</h1>
          <p className="text-slate-400">See your public feedbacks and strategic intelligence reports.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-[2.5rem] border border-white/10 p-12 text-center text-slate-400 bg-slate-950/40">
          <div className="inline-block w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p>Loading reports database...</p>
        </div>
      ) : simulations.length === 0 ? (
        <div className="rounded-[2.5rem] border border-white/10 p-12 text-center text-slate-400 bg-[#0b1220]/40">
          <h3 className="text-xl font-bold text-white mb-2">No reports generated yet</h3>
          <p className="mb-6">Run a simulation first to generate reports and recommendations.</p>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
          {/* Selected Report details */}
          <div className="grid gap-6">
            {/* Backlash score card */}
            <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-8 shadow-2xl shadow-slate-950/20 backdrop-blur-xl">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400 mb-6 flex items-center gap-2">
                <BarChart3 size={16} className="text-cyan-400" />
                Backlash Risk Score
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative flex h-36 w-36 items-center justify-center rounded-full bg-white/5 flex-shrink-0">
                  <div className="absolute inset-0 rounded-full border border-white/10" />
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-500/10 blur-xl" />
                  <div className="relative flex flex-col items-center justify-center text-center">
                    <span className="text-5xl font-black text-white">
                      {selectedSim ? `${Math.round(selectedSim.backlash_score)}%` : '—'}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.3em] text-slate-500 mt-2">Probability</span>
                  </div>
                </div>
                <div className="flex-1 space-y-3 w-full">
                  <div className="h-4 rounded-full bg-slate-900/80 overflow-hidden relative border border-white/5">
                    <div 
                      className={`h-full rounded-full transition-all duration-700 ${
                        selectedSim?.backlash_score > 50 ? 'bg-red-500' :
                        selectedSim?.backlash_score > 20 ? 'bg-amber-400' :
                        'bg-cyan-400'
                      }`}
                      style={{ width: `${selectedSim ? Math.min(100, Math.max(5, selectedSim.backlash_score)) : 10}%` }} 
                    />
                  </div>
                  <p className="text-slate-300 text-sm leading-6">
                    {selectedSim?.backlash_score > 50 
                      ? "High risk alert. Significant backlash probability detected across demographic subsegments. Immediate policy wording adjustments recommended." 
                      : selectedSim?.backlash_score > 20 
                      ? "Moderate risk. Wording creates friction with specific segments. Consider minor adjustments prior to rollout."
                      : "Low risk. The concept is highly resonant and demonstrates positive vibes with minor socio-political objections."
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Sentiment breakdown card */}
            <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-8 shadow-2xl shadow-slate-950/20 backdrop-blur-xl">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400 mb-6 flex items-center gap-2">
                <Brain size={16} className="text-cyan-400" />
                Selected Concept Sentiment
              </p>
              <div className="rounded-[2rem] bg-slate-900/40 border border-white/5 p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="space-y-1 text-center sm:text-left">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Aggregate Score</div>
                  <span className="text-5xl font-black text-white">
                    {selectedSim ? `${Math.round(selectedSim.metadata?.sentiment_score ?? selectedSim.sentiment_score ?? (100 - selectedSim.backlash_score))}/100` : '—'}
                  </span>
                </div>
                <div className="flex-1 w-full text-slate-300 text-sm max-w-md leading-relaxed">
                  The sentiment profile maps the overall resonance weight. Positive scores show acceptance, negative values indicate emerging friction points.
                </div>
              </div>
            </div>

            {/* AI intelligence Summary details */}
            <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-8 shadow-2xl shadow-slate-950/20 backdrop-blur-xl">
              <div className="flex items-start justify-between gap-6">
                <div className="space-y-4 w-full">
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                    <Brain size={16} className="text-cyan-400" />
                    AI Intelligence Summary & Recommendations
                  </p>
                  
                  {isLoadingReport ? (
                    <div className="py-6 text-center text-slate-500">
                      <div className="inline-block w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                      <span>Retrieving analysis report...</span>
                    </div>
                  ) : selectedReport ? (
                    <div className="space-y-6">
                      <div className="border-l-2 border-cyan-500/30 pl-4 py-1">
                        <p className="text-slate-200 text-lg leading-relaxed italic">
                          "{selectedReport.executiveSummary}"
                        </p>
                      </div>

                      {selectedReport.strategicRecommendations?.length > 0 && (
                        <div className="bg-slate-900/60 rounded-2xl border border-white/5 p-5 space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Key Action Points:</h4>
                          <ul className="list-disc pl-5 text-sm text-slate-300 space-y-2">
                            {selectedReport.strategicRecommendations.map((rec, idx) => (
                              <li key={idx}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-lg text-slate-500">No report content generated for this simulation yet.</p>
                  )}
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <button
                  type="button"
                  onClick={() => onOptimizeConcept && onOptimizeConcept(selectedSim)}
                  className="rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-6 py-3.5 text-sm font-black transition active:scale-95 shadow-md shadow-cyan-500/10"
                  disabled={!selectedSim}
                >
                  Optimize Concept
                </button>
                <button
                  type="button"
                  onClick={() => onViewReport && onViewReport(selectedSim?.simulation_id)}
                  className="rounded-2xl border border-white/10 bg-slate-900/70 hover:border-cyan-400 hover:bg-slate-800 text-white px-6 py-3.5 text-sm font-bold transition flex items-center justify-center space-x-2"
                  disabled={!selectedSim}
                >
                  <FileText size={18} />
                  <span>View & Download PDF</span>
                </button>
              </div>
            </div>
          </div>

          {/* Reports History Feed (Right Side) */}
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-8 shadow-2xl shadow-slate-950/20 backdrop-blur-xl">
              <div className="mb-8 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-white">Generated Reports List</h3>
                  <p className="text-sm text-slate-500">Select a report to inspect details.</p>
                </div>
                <span className="rounded-full border border-white/10 bg-slate-900/80 px-3 py-1.5 text-[10px] uppercase tracking-[0.25em] text-slate-400 font-bold">
                  {totalCount} reports
                </span>
              </div>

              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {simulations.map((sim) => {
                  const isSelected = selectedSim?.simulation_id === sim.simulation_id;
                  const audienceLabel = getAudienceLabel(sim.audience);
                  const backlash = Math.round(Number(sim.backlash_score ?? 0));
                  const dateStr = formatReportDate(sim.created_at);

                  return (
                    <div 
                      key={sim.simulation_id}
                      onClick={() => setSelectedSim(sim)}
                      className={`cursor-pointer rounded-2xl border p-5 transition-all flex flex-col gap-3 ${
                        isSelected 
                          ? 'border-cyan-500/50 bg-cyan-950/15 shadow-[0_0_15px_rgba(6,182,212,0.05)]' 
                          : 'border-white/5 bg-slate-900/30 hover:border-white/10 hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-white text-base leading-snug line-clamp-1">{sim.concept}</h4>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded ${
                          backlash > 50 ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          backlash > 20 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          Risk: {backlash}%
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="bg-white/5 px-2 py-0.5 rounded text-[10px] tracking-wide uppercase">
                          {audienceLabel}
                        </span>
                        <span>{dateStr}</span>
                      </div>

                      <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-white/5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewReport && onViewReport(sim.simulation_id);
                          }}
                          className="px-3 py-1 bg-white/5 hover:bg-cyan-500 hover:text-slate-950 text-slate-300 text-xs font-bold rounded-lg transition flex items-center space-x-1"
                        >
                          <Download size={12} />
                          <span>PDF</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Average Metrics card */}
            <div className="rounded-[2rem] border border-dashed border-white/10 bg-slate-950/70 p-6 flex justify-between items-center gap-4 text-slate-300">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-bold">Risk Average</p>
                <p className="text-3xl font-black text-white mt-1">{avgBacklash}%</p>
              </div>
              <div className="w-px h-10 bg-white/10"></div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-bold">Resonance avg</p>
                <p className="text-3xl font-black text-white mt-1">{avgSentiment}/100</p>
              </div>
              <div className="w-px h-10 bg-white/10"></div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-bold">Total Runs</p>
                <p className="text-3xl font-black text-white mt-1">{totalCount}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
