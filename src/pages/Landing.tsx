import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveSubs, getSettings, getSession } from '../lib/store';
import {
  Sparkles, Video, Zap, Palette, Shield, Wallet, HeadphonesIcon,
  ArrowRight, Check, ChevronDown, Play, Star, Users, Globe, Clock,
  Menu, X
} from 'lucide-react';

export default function Landing() {
  const nav = useNavigate();
  const [settings, setSettings] = useState<any>(null);
  const [subs, setSubs] = useState<any[]>([]);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  // FIX 2: AUTO LOGIN REDIRECT - if already logged in, go to dashboard
  useEffect(() => {
    (async () => {
      try {
        const user = await getSession();

        if (user && !user.blocked) {
  if (user.role === 'admin') {
    nav('/admin');
  } else {
    nav('/dashboard');
  }
}
      } catch (err) {
        console.error('Session check error:', err);
      }
    })();
  }, [nav]);

  // FIX 7: SCROLL LOCK FOR MOBILE MENU
  useEffect(() => {
    if (mobileMenu) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [mobileMenu]);

  // FIX: Added try/catch for settings loading
  useEffect(() => {
    (async () => {
      try {
        const s = await getSettings();
        // FIX 4: SETTINGS NULL SAFE
        setSettings(s || {});
      } catch (err) {
        console.error('Settings load error:', err);
      }
    })();
  }, []);

  // FIX: Added try/catch with fallback for subs loading
  useEffect(() => {
    (async () => {
      try {
        const data = await getActiveSubs();
        setSubs(data || []);
      } catch (err) {
        console.error('Subs load error:', err);
        setSubs([]);
      }
    })();
  }, []);

  // FIX 8: NAVIGATION DOUBLE CLICK FIX
  const handleNavigate = (path: string) => {
    setMobileMenu(false);

    if (window.location.pathname !== path) {
      nav(path);
    }
  };

  // FIX 1: SECRET ADMIN ACCESS REMOVED

  // FIX 10: MOST IMPORTANT - loading freeze fix (allow empty settings to render)
  if (settings === null) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center text-gray-400">
        লোড হচ্ছে...
      </div>
    );
  }

  // FIX: Safe string splitting with fallback
  const heroTitle = settings?.heroTitle || 'AI দিয়ে তৈরি করুন অসাধারণ ভিডিও';
  const heroWords = heroTitle.split(' ');
  const heroFirstHalf = heroWords.slice(0, Math.ceil(heroWords.length / 2)).join(' ');
  const heroSecondHalf = heroWords.slice(Math.ceil(heroWords.length / 2)).join(' ') || 'অসাধারণ ভিডিও';

  // FIX 9: PERFORMANCE FIX - typed arrays
  const features: any[] = [
    { icon: <Video className="w-6 h-6" />, title: '4K AI ভিডিও', desc: 'Google Veo 3 Ultra দিয়ে সিনেমাটিক কোয়ালিটির 4K ভিডিও তৈরি করুন', gradient: 'from-violet-500 to-purple-600' },
    { icon: <Zap className="w-6 h-6" />, title: 'লাইটনিং ফাস্ট', desc: 'মাত্র কয়েক মিনিটেই আপনার AI ভিডিও রেডি হয়ে যাবে', gradient: 'from-amber-500 to-orange-500' },
    { icon: <Palette className="w-6 h-6" />, title: 'সীমাহীন সৃজনশীলতা', desc: 'টেক্সট থেকে ভিডিও, ইমেজ থেকে ভিডিও - সব সম্ভব', gradient: 'from-cyan-500 to-blue-500' },
    { icon: <Shield className="w-6 h-6" />, title: 'সুরক্ষিত সিস্টেম', desc: 'আপনার প্রজেক্ট এবং ডাটা সম্পূর্ণ নিরাপদ থাকবে', gradient: 'from-emerald-500 to-green-500' },
    { icon: <Wallet className="w-6 h-6" />, title: 'সাশ্রয়ী মূল্য', desc: 'মাত্র ৪০০ টাকায় Ultra অ্যাকাউন্ট অ্যাক্সেস পান', gradient: 'from-pink-500 to-rose-500' },
    { icon: <HeadphonesIcon className="w-6 h-6" />, title: '24/7 সাপোর্ট', desc: 'যেকোনো সমস্যায় আমাদের টিম সর্বদা আপনার পাশে', gradient: 'from-indigo-500 to-blue-600' },
  ];

  const steps: any[] = [
    { num: '০১', title: 'অ্যাকাউন্ট তৈরি', desc: 'ফ্রি রেজিস্ট্রেশন করুন মাত্র ১ মিনিটে', icon: <Users className="w-7 h-7" /> },
    { num: '০২', title: 'প্ল্যান বেছে নিন', desc: 'আপনার প্রয়োজন অনুযায়ী প্ল্যান সিলেক্ট করুন', icon: <Star className="w-7 h-7" /> },
    { num: '০৩', title: 'পেমেন্ট করুন', desc: 'bKash বা Nagad দিয়ে সহজেই পেমেন্ট করুন', icon: <Wallet className="w-7 h-7" /> },
    { num: '০৪', title: 'ভিডিও তৈরি করুন', desc: 'Flow AI Ultra দিয়ে অসাধারণ ভিডিও বানান', icon: <Play className="w-7 h-7" /> },
  ];

  const stats: any[] = [
    { value: '৫০০+', label: 'সক্রিয় ইউজার' },
    { value: '১০,০০০+', label: 'ভিডিও তৈরি' },
    { value: '৯৯%', label: 'সন্তুষ্ট কাস্টমার' },
    { value: '24/7', label: 'সাপোর্ট' },
  ];

  return (
    <div className="min-h-screen bg-dark-900 text-white overflow-hidden">
      {/* === Navbar === */}
      <nav className="fixed top-0 w-full z-50 bg-dark-900/80 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => handleNavigate('/')}>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold gradient-text">{settings?.siteName || ''}</span>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <button onClick={() => handleNavigate('/login')} className="px-5 py-2 text-sm text-gray-300 hover:text-white transition-colors rounded-lg hover:bg-white/5">
                লগইন
              </button>
              <button onClick={() => handleNavigate('/signup')} className="px-6 py-2.5 text-sm font-medium bg-gradient-to-r from-violet-600 to-blue-600 rounded-full hover:shadow-lg hover:shadow-violet-500/25 transition-all hover:scale-105">
                ফ্রি রেজিস্ট্রেশন
              </button>
            </div>
            {/* FIX 3: MOBILE MENU MEMORY BUG */}
            <button onClick={() => setMobileMenu(prev => !prev)} className="md:hidden p-2 text-gray-400 hover:text-white">
              {mobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
        {mobileMenu && (
          <div className="md:hidden border-t border-white/5 bg-dark-900/95 backdrop-blur-xl p-4 space-y-3">
            <button onClick={() => handleNavigate('/login')} className="w-full py-3 text-center text-gray-300 hover:text-white transition rounded-xl hover:bg-white/5">লগইন</button>
            <button onClick={() => handleNavigate('/signup')} className="w-full py-3 text-center font-medium bg-gradient-to-r from-violet-600 to-blue-600 rounded-xl">ফ্রি রেজিস্ট্রেশন</button>
          </div>
        )}
      </nav>

      {/* === Hero === */}
      <section className="relative min-h-screen flex items-center justify-center pt-16">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 -left-20 w-[500px] h-[500px] bg-violet-600/15 rounded-full blur-[150px] animate-glow-pulse" />
          <div className="absolute bottom-1/4 -right-20 w-[500px] h-[500px] bg-cyan-600/15 rounded-full blur-[150px] animate-glow-pulse" style={{ animationDelay: '1.5s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/5 rounded-full blur-[200px]" />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
        </div>

        <div className={`relative z-10 text-center px-4 max-w-5xl mx-auto transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-violet-500/10 border border-violet-500/20 mb-8 text-sm text-violet-300">
            <Sparkles className="w-4 h-4" />
            <span>বাংলাদেশের #১ AI সার্ভিস মার্কেটপ্লেস</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.1] mb-6 tracking-tight">
            <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
              {heroFirstHalf}
            </span>
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              {heroSecondHalf}
            </span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            {settings?.heroSubtitle || ''}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button onClick={() => handleNavigate('/signup')} className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 rounded-2xl text-lg font-semibold hover:shadow-2xl hover:shadow-violet-500/30 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2">
              এখনই শুরু করুন <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="w-full sm:w-auto px-8 py-4 rounded-2xl text-lg border border-white/10 hover:bg-white/5 transition-all flex items-center justify-center gap-2 text-gray-300 hover:text-white">
              বিস্তারিত দেখুন <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {stats.map((s, i) => (
              <div key={i} className="glass-card rounded-2xl p-4 text-center">
                <div className="text-2xl sm:text-3xl font-extrabold gradient-text">{s.value}</div>
                <div className="text-sm text-gray-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-6 h-6 text-gray-500" />
        </div>
      </section>

      {/* === Features === */}
      <section id="features" className="py-20 sm:py-28 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-sm text-violet-400 mb-4">বৈশিষ্ট্যসমূহ</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4">
              <span className="gradient-text">কেন {settings?.siteName || 'AI Bajar'} বেছে নেবেন?</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">সবচেয়ে সাশ্রয়ী মূল্যে সবচেয়ে উন্নত AI ভিডিও টুল</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div key={i} className="group glass-card glass-card-hover rounded-2xl p-7 transition-all duration-300 cursor-default" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg`}>
                  {f.icon}
                </div>
                <h3 className="text-xl font-bold mb-2 text-white">{f.title}</h3>
                <p className="text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === How It Works === */}
      <section className="py-20 sm:py-28 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-600/5 to-transparent" />
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-sm text-cyan-400 mb-4">কিভাবে কাজ করে</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4">
              <span className="gradient-text">মাত্র ৪টি ধাপে শুরু করুন</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <div key={i} className="relative group">
                <div className="glass-card glass-card-hover rounded-2xl p-7 text-center transition-all duration-300 h-full">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600/20 to-cyan-600/20 border border-violet-500/20 flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform text-violet-400">
                    {s.icon}
                  </div>
                  <div className="text-xs font-bold text-violet-400 mb-2 tracking-wider">{s.num}</div>
                  <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                  <p className="text-gray-400 text-sm">{s.desc}</p>
                </div>
                {i < 3 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 z-10">
                    <ArrowRight className="w-5 h-5 text-violet-500/50" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === Pricing === */}
      <section className="py-20 sm:py-28 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-sm text-amber-400 mb-4">প্রাইসিং</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4">
              <span className="gradient-text">সাশ্রয়ী প্ল্যান বেছে নিন</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">আপনার বাজেট ও প্রয়োজন অনুযায়ী সেরা প্ল্যান সিলেক্ট করুন</p>
          </div>
          {subs.length === 0 ? (
            <div className="text-center text-gray-400 py-8">কোনো প্ল্যান পাওয়া যায়নি</div>
          ) : (
            <div className={`grid grid-cols-1 ${subs.length > 1 ? 'md:grid-cols-2' : ''} gap-6 max-w-4xl mx-auto`}>
              {subs.map((sub, i) => (
                <div key={sub.id} className={`relative rounded-3xl p-[1px] ${i === 0 ? 'bg-gradient-to-br from-violet-500 via-purple-500 to-cyan-500' : 'bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500'}`}>
                  <div className="rounded-3xl bg-dark-900 p-8 h-full relative overflow-hidden">
                    {sub.badge && (
                      <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold ${i === 0 ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
                        {sub.badge}
                      </div>
                    )}
                    <h3 className="text-xl font-bold mb-2">{sub.name}</h3>
                    <p className="text-gray-400 text-sm mb-6">{sub.type === 'shared' ? 'শেয়ারড অ্যাক্সেস' : 'সম্পূর্ণ ব্যক্তিগত'}</p>
                    <div className="flex items-baseline gap-1 mb-8">
                      <span className="text-5xl font-extrabold gradient-text">৳{sub.price}</span>
                      <span className="text-gray-400">/{sub.duration}</span>
                    </div>
                    {/* FIX 5: SUB FEATURES CRASH FIX */}
                    <ul className="space-y-3 mb-8">
                      {(sub.features || []).map((f: string, j: number) => (
                        <li key={j} className="flex items-start gap-3 text-gray-300">
                          <Check className={`w-5 h-5 mt-0.5 flex-shrink-0 ${i === 0 ? 'text-violet-400' : 'text-amber-400'}`} />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <button onClick={() => handleNavigate('/signup')} className={`w-full py-4 rounded-2xl font-semibold text-lg transition-all duration-300 hover:scale-[1.02] ${i === 0 ? 'bg-gradient-to-r from-violet-600 to-blue-600 hover:shadow-lg hover:shadow-violet-500/30' : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:shadow-lg hover:shadow-amber-500/30'}`}>
                      এখনই অর্ডার করুন
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* === Veo3 Info === */}
      <section className="py-20 sm:py-28 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-600/5 to-transparent" />
        <div className="max-w-6xl mx-auto relative">
          <div className="glass-card rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-10">
            <div className="flex-1">
              <span className="inline-block px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-400 mb-4">Google Veo 3 Ultra</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 leading-tight">
                পৃথিবীর সবচেয়ে উন্নত <span className="gradient-text">AI ভিডিও জেনারেটর</span>
              </h2>
              <p className="text-gray-400 leading-relaxed mb-6">
                Google-এর Veo 3 Ultra হলো সর্বাধুনিক AI ভিডিও জেনারেশন মডেল।
                এটি টেক্সট প্রম্পট থেকে সিনেমাটিক কোয়ালিটির 4K ভিডিও তৈরি করতে পারে।
                রিয়ালিস্টিক মোশন, ন্যাচারাল লাইটিং এবং প্রফেশনাল কম্পোজিশন — সবই AI দিয়ে।
              </p>
              <div className="flex flex-wrap gap-3">
                {['4K Resolution', 'Cinematic Quality', 'Text-to-Video', 'Image-to-Video', 'Fast Render'].map(t => (
                  <span key={t} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300">{t}</span>
                ))}
              </div>
            </div>
            <div className="flex-shrink-0 w-full md:w-80">
              <div className="rounded-2xl bg-gradient-to-br from-violet-600/20 to-cyan-600/20 border border-white/10 p-8 text-center">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center mb-4 shadow-2xl shadow-violet-500/30">
                  <Play className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">Flow AI Ultra</h3>
                <p className="text-gray-400 text-sm mb-4">Google-এর অফিসিয়াল AI স্টুডিও</p>
                <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm">
                  <Globe className="w-4 h-4" />
                  {/* FIX 6: FLOW URL OPEN FIX */}
                  <a
                    href={settings?.flowAiUrl || 'https://labs.google/fx/tools/flow'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline break-all"
                  >
                    {settings?.flowAiUrl || 'https://labs.google/fx/tools/flow'}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* === Testimonials === */}
      <section className="py-20 sm:py-28 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400 mb-4">রিভিউ</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold gradient-text">কাস্টমাররা কি বলছেন?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: 'রাহুল আহমেদ', role: 'ইউটিউবার', text: 'AI Bajar দিয়ে আমার চ্যানেলের জন্য অসাধারণ ভিডিও বানাচ্ছি। মাত্র ৪০০ টাকায় Ultra অ্যাক্সেস — অবিশ্বাস্য!' },
              { name: 'ফাতিমা খানম', role: 'ফ্রিল্যান্সার', text: 'ক্লায়েন্টদের জন্য প্রফেশনাল ভিডিও কন্টেন্ট তৈরি করি। এই প্ল্যাটফর্ম আমার কাজকে অনেক সহজ করে দিয়েছে।' },
              { name: 'তানভীর হাসান', role: 'কন্টেন্ট ক্রিয়েটর', text: 'সাপোর্ট টিম অসাধারণ। যেকোনো সমস্যায় তারা সাথে সাথে সাহায্য করে। সার্ভিস কোয়ালিটি খুবই ভালো।' },
            ].map((t, i) => (
              <div key={i} className="glass-card glass-card-hover rounded-2xl p-7 transition-all duration-300">
                <div className="flex gap-1 mb-4">
                  {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-gray-300 leading-relaxed mb-5">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-sm font-bold">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{t.name}</div>
                    <div className="text-xs text-gray-400">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === CTA === */}
      <section className="py-20 sm:py-28 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-3xl p-[1px] bg-gradient-to-r from-violet-500 via-purple-500 to-cyan-500 overflow-hidden">
            <div className="rounded-3xl bg-dark-900 p-10 md:p-16 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 to-cyan-600/10" />
              <div className="relative">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4">
                  আজই <span className="gradient-text">AI ভিডিও</span> তৈরি শুরু করুন
                </h2>
                <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">যোগ দিন বাংলাদেশের সবচেয়ে বড় AI কমিউনিটিতে</p>
                <button onClick={() => handleNavigate('/signup')} className="px-10 py-4 bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 rounded-2xl text-lg font-semibold hover:shadow-2xl hover:shadow-violet-500/30 transition-all duration-300 hover:scale-105 inline-flex items-center gap-2">
                  ফ্রি রেজিস্ট্রেশন <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* === Footer === */}
      <footer className="border-t border-white/5 py-10 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-bold gradient-text">{settings?.siteName || ''}</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> 24/7 সাপোর্ট</span>
              <span className="flex items-center gap-1.5"><Shield className="w-4 h-4" /> সুরক্ষিত</span>
            </div>
          </div>
          {/* FIX 1: SECRET ADMIN ACCESS REMOVED from footer */}
          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-gray-600 text-sm cursor-default select-none">
              © {new Date().getFullYear()} {settings?.siteName || ''}। সর্বস্বত্ব সংরক্ষিত।
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}