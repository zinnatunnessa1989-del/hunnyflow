import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getSession, clearSession, getActiveSubs, getUserOrders, getUserMessages,
  sendMessage, createOrder, getSettings,
  type Subscription
} from '../lib/store';
import {
  Sparkles, LayoutDashboard, ShoppingBag, MessageCircle, CreditCard,
  LogOut, ExternalLink, Check, Clock, XCircle, Upload, Send, Image,
  ChevronRight, ArrowRight, Menu, X, Play, Video, Star, AlertCircle,
  Download, Smartphone, HelpCircle
} from 'lucide-react';

type Tab = 'dashboard' | 'plans' | 'orders' | 'order' | 'inbox' | 'extension' | 'app' | 'howto';

export default function Dashboard() {
  const nav = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refresh, setRefresh] = useState(0);

  // FIX 1: INBOX auto refresh - polling every 2 seconds
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      try {
        const latestMessages = await getUserMessages(user.id);
        setMessages(latestMessages || []);
      } catch (err) {
        console.error('Auto refresh message error:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [user]);

  const [subs, setSubs] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);

  const [orderSub, setOrderSub] = useState<Subscription | null>(null);
  const [orderStep, setOrderStep] = useState(1);
  const [payMethod, setPayMethod] = useState('bkash');
  const [screenshot, setScreenshot] = useState('');
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderDone, setOrderDone] = useState(false);

  const [msgText, setMsgText] = useState('');
  const [msgImg, setMsgImg] = useState('');
  const msgEndRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const ssRef = useRef<HTMLInputElement>(null);

  useEffect(() => { let cancelled = false; (async () => { try { const u = await getSession(); if (cancelled) return;
    // FIX 7: dashboard session security fix
    if (!u || u.blocked) {
      localStorage.removeItem('ai_bajar_session');
      nav('/login');
      return;
    } setUser(u); } catch (err) { console.error('Session load error:', err); if (!cancelled) nav('/login'); } })(); return () => { cancelled = true; }; }, [nav]);
  useEffect(() => { (async () => { try { const s = await getSettings(); setSettings(s || {}); } catch (err) { console.error('Settings load error:', err); } })(); }, []);
  useEffect(() => { if (!user) return; (async () => { try { const [activeSubs, userOrders, userMessages] = await Promise.all([getActiveSubs(), getUserOrders(user.id), getUserMessages(user.id)]); setSubs(activeSubs || []); setOrders(userOrders || []); setMessages(userMessages || []); } catch (err) { console.error('Data load error:', err); } })(); }, [user, refresh]);
  useEffect(() => { if (tab === 'inbox') setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100); }, [tab, refresh, messages.length]);

  if (!user || !settings) { return <div className="min-h-screen flex items-center justify-center text-gray-400">লোড হচ্ছে...</div>; }

  const confirmedOrders = orders.filter((o: any) => o.status === 'confirmed');
  const hasActive = confirmedOrders.length > 0;

  const handleImgUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (v: string) => void) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!file.type.startsWith('image/')) { alert('শুধু ইমেজ আপলোড করা যাবে'); return; }
    // FIX 9: image memory leak fix - size check BEFORE FileReader
    if (file.size > 5 * 1024 * 1024) {
      alert('ফাইল 5MB এর বেশি হতে পারবে না');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => { try { const img = new window.Image(); img.onload = () => { const canvas = document.createElement('canvas'); const maxW = 800; const scale = Math.min(1, maxW / img.width); canvas.width = img.width * scale; canvas.height = img.height * scale; const ctx = canvas.getContext('2d'); if (ctx) ctx.drawImage(img, 0, 0, canvas.width, canvas.height); setter(canvas.toDataURL('image/jpeg', 0.7)); }; img.onerror = () => { alert('ছবি লোড করা যায়নি'); }; img.src = reader.result as string; } catch { alert('ছবি প্রসেস করতে সমস্যা হয়েছে'); } };
    reader.readAsDataURL(file);
  };

  // FIX 5: order submit duplicate bug fix
  const submitOrder = async () => {
    if (orderLoading) return;
    if (!user || !orderSub || !screenshot || !payMethod) return;
    setOrderLoading(true);
    try {
      await createOrder(user.id, user.name, user.email, user.phone, orderSub.id, orderSub.name, orderSub.price, screenshot, payMethod);
      setOrderDone(true);
      setOrderStep(5);
    } catch (err) {
      console.error('Order submit error:', err);
      alert('অর্ডার সাবমিট করতে সমস্যা হয়েছে');
    }
    setOrderLoading(false);
  };

  // FIX 6: message send instant UI fix
  const sendMsg = async () => {
    if (!msgText.trim() && !msgImg) return;
    try {
      const text = msgText.trim();
      const image = msgImg || undefined;

      await sendMessage(user.id, user.name, text, image, false);

      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          userId: user.id,
          userName: user.name,
          text,
          image,
          isAdmin: false,
          timestamp: new Date().toISOString()
        }
      ]);

      setMsgText('');
      setMsgImg('');
      setRefresh(r => r + 1);
      setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      console.error('Send message error:', err);
      alert('মেসেজ পাঠাতে সমস্যা হয়েছে');
    }
  };

  const startOrder = (sub: Subscription) => { setOrderSub(sub); setOrderStep(1); setScreenshot(''); setOrderDone(false); setPayMethod('bkash'); setTab('order'); };

  // FIX 4: logout fully clean fix
  const handleLogout = async () => {
    try {
      await clearSession();
      localStorage.removeItem('ai_bajar_session');
      sessionStorage.clear();
    } catch (err) {
      console.error('Logout error:', err);
    }
    nav('/');
  };

  const navItems = [
    { id: 'dashboard' as Tab, label: 'ড্যাশবোর্ড', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'plans' as Tab, label: 'সকল প্ল্যান', icon: <CreditCard className="w-5 h-5" /> },
    { id: 'orders' as Tab, label: 'আমার অর্ডার', icon: <ShoppingBag className="w-5 h-5" /> },
    { id: 'extension' as Tab, label: 'এক্সটেনশন', icon: <Download className="w-5 h-5" /> },
    { id: 'app' as Tab, label: 'অ্যাপ', icon: <Smartphone className="w-5 h-5" /> },
    { id: 'howto' as Tab, label: 'কিভাবে ব্যবহার করবেন', icon: <HelpCircle className="w-5 h-5" /> },
    { id: 'inbox' as Tab, label: 'ইনবক্স', icon: <MessageCircle className="w-5 h-5" /> },
  ];

  const stepLabels = ['প্ল্যান', 'পেমেন্ট', 'স্ক্রিনশট', 'সাবমিট', 'যাচাই', '✓'];
  const StepTracker = ({ currentStep, small }: { currentStep: number; small?: boolean }) => (
    <div className="flex items-center justify-between w-full">
      {stepLabels.map((label, i) => { const step = i + 1; const done = currentStep > step || (currentStep === 6 && step === 6); const active = currentStep === step; const isLast = step === 6; return (<div key={i} className="flex items-center flex-1 last:flex-none"><div className="flex flex-col items-center"><div className={`${small ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm'} rounded-full flex items-center justify-center font-bold transition-all ${done ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : active ? (isLast ? 'bg-emerald-500 text-white' : 'bg-violet-500 text-white shadow-lg shadow-violet-500/30 animate-pulse') : 'bg-white/5 text-gray-500 border border-white/10'}`}>{done || (active && isLast) ? <Check className={small ? 'w-3.5 h-3.5' : 'w-4 h-4'} /> : step}</div><span className={`${small ? 'text-[10px] mt-0.5' : 'text-xs mt-1.5'} ${done ? 'text-emerald-400' : active ? 'text-violet-400' : 'text-gray-500'} whitespace-nowrap`}>{label}</span></div>{i < 5 && <div className={`h-0.5 flex-1 mx-1 ${small ? 'mx-0.5' : 'mx-2'} rounded ${done ? 'bg-emerald-500/50' : 'bg-white/5'}`} />}</div>); })}
    </div>
  );

  return (
    <div className="min-h-screen bg-dark-900 flex">
      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-72 bg-dark-800/80 backdrop-blur-xl border-r border-white/5 flex flex-col z-50 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-5 border-b border-white/5"><div className="flex items-center gap-2.5 cursor-pointer" onClick={() => nav('/')}><div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/20"><Sparkles className="w-5 h-5" /></div><span className="text-xl font-bold gradient-text">{settings?.siteName || 'AI Bajar'}</span></div></div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">{navItems.map(item => (<button key={item.id} onClick={() => { setTab(item.id); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${tab === item.id ? 'bg-violet-500/15 text-violet-300 border border-violet-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>{item.icon}<span className="font-medium">{item.label}</span></button>))}</nav>
        <div className="p-4 border-t border-white/5"><div className="flex items-center gap-3 px-3 py-2 mb-3"><div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-sm font-bold">{user.name.charAt(0)}</div><div className="flex-1 min-w-0"><div className="font-medium text-sm truncate">{user.name}</div><div className="text-xs text-gray-500 truncate">{user.email}</div></div></div><button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/5 transition-all"><LogOut className="w-5 h-5" /><span className="font-medium">লগআউট</span></button></div>
      </aside>

      <main className="flex-1 min-h-screen">
        <header className="sticky top-0 z-30 bg-dark-900/80 backdrop-blur-xl border-b border-white/5 px-4 sm:px-6 h-16 flex items-center justify-between"><button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-gray-400 hover:text-white"><Menu className="w-6 h-6" /></button><h1 className="text-lg font-bold hidden sm:block">{tab === 'dashboard' && 'ড্যাশবোর্ড'}{tab === 'plans' && 'সকল প্ল্যান'}{tab === 'orders' && 'আমার অর্ডার'}{tab === 'order' && 'নতুন অর্ডার'}{tab === 'extension' && 'এক্সটেনশন'}{tab === 'app' && 'অ্যাপ'}{tab === 'howto' && 'কিভাবে ব্যবহার করবেন'}{tab === 'inbox' && 'ইনবক্স'}</h1><div className="flex items-center gap-3">{hasActive && (<a href={settings?.flowAiUrl || '#'} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-sm font-medium flex items-center gap-2 hover:shadow-lg hover:shadow-emerald-500/20 transition-all"><Play className="w-4 h-4" /> Flow AI Ultra</a>)}</div></header>

        <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
          {tab === 'dashboard' && (<div className="space-y-6 animate-fade-in"><div className="glass-card rounded-2xl p-6 sm:p-8 relative overflow-hidden"><div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 to-cyan-600/10" /><div className="relative"><h2 className="text-2xl sm:text-3xl font-bold mb-2">স্বাগতম, <span className="gradient-text">{user.name}</span>! 👋</h2><p className="text-gray-400">আপনার AI ভিডিও জার্নি এখানে শুরু হয়</p></div></div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"><div className="glass-card rounded-2xl p-5"><div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center text-violet-400"><CreditCard className="w-5 h-5" /></div><span className="text-sm text-gray-400">সক্রিয় প্ল্যান</span></div><div className="text-xl font-bold">{hasActive ? confirmedOrders[0]?.subscriptionName : 'কোনো প্ল্যান নেই'}</div>{hasActive && <span className="inline-flex items-center gap-1 text-xs text-emerald-400 mt-1"><Check className="w-3 h-3" /> অ্যাক্টিভ</span>}</div><div className="glass-card rounded-2xl p-5"><div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400"><ShoppingBag className="w-5 h-5" /></div><span className="text-sm text-gray-400">মোট অর্ডার</span></div><div className="text-xl font-bold">{orders.length} টি</div></div><div className="glass-card rounded-2xl p-5 sm:col-span-2 lg:col-span-1"><div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center text-cyan-400"><MessageCircle className="w-5 h-5" /></div><span className="text-sm text-gray-400">মেসেজ</span></div><div className="text-xl font-bold">{messages.length} টি</div></div></div>{hasActive ? (<div className="rounded-2xl p-[1px] bg-gradient-to-r from-emerald-500 to-cyan-500"><div className="rounded-2xl bg-dark-900 p-6 sm:p-8"><div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"><div><div className="flex items-center gap-2 mb-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" /><span className="text-emerald-400 font-medium">অ্যাক্সেস অ্যাক্টিভ</span></div><h3 className="text-xl font-bold mb-1">Veo 3 Ultra ব্যবহার করুন</h3><p className="text-gray-400 text-sm">নিচের বাটনে ক্লিক করে Flow AI Ultra ওপেন করুন এবং ভিডিও তৈরি শুরু করুন</p></div><a href={settings?.flowAiUrl || '#'} target="_blank" rel="noopener noreferrer" className="px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-cyan-600 font-semibold text-lg flex items-center gap-2 hover:shadow-2xl hover:shadow-emerald-500/30 transition-all hover:scale-105 whitespace-nowrap"><Play className="w-5 h-5" /> Flow AI Ultra খুলুন <ExternalLink className="w-4 h-4" /></a></div></div></div>) : (<div className="glass-card rounded-2xl p-6 sm:p-8 text-center"><div className="w-16 h-16 rounded-2xl bg-violet-500/15 flex items-center justify-center mx-auto mb-4 text-violet-400"><Video className="w-8 h-8" /></div><h3 className="text-xl font-bold mb-2">এখনো কোনো সক্রিয় প্ল্যান নেই</h3><p className="text-gray-400 mb-6">একটি প্ল্যান কিনুন এবং AI ভিডিও তৈরি শুরু করুন</p><button onClick={() => setTab('plans')} className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 font-medium inline-flex items-center gap-2 hover:shadow-lg hover:shadow-violet-500/25 transition-all">প্ল্যান দেখুন <ArrowRight className="w-4 h-4" /></button></div>)}<div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><button onClick={() => setTab('plans')} className="glass-card glass-card-hover rounded-2xl p-5 text-left transition-all group"><Star className="w-6 h-6 text-violet-400 mb-3 group-hover:scale-110 transition-transform" /><h4 className="font-bold mb-1">প্ল্যান কিনুন</h4><p className="text-sm text-gray-400">সাশ্রয়ী মূল্যে Ultra অ্যাক্সেস</p></button><button onClick={() => setTab('orders')} className="glass-card glass-card-hover rounded-2xl p-5 text-left transition-all group"><ShoppingBag className="w-6 h-6 text-amber-400 mb-3 group-hover:scale-110 transition-transform" /><h4 className="font-bold mb-1">অর্ডার ট্র্যাক</h4><p className="text-sm text-gray-400">অর্ডারের স্ট্যাটাস দেখুন</p></button><button onClick={() => setTab('extension')} className="glass-card glass-card-hover rounded-2xl p-5 text-left transition-all group"><Download className="w-6 h-6 text-emerald-400 mb-3 group-hover:scale-110 transition-transform" /><h4 className="font-bold mb-1">এক্সটেনশন</h4><p className="text-sm text-gray-400">Chrome এক্সটেনশন ডাউনলোড</p></button></div></div>)}

          {/* PLANS */}
          {tab === 'plans' && (<div className="space-y-6 animate-fade-in"><div className="text-center mb-8"><h2 className="text-2xl sm:text-3xl font-bold gradient-text mb-2">সকল প্ল্যান</h2><p className="text-gray-400">আপনার প্রয়োজন অনুযায়ী প্ল্যান বেছে নিন</p></div>{subs.length === 0 ? <div className="text-center text-gray-400 py-8">কোনো প্ল্যান পাওয়া যায়নি</div> : (<div className={`grid grid-cols-1 ${subs.length > 1 ? 'md:grid-cols-2' : ''} gap-6 max-w-4xl mx-auto`}>{subs.map((sub, i) => (<div key={sub.id} className={`rounded-3xl p-[1px] ${i === 0 ? 'bg-gradient-to-br from-violet-500 via-purple-500 to-cyan-500' : 'bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500'}`}><div className="rounded-3xl bg-dark-900 p-7 h-full relative overflow-hidden">{sub.badge && <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold ${i === 0 ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>{sub.badge}</div>}<h3 className="text-xl font-bold mb-1">{sub.name}</h3><p className="text-sm text-gray-400 mb-5">{sub.type === 'shared' ? 'শেয়ারড অ্যাক্সেস' : 'ব্যক্তিগত অ্যাকাউন্ট'}</p><div className="flex items-baseline gap-1 mb-6"><span className="text-4xl font-extrabold gradient-text">৳{sub.price}</span><span className="text-gray-400">/{sub.duration}</span></div><ul className="space-y-2.5 mb-6">{sub.features.map((f: string, j: number) => (<li key={j} className="flex items-start gap-2.5 text-gray-300 text-sm"><Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${i === 0 ? 'text-violet-400' : 'text-amber-400'}`} /> {f}</li>))}</ul><button onClick={() => startOrder(sub)} className={`w-full py-3.5 rounded-xl font-semibold transition-all hover:scale-[1.02] ${i === 0 ? 'bg-gradient-to-r from-violet-600 to-blue-600 hover:shadow-lg hover:shadow-violet-500/30' : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:shadow-lg hover:shadow-amber-500/30'}`}>অর্ডার করুন <ChevronRight className="w-4 h-4 inline" /></button></div></div>))}</div>)}</div>)}

          {/* EXTENSION TAB */}
          {tab === 'extension' && (<div className="animate-fade-in">{hasActive ? (<div className="space-y-6"><div className="relative p-10 rounded-3xl text-center bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl overflow-hidden"><div className="absolute inset-0 bg-gradient-to-b from-violet-600/5 to-emerald-600/5" /><div className="relative z-10"><div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-500/30"><Download className="w-8 h-8 text-white" /></div><h2 className="text-3xl font-bold mb-3">{settings?.siteName || 'AI Bajar'} Chrome Extension</h2><div className="flex justify-center gap-3 mb-4"><span className="px-3 py-1 rounded-full text-xs font-medium bg-violet-500/15 text-violet-300 border border-violet-500/20">{settings?.extensionVersion || 'V1.0.0 LATEST'}</span><span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">MANIFEST V3</span></div><p className="text-gray-400 text-sm max-w-lg mx-auto mb-6">Works on <span className="text-violet-400">Google Flow</span> & <span className="text-violet-400">Whisk</span>. Auto-injects sessions — install once, works everywhere.</p><div className="flex justify-center gap-3 flex-wrap">{(settings?.extensionUrl) ? (<a href={settings.extensionUrl} download className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium flex items-center gap-2 hover:shadow-lg hover:shadow-violet-500/30 transition-all"><Download className="w-4 h-4" /> Download Extension</a>) : (<span className="px-6 py-3 rounded-xl bg-white/5 text-gray-500 text-sm">No extension uploaded</span>)}<a href="chrome://extensions" target="_blank" rel="noopener noreferrer" className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 font-medium flex items-center gap-2 hover:bg-white/10 transition-all"><ExternalLink className="w-4 h-4" /> chrome://extensions</a></div><p className="text-xs text-gray-500 mt-4">Requires Chrome or Edge · Manifest V3 · Google Flow + Whisk</p></div></div><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[{ icon: '🛡', title: 'Admin sessions', desc: 'No personal Google account needed.' },{ icon: '⚡', title: 'Auto model select', desc: 'Selects fast model automatically.' },{ icon: '⚙', title: 'Auto inject', desc: 'Injects session when you open Flow.' },{ icon: '🔒', title: 'Account locked', desc: 'Secure — no unauthorized access.' }].map((f, i) => (<div key={i} className="p-4 rounded-xl bg-white/[0.03] border border-white/5 text-center hover:bg-white/5 transition-all"><div className="text-2xl mb-2">{f.icon}</div><h4 className="text-sm font-medium mb-1">{f.title}</h4><p className="text-xs text-gray-500">{f.desc}</p></div>))}</div></div>) : (<div className="glass-card rounded-2xl p-8 text-center"><Download className="w-12 h-12 text-gray-500 mx-auto mb-4" /><h3 className="text-lg font-bold mb-2">এক্সটেনশন ডাউনলোড</h3><p className="text-gray-400 text-sm mb-4">অর্ডার কনফার্ম হলে এক্সটেনশন ডাউনলোড করতে পারবেন</p><button onClick={() => setTab('plans')} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-sm font-medium">প্ল্যান দেখুন</button></div>)}</div>)}

          {/* APP TAB */}
          {tab === 'app' && (<div className="animate-fade-in">{hasActive ? (<div className="glass-card rounded-3xl p-8 text-center"><h2 className="text-2xl font-bold mb-6">অ্যাপ ডাউনলোড করুন</h2>{settings?.appImageUrl ? (<img src={settings.appImageUrl} alt="App" className="max-w-xs mx-auto rounded-2xl mb-6 shadow-2xl" />) : (<div className="w-48 h-48 mx-auto rounded-2xl bg-white/5 flex items-center justify-center mb-6"><Smartphone className="w-20 h-20 text-gray-500" /></div>)}<p className="text-gray-400 mb-6">এই অ্যাপটি ব্যবহার করে এক্সটেনশন ইন্সটল করুন</p><a href={settings?.appDownloadUrl || '#'} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 font-semibold text-lg hover:shadow-lg transition-all"><Smartphone className="w-5 h-5" /> অ্যাপ ডাউনলোড করুন</a></div>) : (<div className="glass-card rounded-2xl p-8 text-center"><Smartphone className="w-12 h-12 text-gray-500 mx-auto mb-4" /><h3 className="text-lg font-bold mb-2">অ্যাপ ডাউনলোড</h3><p className="text-gray-400 text-sm mb-4">অর্ডার কনফার্ম হলে অ্যাপ ডাউনলোড করতে পারবেন</p><button onClick={() => setTab('plans')} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-sm font-medium">প্ল্যান দেখুন</button></div>)}</div>)}
        
          {/* HOW TO USE TAB - FIX 2: Thumbnail click opens YouTube in new tab */}
          {tab === 'howto' && (<div className="animate-fade-in">{hasActive ? (<div className="glass-card rounded-3xl p-8"><h2 className="text-2xl font-bold text-center mb-6">{settings?.tutorialTitle || 'কিভাবে ব্যবহার করবেন'}</h2>{settings?.tutorialThumbnail ? (<div className="relative max-w-3xl mx-auto rounded-2xl overflow-hidden mb-6 cursor-pointer group" 
            onClick={() => {
              const url = settings?.tutorialVideoUrl;
              if (url) {
                window.open(url, '_blank');
              }
            }}
          >{settings?.tutorialVideoUrl ? (<><img src={settings.tutorialThumbnail} alt="Tutorial" className="w-full aspect-video object-cover" /><div className="absolute inset-0 bg-black/50 flex items-center justify-center group-hover:bg-black/30 transition-all"><div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform"><Play className="w-10 h-10 text-white ml-1" /></div></div></>) : (<img src={settings.tutorialThumbnail} alt="Tutorial" className="w-full aspect-video object-cover" />)}</div>) : (settings?.tutorialVideoUrl ? (<div className="aspect-video max-w-3xl mx-auto rounded-2xl overflow-hidden mb-6"><iframe src={settings.tutorialVideoUrl} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="Tutorial" /></div>) : (<div className="aspect-video max-w-3xl mx-auto rounded-2xl bg-white/5 flex items-center justify-center mb-6"><Video className="w-20 h-20 text-gray-500" /></div>))}<p className="text-gray-400 text-center">ভিডিওটি দেখে ধাপে ধাপে শিখুন কিভাবে এক্সটেনশন ও অ্যাপ ব্যবহার করবেন</p></div>) : (<div className="glass-card rounded-2xl p-8 text-center"><Video className="w-12 h-12 text-gray-500 mx-auto mb-4" /><h3 className="text-lg font-bold mb-2">টিউটোরিয়াল</h3><p className="text-gray-400 text-sm mb-4">অর্ডার কনফার্ম হলে টিউটোরিয়াল ভিডিও দেখতে পারবেন</p><button onClick={() => setTab('plans')} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-sm font-medium">প্ল্যান দেখুন</button></div>)}</div>)}

          {/* ORDER FLOW */}
          {tab === 'order' && orderSub && (<div className="max-w-2xl mx-auto space-y-6 animate-fade-in"><StepTracker currentStep={orderStep} />{orderStep === 1 && (<div className="glass-card rounded-2xl p-6"><h3 className="text-xl font-bold mb-4">নির্বাচিত প্ল্যান</h3><div className="rounded-xl bg-violet-500/10 border border-violet-500/20 p-5"><h4 className="font-bold text-lg mb-1">{orderSub.name}</h4><p className="text-gray-400 text-sm mb-3">{orderSub.type === 'shared' ? 'শেয়ারড অ্যাক্সেস' : 'ব্যক্তিগত অ্যাকাউন্ট'}</p><div className="text-3xl font-extrabold gradient-text">৳{orderSub.price}<span className="text-sm text-gray-400 font-normal ml-1">/{orderSub.duration}</span></div></div><button onClick={() => setOrderStep(2)} className="w-full mt-5 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2">পরবর্তী <ArrowRight className="w-4 h-4" /></button></div>)}{orderStep === 2 && (<div className="glass-card rounded-2xl p-6"><h3 className="text-xl font-bold mb-4">পেমেন্ট মেথড</h3><div className="space-y-3 mb-6"><button onClick={() => setPayMethod('bkash')} className={`w-full p-4 rounded-xl border text-left flex items-center gap-4 transition-all ${payMethod === 'bkash' ? 'border-pink-500/50 bg-pink-500/10' : 'border-white/10 hover:bg-white/5'}`}><div className="w-12 h-12 rounded-xl bg-pink-600 flex items-center justify-center font-bold text-lg">b</div><div><div className="font-bold">bKash</div><div className="text-sm text-gray-400">নম্বর: <span className="text-pink-400 font-mono">{settings?.bkashNumber || ''}</span></div></div>{payMethod === 'bkash' && <Check className="w-5 h-5 text-pink-400 ml-auto" />}</button><button onClick={() => setPayMethod('nagad')} className={`w-full p-4 rounded-xl border text-left flex items-center gap-4 transition-all ${payMethod === 'nagad' ? 'border-orange-500/50 bg-orange-500/10' : 'border-white/10 hover:bg-white/5'}`}><div className="w-12 h-12 rounded-xl bg-orange-600 flex items-center justify-center font-bold text-lg">N</div><div><div className="font-bold">Nagad</div><div className="text-sm text-gray-400">নম্বর: <span className="text-orange-400 font-mono">{settings?.nagadNumber || ''}</span></div></div>{payMethod === 'nagad' && <Check className="w-5 h-5 text-orange-400 ml-auto" />}</button></div><div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm mb-5"><AlertCircle className="w-4 h-4 inline mr-1" />উপরের নম্বরে <strong>৳{orderSub.price}</strong> Send Money করুন</div><div className="flex gap-3"><button onClick={() => setOrderStep(1)} className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all">পেছনে</button><button onClick={() => setOrderStep(3)} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2">পরবর্তী <ArrowRight className="w-4 h-4" /></button></div></div>)}{orderStep === 3 && (<div className="glass-card rounded-2xl p-6"><h3 className="text-xl font-bold mb-4">পেমেন্ট স্ক্রিনশট</h3><p className="text-gray-400 text-sm mb-5">পেমেন্টের স্ক্রিনশট আপলোড করুন</p><input ref={ssRef} type="file" accept="image/*" className="hidden" onChange={e => handleImgUpload(e, setScreenshot)} />{!screenshot ? (<button onClick={() => ssRef.current?.click()} className="w-full py-16 rounded-2xl border-2 border-dashed border-white/10 hover:border-violet-500/30 hover:bg-violet-500/5 transition-all flex flex-col items-center gap-3 text-gray-400 hover:text-violet-400"><Upload className="w-10 h-10" /><span className="font-medium">ক্লিক করে ছবি আপলোড করুন</span></button>) : (<div className="relative rounded-xl overflow-hidden border border-white/10"><img src={screenshot} alt="Screenshot" className="w-full max-h-80 object-contain bg-dark-800" /><button onClick={() => { setScreenshot(''); if (ssRef.current) ssRef.current.value = ''; }} className="absolute top-2 right-2 p-2 rounded-full bg-red-500/80 hover:bg-red-500 transition"><X className="w-4 h-4" /></button></div>)}<div className="flex gap-3 mt-5"><button onClick={() => setOrderStep(2)} className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all">পেছনে</button><button onClick={() => setOrderStep(4)} disabled={!screenshot} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 font-semibold hover:shadow-lg transition-all disabled:opacity-30 flex items-center justify-center gap-2">পরবর্তী <ArrowRight className="w-4 h-4" /></button></div></div>)}{orderStep === 4 && (<div className="glass-card rounded-2xl p-6"><h3 className="text-xl font-bold mb-4">অর্ডার সামারি</h3><div className="space-y-4 mb-6"><div className="flex justify-between py-3 border-b border-white/5"><span className="text-gray-400">প্ল্যান</span><span className="font-semibold">{orderSub.name}</span></div><div className="flex justify-between py-3 border-b border-white/5"><span className="text-gray-400">মূল্য</span><span className="font-semibold text-emerald-400">৳{orderSub.price}</span></div><div className="flex justify-between py-3 border-b border-white/5"><span className="text-gray-400">পেমেন্ট</span><span className="font-semibold">{payMethod === 'bkash' ? 'bKash' : 'Nagad'}</span></div><div className="flex justify-between py-3"><span className="text-gray-400">স্ক্রিনশট</span><span className="text-emerald-400 flex items-center gap-1"><Check className="w-4 h-4" /> আপলোড হয়েছে</span></div></div>{screenshot && (<div className="rounded-xl overflow-hidden border border-white/10 mb-5"><img src={screenshot} alt="SS" className="w-full max-h-40 object-contain bg-dark-800" /></div>)}<div className="flex gap-3"><button onClick={() => setOrderStep(3)} className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all">পেছনে</button><button onClick={submitOrder} disabled={orderLoading} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">{orderLoading ? <><Clock className="w-4 h-4 animate-spin" /> সাবমিট হচ্ছে...</> : <>সাবমিট করুন <Check className="w-4 h-4" /></>}</button></div></div>)}{orderStep >= 5 && !orderDone && (<div className="glass-card rounded-2xl p-8 text-center"><Clock className="w-16 h-16 text-amber-400 mx-auto mb-4 animate-pulse" /><h3 className="text-xl font-bold mb-2">যাচাই চলছে</h3><p className="text-gray-400">আপনার অর্ডারটি অ্যাডমিন যাচাই করছেন। অনুগ্রহ করে অপেক্ষা করুন।</p></div>)}{orderDone && (<div className="glass-card rounded-2xl p-8 text-center"><div className="w-16 h-16 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto mb-4"><Clock className="w-8 h-8 text-amber-400 animate-pulse" /></div><h3 className="text-xl font-bold mb-2">অর্ডার সাবমিট হয়েছে!</h3><p className="text-gray-400 mb-6">অ্যাডমিন কনফার্ম করলে আপনি Flow AI Ultra ব্যবহার করতে পারবেন।</p><button onClick={() => setTab('orders')} className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 font-medium inline-flex items-center gap-2">আমার অর্ডার দেখুন <ArrowRight className="w-4 h-4" /></button></div>)}</div>)}

          {/* ORDERS */}
          {tab === 'orders' && (<div className="space-y-4 animate-fade-in">{orders.length === 0 ? (<div className="glass-card rounded-2xl p-8 text-center"><ShoppingBag className="w-12 h-12 text-gray-500 mx-auto mb-4" /><h3 className="text-lg font-bold mb-2">কোনো অর্ডার নেই</h3><p className="text-gray-400 text-sm mb-4">একটি প্ল্যান অর্ডার করুন</p><button onClick={() => setTab('plans')} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-sm font-medium">প্ল্যান দেখুন</button></div>) : (orders.slice().reverse().map((order: any) => (<div key={order.id} className="glass-card rounded-2xl p-5 sm:p-6"><div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-5"><div><h4 className="font-bold text-lg">{order.subscriptionName}</h4><p className="text-sm text-gray-400">অর্ডার: {new Date(order.createdAt).toLocaleDateString('bn-BD')}</p></div><div className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${order.status === 'confirmed' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : order.status === 'rejected' ? 'bg-red-500/15 text-red-400 border border-red-500/20' : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'}`}>{order.status === 'confirmed' ? <><Check className="w-3 h-3" /> কনফার্মড</> : order.status === 'rejected' ? <><XCircle className="w-3 h-3" /> বাতিল</> : <><Clock className="w-3 h-3" /> পেন্ডিং</>}</div></div><StepTracker currentStep={order.currentStep} small />{order.status === 'confirmed' && (<div className="mt-4 pt-4 border-t border-white/5"><a href={settings?.flowAiUrl || '#'} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-sm font-medium hover:shadow-lg transition-all"><Play className="w-4 h-4" /> Flow AI Ultra খুলুন <ExternalLink className="w-3 h-3" /></a></div>)}</div>)))}</div>)}

          {/* INBOX - FIX 3: Enter spam send bug fix */}
          {tab === 'inbox' && (<div className="flex flex-col h-[calc(100vh-10rem)] animate-fade-in"><div className="glass-card rounded-t-2xl flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">{messages.length === 0 && (<div className="text-center py-12"><MessageCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" /><h3 className="text-lg font-bold mb-1">ইনবক্স</h3><p className="text-gray-400 text-sm">অ্যাডমিনের সাথে কথা বলুন</p></div>)}{messages.map((msg: any) => (<div key={msg.id} className={`flex ${msg.isAdmin ? 'justify-start' : 'justify-end'}`}><div className={`max-w-[80%] sm:max-w-[70%] rounded-2xl p-3.5 ${msg.isAdmin ? 'bg-white/[0.06] rounded-bl-md' : 'bg-violet-600/25 border border-violet-500/20 rounded-br-md'}`}>{msg.isAdmin && <div className="text-xs text-violet-400 font-medium mb-1">অ্যাডমিন</div>}{msg.image && <img src={msg.image} alt="" className="rounded-xl max-w-full mb-2 max-h-60 object-contain" />}{msg.text && <p className="text-sm leading-relaxed">{msg.text}</p>}<div className="text-[10px] text-gray-500 mt-1.5 text-right">{new Date(msg.timestamp).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}</div></div></div>))}<div ref={msgEndRef} /></div>{msgImg && (<div className="px-4 py-2 bg-dark-800 border-x border-white/5"><div className="relative inline-block"><img src={msgImg} alt="" className="h-20 rounded-lg" /><button onClick={() => setMsgImg('')} className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center"><X className="w-3 h-3" /></button></div></div>)}<div className="glass-card rounded-b-2xl p-3 flex items-center gap-2 border-t border-white/5"><input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleImgUpload(e, setMsgImg)} /><button onClick={() => fileRef.current?.click()} className="p-2.5 rounded-xl hover:bg-white/5 text-gray-400 hover:text-violet-400 transition-all"><Image className="w-5 h-5" /></button><input type="text" value={msgText} onChange={e => setMsgText(e.target.value)} 
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMsg();
              }
            }}
          placeholder="মেসেজ লিখুন..." className="flex-1 py-2.5 px-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/40 transition-all text-sm" /><button onClick={sendMsg} disabled={!msgText.trim() && !msgImg} className="p-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:shadow-lg transition-all disabled:opacity-30"><Send className="w-5 h-5" /></button></div></div>)}
        </div>
      </main>
    </div>
  );
}