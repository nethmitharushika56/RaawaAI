import React, { useState, useEffect } from 'react';
import { User, Zap, Shield, Users, Smile, ChevronLeft, Check } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import PersonaEngine from './PersonaEngine';
import Privacy from './Privacy';
import Organizations from './Organizations';

const Settings = ({ onBack }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('persona');

  const menuItems = [
    { id: 'persona', label: 'Persona Engine', icon: Zap },
    { id: 'privacy', label: 'Data & Privacy', icon: Shield },
    { id: 'org', label: 'Manage Organization', icon: Users },
  ];

  useEffect(() => {
    const parts = location.pathname.split('/');
    const last = parts[parts.length - 1];
    if (['persona', 'privacy', 'org'].includes(last)) {
      setActiveTab(last);
    } else {
      setActiveTab('persona');
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#050816] text-slate-100 font-sans pb-20">
      <div className="w-full px-6 py-8">
        {/* Breadcrumb */}
        <button 
          onClick={onBack}
          className="flex items-center space-x-2 text-white hover:text-slate-200 transition-colors mb-8 group"
        >
          <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Back to Agency Dashboard</span>
        </button>

        {/* Title */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">System Settings</h1>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">
            Tune the RaawaAI Persona Engine and manage laboratory preferences.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-12">
          {/* Sidebar */}
          <aside className="w-full lg:w-64 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); navigate(`/settings/${item.id}`); }}
                  className={`w-full flex items-center space-x-4 px-6 py-4 rounded-xl transition-all ${
                    isActive 
                      ? 'bg-[#1a4f63]/20 text-[#3CD3AD] border border-[#3CD3AD]/20' 
                      : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <Icon size={20} className={isActive ? 'text-[#3CD3AD]' : ''} />
                  <span className="font-bold text-sm tracking-wide">{item.label}</span>
                </button>
              );
            })}
          </aside>

          {/* Content area */}
          <main className="flex-grow space-y-8">
            {activeTab === 'persona' && <PersonaEngine />}

            {activeTab === 'privacy' && <Privacy />}

            {activeTab === 'org' && (
              <div>
                <div className="bg-[#11162d]/20 border border-white/5 rounded-2xl p-8">
                  <h2 className="text-xl font-bold text-white mb-4">Manage Organization</h2>
                  <p className="text-slate-400 mb-6">Open the organizations manager to create and update organizations.</p>
                  <button onClick={() => navigate('/organizations')} className="px-6 py-3 rounded-lg bg-[#3CD3AD] text-[#050816] font-semibold">Open Organizations</button>
                </div>
              </div>
            )}

            <div className="text-center pt-8">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] border-t border-white/5 pt-8">
                © 2024 RaawaAI Labs. All rights reserved.
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );

};

export default Settings;
