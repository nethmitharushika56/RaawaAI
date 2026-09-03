import React from 'react';

const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="w-full border-t border-white/5 py-12 px-12 md:px-24 mt-20 relative bg-[#050816]">
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-12 justify-items-center text-center">
        <div className="space-y-4">
          <h3 className="font-bold text-slate-400 uppercase tracking-wider text-xs">RAAWA AI</h3>
          <p className="text-[10px] text-slate-600 leading-relaxed max-w-[240px] mx-auto">
            The digital resonance laboratory for stress-testing human perception. Predict the backlash before the launch.
          </p>
        </div>
        
        <div className="space-y-4">
          <h3 className="font-bold text-slate-400 uppercase tracking-wider text-xs">Platform</h3>
          <ul className="text-[10px] text-slate-600 space-y-2">
            <li className="hover:text-slate-400 cursor-pointer transition-colors">Persona Engine</li>
            <li className="hover:text-slate-400 cursor-pointer transition-colors">Sentiment Heatmaps</li>
            <li className="hover:text-slate-400 cursor-pointer transition-colors">Risk KPI matrix</li>
          </ul>
        </div>
        
        <div className="space-y-4">
          <h3 className="font-bold text-slate-400 uppercase tracking-wider text-xs">Legal</h3>
          <ul className="text-[10px] text-slate-600 space-y-2">
            <li className="hover:text-slate-400 cursor-pointer transition-colors">Privacy Shield</li>
            <li className="hover:text-slate-400 cursor-pointer transition-colors">Data ethics</li>
            <li className="hover:text-slate-400 cursor-pointer transition-colors">Terms of simulation</li>
          </ul>
        </div>
      </div>
      <div className="text-center pt-16 mt-8 border-t border-white/5">
        <p className="text-[10px] text-slate-700">© 2026 RAAWA AI. All rights reserved. Designed by Team Exyra.</p>
      </div>

      {/* Scroll to Top Button */}
      <button
        onClick={scrollToTop}
        className="absolute bottom-8 right-8 p-3 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all"
        aria-label="Scroll to top"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
        </svg>
      </button>
    </footer>
  );
};

export default Footer;
