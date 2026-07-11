import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, BrainCircuit, Flame, BarChart3, Download, Sparkles } from 'lucide-react';
import { loadSimulationResult, SIMULATION_RESULT_STORAGE_KEY } from '../services/geminiService';
import { downloadSimulationResultPdf } from '../utils/simulationResultPdf';
import { scoreLabel, scoreToColor } from '../utils/heatmapUtils';

const SimulationResultWindow = ({ onClose }) => {
  const [result, setResult] = useState(() => loadSimulationResult());
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    document.title = 'Simulation Result - RaawaAI';

    const syncResult = () => setResult(loadSimulationResult());
    syncResult();

    const handleStorage = (event) => {
      if (event.key === SIMULATION_RESULT_STORAGE_KEY) {
        syncResult();
      }
    };

    window.addEventListener('storage', handleStorage);
    const interval = window.setInterval(syncResult, 800);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.clearInterval(interval);
    };
  }, []);

  const heatmapRows = useMemo(() => {
    if (!result?.heatmapMatrix?.length) return [];
    return result.heatmapMatrix;
  }, [result]);

  const handleClose = () => {
    const dashboardPath = '/agency-dashboard';

    if (window.opener && !window.opener.closed) {
      try {
        window.opener.postMessage(
          { type: 'raawaai:navigate', path: dashboardPath },
          window.location.origin,
        );
        window.opener.focus();
      } catch (error) {
        console.warn('Could not focus main application window:', error);
      }

      window.close();

      window.setTimeout(() => {
        if (!window.closed) {
          window.location.replace(dashboardPath);
        }
      }, 200);
      return;
    }

    if (typeof onClose === 'function') {
      onClose();
    }
  };

  const handleDownloadPdf = async () => {
    if (!result || isDownloading) return;

    setIsDownloading(true);
    try {
      await downloadSimulationResultPdf(result);
    } catch (error) {
      console.error('PDF download failed:', error);
      alert('Failed to generate the simulation PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!result) {
    return (
      <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center px-6">
        <div className="max-w-xl w-full rounded-[2rem] border border-white/10 bg-white/[0.04] p-10 shadow-2xl backdrop-blur-xl text-center space-y-5">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-cyan-500/15 border border-cyan-400/20 flex items-center justify-center text-cyan-300">
            <Sparkles size={28} />
          </div>
          <h1 className="text-3xl font-black">Waiting for simulation output</h1>
          <p className="text-slate-400 leading-relaxed">
            The analysis window will populate as soon as the multi-agent engine finishes.
            If you launched this page manually, run a simulation first.
          </p>
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
          >
            <ChevronLeft size={16} />
            Back to Agency Dashboard
          </button>
        </div>
      </div>
    );
  }

  const heatmapCells = heatmapRows.flatMap((row) => row.days.map((day) => ({
    region: row.region,
    day: day.day,
    score: Number(day.score) || 0,
    intensity: Number(day.intensity) || 0,
    count: Number(day.count) || 0,
  })));

  return (
    <div className="min-h-screen bg-[#020617] text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.14),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.16),_transparent_35%)]" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-8 space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
            >
              <ChevronLeft size={16} />
              Back to Agency Dashboard
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-5 py-3 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Download size={16} />
              {isDownloading ? 'Generating PDF...' : 'Download PDF Report'}
            </button>
          </div>

          <div className="text-right space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-cyan-300">Multi-Agent Simulation Output</p>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">AI Sentiment Heat Map</h1>
          </div>
        </div>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Backlash Probability</p>
                <h2 className="mt-2 text-4xl font-black text-white">{result.backlashProbability}%</h2>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-rose-500/15 border border-rose-400/20 flex items-center justify-center text-rose-300">
                <Flame size={28} />
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              AI-aggregated risk estimate based on persona reactions, regional volatility, and the proportion of negative events.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Sentiment Score</p>
                <h2 className="mt-2 text-4xl font-black text-white">{result.sentimentScore >= 0 ? '+' : ''}{result.sentimentScore}</h2>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-cyan-500/15 border border-cyan-400/20 flex items-center justify-center text-cyan-300">
                <BrainCircuit size={28} />
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              The engine classifies each persona reaction with Hugging Face sentiment scoring before aggregating the result.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Event Coverage</p>
                <h2 className="mt-2 text-4xl font-black text-white">{result.summary?.total_events ?? result.reactions?.length ?? 0}</h2>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-emerald-500/15 border border-emerald-400/20 flex items-center justify-center text-emerald-300">
                <BarChart3 size={28} />
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Multi-agent personas were simulated across the configured horizon and summarized into the heat map below.
            </p>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">Heat Map</p>
              <h2 className="text-2xl font-black text-white">Region-by-day sentiment intensity</h2>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
              <span className="inline-flex h-3 w-3 rounded-full bg-red-500/80" /> Negative
              <span className="inline-flex h-3 w-3 rounded-full bg-slate-500/60" /> Neutral
              <span className="inline-flex h-3 w-3 rounded-full bg-emerald-400/90" /> Positive
            </div>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="min-w-[980px] space-y-3">
              <div className="grid gap-2" style={{ gridTemplateColumns: `220px repeat(${Math.max(1, (heatmapRows[0]?.days?.length || 1))}, minmax(18px, 1fr))` }}>
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 py-2">Region</div>
                {(heatmapRows[0]?.days || []).map((day) => (
                  <div key={day.day} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 py-2 text-center">
                    D{day.day}
                  </div>
                ))}
              </div>

              {heatmapRows.map((row) => (
                <div key={row.region} className="grid gap-2 items-stretch" style={{ gridTemplateColumns: `220px repeat(${row.days.length}, minmax(18px, 1fr))` }}>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 flex flex-col justify-center">
                    <div className="font-bold text-white">{row.region}</div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mt-1">
                      Avg {Math.round((Number(row.average) || 0) * 100)} • Vol {Math.round((Number(row.volatility) || 0) * 100)}
                    </div>
                  </div>

                  {row.days.map((day) => {
                    const cellColor = scoreToColor(day.score);
                    return (
                      <div
                        key={`${row.region}-${day.day}`}
                        title={`${row.region} | Day ${day.day} | ${scoreLabel(day.score)} (${day.score}) | ${day.count} events`}
                        className="min-h-12 rounded-2xl border border-white/5 shadow-lg transition-transform hover:-translate-y-0.5"
                        style={{ background: cellColor }}
                      >
                        <div className="flex h-full flex-col justify-between p-3 text-[10px] font-black uppercase tracking-[0.15em] text-white/85">
                          <span>{scoreLabel(day.score)}</span>
                          <span>{day.count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-xl space-y-6">
            <h3 className="text-xl font-black">Simulation Summary</h3>
            <pre className="whitespace-pre-wrap rounded-3xl border border-white/10 bg-slate-950/80 p-6 text-sm leading-relaxed text-slate-300 overflow-x-auto">
              {JSON.stringify(result.summary, null, 2)}
            </pre>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-xl space-y-6">
            <h3 className="text-xl font-black">Sample AI Reactions</h3>
            <div className="space-y-4 max-h-[520px] overflow-y-auto pr-2">
              {(result.sample_posts || result.reactions || []).slice(0, 6).map((item, index) => (
                <div key={item.id || index} className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-bold text-white">{item.personaName || item.persona || `Persona ${index + 1}`}</div>
                      <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500 mt-1">{item.sentiment || 'neutral'}</div>
                    </div>
                    <div className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] ${item.sentiment === 'positive' ? 'bg-emerald-500/15 text-emerald-300' : item.sentiment === 'negative' ? 'bg-rose-500/15 text-rose-300' : 'bg-slate-500/15 text-slate-300'}`}>
                      {item.sentiment || 'neutral'}
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-slate-300 whitespace-pre-wrap">
                    {item.postContent || item.post || item.comments || 'No reaction text returned.'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SimulationResultWindow;