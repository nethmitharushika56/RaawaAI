import React from 'react';

const ReportViewer = ({ report, onClose }) => {
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
    link.download = 'simulation-report.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-start justify-center overflow-y-auto p-4 sm:p-10 no-print animate-in fade-in duration-300">
      <div className="max-w-4xl w-full bg-white text-slate-900 rounded-[2rem] shadow-2xl overflow-hidden print:shadow-none print:rounded-none animate-in zoom-in duration-500 relative">
        
        {/* Report Header */}
        <div className="bg-slate-50 p-8 sm:p-12 border-b-8 border-slate-900 flex justify-between items-start">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-slate-900 rounded flex flex-col justify-center items-center p-1 space-y-1">
                <div className="w-full h-[3px] bg-white"></div>
                <div className="w-full h-[3px] bg-white"></div>
              </div>
              <span className="text-xl font-black tracking-tighter text-slate-900">RAAWA ANALYSIS</span>
            </div>
            <h1 className="text-4xl font-black uppercase leading-none tracking-tight text-slate-900 mb-2">
              {report.title}
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px]">
              Generated: {report.date} • Confidential Strategic Report
            </p>
          </div>
          <div className="flex space-x-3 no-print">
            <button
              onClick={handleDownload}
              className="p-3 bg-slate-900 text-white rounded-full hover:bg-slate-700 transition-all shadow-lg active:scale-90"
              title="Download report"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v12m0 0l-4-4m4 4l4-4m-8 8h8"></path></svg>
            </button>
            <button 
              onClick={() => window.print()}
              className="p-3 bg-slate-100 text-slate-900 rounded-full hover:bg-blue-600 hover:text-white transition-all shadow-lg active:scale-90"
              title="Print to PDF"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
            </button>
            <button 
              onClick={onClose}
              className="p-3 bg-white border border-slate-200 text-slate-400 rounded-full hover:text-red-500 transition-all hover:border-red-500 active:scale-90"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
        </div>

        {/* Report Content */}
        <div className="p-8 sm:p-12 space-y-12 bg-white">
          
          <section>
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-6 flex items-center">
              <span className="w-4 h-[2px] bg-slate-900 mr-4"></span>
              01 EXECUTIVE SUMMARY
            </h2>
            <div className="pl-8 border-l-2 border-slate-100">
              <p className="text-xl leading-relaxed text-slate-800 font-medium italic whitespace-pre-wrap">
                "{report.executiveSummary}"
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-6 flex items-center">
              <span className="w-4 h-[2px] bg-slate-900 mr-4"></span>
              02 RISK ANALYSIS
            </h2>
            <div className="pl-8 border-l-2 border-slate-100 text-slate-600 text-lg leading-relaxed whitespace-pre-wrap">
              {report.riskAnalysis}
            </div>
          </section>

          <section>
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-6 flex items-center">
              <span className="w-4 h-[2px] bg-slate-900 mr-4"></span>
              03 DEMOGRAPHIC IMPACT
            </h2>
            <div className="pl-8 border-l-2 border-slate-100 text-slate-600 text-lg leading-relaxed whitespace-pre-wrap">
              {report.demographicImpact}
            </div>
          </section>

          <section className="bg-slate-50 p-10 rounded-3xl border border-slate-100">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-8 border-b border-slate-200 pb-4">
              04 STRATEGIC RECOMMENDATIONS
            </h2>
            <ul className="space-y-6">
              {report.strategicRecommendations.map((rec, i) => (
                <li key={i} className="flex items-start space-x-6">
                  <span className="flex-shrink-0 w-8 h-8 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-sm">
                    {i + 1}
                  </span>
                  <p className="text-slate-900 font-bold text-lg pt-1">
                    {rec}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-6 flex items-center">
              <span className="w-4 h-[2px] bg-slate-900 mr-4"></span>
              05 CONCLUSION
            </h2>
            <div className="pl-8 border-l-2 border-slate-100 text-slate-600 text-lg leading-relaxed whitespace-pre-wrap">
              {report.conclusion}
            </div>
          </section>

          {/* Footer */}
          <div className="pt-12 flex justify-between items-center text-[10px] font-bold text-slate-300 uppercase tracking-widest border-t border-slate-100">
            <span>© 2024 RaawaAI Intelligence Systems</span>
            <span>Ref: {Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white !important; color: black !important; padding: 0 !important; margin: 0 !important; }
          .no-print { display: none !important; }
          .fixed { position: static !important; inset: auto !important; background: transparent !important; backdrop-filter: none !important; }
          .shadow-2xl { box-shadow: none !important; }
          .rounded-[2rem], .rounded-3xl { border-radius: 0 !important; }
          .max-w-4xl { max-width: none !important; width: 100% !important; }
          .bg-slate-50 { background-color: transparent !important; }
          @page { margin: 2cm; }
        }
      `}</style>
    </div>
  );
};

export default ReportViewer;
