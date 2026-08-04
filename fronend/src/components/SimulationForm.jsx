import React, { useState } from 'react';

const SimulationForm = ({ onSubmit, isLoading }) => {
  const [concept, setConcept] = useState('');
  const [audience, setAudience] = useState('GEN_Z');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (concept.trim()) {
      onSubmit(concept, audience);
    }
  };

  return (
    <div className="bg-white/[0.03] backdrop-blur-xl rounded-[2.5rem] p-10 border border-white/10 shadow-2xl">
      <h2 className="text-2xl font-bold text-slate-100 mb-8 flex items-center">
        <span className="bg-gradient-to-b from-[#93c5fd] to-[#3b82f6] w-2.5 h-8 rounded-full mr-5 shadow-[0_0_15px_rgba(59,130,246,0.5)]"></span>
        Simulation Configuration
      </h2>
      <form onSubmit={handleSubmit} className="space-y-8">
        <div>
          <label className="block text-xs font-black text-slate-500 mb-3 uppercase tracking-[0.2em]">Concept Definition</label>
          <textarea
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            className="w-full h-44 p-6 bg-slate-900/50 border border-white/10 rounded-2xl text-slate-100 placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 outline-none transition-all resize-none text-lg leading-relaxed"
            placeholder="Describe your policy, product, or campaign idea here..."
            required
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="block text-xs font-black text-slate-500 mb-3 uppercase tracking-[0.2em]">Target Persona Cluster</label>
            <div className="relative">
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="w-full p-5 bg-slate-900/50 border border-white/10 rounded-2xl text-slate-200 font-medium focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="GEN_Z">Sri Lankan Gen-Z</option>
                <option value="PROFESSIONALS">Industry Professionals</option>
                <option value="RURAL">Rural Stakeholders</option>
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isLoading || !concept.trim()}
              className={`group w-full h-[68px] rounded-2xl font-black text-white shadow-xl transition-all transform active:scale-95 flex items-center justify-center space-x-3 text-lg ${
                isLoading ? 'bg-slate-800 cursor-not-allowed opacity-50' : 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-400 hover:via-blue-400 hover:to-indigo-500 shadow-blue-500/10 hover:shadow-[0_0_25px_rgba(59,130,246,0.3)]'
              }`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-6 w-6 text-blue-400" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Syncing Neural Net...</span>
                </>
              ) : (
                <>
                  <span>Launch Resonance Analysis </span>
                  <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SimulationForm;
