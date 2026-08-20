import React from 'react';
import html2pdf from 'html2pdf.js';

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

const scoreToColor = (score) => {
  const val = clamp(Number(score) || 0, -1, 1);
  const ratio = Math.abs(val);
  
  // Base color: Slate-800/90 (30, 41, 59)
  const base = { r: 30, g: 41, b: 59 };
  
  if (val >= 0) {
    // Target: Emerald-500 (16, 185, 129)
    const target = { r: 16, g: 185, b: 129 };
    const r = Math.round(base.r + ratio * (target.r - base.r));
    const g = Math.round(base.g + ratio * (target.g - base.g));
    const b = Math.round(base.b + ratio * (target.b - base.b));
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // Target: Red-500 (239, 68, 68)
    const target = { r: 239, g: 68, b: 68 };
    const r = Math.round(base.r + ratio * (target.r - base.r));
    const g = Math.round(base.g + ratio * (target.g - base.g));
    const b = Math.round(base.b + ratio * (target.b - base.b));
    return `rgb(${r}, ${g}, ${b})`;
  }
};

const ReportViewer = ({ report, onClose }) => {
  React.useEffect(() => {
    // Hide body scrollbar when report is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleDownload = () => {
    const lines = [
      report.title || 'Simulation Report',
      '',
      `Generated: ${report.date || new Date().toISOString().slice(0, 10)}`,
      '',
      '## Executive Summary',
      report.executiveSummary || '',
      '',
      '## Risk Analysis',
      report.riskAnalysis || '',
      '',
      '## Demographic Impact',
      report.demographicImpact || '',
      '',
      '## Strategic Recommendations',
      ...(Array.isArray(report.strategicRecommendations) ? report.strategicRecommendations.map((item, index) => `${index + 1}. ${item}`) : []),
      '',
      '## Conclusion',
      report.conclusion || '',
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(report.title || 'simulation-report').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById('report-pdf-content');
    if (!element) return;

    const opt = {
      margin:       [0.5, 0.5, 0.5, 0.5],
      filename:     `${(report.title || 'simulation-report').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { 
        scale: 2, 
        useCORS: true,
        ignoreElements: (el) => el.classList.contains('no-print')
      },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    try {
      html2pdf().set(opt).from(element).save().catch((err) => {
        console.warn('html2pdf async failed, falling back to window.print():', err);
        window.print();
      });
    } catch (e) {
      console.warn('html2pdf sync failed, calling window.print():', e);
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-start justify-center overflow-y-auto p-4 sm:p-10 animate-in fade-in duration-300">
      <div id="report-pdf-content" className="max-w-4xl w-full rounded-[2rem] shadow-2xl overflow-hidden print:shadow-none print:rounded-none animate-in zoom-in duration-500 relative" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>
        
        {/* Report Header */}
        <div className="p-8 sm:p-12 border-b-8 flex justify-between items-start" style={{ backgroundColor: '#f8fafc', borderColor: '#0f172a' }}>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded flex flex-col justify-center items-center p-1 space-y-1" style={{ backgroundColor: '#0f172a' }}>
                <div className="w-full h-[3px] bg-white"></div>
                <div className="w-full h-[3px] bg-white"></div>
              </div>
              <span className="text-xl font-black tracking-tighter" style={{ color: '#0f172a' }}>RAAWA ANALYSIS</span>
            </div>
            <h1 className="text-4xl font-black uppercase leading-none tracking-tight mb-2" style={{ color: '#0f172a' }}>
              {report.title}
            </h1>
            <p className="font-bold uppercase tracking-[0.2em] text-[10px]" style={{ color: '#64748b' }}>
              Generated: {report.date} • Confidential Strategic Report
            </p>
          </div>
          <div className="flex items-center space-x-3 no-print">
            <button
              onClick={handleDownloadPDF}
              className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl flex items-center space-x-2 transition-all shadow-lg active:scale-95 text-xs uppercase tracking-wider"
              title="Download PDF"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Download PDF</span>
            </button>
            <button 
              onClick={onClose}
              className="p-2.5 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-red-500 transition-all hover:border-red-500 active:scale-95 flex items-center justify-center"
              title="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
        </div>

        {/* Report Content */}
        <div className="p-8 sm:p-12 space-y-12" style={{ backgroundColor: '#ffffff' }}>
          
          <section>
            <h2 className="text-xs font-black uppercase tracking-[0.3em] mb-6 flex items-center" style={{ color: '#94a3b8' }}>
              <span className="w-4 h-[2px] mr-4" style={{ backgroundColor: '#0f172a' }}></span>
              01 EXECUTIVE SUMMARY
            </h2>
            <div className="pl-8 border-l-2" style={{ borderColor: '#e2e8f0' }}>
              <p className="text-xl leading-relaxed font-medium italic whitespace-pre-wrap" style={{ color: '#1e293b' }}>
                "{report.executiveSummary}"
              </p>
            </div>
          </section>

          {/* Section 02: Simulation Metrics & Sentiment Heatmap */}
          <section className="rounded-3xl p-8 border space-y-8 print:border-none print:shadow-none" style={{ backgroundColor: '#020617', color: '#ffffff', borderColor: '#1e293b' }}>
            <h2 className="text-xs font-black uppercase tracking-[0.35em] flex items-center border-b pb-4" style={{ color: '#22d3ee', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
              <span className="w-4 h-[2px] mr-4" style={{ backgroundColor: '#22d3ee' }}></span>
              02 SIMULATION METRICS & SENTIMENT HEATMAP
            </h2>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="border rounded-2xl p-6 flex items-center justify-between" style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: '#94a3b8' }}>Backlash Risk</span>
                  <div className="text-3xl font-black mt-1" style={{ color: '#fb7185' }}>{report.backlash_probability ?? 0}%</div>
                </div>
                <div className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest" style={{
                  backgroundColor: (report.backlash_probability ?? 0) > 50 ? 'rgba(239, 68, 68, 0.2)' : (report.backlash_probability ?? 0) > 20 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                  color: (report.backlash_probability ?? 0) > 50 ? '#fca5a5' : (report.backlash_probability ?? 0) > 20 ? '#fcd34d' : '#6ee7b7'
                }}>
                  {(report.backlash_probability ?? 0) > 50 ? 'High' :
                   (report.backlash_probability ?? 0) > 20 ? 'Moderate' :
                   'Low'}
                </div>
              </div>

              <div className="border rounded-2xl p-6 flex items-center justify-between" style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: '#94a3b8' }}>Sentiment Score</span>
                  <div className="text-3xl font-black mt-1" style={{ color: '#22d3ee' }}>
                    {(report.sentiment_score ?? 0) >= 0 ? '+' : ''}{report.sentiment_score ?? 0}/100
                  </div>
                </div>
                <div className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest" style={{
                  backgroundColor: (report.sentiment_score ?? 0) > 20 ? 'rgba(16, 185, 129, 0.2)' : (report.sentiment_score ?? 0) < -20 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                  color: (report.sentiment_score ?? 0) > 20 ? '#6ee7b7' : (report.sentiment_score ?? 0) < -20 ? '#fca5a5' : '#cbd5e1'
                }}>
                  {(report.sentiment_score ?? 0) > 20 ? 'Positive' :
                   (report.sentiment_score ?? 0) < -20 ? 'Negative' :
                   'Neutral'}
                </div>
              </div>
            </div>

            {/* Heatmap Grid */}
            {report.heatmap_matrix && report.heatmap_matrix.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider" style={{ color: '#94a3b8' }}>
                  <span>Sentiment Intensity Grid</span>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-red-500" /> Negative
                    <span className="inline-block h-2 w-2 rounded-full bg-slate-600" /> Neutral
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> Positive
                  </div>
                </div>
                
                <div className="overflow-x-auto pb-2 custom-scrollbar">
                  <div className="w-max space-y-1.5 min-w-full">
                    {/* Header Row */}
                    <div 
                      className="grid gap-1 items-center border-b pb-1 text-[9px] font-bold text-slate-500" 
                      style={{ gridTemplateColumns: `140px repeat(${Math.max(1, report.heatmap_matrix[0]?.days?.length || 1)}, 18px)`, borderColor: 'rgba(255, 255, 255, 0.05)' }}
                    >
                      <div>Region</div>
                      {(report.heatmap_matrix[0]?.days || []).map((d) => (
                        <div key={d.day} className="text-center">D{d.day}</div>
                      ))}
                    </div>

                    {/* Matrix Rows */}
                    {report.heatmap_matrix.map((row) => (
                      <div 
                        key={row.region} 
                        className="grid gap-1 items-center text-[11px]" 
                        style={{ gridTemplateColumns: `140px repeat(${row.days.length}, 18px)` }}
                      >
                        <div className="pr-2 truncate font-medium" style={{ color: '#cbd5e1' }} title={row.region}>
                          {row.region}
                        </div>
                        {row.days.map((day) => {
                          const cellColor = scoreToColor(day.score);
                          return (
                            <div
                              key={`${row.region}-${day.day}`}
                              className="w-[18px] h-[18px] rounded-[3px] border border-white/[0.02]"
                              style={{ backgroundColor: cellColor }}
                              title={`Day ${day.day}: ${day.score}`}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>

          <section>
            <h2 className="text-xs font-black uppercase tracking-[0.3em] mb-6 flex items-center" style={{ color: '#94a3b8' }}>
              <span className="w-4 h-[2px] mr-4" style={{ backgroundColor: '#0f172a' }}></span>
              03 RISK ANALYSIS
            </h2>
            <div className="pl-8 border-l-2 text-lg leading-relaxed whitespace-pre-wrap" style={{ color: '#475569', borderColor: '#f1f5f9' }}>
              {report.riskAnalysis}
            </div>
          </section>

          <section>
            <h2 className="text-xs font-black uppercase tracking-[0.3em] mb-6 flex items-center" style={{ color: '#94a3b8' }}>
              <span className="w-4 h-[2px] mr-4" style={{ backgroundColor: '#0f172a' }}></span>
              04 DEMOGRAPHIC IMPACT
            </h2>
            <div className="pl-8 border-l-2 text-lg leading-relaxed whitespace-pre-wrap" style={{ color: '#475569', borderColor: '#f1f5f9' }}>
              {report.demographicImpact}
            </div>
          </section>

          <section className="p-10 rounded-3xl border" style={{ backgroundColor: '#f8fafc', borderColor: '#f1f5f9' }}>
            <h2 className="text-xs font-black uppercase tracking-[0.3em] mb-8 border-b pb-4" style={{ color: '#94a3b8', borderColor: '#e2e8f0' }}>
              05 STRATEGIC RECOMMENDATIONS
            </h2>
            <ul className="space-y-6">
              {report.strategicRecommendations.map((rec, i) => (
                <li key={i} className="flex items-start space-x-6">
                  <span className="flex-shrink-0 w-8 h-8 text-white rounded-xl flex items-center justify-center font-black text-sm" style={{ backgroundColor: '#0f172a' }}>
                    {i + 1}
                  </span>
                  <p className="font-bold text-lg pt-1" style={{ color: '#0f172a' }}>
                    {rec}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xs font-black uppercase tracking-[0.3em] mb-6 flex items-center" style={{ color: '#94a3b8' }}>
              <span className="w-4 h-[2px] mr-4" style={{ backgroundColor: '#0f172a' }}></span>
              06 CONCLUSION
            </h2>
            <div className="pl-8 border-l-2 text-lg leading-relaxed whitespace-pre-wrap" style={{ color: '#475569', borderColor: '#f1f5f9' }}>
              {report.conclusion}
            </div>
          </section>

          {/* Footer */}
          <div className="pt-12 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest border-t" style={{ color: '#94a3b8', borderColor: '#f1f5f9' }}>
            <span>© 2024 RaawaAI Intelligence Systems</span>
            <span>Ref: {Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          /* Hide all other core layout elements */
          header, main, footer, .no-print {
            display: none !important;
          }
          /* Reset fixed/absolute positioning for printing */
          .fixed {
            position: absolute !important;
            inset: 0 !important;
            background: transparent !important;
            backdrop-filter: none !important;
            padding: 0 !important;
            overflow: visible !important;
            display: block !important;
          }
          /* Center the page content and strip shadow/rounded edges */
          #report-pdf-content {
            box-shadow: none !important;
            border-radius: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Maintain colors on print */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Dark theme section for metrics/heatmap should keep dark background */
          .bg-slate-950 {
            background-color: #020617 !important;
            color: #ffffff !important;
          }
          .text-slate-400 {
            color: #94a3b8 !important;
          }
          .text-cyan-400 {
            color: #22d3ee !important;
          }
          /* Adjust page margins */
          @page {
            size: letter;
            margin: 0.5in;
          }
        }
      `}</style>
    </div>
  );
};

export default ReportViewer;
