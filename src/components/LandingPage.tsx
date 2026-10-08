import React, { useState } from 'react';
import { 
  Camera, 
  ShieldCheck, 
  Bell, 
  FileSpreadsheet, 
  Lock, 
  ArrowRight, 
  LogIn, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronRight, 
  ExternalLink, 
  Layers, 
  Search, 
  Pill, 
  Check, 
  Info, 
  FileText, 
  Scale, 
  Trash2, 
  Mail,
  ChevronDown,
  Plus,
  Wifi,
  Battery,
  Clock,
  Package,
  X
} from 'lucide-react';
import { DoctorLogo } from './DoctorLogo';

interface LandingPageProps {
  onSignIn: () => void;
  navigateToPublicPage: (page: 'guide' | 'privacy' | 'terms' | 'delete-account') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSignIn, navigateToPublicPage }) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [phoneFilter, setPhoneFilter] = useState<'all' | 'expiring' | 'taken'>('all');

  const toggleFaq = (index: number) => {
    setActiveFaq(prev => prev === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#1f1f1f] font-sans antialiased selection:bg-[#0f9d58] selection:text-white">
      {/* ============================================================ */}
      {/* 1. TOP BAR: Authentic App Logo — Nav Links — Sign In Button   */}
      {/* ============================================================ */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#e3e2e0]/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Zone 1: Brand with authentic App Logo */}
          <a href="/" className="flex items-center gap-3 text-slate-900 group">
            <div className="w-10 h-10 rounded-2xl overflow-hidden border border-[#e3e2e0] bg-white p-1 flex items-center justify-center shadow-xs transition-transform group-hover:scale-105 shrink-0">
              <img 
                src="/logo.png" 
                alt="DawaSnap AI" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-[#0f9d58] leading-none block">
                DawaSnap AI
              </span>
              <span className="text-[#5f6368] text-[8px] font-bold uppercase tracking-[0.2em] block mt-1">
                Your Digital Pharmacy
              </span>
            </div>
          </a>

          {/* Zone 2: Navigation links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a href="#mockup" className="hover:text-slate-900 transition-colors">
              App Preview
            </a>
            <a href="#features" className="hover:text-slate-900 transition-colors">
              Capabilities
            </a>
            <a href="#google-integration" className="hover:text-slate-900 transition-colors">
              Google Integration
            </a>
            <a href="#security" className="hover:text-slate-900 transition-colors">
              Data Safety
            </a>
            <a href="#faq" className="hover:text-slate-900 transition-colors">
              FAQ
            </a>
          </nav>

          {/* Zone 3: Primary action (Sign In button) */}
          <div className="flex items-center gap-3">
            <button
              onClick={onSignIn}
              id="navbar-signin-btn"
              className="px-5 py-2 text-sm font-bold text-white bg-[#0f9d58] hover:bg-[#0b8043] rounded-full transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <LogIn size={16} strokeWidth={2.5} />
              <span>Sign In</span>
            </button>
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/* 2. HERO SECTION                                              */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden pt-12 pb-16 lg:pt-18 lg:pb-22 border-b border-[#e3e2e0]/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            {/* Tagline */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#e6f4ea] text-[#0f9d58] text-xs font-bold tracking-wide">
              <span>On-Device OCR</span>
              <span aria-hidden="true">·</span>
              <span>Drug Safety Engine</span>
              <span aria-hidden="true">·</span>
              <span>Google Verified</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#1f1f1f] tracking-tight leading-[1.12] text-balance">
              The Intelligent Medication Vault &amp; Prescription Scanner
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-[#5f6368] leading-relaxed font-normal text-balance">
              Track expiration dates, prevent harmful drug-drug interactions, and scan medication boxes with on-device OCR. Pure privacy with automatic Google Sheets synchronization.
            </p>

            {/* CTA Group */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <button
                onClick={onSignIn}
                id="hero-getstarted-btn"
                className="w-full sm:w-auto px-8 py-3.5 bg-[#0f9d58] hover:bg-[#0b8043] text-white font-extrabold text-base rounded-full shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-98 whitespace-nowrap"
              >
                <span>Launch Web App</span>
                <ArrowRight size={18} strokeWidth={2.5} />
              </button>
              <a
                href="#mockup"
                className="w-full sm:w-auto px-7 py-3.5 bg-white hover:bg-slate-50 text-slate-800 font-bold text-base rounded-full border border-[#e3e2e0] shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <span>View Mobile Experience</span>
              </a>
            </div>

            {/* Trust Markers */}
            <div className="pt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[#5f6368] font-medium">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-[#0f9d58]" />
                DPDP Act 2023 Compliant
              </span>
              <span className="flex items-center gap-1.5">
                <Lock size={16} className="text-[#0f9d58]" />
                Zero Cloud Storage for Photos
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-[#0f9d58]" />
                Google API Services User Data Policy Verified
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 3. PHONE SCREEN APPLICATION SHOWCASE (Matching Real App 1:1) */}
      {/* ============================================================ */}
      <section id="mockup" className="py-16 lg:py-24 bg-white border-b border-[#e3e2e0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <h2 className="text-xs font-extrabold tracking-widest text-[#0f9d58] uppercase">
              Actual Application Experience
            </h2>
            <h3 className="text-3xl sm:text-4xl font-black text-[#1f1f1f] tracking-tight">
              Crafted For Complete Adherence &amp; Safety
            </h3>
            <p className="text-[#5f6368] text-sm sm:text-base">
              Explore the exact mobile interface used by patients and caregivers to track daily dosages, expiry timelines, and medication interactions.
            </p>
          </div>

          {/* Interactive Layout: Phone Frame + Feature Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center max-w-6xl mx-auto">
            {/* Phone Screen Mockup Container (Col 7) */}
            <div className="lg:col-span-7 flex justify-center">
              <div className="w-full max-w-[380px] bg-slate-900 p-3 sm:p-3.5 rounded-[46px] shadow-2xl ring-1 ring-slate-800 relative">
                {/* Dynamic Island / Speaker Pill */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-30 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700/60 ml-auto mr-3" />
                </div>

                {/* Inner Screen Canvas */}
                <div className="bg-[#faf8f5] rounded-[38px] overflow-hidden flex flex-col h-[700px] border border-slate-200/40 relative select-none">
                  {/* Phone Status Bar */}
                  <div className="pt-2.5 px-6 pb-1 flex items-center justify-between text-[11px] font-semibold text-slate-800 z-20">
                    <span>9:41</span>
                    <div className="flex items-center gap-1.5 text-slate-800">
                      <Wifi size={12} />
                      <Battery size={13} />
                    </div>
                  </div>

                  {/* App Glossy Header matching App.tsx lines 2297-2347 */}
                  <div className="bg-white border-b border-[#e3e2e0]/80 px-4 pt-3 pb-3 shadow-xs">
                    <div className="flex justify-between items-center mb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl overflow-hidden border border-[#e3e2e0] bg-white p-0.5">
                          <img src="/logo.png" alt="" className="w-full h-full object-contain" />
                        </div>
                        <div>
                          <h4 className="text-base font-extrabold tracking-tight text-[#0f9d58] leading-tight">
                            DawaSnap AI
                          </h4>
                          <p className="text-[#5f6368] text-[7px] font-bold uppercase tracking-[0.2em]">
                            Your Digital Pharmacy
                          </p>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-[#e3e2e0] bg-[#faf8f5] flex items-center justify-center shadow-2xs">
                        <img 
                          src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100&h=100" 
                          alt="User" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>

                    {/* Inside App Search Bar */}
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text" 
                        readOnly 
                        value="Search medications..." 
                        className="w-full bg-[#faf8f5] border border-[#e3e2e0] rounded-xl py-1.5 pl-8 pr-3 text-[11px] text-slate-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Scrollable Inside Content Canvas */}
                  <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 pb-20">
                    {/* 4 Inside App Stats Cards */}
                    <div className="grid grid-cols-4 gap-1.5">
                      <div className="bg-white border border-[#e3e2e0] rounded-xl p-2 text-center shadow-xs">
                        <p className="text-slate-400 text-[8px] uppercase tracking-wider font-extrabold">Total</p>
                        <p className="text-sm font-black text-[#1f1f1f]">18</p>
                      </div>
                      <div className="bg-white border border-[#e3e2e0] rounded-xl p-2 text-center shadow-xs">
                        <p className="text-slate-400 text-[8px] uppercase tracking-wider font-extrabold">Unique</p>
                        <p className="text-sm font-black text-[#1a73e8]">14</p>
                      </div>
                      <div className="bg-white border border-[#e3e2e0] rounded-xl p-2 text-center shadow-xs">
                        <p className="text-slate-400 text-[8px] uppercase tracking-wider font-extrabold">Expiring</p>
                        <p className="text-sm font-black text-[#f2a154]">2</p>
                      </div>
                      <div className="bg-white border border-[#e3e2e0] rounded-xl p-2 text-center shadow-xs">
                        <p className="text-slate-400 text-[8px] uppercase tracking-wider font-extrabold">Taken</p>
                        <p className="text-sm font-black text-[#0f9d58]">5</p>
                      </div>
                    </div>

                    {/* Inside App Filter Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                      <button 
                        onClick={() => setPhoneFilter('all')}
                        className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wide border cursor-pointer ${
                          phoneFilter === 'all' 
                            ? 'bg-[#0f9d58] text-white border-transparent shadow-xs' 
                            : 'bg-white border-[#e3e2e0] text-slate-600'
                        }`}
                      >
                        All
                      </button>
                      <button 
                        onClick={() => setPhoneFilter('expiring')}
                        className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wide border cursor-pointer ${
                          phoneFilter === 'expiring' 
                            ? 'bg-[#f2a154] text-white border-transparent shadow-xs' 
                            : 'bg-white border-[#e3e2e0] text-slate-600'
                        }`}
                      >
                        Expiring Soon
                      </button>
                      <button 
                        onClick={() => setPhoneFilter('taken')}
                        className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wide border cursor-pointer ${
                          phoneFilter === 'taken' 
                            ? 'bg-[#0f9d58] text-white border-transparent shadow-xs' 
                            : 'bg-white border-[#e3e2e0] text-slate-600'
                        }`}
                      >
                        Taken
                      </button>
                    </div>

                    {/* Inside App Medicine Card 1: Safe Active Batch */}
                    <div className="w-full bg-white border-2 border-blue-400 rounded-2xl p-3 shadow-xs space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h5 className="font-bold text-xs text-[#1f1f1f] truncate">
                              Augmentin 625 Duo
                            </h5>
                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                              2 Batches
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                            <span className="flex items-center gap-0.5">
                              <Package size={10} /> 1 tablet
                            </span>
                            <span className="flex items-center gap-0.5 text-[#1a73e8] font-semibold">
                              <Clock size={10} /> Twice daily
                            </span>
                          </div>
                        </div>
                        <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                          Safe · 5 Mos
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#e6f4ea] text-[#0f9d58]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0f9d58]" />
                          Antibiotics
                        </span>
                        <span className="text-[#0f9d58] font-bold flex items-center gap-1">
                          <Check size={12} /> Taken today
                        </span>
                      </div>
                    </div>

                    {/* Inside App Medicine Card 2: Expiring Soon Alert */}
                    <div className="w-full bg-white border-2 border-orange-500 rounded-2xl p-3 shadow-xs space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h5 className="font-bold text-xs text-[#1f1f1f] truncate">
                              Metformin HCl 500mg
                            </h5>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                            <span className="flex items-center gap-0.5">
                              <Package size={10} /> 1 tablet
                            </span>
                            <span className="flex items-center gap-0.5 text-slate-600">
                              <Clock size={10} /> Daily with meals
                            </span>
                          </div>
                        </div>
                        <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 shrink-0 animate-pulse">
                          Expiring · 8 Days
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#f2a154]" />
                          Diabetes
                        </span>
                        <span className="text-amber-700 font-semibold">
                          Next dose: 8:00 PM
                        </span>
                      </div>
                    </div>

                    {/* Inside App Medicine Card 3: Gastrointestinal */}
                    <div className="w-full bg-white border-2 border-emerald-500 rounded-2xl p-3 shadow-xs space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <h5 className="font-bold text-xs text-[#1f1f1f] truncate">
                            Pantoprazole 40mg
                          </h5>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                            <span className="flex items-center gap-0.5">
                              <Package size={10} /> 1 tablet
                            </span>
                            <span className="flex items-center gap-0.5 text-slate-600">
                              <Clock size={10} /> Morning empty stomach
                            </span>
                          </div>
                        </div>
                        <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                          Safe · 14 Mos
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#1a73e8]" />
                          Gastrointestinal
                        </span>
                        <span className="text-slate-400">
                          Stock: 24 left
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Inside App Floating Bottom Action Bar matching App.tsx lines 2608-2644 */}
                  <div className="absolute bottom-4 left-4 right-4 z-20">
                    <div className="bg-white/95 backdrop-blur-md border border-[#e3e2e0] rounded-full py-1.5 px-3 flex items-center justify-between shadow-lg">
                      <div className="flex-1 flex flex-col items-center text-[#f97316]">
                        <Plus size={16} />
                        <span className="text-[8px] font-bold uppercase tracking-widest mt-0.5">Manual</span>
                      </div>
                      <div className="w-px h-6 bg-slate-200" />
                      <div className="flex-1 flex flex-col items-center text-[#f97316]">
                        <Camera size={16} />
                        <span className="text-[8px] font-bold uppercase tracking-widest mt-0.5">Scan</span>
                      </div>
                      <div className="w-px h-6 bg-slate-200" />
                      <div className="flex-1 flex flex-col items-center text-[#f97316]">
                        <DoctorLogo className="w-4 h-4 text-[#f97316]" />
                        <span className="text-[8px] font-bold uppercase tracking-widest mt-0.5">Consult</span>
                      </div>
                    </div>
                  </div>

                  {/* Home Indicator Bar */}
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-28 h-1 bg-slate-400/80 rounded-full" />
                </div>
              </div>
            </div>

            {/* Side Highlights Matching App Design Principles (Col 5) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-[#faf8f5] border border-[#e3e2e0] rounded-3xl p-6 sm:p-7 space-y-4 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-white border border-[#e3e2e0] flex items-center justify-center text-[#0f9d58] shadow-xs">
                  <DoctorLogo className="w-7 h-7 text-[#0f9d58]" />
                </div>
                <h4 className="text-xl font-extrabold text-[#1f1f1f] tracking-tight">
                  Authentic Clinical Medicine Vault
                </h4>
                <p className="text-sm text-[#5f6368] leading-relaxed">
                  Every card, badge, and color in the phone view reflects the live system. Color-coded borders instantly identify expiry risk (blue for safe, orange for warning, green for verified).
                </p>
                <div className="pt-2 border-t border-slate-200/80 space-y-2 text-xs font-semibold text-slate-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-[#0f9d58]" />
                    <span>Exact Android AlarmManager adherence schedules</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-[#0f9d58]" />
                    <span>Real-time drug-drug contraindication warnings</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-[#0f9d58]" />
                    <span>On-device RAM OCR with zero permanent photo uploads</span>
                  </div>
                </div>
              </div>

              {/* Quick Launch Card */}
              <div className="bg-white border border-[#e3e2e0] rounded-3xl p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#0f9d58] flex items-center justify-center">
                      <FileSpreadsheet size={18} />
                    </div>
                    <div>
                      <h5 className="font-bold text-sm text-[#1f1f1f]">Google Sheets Sync</h5>
                      <p className="text-[11px] text-[#5f6368]">Export medication logs to private Drive</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-[#e6f4ea] text-[#0f9d58] px-2 py-0.5 rounded-full">
                    Active
                  </span>
                </div>
                <button
                  onClick={onSignIn}
                  className="w-full py-3 bg-[#0f9d58] hover:bg-[#0b8043] text-white rounded-2xl font-bold text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogIn size={16} />
                  <span>Launch Live App in Browser</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 4. CORE CAPABILITIES (Numbered Editorial Grid)               */}
      {/* ============================================================ */}
      <section id="features" className="py-16 lg:py-24 border-b border-[#e3e2e0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center mb-14 space-y-3">
            <h2 className="text-xs font-bold tracking-widest text-[#0f9d58] uppercase">
              Core Capabilities
            </h2>
            <h3 className="text-3xl sm:text-4xl font-black text-[#1f1f1f] tracking-tight">
              Clinical Precision Built Into Every Action
            </h3>
            <p className="text-[#5f6368] text-base">
              Engineered to protect patient health through intelligent OCR, automated shelf-life warnings, and proactive pharmacology safety checks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Capability 01 */}
            <div className="bg-white rounded-3xl border border-[#e3e2e0] p-6 space-y-4 shadow-xs hover:border-[#0f9d58]/60 transition-colors">
              <div className="text-xs font-extrabold text-[#0f9d58]">01. SCANNER</div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#0f9d58] flex items-center justify-center">
                <Camera size={24} />
              </div>
              <h4 className="text-lg font-bold text-[#1f1f1f]">
                On-Device Vision &amp; OCR
              </h4>
              <p className="text-sm text-[#5f6368] leading-relaxed">
                Scan blister packs, bottles, and prescription slips. Text extraction happens on-device with zero permanent image storage on any cloud.
              </p>
            </div>

            {/* Capability 02 */}
            <div className="bg-white rounded-3xl border border-[#e3e2e0] p-6 space-y-4 shadow-xs hover:border-[#0f9d58]/60 transition-colors">
              <div className="text-xs font-extrabold text-[#0f9d58]">02. SAFETY</div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <ShieldCheck size={24} />
              </div>
              <h4 className="text-lg font-bold text-[#1f1f1f]">
                Drug Interaction Intelligence
              </h4>
              <p className="text-sm text-[#5f6368] leading-relaxed">
                Continuous cross-referencing of active ingredients to warn against contraindications, duplicate therapies, or dangerous combination risks.
              </p>
            </div>

            {/* Capability 03 */}
            <div className="bg-white rounded-3xl border border-[#e3e2e0] p-6 space-y-4 shadow-xs hover:border-[#0f9d58]/60 transition-colors">
              <div className="text-xs font-extrabold text-[#0f9d58]">03. EXPIRATION</div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Bell size={24} />
              </div>
              <h4 className="text-lg font-bold text-[#1f1f1f]">
                Smart Alerts &amp; Adherence
              </h4>
              <p className="text-sm text-[#5f6368] leading-relaxed">
                Native Android notifications and browser push alerts remind you before medication potency degrades or a daily dose is missed.
              </p>
            </div>

            {/* Capability 04 */}
            <div className="bg-white rounded-3xl border border-[#e3e2e0] p-6 space-y-4 shadow-xs hover:border-[#0f9d58]/60 transition-colors">
              <div className="text-xs font-extrabold text-[#0f9d58]">04. EXPORT</div>
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <FileSpreadsheet size={24} />
              </div>
              <h4 className="text-lg font-bold text-[#1f1f1f]">
                Google Sheets Integration
              </h4>
              <p className="text-sm text-[#5f6368] leading-relaxed">
                Seamlessly export complete medication logs, dose history, and doctor consultation checklists directly to your private Google Sheets.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 5. MID-ARTICLE SIGN IN & CONVERSION BLOCK                     */}
      {/* ============================================================ */}
      <section className="py-16 bg-[#0f9d58] text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-semibold backdrop-blur-xs">
            <Lock size={13} />
            <span>Secure Web Application</span>
          </div>

          <h3 className="text-3xl sm:text-4xl font-black tracking-tight text-white max-w-2xl mx-auto">
            Ready to organize your medications with clinical safety?
          </h3>

          <p className="text-white/85 text-base max-w-xl mx-auto leading-relaxed">
            Sign in to access your personal medicine vault, synchronize expiry schedules, or start a new on-device OCR scan immediately.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            {/* Middle of article Sign In button */}
            <button
              onClick={onSignIn}
              id="mid-article-signin-btn"
              className="w-full sm:w-auto px-8 py-3.5 bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-base rounded-full shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <LogIn size={18} strokeWidth={2.5} className="text-[#0f9d58]" />
              <span>Sign In to DawaSnap AI</span>
            </button>

            <button
              onClick={onSignIn}
              className="w-full sm:w-auto px-6 py-3.5 bg-emerald-800/80 hover:bg-emerald-800 text-white font-semibold text-base rounded-full transition-all border border-white/20 flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <span>Create New Account</span>
            </button>
          </div>

          <p className="text-xs text-white/70 pt-2">
            No credit card required · Free tier available · 100% data exportable
          </p>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 6. GOOGLE BRAND & OAUTH COMPLIANCE TRANSPARENCY SECTION       */}
      {/* ============================================================ */}
      <section id="google-integration" className="py-16 lg:py-24 bg-white border-b border-[#e3e2e0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="space-y-2 text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-[#0f9d58]">
                Google API Services Compliance
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-[#1f1f1f] tracking-tight">
                Google OAuth &amp; Data Transparency Disclosure
              </h3>
              <p className="text-[#5f6368] text-sm">
                How DawaSnap AI utilizes Google Identity and Google Workspace integrations in strict adherence to Google API Services User Data Policy.
              </p>
            </div>

            <div className="bg-[#faf8f5] border border-[#e3e2e0] rounded-3xl p-6 sm:p-8 space-y-6">
              {/* Point 1: Google Sign-In */}
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-white border border-[#e3e2e0] flex items-center justify-center shrink-0 shadow-2xs">
                  <img
                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                    alt="Google"
                    className="w-5 h-5"
                  />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-[#1f1f1f] text-sm">
                    1. Google Sign-In (Firebase Authentication)
                  </h4>
                  <p className="text-xs text-[#5f6368] leading-relaxed">
                    DawaSnap AI allows users to authenticate using their verified Google Account. We only read your basic profile info (email and user display name) to assign a cryptographic <code>request.auth.uid</code> to isolate your personal medicine inventory. We never access passwords or private profile details.
                  </p>
                </div>
              </div>

              {/* Point 2: Google Sheets Export */}
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 shadow-2xs text-[#0f9d58]">
                  <FileSpreadsheet size={18} />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-[#1f1f1f] text-sm">
                    2. Google Sheets Integration Scope (Export Feature)
                  </h4>
                  <p className="text-xs text-[#5f6368] leading-relaxed">
                    When you explicitly initiate a health data export, DawaSnap AI connects to Google Sheets exclusively to generate a private spreadsheet in your own Google Drive. We do not read, modify, or index any other spreadsheets or personal documents in your Google Drive.
                  </p>
                </div>
              </div>

              {/* Point 3: Limited Use Statement */}
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0 shadow-2xs text-blue-600">
                  <ShieldCheck size={18} />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-[#1f1f1f] text-sm">
                    3. Google API Services User Data Policy Compliance
                  </h4>
                  <p className="text-xs text-[#5f6368] leading-relaxed">
                    DawaSnap AI adheres to the <strong>Google API Services User Data Policy</strong>, including the Limited Use requirements. Data obtained through Google APIs is never sold, never transferred to advertising brokers, and never utilized for surveillance or model training without user direction.
                  </p>
                </div>
              </div>

              {/* Point 4: Developer Contact & Verification Details */}
              <div className="pt-4 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#5f6368]">
                <div>
                  <span className="font-bold text-slate-800">Operating Developer:</span>{' '}
                  MD NOOR HASSAN
                </div>
                <div>
                  <span className="font-bold text-slate-800">Support / Privacy Email:</span>{' '}
                  <a href="mailto:newluckypharmacy@gmail.com" className="text-[#0f9d58] hover:underline font-medium">
                    newluckypharmacy@gmail.com
                  </a>
                </div>
                <div>
                  <span className="font-bold text-slate-800">Android Package:</span>{' '}
                  <code>in.dawalens.app</code>
                </div>
                <div>
                  <span className="font-bold text-slate-800">Verified Web Domain:</span>{' '}
                  <code>dawasnap.vercel.app</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 7. FREQUENTLY ASKED QUESTIONS (FAQ)                          */}
      {/* ============================================================ */}
      <section id="faq" className="py-16 lg:py-24 border-b border-[#e3e2e0]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-3">
            <h2 className="text-xs font-bold tracking-widest text-[#0f9d58] uppercase">
              Frequently Asked Questions
            </h2>
            <h3 className="text-3xl font-black text-[#1f1f1f] tracking-tight">
              Everything You Need To Know
            </h3>
          </div>

          <div className="space-y-3">
            {[
              {
                q: "Are my medicine packaging photos uploaded or stored in the cloud?",
                a: "No. Medicine photos captured for your inventory are kept purely in your browser's local sandbox memory (IndexedDB) or on your mobile device. They are never uploaded to Firebase Storage or external image hosts."
              },
              {
                q: "How does the drug interaction checker work?",
                a: "When you add medications, the system checks pharmacological compatibility and active compounds against known contraindications, alerting you in real time to potential adverse reactions."
              },
              {
                q: "Can I use DawaSnap AI without creating an account?",
                a: "You can view the documentation, user guides, and legal policies publicly. To sync medications, receive shelf-life push reminders, and maintain your private inventory, signing in is required."
              },
              {
                q: "How can I permanently delete my account and all medication records?",
                a: "You have complete control over your data. You can delete individual medicines anytime, or perform an instant, permanent account purge through the in-app settings or via our statutory web deletion portal at /delete-account."
              }
            ].map((faq, idx) => (
              <div 
                key={idx}
                className="bg-white border border-[#e3e2e0] rounded-2xl overflow-hidden shadow-2xs"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full px-5 py-4 text-left font-bold text-sm text-[#1f1f1f] flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown 
                    size={16} 
                    className={`text-slate-500 transition-transform ${activeFaq === idx ? 'rotate-180 text-[#0f9d58]' : ''}`} 
                  />
                </button>
                {activeFaq === idx && (
                  <div className="px-5 pb-4 text-xs sm:text-sm text-[#5f6368] leading-relaxed border-t border-slate-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 8. FOOTER WITH STATUTORY & LEGAL VERIFICATION LINKS           */}
      {/* ============================================================ */}
      <footer className="bg-white text-[#5f6368] text-xs py-12 border-t border-[#e3e2e0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl overflow-hidden border border-[#e3e2e0] bg-white p-0.5">
                <img src="/logo.png" alt="" className="w-full h-full object-contain" />
              </div>
              <div className="space-y-0.5">
                <div className="text-[#1f1f1f] font-extrabold text-sm">
                  DawaSnap AI
                </div>
                <p className="text-[10px] text-[#5f6368]">
                  Smart Medicine Tracker &amp; On-Device Prescription Scanner
                </p>
              </div>
            </div>

            {/* Quick Links */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-medium">
              <button
                onClick={() => navigateToPublicPage('privacy')}
                className="text-[#5f6368] hover:text-[#1f1f1f] underline cursor-pointer"
              >
                Privacy Policy
              </button>
              <button
                onClick={() => navigateToPublicPage('terms')}
                className="text-[#5f6368] hover:text-[#1f1f1f] underline cursor-pointer"
              >
                Terms of Service
              </button>
              <button
                onClick={() => navigateToPublicPage('guide')}
                className="text-[#5f6368] hover:text-[#1f1f1f] underline cursor-pointer"
              >
                User Guide
              </button>
              <button
                onClick={() => navigateToPublicPage('delete-account')}
                className="text-[#5f6368] hover:text-[#1f1f1f] underline cursor-pointer"
              >
                Delete Account
              </button>
              <a
                href="mailto:newluckypharmacy@gmail.com"
                className="text-[#5f6368] hover:text-[#1f1f1f] underline"
              >
                Contact Developer
              </a>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <div>
              &copy; {new Date().getFullYear()} DawaSnap AI. All rights reserved. Developed by MD NOOR HASSAN.
            </div>
            <div className="text-center sm:text-right">
              Medical Disclaimer: DawaSnap AI is an organizational and tracking tool only and does not provide clinical diagnoses.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
