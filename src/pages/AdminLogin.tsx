import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin, getSession } from '../lib/store';
import { ShieldCheck, Mail, Lock, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function AdminLogin() {
  const nav = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // FIX: Added try/catch and proper admin role + verified check
  useEffect(() => {
    let cancelled = false;

    getSession().then(user => {
      if (cancelled) return;
      if (user && user.role === "admin" && user.verified !== false && !user.blocked) {
        nav('/admin');
      }
    }).catch(() => {
      // Silently fail - user just isn't logged in
    });

    return () => {
      cancelled = true;
    };
  }, [nav]);

  const handleLogin = async () => {
    setError('');

    // FIX: Better validation with trim check
    if (!email.trim() || !password.trim()) {
      setError('সব ফিল্ড পূরণ করুন');
      return;
    }

    try {
    if (loading) return;

    setLoading(true);

  const ok = await adminLogin(email.trim(), password.trim());

      if (!ok) {
        setError('ভুল ক্রেডেনশিয়াল');
        return;
      }

      // FIX: Verify session was actually set before redirecting
      const user = await getSession();
      if (user && user.role === 'admin') {
        nav('/admin');
      } else {
        setError('সেশন তৈরি করা যায়নি');
      }
    } catch (e) {
      console.error('Admin login error:', e);
      setError('লগইন ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-red-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/3 right-1/3 w-[400px] h-[400px] bg-orange-600/10 rounded-full blur-[150px]" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-red-500/30">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold mb-1">Admin Access</h1>
          <p className="text-gray-500 text-sm">সুরক্ষিত এলাকা</p>
        </div>

        <div className="rounded-2xl bg-white/[0.03] border border-red-500/10 backdrop-blur-xl p-7">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Admin Email"
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 focus:bg-white/[0.06] transition-all"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type={showPass ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="Password"
                className="w-full pl-12 pr-12 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 focus:bg-white/[0.06] transition-all"
              />

              <button
                onClick={() => setShowPass(!showPass)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
              >
                {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              aria-busy={loading}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-lg hover:shadow-red-500/25 transition-all"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'প্রবেশ করুন'}
            </button>
          </div>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          শুধুমাত্র অ্যাডমিনের জন্য
        </p>
      </div>
    </div>
  );
}