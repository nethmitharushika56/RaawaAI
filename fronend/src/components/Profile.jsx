import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Mail, Phone, Building2, Briefcase, Edit3, ShieldAlert, Trash2, ArrowRight, ChevronRight } from 'lucide-react';
import ChangePasswordDialog from './ChangePasswordDialog';
import ConfirmDialog from './ConfirmDialog';
import Subscriptions from './Subscriptions';
import { getProfile, saveProfile } from '../services/accountService';

const Profile = ({ onSignOut, currentPassword = '', onPasswordChanged, onProfileUpdated }) => {
  const location = useLocation();
  const [selectedSection, setSelectedSection] = useState(() => {
    return location.state?.section || 'profile';
  });

  useEffect(() => {
    if (location.state?.section) {
      setSelectedSection(location.state.section);
    }
  }, [location.state]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [message, setMessage] = useState('');
  const [avatar, setAvatar] = useState('');
  const fileInputRef = useRef(null);
  const hasHydratedRef = useRef(false);
  const lastSavedEmailRef = useRef('');
  const autoSaveTimerRef = useRef(null);
  const navigate = useNavigate();

  const normalizeEmail = (value) => (value || '').trim().toLowerCase();
  const getProfileKey = (userEmail) => `profile:${normalizeEmail(userEmail)}`;
  const getCurrentUserEmail = () => normalizeEmail(localStorage.getItem('currentUserEmail'));
  const loadProfileForEmail = (userEmail) => {
    const raw = localStorage.getItem(getProfileKey(userEmail));
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch (err) {
      console.error('Failed to parse stored profile', err);
      return null;
    }
  };

  const persistProfile = (sourceEmail, profileData, { showStatus = false } = {}) => {
    const activeEmail = normalizeEmail(sourceEmail);
    const nextEmail = normalizeEmail(profileData?.email) || activeEmail;

    if (!nextEmail) {
      if (showStatus) {
        setMessage('No active user found. Please sign in again.');
      }
      return false;
    }

    try {
      const payload = {
        name: profileData?.name || '',
        email: nextEmail,
        phone: profileData?.phone || '',
        company: profileData?.company || '',
        jobTitle: profileData?.jobTitle || '',
        description: profileData?.description || '',
        avatar: profileData?.avatar || '',
      };

      localStorage.setItem(getProfileKey(nextEmail), JSON.stringify(payload));

      if (activeEmail && activeEmail !== nextEmail) {
        localStorage.removeItem(getProfileKey(activeEmail));
      }

      localStorage.setItem('currentUserEmail', nextEmail);
      lastSavedEmailRef.current = nextEmail;

      void saveProfile(payload).catch((err) => {
        console.warn('Profile sync skipped:', err?.message || err);
      });

      if (typeof onProfileUpdated === 'function') {
        onProfileUpdated(payload);
      }

      if (showStatus) {
        setMessage('Profile saved successfully.');
      }

      return true;
    } catch (e) {
      console.error('Failed to save profile locally', e);
      if (showStatus) {
        setMessage('Failed to save profile.');
      }
      return false;
    }
  };

  const handleSave = (event) => {
    if (event) event.preventDefault();

    persistProfile(getCurrentUserEmail(), { name, email, phone, company, jobTitle, description, avatar }, { showStatus: true });
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size should be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 256;
        const MAX_HEIGHT = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setAvatar(dataUrl);
        persistProfile(getCurrentUserEmail(), {
          name,
          email,
          phone,
          company,
          jobTitle,
          description,
          avatar: dataUrl
        }, { showStatus: false });
        setMessage('Profile picture updated successfully.');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setAvatar('');
    persistProfile(getCurrentUserEmail(), {
      name,
      email,
      phone,
      company,
      jobTitle,
      description,
      avatar: ''
    }, { showStatus: false });
    setMessage('Profile picture removed.');
  };

  // Show/perform delete flow via confirmation dialog
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const performDeleteAccount = () => {
    const activeEmail = getCurrentUserEmail();

    try {
      if (activeEmail) {
        localStorage.removeItem(getProfileKey(activeEmail));
      }
      localStorage.removeItem('currentUserEmail');
      hasHydratedRef.current = false;
      lastSavedEmailRef.current = '';

      setName('');
      setEmail('');
      setPhone('');
      setCompany('');
      setJobTitle('');
      setDescription('');
      setAvatar('');
      setMessage('Account deleted successfully.');
    } catch (err) {
      console.error('Failed to delete account locally:', err);
      setMessage('Failed to delete account.');
    }

    setShowDeleteConfirm(false);

    if (onSignOut) {
      onSignOut();
      return;
    }

    navigate('/login');
  };

  const [showChangePassword, setShowChangePassword] = useState(false);

  const handleChangePassword = () => {
    setShowChangePassword(true);
  };

  const handleChangePasswordSave = async (_current, newPass) => {
    if (typeof onPasswordChanged === 'function') {
      onPasswordChanged(newPass);
    }

    setMessage('Password changed successfully.');
    return { success: true };
  };

  useEffect(() => {
    const activeEmail = getCurrentUserEmail();

    if (!activeEmail) {
      setName('');
      setEmail('');
      setPhone('');
      setCompany('');
      setJobTitle('');
      setDescription('');
      return;
    }

    const saved = loadProfileForEmail(activeEmail);
    const localPayload = saved
      ? {
          name: saved?.name || '',
          email: saved?.email || activeEmail || '',
          phone: saved?.phone || '',
          company: saved?.company || '',
          jobTitle: saved?.jobTitle || '',
          description: saved?.description || '',
          avatar: saved?.avatar || '',
        }
      : null;

    if (saved) {
      setName(saved?.name || '');
      setEmail(saved?.email || activeEmail || '');
      setPhone(saved?.phone || '');
      setCompany(saved?.company || '');
      setJobTitle(saved?.jobTitle || '');
      setDescription(saved?.description || '');
      setAvatar(saved?.avatar || '');
      lastSavedEmailRef.current = activeEmail;
    }

    const hydrateRemoteProfile = async () => {
      try {
        const response = await getProfile();
        const remoteProfile = response?.profile;

        if (remoteProfile && !saved) {
          setName(remoteProfile?.name || '');
          setEmail(remoteProfile?.email || activeEmail || '');
          setPhone(remoteProfile?.phone || '');
          setCompany(remoteProfile?.company || '');
          setJobTitle(remoteProfile?.job_title || '');
          setDescription(remoteProfile?.description || '');
          setAvatar(remoteProfile?.avatar || '');

          localStorage.setItem(
            getProfileKey(activeEmail),
            JSON.stringify({
              name: remoteProfile?.name || '',
              email: remoteProfile?.email || activeEmail || '',
              phone: remoteProfile?.phone || '',
              company: remoteProfile?.company || '',
              jobTitle: remoteProfile?.job_title || '',
              description: remoteProfile?.description || '',
              avatar: remoteProfile?.avatar || '',
            })
          );
        }

        if (localPayload) {
          void saveProfile(localPayload).catch((err) => {
            console.warn('Profile resync skipped:', err?.message || err);
          });
        }
      } catch (err) {
        console.warn('Profile fetch skipped:', err?.message || err);
      } finally {
        hasHydratedRef.current = true;
      }
    };

    hydrateRemoteProfile();
  }, []);

  useEffect(() => {
    if (!hasHydratedRef.current) return undefined;

    clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      persistProfile(getCurrentUserEmail(), { name, email, phone, company, jobTitle, description, avatar });
    }, 300);

    return () => clearTimeout(autoSaveTimerRef.current);
  }, [name, email, phone, company, jobTitle, description, avatar]);

  // Clear all data flow via confirmation dialog
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const performClearAllData = () => {
    try {
      const activeEmail = getCurrentUserEmail();
      if (activeEmail) {
        localStorage.removeItem(getProfileKey(activeEmail));
      }
      localStorage.removeItem('currentUserEmail');
      hasHydratedRef.current = false;
      lastSavedEmailRef.current = '';

      setName('');
      setEmail('');
      setPhone('');
      setCompany('');
      setJobTitle('');
      setDescription('');
      setAvatar('');
      setMessage('All local data cleared.');
    } catch (err) {
      console.error('Failed to clear data:', err);
      setMessage('Failed to clear data.');
    }
    setShowClearConfirm(false);
  };

  const handleClearAllData = () => {
    const ok = window.confirm('Clear all your profile data? This will remove the current user profile only.');
    if (!ok) return;

    performClearAllData();
  };

  const sectionButtonClass = (section) =>
    `w-full flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition ${
      selectedSection === section
        ? 'border border-blue-500/30 bg-blue-600/10 text-white'
        : 'border border-slate-700 bg-[#08111f] text-slate-100 hover:bg-slate-900'
    }`;

  const renderSectionContent = () => {
    switch (selectedSection) {
      case 'terms':
        return (
          <div className="space-y-6">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500 mb-2">Terms & Conditions</p>
              <h2 className="text-3xl font-black text-white">Usage Policy</h2>
            </div>
            <div className="space-y-4 text-sm leading-7 text-slate-300">
              <p>By using RaawaAI, you agree to keep all content within the platform secure and to use generated insights responsibly. Your account may be suspended for misuse, including sharing data with unauthorized third parties or generating harmful content.</p>
              <p>RaawaAI is intended for lawful and ethical use only. You are responsible for maintaining the confidentiality of your credentials and for all activity that occurs under your account.</p>
              <p>If you need to request support, manage privacy settings, or ask about data retention, contact our team using the Contact Us section.</p>
            </div>
          </div>
        );
      case 'contact':
        return (
          <div className="space-y-6">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500 mb-2">Contact Us</p>
              <h2 className="text-3xl font-black text-white">We’re here to help</h2>
            </div>
            <div className="grid gap-4 text-sm text-slate-300">
              <div className="rounded-3xl border border-white/10 bg-[#07101d] p-6">
                <p className="font-semibold text-white mb-2">Support</p>
                <p>support@raawaai.com</p>
                <p className="text-slate-500">For product help, account issues, or platform questions.</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-[#07101d] p-6">
                <p className="font-semibold text-white mb-2">Sales</p>
                <p>sales@raawaai.com</p>
                <p className="text-slate-500">For enterprise plans, upgrade inquiries, or partnership requests.</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-[#07101d] p-6">
                <p className="font-semibold text-white mb-2">Phone</p>
                <p>+94 771 234 567</p>
                <p className="text-slate-500">Available Monday–Friday, 9am–6pm.</p>
              </div>
            </div>
          </div>
        );
      case 'subs':
        return <Subscriptions />;
      default:
        return (
          <form onSubmit={handleSave} className="space-y-8">
            {message && (
              <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100">
                {message}
              </div>
            )}

            <div className="grid gap-6">
              <div className="grid gap-2">
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Name</label>
                <div className="rounded-2xl bg-[#091224] border border-white/10 px-4 py-3 flex items-center gap-3 text-slate-100">
                  <User className="text-slate-400" size={18} />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-transparent outline-none text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Email</label>
                <div className="rounded-2xl bg-[#091224] border border-white/10 px-4 py-3 flex items-center gap-3 text-slate-100">
                  <Mail className="text-slate-400" size={18} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-transparent outline-none text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Phone Number</label>
                  <div className="rounded-2xl bg-[#091224] border border-white/10 px-4 py-3 flex items-center gap-3 text-slate-100">
                    <Phone className="text-slate-400" size={18} />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-transparent outline-none text-sm text-white"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Company</label>
                  <div className="rounded-2xl bg-[#091224] border border-white/10 px-4 py-3 flex items-center gap-3 text-slate-100">
                    <Building2 className="text-slate-400" size={18} />
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full bg-transparent outline-none text-sm text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Job Title</label>
                  <div className="rounded-2xl bg-[#091224] border border-white/10 px-4 py-3 flex items-center gap-3 text-slate-100">
                    <Briefcase className="text-slate-400" size={18} />
                    <input
                      type="text"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      className="w-full bg-transparent outline-none text-sm text-white"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={5}
                    className="w-full min-h-[140px] resize-none rounded-2xl bg-[#091224] border border-white/10 px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500/40"
                  />
                </div>
              </div>
            </div>

            <button className="w-full rounded-2xl bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 px-5 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-100 hover:bg-slate-700 transition shadow-xl shadow-slate-950/20">
              Save
            </button>
          </form>
        );
    }
  };

  return (
    <div className="w-full px-6 py-10 min-h-[calc(100vh-80px)]">
      <div className="flex flex-col gap-8">
        <section className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-xl shadow-slate-950/20 backdrop-blur-xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500 mb-2">Identity & Profile</p>
              <h1 className="text-3xl font-black text-white">Profile Details</h1>
            </div>
            <button className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/40 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900 transition" onClick={handleSave}>
              <Edit3 size={16} /> Save Changes
            </button>
          </div>

          <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="space-y-6 rounded-3xl border border-white/10 bg-slate-950/50 p-6">
              <div className="flex flex-col items-center text-center gap-4">
                <div 
                  className="relative group cursor-pointer overflow-hidden rounded-full h-28 w-28 border border-white/10 hover:border-blue-500/40 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {avatar ? (
                    <img 
                      src={avatar} 
                      alt="Profile" 
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105" 
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-slate-700 via-slate-800 to-slate-950 flex items-center justify-center text-4xl text-slate-100">
                      <User size={40} className="text-slate-300" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-1">
                    <Edit3 size={16} className="text-slate-200" />
                    <span className="text-[10px] font-semibold text-slate-200 uppercase tracking-wider">Change</span>
                  </div>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
                
                {avatar && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="text-xs text-rose-400 hover:text-rose-300 hover:underline transition-colors font-medium flex items-center gap-1"
                  >
                    <Trash2 size={12} /> Remove photo
                  </button>
                )}
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Role</p>
                  <p className="text-lg font-semibold text-white">Agent</p>
                </div>
              </div>

              <div className="space-y-4">
                <button type="button" className={sectionButtonClass('profile')} onClick={() => setSelectedSection('profile')}>
                  <span>Profile Details</span>
                  <ChevronRight size={18} />
                </button>
                <button type="button" className={sectionButtonClass('subs')} onClick={() => setSelectedSection('subs')}>
                  <span>Subscriptions</span>
                  <ChevronRight size={18} />
                </button>
                <button type="button" className={sectionButtonClass('terms')} onClick={() => setSelectedSection('terms')}>
                  <span>Terms & Conditions</span>
                  <ChevronRight size={18} />
                </button>
                <button type="button" className={sectionButtonClass('contact')} onClick={() => setSelectedSection('contact')}>
                  <span>Contact Us</span>
                  <ChevronRight size={18} />
                </button>
              </div>
            </aside>

            <div className="space-y-8 rounded-3xl border border-white/10 bg-[#060a19]/80 p-8 shadow-inner shadow-slate-950/30">
              {renderSectionContent()}

              {selectedSection === 'profile' && (
                <div className="rounded-3xl border border-rose-500/10 bg-rose-500/5 p-4">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-rose-400">Danger Zone</p>
                      <h2 className="text-xl font-bold text-white">Account actions</h2>
                    </div>
                    <ShieldAlert className="text-rose-400" size={24} />
                  </div>

                  <div className="space-y-3">
                        <button type="button" onClick={handleChangePassword} className="w-full flex items-center justify-between rounded-2xl border border-rose-400/20 bg-[#1e151a] px-4 py-3 text-sm text-rose-200 hover:bg-[#2d1920] transition">
                      <span>Change Password</span>
                      <ChevronRight size={18} />
                    </button>
                        <button type="button" onClick={() => setShowClearConfirm(true)} className="w-full flex items-center justify-between rounded-2xl border border-rose-400/20 bg-[#1e151a] px-4 py-3 text-sm text-rose-200 hover:bg-[#2d1920] transition">
                      <span>Clear All Data</span>
                      <ChevronRight size={18} />
                    </button>
                        <button type="button" className="w-full flex items-center justify-between rounded-2xl border border-rose-400/20 bg-[#1d1114] px-4 py-3 text-sm font-semibold text-white hover:bg-[#3d121f] transition" onClick={() => setShowDeleteConfirm(true)}>
                      <span>Delete Account</span>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              )}
                  {showChangePassword && (
                    <ChangePasswordDialog
                      expectedCurrentPassword={currentPassword}
                      onSave={handleChangePasswordSave}
                      onClose={() => setShowChangePassword(false)}
                    />
                  )}

                  {showClearConfirm && (
                    <ConfirmDialog
                      title="Clear all local data?"
                      description="This will remove local preferences and cached simulations. This action cannot be undone."
                      confirmLabel="Clear"
                      cancelLabel="Cancel"
                      onConfirm={performClearAllData}
                      onCancel={() => setShowClearConfirm(false)}
                    />
                  )}

                  {showDeleteConfirm && (
                    <ConfirmDialog
                      title="Delete account?"
                      description="Deleting your account will remove all local data. Backend account deletion is not yet implemented in this demo."
                      confirmLabel="Delete Account"
                      cancelLabel="Cancel"
                      danger={true}
                      onConfirm={performDeleteAccount}
                      onCancel={() => setShowDeleteConfirm(false)}
                    />
                  )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Profile;
