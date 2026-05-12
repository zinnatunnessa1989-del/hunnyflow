import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signUp, login, verifyEmail, getSettings, forgotPassword } from '../lib/store';
import { Sparkles, Eye, EyeOff, ArrowLeft, Mail, Lock, User, Phone, Loader2, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';

type AuthMode = 'login' | 'signup' | 'verify' | 'forgot';

export default function Auth({ mode: initialMode }: { mode: AuthMode }) {
  const nav = useNavigate();
  const [settings, setSettings] = useState<any>({});
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [vCode, setVCode] = useState('');
  const [verifyEmail2, setVerifyEmail2] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');

  // ===== LOAD SETTINGS =====
  useEffect(() => {
    (async () => {
      try {
        const appSettings = await getSettings();
        setSettings(appSettings);
      } catch (err) {
        console.error('Settings load error:', err);
      }
    })();
  }, []);

  // ===== SYNC MODE FROM PROPS =====
  useEffect(() => {
    if (mode === 'verify') {
      const savedEmail = sessionStorage.getItem('verify_email');
      const savedCode = sessionStorage.getItem('verify_code');

      if (savedEmail) {
        setVerifyEmail2(savedEmail);
      }
      if (savedCode) {
        setGeneratedCode(savedCode);
      }
    }
  }, [mode]);

  useEffect(() => {
    setMode(initialMode);
    setError('');
    setSuccess('');
  }, [initialMode]);


  // ===== HANDLE SIGNUP =====
  const handleSignup = async () => {
    setError('');
    setSuccess('');

    if (!name.trim()) {
      return setError('আপনার নাম লিখুন');
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return setError('সঠিক ইমেইল দিন');
    }

    if (!phone.trim() || phone.length < 11) {
      return setError('সঠিক ফোন নম্বর দিন');
    }

    if (password.length < 6) {
      return setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে');
    }

    if (loading) return;

    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanPassword = password.trim();
      const cleanName = name.trim();
      const cleanPhone = phone.trim();

      const result = await signUp(cleanName, cleanEmail, cleanPhone, cleanPassword);

      if (!result.ok) {
        setError(result.error || 'সমস্যা হয়েছে');
        setLoading(false);
        return;
      }

      setGeneratedCode(result.code || '');
      sessionStorage.setItem('verify_code', result.code || '');
      setVerifyEmail2(cleanEmail);
      sessionStorage.setItem('verify_email', cleanEmail);
      setPassword('');
      setLoading(false);
      
      setMode('verify');
    } catch (err) {
      console.error('Signup error:', err);
      setError('সাইনআপ করতে সমস্যা হয়েছে');
      setLoading(false);
    }
  };

  // ===== HANDLE LOGIN =====
  const handleLogin = async () => {
    setError('');
    setSuccess('');

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return setError('সঠিক ইমেইল দিন');
    }

    if (!password.trim()) {
      return setError('পাসওয়ার্ড দিন');
    }

    if (loading) return;

    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanPassword = password.trim();

      const result = await login(cleanEmail, cleanPassword);

      if (!result.ok) {
        if (result.needsVerify) {
          setVerifyEmail2(cleanEmail);
          setError('');
          setLoading(false);
          setMode('verify');
          return;
        }
        
        setError(result.error || 'সমস্যা হয়েছে');
        setLoading(false);
        return;
      }

      setSuccess('সফলভাবে লগইন হয়েছে!');
      setPassword('');
      setLoading(false);
      
      setTimeout(() => {
        if (result.user?.role === 'admin') {
          nav('/admin');
        } else {
          if (window.location.pathname !== '/dashboard') {
            nav('/dashboard');
          }
        }
      }, 500);
      
    } catch (err) {
      console.error('Login error:', err);
      setError('লগইন করতে সমস্যা হয়েছে');
      setLoading(false);
    }
  };

  // ===== HANDLE FORGOT PASSWORD =====
  const handleForgotPassword = async () => {
    setError('');
    setSuccess('');

    if (!forgotEmail.trim() || !/^\S+@\S+\.\S+$/.test(forgotEmail)) {
      return setError('সঠিক ইমেইল দিন');
    }

    if (!confirm('আপনি কি নিশ্চিত? আপনার অ্যাকাউন্ট সম্পূর্ণ ডিলিট হয়ে যাবে।')) {
      return;
    }

    if (loading) return;

    setLoading(true);

    try {
      const cleanEmail = forgotEmail.trim().toLowerCase();
      const result = await forgotPassword(cleanEmail);

      if (!result.ok) {
        setError(result.error || 'সমস্যা হয়েছে');
        setLoading(false);
        return;
      }

      setSuccess('অ্যাকাউন্ট সফলভাবে ডিলিট হয়েছে! নতুন অ্যাকাউন্ট তৈরি করতে পারেন।');
      setForgotEmail('');
      setLoading(false);
      
      setTimeout(() => {
        setMode('signup');
        setSuccess('');
      }, 2000);
      
    } catch (err) {
      console.error('Forgot password error:', err);
      setError('সমস্যা হয়েছে');
      setLoading(false);
    }
  };

  // ===== HANDLE VERIFY =====
  const handleVerify = async () => {
    setError('');
    setSuccess('');

    if (!verifyEmail2) {
      return setError('ইমেইল পাওয়া যায়নি');
    }

    if (vCode.length !== 6) {
      return setError('৬ সংখ্যার কোড দিন');
    }

    if (loading) return;

    setLoading(true);

    try {
      const cleanEmail = verifyEmail2.trim().toLowerCase();
      const cleanCode = vCode.trim();

      const isVerified = await verifyEmail(cleanEmail, cleanCode);

      if (!isVerified) {
        setError('ভুল কোড। আবার চেষ্টা করুন।');
        setLoading(false);
        return;
      }

      setSuccess('অ্যাকাউন্ট ভেরিফাই হয়েছে!');
      sessionStorage.removeItem('verify_email');
      sessionStorage.removeItem('verify_code');
      setGeneratedCode('');
      setLoading(false);

      setTimeout(() => {
        setMode('login');
        setSuccess('');
        nav('/login');
      }, 1200);
      
    } catch (err) {
      console.error('Verify error:', err);
      setError('ভেরিফিকেশন ব্যর্থ হয়েছে');
      setLoading(false);
    }
  };

  // ===== RENDER =====
  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-cyan-600/10 rounded-full blur-[150px]" />
        <div className="absolute inset-0 opacity-[0.02]" style={{ 
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', 
          backgroundSize: '40px 40px' 
        }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header Section */}
        <div className="text-center mb-8">
          <button 
            onClick={() => nav('/')} 
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition mb-6 text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> হোমপেজে ফিরুন
          </button>
          
          <div className="flex items-center justify-center gap-2.5 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold gradient-text">
              {settings?.siteName || 'Loading...'}
            </span>
          </div>
        </div>

        {/* Main Card */}
        <div className="rounded-3xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl p-8 shadow-2xl">
          
          <h2 className="text-2xl font-bold text-center mb-2">
            {mode === 'login' && 'আপনার অ্যাকাউন্টে লগইন করুন'}
            {mode === 'signup' && 'নতুন অ্যাকাউন্ট তৈরি করুন'}
            {mode === 'verify' && 'যাচাইকরণ'}
            {mode === 'forgot' && 'পাসওয়ার্ড ভুলে গেছেন?'}
          </h2>
          
          <p className="text-gray-400 text-center text-sm mb-8">
            {mode === 'login' && 'আপনার ইমেইল ও পাসওয়ার্ড দিয়ে লগইন করুন'}
            {mode === 'signup' && 'আপনার তথ্য দিয়ে রেজিস্ট্রেশন সম্পন্ন করুন'}
            {mode === 'verify' && 'নিচের কোডটি ব্যবহার করে ভেরিফাই করুন'}
            {mode === 'forgot' && 'ইমেইল দিয়ে অ্যাকাউন্ট ডিলিট করে পুনরায় রেজিস্ট্রেশন করুন'}
          </p>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}
          
          {success && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-emerald-400 text-sm">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {success}
            </div>
          )}

          {/* ===== FORGOT PASSWORD FORM ===== */}
          {mode === 'forgot' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                সতর্কতা: আপনার ইমেইল দিলে অ্যাকাউন্ট সম্পূর্ণ ডিলিট হয়ে যাবে। তারপর নতুন করে রেজিস্ট্রেশন করতে পারবেন।
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">আপনার ইমেইল</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    placeholder="example@gmail.com"
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 focus:bg-white/[0.06] transition-all"
                  />
                </div>
              </div>
              
              <button
                onClick={handleForgotPassword}
                disabled={loading}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 font-semibold text-lg transition-all hover:shadow-lg hover:shadow-red-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'অ্যাকাউন্ট ডিলিট করুন'}
              </button>
              
              <p className="text-center text-sm text-gray-400 mt-4">
                <button
                  onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                  className="text-violet-400 hover:text-violet-300 font-medium"
                >
                  লগইনে ফিরুন
                </button>
              </p>
            </div>
          )}

          {/* ===== SIGNUP FORM ===== */}
          {mode === 'signup' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">পুরো নাম</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="আপনার নাম"
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.06] transition-all"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">ইমেইল</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="example@gmail.com"
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.06] transition-all"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">ফোন নম্বর</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.06] transition-all"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">পাসওয়ার্ড</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="কমপক্ষে ৬ অক্ষর"
                    className="w-full pl-12 pr-12 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.06] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              
              <button
                onClick={handleSignup}
                disabled={loading}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 font-semibold text-lg transition-all hover:shadow-lg hover:shadow-violet-500/25 hover:scale-[1.01] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'রেজিস্ট্রেশন করুন'}
              </button>
              
              <p className="text-center text-sm text-gray-400 mt-4">
                আগেই অ্যাকাউন্ট আছে?{' '}
                <button
                  onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                  className="text-violet-400 hover:text-violet-300 font-medium"
                >
                  লগইন করুন
                </button>
              </p>
            </div>
          )}

          {/* ===== LOGIN FORM ===== */}
          {mode === 'login' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">ইমেইল</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="example@gmail.com"
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.06] transition-all"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">পাসওয়ার্ড</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="আপনার পাসওয়ার্ড"
                    className="w-full pl-12 pr-12 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.06] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              
              <button
                type="button"
                onClick={handleLogin}
                disabled={loading}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 font-semibold text-lg transition-all hover:shadow-lg hover:shadow-violet-500/25 hover:scale-[1.01] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'লগইন করুন'}
              </button>
              
              <p className="text-center text-sm text-gray-400 mt-4">
                পাসওয়ার্ড ভুলে গেছেন?{' '}
                <button
                  onClick={() => { setMode('forgot'); setError(''); setSuccess(''); setForgotEmail(''); }}
                  className="text-red-400 hover:text-red-300 font-medium flex items-center gap-1 mx-auto"
                >
                  <HelpCircle className="w-4 h-4" /> এখানে ক্লিক করুন
                </button>
              </p>
              
              <p className="text-center text-sm text-gray-400 mt-2">
                অ্যাকাউন্ট নেই?{' '}
                <button
                  onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}
                  className="text-violet-400 hover:text-violet-300 font-medium"
                >
                  রেজিস্ট্রেশন করুন
                </button>
              </p>
            </div>
          )}

          {/* ===== VERIFY FORM ===== */}
          {mode === 'verify' && (
            <div className="space-y-5">
              <div className="mb-2 p-5 rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/30 text-center">
                <div className="text-sm text-gray-300 mb-2">
                  আপনার verification code
                </div>

                <div className="text-4xl font-black tracking-[0.3em] text-white mb-2 font-mono">
                  {generatedCode || '------'}
                </div>

                <div className="text-sm text-amber-300">
                  এই কোডটি ব্যবহার করে অ্যাকাউন্ট ভেরিফাই করুন
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5 text-center">
                  উপরের কোডটি দিন
                </label>

                <input
                  type="text"
                  value={vCode}
                  onChange={e => setVCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="৬ সংখ্যার কোড"
                  maxLength={6}
                  className="w-full py-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-center text-2xl font-mono tracking-[0.5em] placeholder-gray-500 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.06] transition-all"
                />
              </div>

              <button
                onClick={handleVerify}
                disabled={loading || vCode.length !== 6}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 font-semibold text-lg transition-all hover:shadow-lg hover:shadow-violet-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'ভেরিফাই করুন'}
              </button>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}