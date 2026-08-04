import React from 'react';
import { ShieldCheck } from 'lucide-react';

const audienceCards = [
  'Government bodies testing laws and tax policy',
  'Corporates and brands evaluating launches and campaigns',
  'NGOs measuring the likely effect of awareness programs',
  'PR agencies planning crisis communication strategies',
];

const About = () => {
  return (
    <div className="space-y-24 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Page Title */}
      <div className="text-center">
        <h1 className="text-5xl font-black mb-4 tracking-tight bg-gradient-to-r from-[#69D2E9] to-[#3498DB] bg-clip-text text-transparent">
          About RaawaAI
        </h1>
        <p className="text-slate-500 font-medium text-lg uppercase tracking-widest max-w-3xl mx-auto leading-relaxed">
          The synthetic population laboratory for testing public resonance and ethical alignment.
        </p>
      </div>

      {/* Project Overview */}
      <section id="overview" className="w-full rounded-[2rem] border border-white/10 bg-[#07101e]/80 p-8 shadow-2xl shadow-black/20 backdrop-blur-sm md:p-10">
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center">
          <h2 className="text-3xl font-black text-slate-100 md:text-4xl">A digital laboratory for public sentiment.</h2>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-slate-300 md:text-base">
            RaawaAI simulates a virtual public so organizations can test laws, product concepts, or campaigns before launch. The platform helps teams identify where resistance starts, why it starts, and how the wording can be improved.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2 text-left w-full">
            {[
              'Input a concept, law, product feature, or campaign idea.',
              'Select regions and demographics such as Gen-Z, farmers, or legal experts.',
              'Run a 30-day simulation across a realistic social timeline.',
              'Inspect backlash risk, sentiment shifts, and refinement suggestions.',
            ].map((step, index) => (
              <div key={index} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-7 text-slate-300 flex items-start">
                <span className="mr-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-r from-[#1061cc] to-[#49c5e0] text-[11px] font-black text-slate-950 shrink-0">{index + 1}</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Built on LLM reasoning statement, styled boldly and center-aligned */}
      <section className="w-full max-w-4xl mx-auto text-center px-4">
        <h2 className="text-3xl font-black text-slate-100 tracking-tight select-none">
          Built on LLM reasoning, synthetic data, and cloud persistence.
        </h2>
        <p className="mt-4 text-sm leading-7 text-slate-400 max-w-3xl mx-auto">
          The brain is a large language model configured for persona-based reasoning and sentiment classification. The body is a responsive web app. The data layer uses synthesized cultural trends and secure simulation logs.
        </p>
      </section>

      {/* Impact Assessment */}
      <section className="w-full rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#0a1426] to-[#050816] p-8 md:p-10">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <h2 className="mt-5 text-3xl font-black text-slate-100 md:text-4xl">This is a social safety net for innovation.</h2>
            <p className="mt-4 text-sm leading-7 text-slate-400 md:text-base">
              The short-term value is immediate identification of backlash risk and refinement opportunities. The long-term value is a society with less friction, stronger trust, and launches that are more likely to succeed.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="text-xs uppercase tracking-[0.26em] text-slate-500">Short-term</div>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                Immediate identification of backlash risk and the specific policy or message areas that need refinement.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="text-xs uppercase tracking-[0.26em] text-slate-500">Long-term</div>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                A practical framework for building products and policies that people trust, rather than merely tolerate.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
