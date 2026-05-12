import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getUsers, getOrders, getAccounts, getSubs, getSettings,
  getConversations, getUserMessages, sendMessage, confirmOrder,
  rejectOrder, blockUser, unblockUser, addAccount, deleteAccount,
  removeUserFromAccount, addSub, updateSub, deleteSub, updateSettings,
  getSession, clearSession, fileToBase64
} from '../lib/store';
import {
  LayoutDashboard, ShoppingBag, Users, HardDrive, Tag, MessageCircle,
  Settings, LogOut, Check, Clock, XCircle, Plus, Trash2, UserX, UserCheck,
  Send, Image, X, ChevronDown, Eye, EyeOff, Search, Menu,
  ShieldCheck, CreditCard, Download, Upload, Sparkles, Activity, Key,
  AlertCircle, UserPlus, DollarSign, Server, MessageSquare, Package,
  ArrowUpRight, ArrowDownRight, RefreshCw,
} from 'lucide-react';

// ==================== TYPES ====================

type Tab = 'dashboard' | 'orders' | 'users' | 'accounts' | 'subs' | 'messages' | 'settings';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  blocked: boolean;
  createdAt: string;
}

interface Order {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  subscriptionId: string;
  subscriptionName: string;
  subscriptionPrice: number;
  status: 'pending' | 'confirmed' | 'rejected';
  screenshot: string;
  paymentMethod: string;
  createdAt: string;
  assignedAccountId?: string;
  expiresAt?: string;
}

interface Account {
  id: string;
  gmail: string;
  cookie?: string;
  subscriptionId: string;
  subscriptionName: string;
  assignedUsers: string[];
  maxSlots: number;
}

interface Subscription {
  id: string;
  name: string;
  price: number;
  duration: string;
  type: 'shared' | 'personal';
  maxUsers: number;
  features: string[];
  badge?: string;
  color: string;
  active: boolean;
}

interface Convo {
  userId: string;
  userName: string;
  lastMsg: string;
  time: string;
  count: number;
}

interface Message {
  id: string;
  userId: string;
  userName: string;
  text: string;
  image?: string;
  timestamp: string;
  isAdmin: boolean;
}

interface SettingsData {
  siteName: string;
  heroTitle: string;
  heroSubtitle: string;
  flowAiUrl: string;
  bkashNumber: string;
  nagadNumber: string;
  adminEmail: string;
  adminPassword: string;
  logoUrl: string;
  extensionUrl: string;
  extensionVersion: string;
  appImageUrl: string;
  appDownloadUrl: string;
  tutorialVideoUrl: string;
  tutorialTitle: string;
  tutorialThumbnail: string;
}

interface SubForm {
  name: string;
  price: number;
  duration: string;
  type: 'shared' | 'personal';
  maxUsers: number;
  features: string;
  badge: string;
  color: string;
  active: boolean;
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  verified: boolean;
  blocked: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

interface AdminLoginRecord {
  email: string;
  timestamp: string;
  success: boolean;
}

// ==================== CONSTANTS ====================

const SESSION_TIMEOUT_MINUTES = 60;
const ADMIN_ROLE = 'admin';
const ADMIN_LOGIN_STORAGE_KEY = 'aibajar_admin_logins';
const SETTINGS_CACHE_KEY = 'aibajar_settings_cache';

// ==================== MAIN ADMIN COMPONENT ====================

export default function Admin() {
  const nav = useNavigate();
  
  // ===== CRITICAL SECURITY STATE =====
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [securityCheckPassed, setSecurityCheckPassed] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [adminLoginRecords, setAdminLoginRecords] = useState<AdminLoginRecord[]>([]);
  const [securityLevel, setSecurityLevel] = useState<string>('initializing');
  
  // ===== UI STATE =====
  const [tab, setTab] = useState<Tab>('dashboard');
  const [refresh, setRefresh] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  // ===== DATA STATE =====
  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [convos, setConvos] = useState<Convo[]>([]);

  const refreshData = () => setRefresh(p => p + 1);

  // ===== LOAD ADMIN LOGIN HISTORY FROM LOCAL STORAGE =====
  useEffect(() => {
    try {
      const storedLogins = localStorage.getItem(ADMIN_LOGIN_STORAGE_KEY);
      if (storedLogins) {
        const parsedLogins = JSON.parse(storedLogins) as AdminLoginRecord[];
        setAdminLoginRecords(parsedLogins || []);
      }
    } catch (error) {
      console.error('[SECURITY] Failed to load admin login history:', error);
    }
  }, []);

  // ===== SAVE ADMIN LOGIN RECORD =====
  const saveAdminLoginRecord = (email: string, success: boolean) => {
    try {
      const newRecord: AdminLoginRecord = {
        email: email,
        timestamp: new Date().toISOString(),
        success: success
      };
      
      const existingRecords = JSON.parse(
        localStorage.getItem(ADMIN_LOGIN_STORAGE_KEY) || '[]'
      ) as AdminLoginRecord[];
      
      existingRecords.push(newRecord);
      
      // Keep only last 200 records for performance
      const trimmedRecords = existingRecords.slice(-50);
      
      localStorage.setItem(ADMIN_LOGIN_STORAGE_KEY, JSON.stringify(trimmedRecords));
      setAdminLoginRecords(trimmedRecords);
      
    } catch (error) {
      console.error('[SECURITY] Failed to save admin login record:', error);
    }
  };

  // ===== SESSION ACTIVITY TRACKER - HEARTBEAT SYSTEM =====
  useEffect(() => {
    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart', 'focus'];
    
    const handleUserActivity = () => {
      setLastActivity(Date.now());
      if (sessionExpired) {
        setSessionExpired(false);
      }
    };

    activityEvents.forEach(event => {
      window.addEventListener(event, handleUserActivity);
    });

    return () => {
     activityEvents.forEach(event => {
    window.removeEventListener(event, handleUserActivity);
    });
   };
  }, [sessionExpired]);

  // ===== SESSION TIMEOUT MONITOR =====
  useEffect(() => {
    if (!isAdmin || !adminUser || !securityCheckPassed) return;

    const timeoutInterval = setInterval(() => {
      const currentTime = Date.now();
      const inactiveDuration = currentTime - lastActivity;
      const timeoutMilliseconds = SESSION_TIMEOUT_MINUTES * 60 * 1000;

      if (inactiveDuration > timeoutMilliseconds && !sessionExpired) {
        console.warn('[SECURITY] Session timeout detected - Inactive for', SESSION_TIMEOUT_MINUTES, 'minutes');
        setSessionExpired(true);
        handleForceLogout('স্বয়ংক্রিয় সেশন টাইমআউট - ' + SESSION_TIMEOUT_MINUTES + ' মিনিট নিষ্ক্রিয়তা');
      }
    }, 15000); // Check every 15 seconds

    return () => clearInterval(timeoutInterval);
  }, [isAdmin, adminUser, lastActivity, sessionExpired, securityCheckPassed]);

  // ===== ULTRA SECURE ADMIN AUTHENTICATION - MULTI LAYER CHECK =====
  useEffect(() => {
    let securityCheckCancelled = false;
    let securityTimeout: ReturnType<typeof setTimeout>;

    const performMultiLayerSecurityCheck = async () => {
      try {
        setSecurityLevel('checking_session');
        
        // LAYER 1: Get current user session
        const currentUser = await getSession();
        
        if (securityCheckCancelled) return;

        // LAYER 2: Verify user exists
        if (!currentUser) {
          console.warn('[SECURITY L2] No active session found');
          await clearSession();
localStorage.removeItem(SETTINGS_CACHE_KEY);
          nav('/admin-login');
          return;
        }

        setSecurityLevel('checking_block_status');

        // LAYER 3: Verify user is not blocked
        if (currentUser.blocked === true) {
          console.warn('[SECURITY L3] Blocked user attempted access:', currentUser.email);
          saveAdminLoginRecord(currentUser.email || 'unknown', false);
          await clearSession();
localStorage.removeItem(SETTINGS_CACHE_KEY);
          nav('/admin-login');
          return;
        }

        setSecurityLevel('checking_admin_role');

        // LAYER 4: Verify admin role
        if (currentUser.role !== ADMIN_ROLE) {
          console.warn('[SECURITY L4] Non-admin access attempt by:', currentUser.email);
          saveAdminLoginRecord(currentUser.email || 'unknown', false);
          await clearSession();
localStorage.removeItem(SETTINGS_CACHE_KEY);
          nav('/admin-login');
          return;
        }

        setSecurityLevel('checking_verification');

        // LAYER 5: Verify email is verified
        if (currentUser.verified !== true) {
          console.warn('[SECURITY L5] Unverified admin user');
          await clearSession();
localStorage.removeItem(SETTINGS_CACHE_KEY);
          nav('/admin-login');
          return;
        }

        setSecurityLevel('loading_settings');

        // LAYER 6: Load application settings
        const appSettings = await getSettings();
        
        if (securityCheckCancelled) return;

        // LAYER 7: Verify admin email matches stored settings
        if (currentUser.email !== appSettings?.adminEmail) {
          console.warn('[SECURITY L7] Email mismatch - User:', currentUser.email, 'Expected:', appSettings?.adminEmail);
          saveAdminLoginRecord(currentUser.email || 'unknown', false);
          await clearSession();
localStorage.removeItem(SETTINGS_CACHE_KEY);
          nav('/admin-login');
          return;
        }

        setSecurityLevel('access_granted');

        // LAYER 8: All checks passed - Grant access
        console.log('[SECURITY] ✅ Admin access granted for:', currentUser.email);
        saveAdminLoginRecord(currentUser.email, true);
        
        if (!securityCheckCancelled) {
          setIsAdmin(true);
          setAdminUser(currentUser as AdminUser);
          setSettings({ ...appSettings });
          setSecurityCheckPassed(true);
          setLastActivity(Date.now());
          
          // Cache settings for faster reload
          try {
            const safeSettings = {
  ...appSettings,
  adminPassword: '',
};

localStorage.setItem(
  SETTINGS_CACHE_KEY,
  JSON.stringify(safeSettings)
);
          } catch (e) {
            // Ignore cache errors
          }
        }

      } catch (error) {
        console.error('[SECURITY] Critical authentication error:', error);
        if (!securityCheckCancelled) {
          await clearSession();
localStorage.removeItem(SETTINGS_CACHE_KEY);
          nav('/admin-login');
        }
      }

      if (!securityCheckCancelled) {
        setLoading(false);
      }
    };

    // Slight delay to prevent race conditions
    securityTimeout = setTimeout(() => {
      performMultiLayerSecurityCheck();
    }, 100);

    return () => {
      securityCheckCancelled = true;
      clearTimeout(securityTimeout);
    };
  }, [nav]);

  // ===== LOAD ALL PANEL DATA AFTER SECURITY CLEARANCE =====
  useEffect(() => {
    if (!isAdmin || !adminUser || !securityCheckPassed) return;

    let dataLoadCancelled = false;
    setDataLoading(true);

    async function loadAllPanelData() {
      try {
        // Load all core data in parallel for speed
        const [loadedUsers, loadedOrders, loadedAccounts, loadedConvos] = await Promise.all([
          getUsers(),
          getOrders(),
          getAccounts(),
          getConversations()
        ]);

        if (dataLoadCancelled) return;

        // Set data with null safety
        setUsers(Array.isArray(loadedUsers) ? loadedUsers : []);
        setOrders(Array.isArray(loadedOrders) ? loadedOrders : []);
        setAccounts(Array.isArray(loadedAccounts) ? loadedAccounts : []);
        setConvos(Array.isArray(loadedConvos) ? loadedConvos : []);

        // Load subscriptions separately
        const subsData = await getSubs();
        if (!dataLoadCancelled) {
          setSubs(Array.isArray(subsData) ? subsData : []);
        }

        // Refresh settings from server
        const freshSettings = await getSettings();
        if (!dataLoadCancelled && freshSettings) {
          setSettings({ ...freshSettings });
        }

      } catch (error) {
        console.error("[DATA LOAD ERROR]:", error);
      } finally {
        if (!dataLoadCancelled) {
          setDataLoading(false);
        }
      }
    }

    loadAllPanelData();

    return () => {
      dataLoadCancelled = true;
    };
  }, [refresh, isAdmin, adminUser, securityCheckPassed]);

  // ===== FORCE LOGOUT WITH SECURITY LOGGING =====
  const handleForceLogout = async (reason?: string) => {
    const logoutReason = reason || 'Unknown reason';
    console.warn('[SECURITY] 🚪 Force logout initiated - Reason:', logoutReason);
    
    try {
      await clearSession();
localStorage.removeItem(SETTINGS_CACHE_KEY);
      setIsAdmin(false);
      setAdminUser(null);
      setSecurityCheckPassed(false);
      setSecurityLevel('logged_out');
      nav('/admin-login');
    } catch (error) {
      console.error("[LOGOUT ERROR]:", error);
      // Emergency redirect
      window.location.href = '/#/admin-login';
    }
  };

  // ===== MANUAL LOGOUT =====
  const handleManualLogout = async () => {
    console.log('[SECURITY] Manual logout by admin');
    try {
      await clearSession();
localStorage.removeItem(SETTINGS_CACHE_KEY);
      setIsAdmin(false);
      setAdminUser(null);
      setSecurityCheckPassed(false);
      setSecurityLevel('manual_logout');
      nav('/admin-login');
    } catch (error) {
      console.error("[LOGOUT ERROR]:", error);
      window.location.href = '/#/admin-login';
    }
  };

  // ===== LOADING STATE WITH SECURITY STATUS =====
  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center animate-pulse shadow-2xl shadow-red-500/30">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">নিরাপত্তা যাচাই করা হচ্ছে</h2>
          <p className="text-gray-400 text-sm max-w-md">
            মাল্টি-লেয়ার সিকিউরিটি চেক সম্পন্ন হচ্ছে। অনুগ্রহ করে অপেক্ষা করুন...
          </p>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" style={{ animationDelay: '0.2s' }} />
            <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" style={{ animationDelay: '0.4s' }} />
          </div>
          <p className="text-gray-600 text-xs">{securityLevel}</p>
        </div>
      </div>
    );
  }

  // ===== SESSION EXPIRED STATE =====
  if (sessionExpired) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-red-500/20 flex items-center justify-center">
            <Clock className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">সেশন শেষ হয়ে গেছে</h2>
          <p className="text-gray-400 mb-2">
            আপনার সেশন {SESSION_TIMEOUT_MINUTES} মিনিটের নিষ্ক্রিয়তার কারণে স্বয়ংক্রিয়ভাবে বন্ধ করা হয়েছে।
          </p>
          <p className="text-gray-600 text-sm mb-6">
            নিরাপত্তার কারণে এটি করা হয়েছে। অনুগ্রহ করে পুনরায় লগইন করুন।
          </p>
          <button
            onClick={() => { setSessionExpired(false); nav('/admin-login'); }}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 font-semibold text-white hover:shadow-lg hover:shadow-red-500/25 transition-all"
          >
            পুনরায় লগইন করুন
          </button>
        </div>
      </div>
    );
  }

  // ===== ACCESS DENIED STATE =====
  if (!isAdmin || !adminUser || !securityCheckPassed) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-red-500/20 flex items-center justify-center">
            <ShieldCheck className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">অ্যাক্সেস অস্বীকৃত</h2>
          <p className="text-gray-400 mb-2">
            আপনার এই পৃষ্ঠাটি দেখার অনুমতি নেই।
          </p>
          <p className="text-gray-600 text-sm mb-6">
            আপনি যদি প্রশাসক হন, তাহলে দয়া করে সঠিক ক্রেডেনশিয়াল দিয়ে লগইন করুন।
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => nav('/admin-login')}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 font-medium text-white hover:shadow-lg transition-all"
            >
              অ্যাডমিন লগইন
            </button>
            <button
              onClick={() => nav('/')}
              className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-all"
            >
              হোমপেজ
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===== SETTINGS NOT LOADED =====
  if (!settings) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-400">সেটিংস লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  // ===== CALCULATE DASHBOARD STATISTICS =====
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const confirmedOrders = orders.filter(o => o.status === 'confirmed');
  const rejectedOrders = orders.filter(o => o.status === 'rejected');
  const totalRevenue = confirmedOrders.reduce((sum, o) => sum + (o.subscriptionPrice || 0), 0);
  
  // Admin login statistics
  const successfulAdminLogins = adminLoginRecords.filter(r => r.success).length;
  const failedAdminLogins = adminLoginRecords.filter(r => !r.success).length;
  const recentAdminLogins = adminLoginRecords.slice(-15).reverse();

  // ===== SIDEBAR NAVIGATION ITEMS =====
  const navItems: { id: Tab; label: string; icon: React.ReactNode; badge?: number; color?: string }[] = [
    { id: 'dashboard', label: 'ড্যাশবোর্ড', icon: <LayoutDashboard className="w-5 h-5" />, color: 'text-violet-400' },
    { id: 'orders', label: 'অর্ডার সমূহ', icon: <ShoppingBag className="w-5 h-5" />, badge: pendingOrders.length, color: 'text-amber-400' },
    { id: 'users', label: 'ইউজার ম্যানেজমেন্ট', icon: <Users className="w-5 h-5" />, badge: users.length, color: 'text-cyan-400' },
    { id: 'accounts', label: 'আল্ট্রা অ্যাকাউন্ট', icon: <HardDrive className="w-5 h-5" />, color: 'text-emerald-400' },
    { id: 'subs', label: 'সাবস্ক্রিপশন', icon: <Tag className="w-5 h-5" />, color: 'text-pink-400' },
    { id: 'messages', label: 'মেসেজ সেন্টার', icon: <MessageCircle className="w-5 h-5" />, badge: convos.length, color: 'text-blue-400' },
    { id: 'settings', label: 'সিস্টেম সেটিংস', icon: <Settings className="w-5 h-5" />, color: 'text-purple-400' },
  ];

  // ===== RENDER ADMIN PANEL =====
  return (
    <div className="min-h-screen bg-dark-900 flex" onClick={() => setLastActivity(Date.now())}>
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ===== ADMIN SIDEBAR ===== */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-72 bg-dark-800/80 backdrop-blur-xl border-r border-white/5 flex flex-col z-50 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        
        {/* Sidebar Brand Header */}
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-white tracking-tight">অ্যাডমিন প্যানেল</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-emerald-400 font-medium uppercase tracking-wider">সুরক্ষিত সংযোগ</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Navigation Menu */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto scrollbar-thin">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setTab(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 group ${
                tab === item.id 
                  ? 'bg-red-500/15 text-red-300 border border-red-500/20 shadow-lg shadow-red-500/5' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <span className={tab === item.id ? 'text-red-400' : item.color || 'text-gray-500'}>
                {item.icon}
              </span>
              <span className="font-medium flex-1 text-sm">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-bold min-w-[24px] text-center">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Sidebar Footer - Admin Profile & Logout */}
        <div className="p-4 border-t border-white/5 space-y-3">
          {/* Admin Profile Card */}
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-sm font-bold shadow-md">
              {adminUser?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate text-white">{adminUser?.name || 'Administrator'}</div>
              <div className="text-[11px] text-gray-500 truncate">{adminUser?.email || 'admin@system'}</div>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-400" title="Online" />
          </div>
          
          {/* Logout Button */}
          <button
            onClick={handleManualLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all border border-red-500/10 hover:border-red-500/30 group"
          >
            <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            <span className="font-medium text-sm">নিরাপদ লগআউট</span>
          </button>
        </div>
      </aside>

      {/* ===== MAIN CONTENT AREA ===== */}
      <main className="flex-1 min-h-screen bg-dark-900">
        {/* Top Navigation Header */}
        <header className="sticky top-0 z-30 bg-dark-900/80 backdrop-blur-xl border-b border-white/5 px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-all">
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white">
                {navItems.find(n => n.id === tab)?.label || 'ড্যাশবোর্ড'}
              </h1>
              {dataLoading && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>ডাটা আপডেট হচ্ছে...</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={refreshData}
              disabled={dataLoading}
              className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-all disabled:opacity-50"
              title="ডাটা রিফ্রেশ করুন"
            >
              <RefreshCw className={`w-4 h-4 ${dataLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {/* Content Panel Area */}
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {tab === 'dashboard' && (
            <AdminDashboard
              users={users}
              orders={orders}
              accounts={accounts}
              pendingOrders={pendingOrders}
              confirmedOrders={confirmedOrders}
              rejectedOrders={rejectedOrders}
              totalRevenue={totalRevenue}
              adminLoginRecords={recentAdminLogins}
              successfulLogins={successfulAdminLogins}
              failedLogins={failedAdminLogins}
            />
          )}
          {tab === 'orders' && <OrdersPanel
  orders={orders}
  accounts={accounts}
  r={refreshData}
  adminUser={adminUser}
  setTab={setTab}
/>}
          {tab === 'users' && <UsersPanel users={users} orders={orders} r={refreshData} adminUser={adminUser} />}
          {tab === 'accounts' && <AccountsPanel accounts={accounts} subs={subs} users={users} r={refreshData} adminUser={adminUser} />}
          {tab === 'subs' && <SubsPanel subs={subs} r={refreshData} adminUser={adminUser} />}
          {tab === 'messages' && <MessagesPanel convos={convos} r={refreshData} refresh={refresh} />}
          {tab === 'settings' && <SettingsPanel settings={settings} r={refreshData} adminUser={adminUser} />}
        </div>
      </main>
    </div>
  );
}
// ==================== DASHBOARD PANEL ====================

function AdminDashboard({
  users, orders, accounts, pendingOrders, confirmedOrders,
  totalRevenue, adminLoginRecords, successfulLogins, failedLogins
}: {
  users: User[]; orders: Order[]; accounts: Account[];
  pendingOrders: Order[]; confirmedOrders: Order[]; rejectedOrders: Order[];
  totalRevenue: number;
  adminLoginRecords: AdminLoginRecord[]; successfulLogins: number; failedLogins: number;
}) {
  const safeUsers = users || [];
  const safeOrders = orders || [];
  const safeAccounts = accounts || [];
  const safePending = pendingOrders || [];
  const safeConfirmed = confirmedOrders || [];
  const safeLoginRecords = adminLoginRecords || [];

  const stats = [
    { 
      label: 'মোট ইউজার', 
      value: safeUsers.length, 
      icon: <Users className="w-6 h-6" />, 
      bg: 'bg-violet-500/15', 
      textColor: 'text-violet-400',
      trend: '+12%',
      trendUp: true
    },
    { 
      label: 'পেন্ডিং অর্ডার', 
      value: safePending.length, 
      icon: <Clock className="w-6 h-6" />, 
      bg: 'bg-amber-500/15', 
      textColor: 'text-amber-400',
      trend: `${safePending.length > 0 ? 'নতুন' : '0'}`,
      trendUp: safePending.length > 0
    },
    { 
      label: 'কনফার্মড অর্ডার', 
      value: safeConfirmed.length, 
      icon: <Check className="w-6 h-6" />, 
      bg: 'bg-emerald-500/15', 
      textColor: 'text-emerald-400',
      trend: `${safeConfirmed.length} টি`,
      trendUp: true
    },
    { 
      label: 'মোট আয়', 
      value: `৳${(totalRevenue || 0).toLocaleString('bn-BD')}`, 
      icon: <DollarSign className="w-6 h-6" />, 
      bg: 'bg-cyan-500/15', 
      textColor: 'text-cyan-400',
      trend: 'সর্বমোট',
      trendUp: true
    },
    { 
      label: 'আল্ট্রা অ্যাকাউন্ট', 
      value: safeAccounts.length, 
      icon: <Server className="w-6 h-6" />, 
      bg: 'bg-pink-500/15', 
      textColor: 'text-pink-400',
      trend: 'সক্রিয়',
      trendUp: true
    },
    { 
      label: 'অ্যাডমিন লগইন', 
      value: successfulLogins || 0, 
      icon: <ShieldCheck className="w-6 h-6" />, 
      bg: 'bg-red-500/15', 
      textColor: 'text-red-400',
      trend: `${failedLogins || 0} ব্যর্থ`,
      trendUp: failedLogins === 0
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <div className="glass-card rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-red-600/5 via-purple-600/5 to-blue-600/5" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-xl shadow-red-500/20">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">অ্যাডমিন ড্যাশবোর্ড</h2>
              <p className="text-gray-400 text-sm">সিস্টেম ওভারভিউ এবং দ্রুত পরিসংখ্যান</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="glass-card rounded-2xl p-5 hover:bg-white/[0.04] transition-all group cursor-default">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl ${s.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <span className={s.textColor}>{s.icon}</span>
              </div>
              <div className={`flex items-center gap-1 text-xs ${s.trendUp ? 'text-emerald-400' : 'text-red-400'}`}>
                {s.trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                <span>{s.trend}</span>
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white mb-1">{s.value}</div>
            <div className="text-sm text-gray-400">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-400" />
              সাম্প্রতিক অর্ডার
            </h3>
            <span className="text-xs text-gray-500">{safeOrders.length} টি অর্ডার</span>
          </div>
          {safeOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">কোনো অর্ডার নেই</div>
          ) : (
            <div className="space-y-2">
              {safeOrders.slice(-8).reverse().map(o => (
                <div key={o.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      o.status === 'confirmed' ? 'bg-emerald-400' :
                      o.status === 'rejected' ? 'bg-red-400' : 'bg-amber-400'
                    }`} />
                    <div>
                      <div className="font-medium text-sm text-white">{o.userName || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{o.subscriptionName || 'N/A'} • ৳{o.subscriptionPrice || 0}</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {o.createdAt ? new Date(o.createdAt).toLocaleDateString('bn-BD') : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Admin Login History */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Key className="w-5 h-5 text-red-400" />
              অ্যাডমিন লগইন ইতিহাস
            </h3>
            <span className="text-xs text-gray-500">{safeLoginRecords.length} টি রেকর্ড</span>
          </div>
          {safeLoginRecords.length === 0 ? (
            <div className="text-center py-8 text-gray-500">কোনো লগইন রেকর্ড নেই</div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {safeLoginRecords.slice(0, 15).map((record, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      record.success ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {record.success ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="font-medium text-sm text-white">{record.email}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(record.timestamp).toLocaleString('bn-BD')}
                      </div>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    record.success ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                  }`}>
                    {record.success ? 'সফল' : 'ব্যর্থ'}
                  </span>
                </div>
              ))}
            </div>
          )}
          {failedLogins > 3 && (
            <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>সতর্কতা: {failedLogins} টি ব্যর্থ লগইন প্রচেষ্টা সনাক্ত হয়েছে!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== ORDERS PANEL ====================

function OrdersPanel({ orders, accounts, r, adminUser, setTab }: { 
  orders: Order[];
  accounts: Account[];
  r: () => void;
  adminUser: AdminUser;
  setTab?: (tab: Tab) => void;
}) {
  const [filter, setFilter] = useState('all');
  const [viewSS, setViewSS] = useState('');
  const [assignModal, setAssignModal] = useState<{ orderId: string; userId: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const safeOrders = orders || [];
  const safeAccounts = accounts || [];
  
  let filtered = filter === 'all' ? safeOrders : safeOrders.filter(o => o.status === filter);
  
  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(o => 
      (o.userName || '').toLowerCase().includes(term) ||
      (o.userEmail || '').toLowerCase().includes(term) ||
      (o.subscriptionName || '').toLowerCase().includes(term)
    );
  }

  const handleConfirm = async (orderId: string, accountId?: string) => {
    if (!adminUser?.id) return;
    try {
      await confirmOrder(orderId, accountId || '', adminUser.id);

    setTab?.('messages');
      setAssignModal(null);
      r();
    } catch (err) {
      console.error(err);
      alert('অর্ডার কনফার্ম করতে সমস্যা হয়েছে');
    }
  };

  const handleReject = async (orderId: string) => {
    if (!adminUser?.id) return;
    if (!confirm('আপনি কি নিশ্চিত এই অর্ডারটি বাতিল করতে চান?')) return;
    try {
      await rejectOrder(orderId, adminUser.id);
      r();
    } catch (err) {
      console.error(err);
      alert('অর্ডার বাতিল করতে সমস্যা হয়েছে');
    }
  };

  const statusCounts = {
    all: safeOrders.length,
    pending: safeOrders.filter(o => o.status === 'pending').length,
    confirmed: safeOrders.filter(o => o.status === 'confirmed').length,
    rejected: safeOrders.filter(o => o.status === 'rejected').length,
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header Stats */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { key: 'all', label: 'সব', count: statusCounts.all, color: 'bg-violet-500/15 text-violet-400' },
          { key: 'pending', label: 'পেন্ডিং', count: statusCounts.pending, color: 'bg-amber-500/15 text-amber-400' },
          { key: 'confirmed', label: 'কনফার্মড', count: statusCounts.confirmed, color: 'bg-emerald-500/15 text-emerald-400' },
          { key: 'rejected', label: 'বাতিল', count: statusCounts.rejected, color: 'bg-red-500/15 text-red-400' },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setFilter(s.key)}
            className={`p-3 rounded-xl text-center transition-all ${filter === s.key ? s.color + ' border border-current' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
          >
            <div className="text-xl font-bold">{s.count}</div>
            <div className="text-xs mt-1">{s.label}</div>
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="নাম, ইমেইল বা সাবস্ক্রিপশন দিয়ে খুঁজুন..."
          className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/40 transition-all text-sm"
        />
      </div>

      {/* Orders List */}
      {filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <ShoppingBag className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-400 mb-1">কোনো অর্ডার পাওয়া যায়নি</h3>
          <p className="text-gray-500 text-sm">ফিল্টার পরিবর্তন করে আবার খুঁজুন</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.slice().reverse().map(o => (
            <div key={o.id} className="glass-card rounded-2xl p-5 hover:bg-white/[0.02] transition-all">
              <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-white text-lg">{o.userName || 'Unknown'}</span>
                    <StatusBadge status={o.status || 'pending'} />
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                    <div><span className="text-gray-500">ইমেইল:</span> <span className="text-gray-300">{o.userEmail || 'N/A'}</span></div>
                    <div><span className="text-gray-500">ফোন:</span> <span className="text-gray-300">{o.userPhone || 'N/A'}</span></div>
                    <div><span className="text-gray-500">প্ল্যান:</span> <span className="text-gray-300">{o.subscriptionName || 'N/A'}</span></div>
                    <div><span className="text-gray-500">মূল্য:</span> <span className="text-emerald-400 font-medium">৳{o.subscriptionPrice || 0}</span></div>
                    <div><span className="text-gray-500">পেমেন্ট:</span> <span className="text-gray-300">{o.paymentMethod || 'N/A'}</span></div>
                    <div><span className="text-gray-500">তারিখ:</span> <span className="text-gray-300">{o.createdAt ? new Date(o.createdAt).toLocaleString('bn-BD') : 'N/A'}</span></div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {o.screenshot && (
                    <button
                      onClick={() => setViewSS(o.screenshot)}
                      className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm flex items-center gap-2 transition-all border border-white/5"
                    >
                      <Eye className="w-4 h-4" /> স্ক্রিনশট
                    </button>
                  )}
                  {o.status === 'pending' && (
                    <>
                      <button
                        onClick={() => {
                          if (safeAccounts.length > 0) {
                            setAssignModal({ orderId: o.id, userId: o.userId });
                          } else {
                            handleConfirm(o.id);
                          }
                        }}
                        className="px-4 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-sm flex items-center gap-2 transition-all border border-emerald-500/20"
                      >
                        <Check className="w-4 h-4" /> কনফার্ম
                      </button>
                      <button
                        onClick={() => handleReject(o.id)}
                        className="px-4 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 text-sm flex items-center gap-2 transition-all border border-red-500/20"
                      >
                        <XCircle className="w-4 h-4" /> বাতিল
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Screenshot View Modal */}
      {viewSS && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setViewSS('')}>
          <div className="relative max-w-3xl w-full max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setViewSS('')}
              className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center z-10 shadow-xl transition-all"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            <img
              src={viewSS}
              alt="Payment Screenshot"
              className="w-full h-full max-h-[85vh] object-contain rounded-2xl border border-white/10"
            />
          </div>
        </div>
      )}

      {/* Assign Account Modal */}
      {assignModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setAssignModal(null)}>
          <div className="bg-dark-800 rounded-2xl p-6 max-w-lg w-full border border-white/10 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">অ্যাকাউন্ট অ্যাসাইন করুন</h3>
              <button onClick={() => setAssignModal(null)} className="p-1 text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              নিচের তালিকা থেকে একটি অ্যাকাউন্ট নির্বাচন করুন যেখানে এই ইউজারকে অ্যাসাইন করা হবে।
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
              {safeAccounts.length === 0 ? (
                <p className="text-center text-gray-500 py-4">কোনো অ্যাকাউন্ট নেই</p>
              ) : (
                safeAccounts.map(acc => {
                  const isFull = (acc.assignedUsers || []).length >= (acc.maxSlots || 0);
                  return (
                    <button
                      key={acc.id}
                      onClick={() => { if (!isFull) handleConfirm(assignModal.orderId, acc.id); }}
                      disabled={isFull}
                      className={`w-full p-4 rounded-xl text-left border transition-all ${
                        isFull
                          ? 'bg-white/2 text-gray-600 border-white/5 cursor-not-allowed'
                          : 'bg-white/5 hover:bg-white/10 text-white border-white/5 hover:border-violet-500/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{acc.gmail || 'N/A'}</div>
                          <div className="text-sm text-gray-400 mt-1">{acc.subscriptionName || ''}</div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          isFull ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'
                        }`}>
                          {(acc.assignedUsers || []).length}/{acc.maxSlots || 0}
                          {isFull && ' (পূর্ণ)'}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            <button
              onClick={() => handleConfirm(assignModal.orderId)}
              className="w-full py-3 rounded-xl bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 transition-all font-medium"
            >
              অ্যাসাইন ছাড়া কনফার্ম করুন
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== USERS PANEL ====================

function UsersPanel({ users, orders, r, adminUser }: { 
  users: User[]; orders: Order[]; r: () => void; adminUser: AdminUser 
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const safeUsers = users || [];
  const safeOrders = orders || [];

  let filtered = safeUsers;
  
  if (search.trim()) {
    const term = search.toLowerCase();
    filtered = filtered.filter(u => 
      (u.name || '').toLowerCase().includes(term) ||
      (u.email || '').toLowerCase().includes(term) ||
      (u.phone || '').toLowerCase().includes(term)
    );
  }
  
  if (statusFilter === 'blocked') filtered = filtered.filter(u => u.blocked);
  if (statusFilter === 'active') filtered = filtered.filter(u => !u.blocked);
  if (statusFilter === 'with_order') {
    filtered = filtered.filter(u => safeOrders.some(o => o.userId === u.id && o.status === 'confirmed'));
  }

  const handleBlock = async (userId: string) => {
    if (!adminUser?.id) return;
    if (!confirm('আপনি কি নিশ্চিত এই ইউজারকে ব্লক করতে চান?')) return;
    try { await blockUser(userId, adminUser.id); r(); } catch (err) { console.error(err); alert('Operation failed'); }
  };

  const handleUnblock = async (userId: string) => {
    if (!adminUser?.id) return;
    try { await unblockUser(userId, adminUser.id); r(); } catch (err) { console.error(err); alert('Operation failed'); }
  };

  const blockedCount = safeUsers.filter(u => u.blocked).length;
  const activeWithOrder = safeUsers.filter(u => safeOrders.some(o => o.userId === u.id && o.status === 'confirmed')).length;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3 mb-2">
        {[
          { key: 'all', label: 'সব', count: safeUsers.length, color: 'bg-violet-500/15 text-violet-400' },
          { key: 'active', label: 'সক্রিয়', count: safeUsers.length - blockedCount, color: 'bg-emerald-500/15 text-emerald-400' },
          { key: 'blocked', label: 'ব্লকড', count: blockedCount, color: 'bg-red-500/15 text-red-400' },
          { key: 'with_order', label: 'অর্ডার আছে', count: activeWithOrder, color: 'bg-cyan-500/15 text-cyan-400' },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setStatusFilter(s.key)}
            className={`p-3 rounded-xl text-center transition-all ${statusFilter === s.key ? s.color + ' border border-current' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
          >
            <div className="text-xl font-bold">{s.count}</div>
            <div className="text-xs mt-1">{s.label}</div>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="নাম, ইমেইল বা ফোন দিয়ে ইউজার খুঁজুন..."
          className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/40 transition-all"
        />
      </div>

      {/* Users List */}
      {filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-400 mb-1">কোনো ইউজার পাওয়া যায়নি</h3>
          <p className="text-gray-500 text-sm">ফিল্টার পরিবর্তন করে আবার খুঁজুন</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(u => {
            const userOrders = safeOrders.filter(o => o.userId === u.id);
            const activeOrder = userOrders.find(o => o.status === 'confirmed');
            const totalSpent = userOrders.filter(o => o.status === 'confirmed').reduce((s, o) => s + (o.subscriptionPrice || 0), 0);
            
            return (
              <div key={u.id} className="glass-card rounded-2xl p-5 hover:bg-white/[0.02] transition-all">
                <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                      u.blocked ? 'bg-red-500/20 text-red-400' : 'bg-gradient-to-br from-violet-500 to-cyan-500 text-white'
                    }`}>
                      {(u.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-white text-lg flex items-center gap-2">
                        {u.name || 'No Name'}
                        {u.blocked && (
                          <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-xs font-medium">ব্লকড</span>
                        )}
                        {activeOrder && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-medium">অ্যাক্টিভ প্ল্যান</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-400 mt-1">{u.email || 'N/A'} • {u.phone || 'N/A'}</div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>যোগদান: {u.createdAt ? new Date(u.createdAt).toLocaleDateString('bn-BD') : 'N/A'}</span>
                        <span>অর্ডার: {userOrders.length} টি</span>
                        {totalSpent > 0 && <span className="text-emerald-400">খরচ: ৳{totalSpent}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {u.blocked ? (
                      <button
                        onClick={() => handleUnblock(u.id)}
                        className="px-4 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-sm flex items-center gap-2 transition-all border border-emerald-500/20"
                      >
                        <UserCheck className="w-4 h-4" /> আনব্লক
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBlock(u.id)}
                        className="px-4 py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 text-sm flex items-center gap-2 transition-all border border-red-500/20"
                      >
                        <UserX className="w-4 h-4" /> ব্লক
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
// ==================== ACCOUNTS PANEL ====================

function AccountsPanel({ accounts, subs, users, r, adminUser }: { 
  accounts: Account[]; subs: Subscription[]; users: User[]; r: () => void; adminUser: AdminUser 
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [newGmail, setNewGmail] = useState('');
  const [newCookie, setNewCookie] = useState('');
  const [newSubId, setNewSubId] = useState('');
  const [newSlots, setNewSlots] = useState(20);
  const [showPassIds, setShowPassIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const safeAccounts = accounts || [];
  const safeSubs = subs || [];
  const safeUsers = users || [];

  let filteredAccounts = safeAccounts;
  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    filteredAccounts = safeAccounts.filter(acc =>
      (acc.gmail || '').toLowerCase().includes(term) ||
      (acc.subscriptionName || '').toLowerCase().includes(term)
    );
  }

  useEffect(() => {
    if (safeSubs.length > 0 && !newSubId) {
      setNewSubId(safeSubs[0].id);
    }
  }, [safeSubs, newSubId]);

  const handleAdd = async () => {
    if (!newGmail || !newCookie || !newSubId || !adminUser?.id) {
      alert('সব ফিল্ড পূরণ করুন');
      return;
    }
    const sub = safeSubs.find(s => s.id === newSubId);
    try {
      await addAccount(newGmail.trim(), newCookie.trim(), newSubId, sub?.name || '', newSlots, adminUser.id);
      setNewGmail(''); setNewCookie(''); setNewSlots(20); setShowAdd(false);
      r();
    } catch (err) { console.error(err); alert('অ্যাকাউন্ট যোগ করতে সমস্যা হয়েছে'); }
  };

  const handleDelete = async (accountId: string) => {
    if (!confirm('আপনি কি নিশ্চিত এই অ্যাকাউন্টটি মুছে ফেলতে চান? এই কাজটি অপরিবর্তনীয়।')) return;
    if (!adminUser?.id) return;
    try { await deleteAccount(accountId, adminUser.id); r(); } catch (err) { console.error(err); alert('অ্যাকাউন্ট মুছতে সমস্যা হয়েছে'); }
  };

  const handleRemoveUser = async (accountId: string, userId: string) => {
    if (!confirm('এই ইউজারকে অ্যাকাউন্ট থেকে সরিয়ে দিতে চান?')) return;
    if (!adminUser?.id) return;
    try { await removeUserFromAccount(accountId, userId, adminUser.id); r(); } catch (err) { console.error(err); alert('ইউজার সরাতে সমস্যা হয়েছে'); }
  };

  const togglePass = (id: string) => {
    setShowPassIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const getUserName = (uid: string) => safeUsers.find(x => x.id === uid)?.name || 'অজানা';
  const getUserEmail = (uid: string) => safeUsers.find(x => x.id === uid)?.email || '';

  const totalSlots = safeAccounts.reduce((s, a) => s + (a.maxSlots || 0), 0);
  const usedSlots = safeAccounts.reduce((s, a) => s + (a.assignedUsers || []).length, 0);
  const freeSlots = totalSlots - usedSlots;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'মোট অ্যাকাউন্ট', value: safeAccounts.length, color: 'bg-violet-500/15 text-violet-400' },
          { label: 'মোট স্লট', value: totalSlots, color: 'bg-cyan-500/15 text-cyan-400' },
          { label: 'ব্যবহৃত', value: usedSlots, color: 'bg-amber-500/15 text-amber-400' },
          { label: 'খালি', value: freeSlots, color: 'bg-emerald-500/15 text-emerald-400' },
        ].map((s, i) => (
          <div key={i} className={`p-3 rounded-xl text-center ${s.color}`}>
            <div className="text-xl font-bold">{s.value}</div>
            <div className="text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="জিমেইল বা সাবস্ক্রিপশন দিয়ে খুঁজুন..."
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/40 transition-all text-sm"
          />
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-sm font-medium flex items-center gap-2 hover:shadow-lg hover:shadow-violet-500/25 transition-all whitespace-nowrap"
        >
          <Plus className="w-4 h-4" /> নতুন অ্যাকাউন্ট যোগ করুন
        </button>
      </div>

      {/* Add Account Form */}
      {showAdd && (
        <div className="glass-card rounded-2xl p-6 border border-violet-500/20 bg-violet-500/5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-lg text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-violet-400" />
              নতুন আল্ট্রা অ্যাকাউন্ট তৈরি করুন
            </h3>
            <button onClick={() => setShowAdd(false)} className="p-1 text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">জিমেইল অ্যাড্রেস *</label>
              <input
                type="email" value={newGmail} onChange={e => setNewGmail(e.target.value)}
                placeholder="example@gmail.com"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/40 transition-all text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">কুকি স্ট্রিং *</label>
              <input
                type="text" value={newCookie} onChange={e => setNewCookie(e.target.value)}
                placeholder="Cookie string paste করুন"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/40 transition-all text-sm font-mono"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">সাবস্ক্রিপশন টাইপ *</label>
              <select
                value={newSubId} onChange={e => setNewSubId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:border-violet-500/40 transition-all text-sm"
              >
                {safeSubs.map(s => (
                  <option key={s.id} value={s.id} className="bg-dark-800">{s.name} - ৳{s.price}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">সর্বোচ্চ ইউজার স্লট *</label>
              <input
                type="number" value={newSlots} onChange={e => setNewSlots(Math.max(1, +e.target.value))}
                placeholder="স্লট সংখ্যা" min={1} max={100}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/40 transition-all text-sm"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleAdd}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-medium hover:shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> অ্যাকাউন্ট তৈরি করুন
            </button>
            <button
              onClick={() => { setShowAdd(false); setNewGmail(''); setNewCookie(''); }}
              className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-all"
            >
              বাতিল করুন
            </button>
          </div>
        </div>
      )}

      {/* Accounts Grid */}
      {filteredAccounts.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <Server className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-400 mb-1">কোনো অ্যাকাউন্ট নেই</h3>
          <p className="text-gray-500 text-sm mb-4">উপরের বাটনে ক্লিক করে নতুন অ্যাকাউন্ট যোগ করুন</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAccounts.map(acc => {
            const assignedCount = (acc.assignedUsers || []).length;
            const isFull = assignedCount >= (acc.maxSlots || 0);
            
            return (
              <div key={acc.id} className="rounded-2xl p-[1px] bg-gradient-to-br from-violet-500/30 via-purple-500/20 to-cyan-500/30">
                <div className="rounded-2xl bg-dark-900 p-5 sm:p-6">
                  {/* Account Header */}
                  <div className="flex flex-col lg:flex-row items-start justify-between gap-4 mb-5 pb-4 border-b border-white/5">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-violet-400 font-medium bg-violet-500/10 px-2 py-0.5 rounded-full">
                          {acc.subscriptionName || 'N/A'}
                        </span>
                        {isFull && (
                          <span className="text-xs text-red-400 font-medium bg-red-500/10 px-2 py-0.5 rounded-full">পূর্ণ</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <HardDrive className="w-4 h-4 text-gray-500" />
                        <span className="font-mono text-sm text-white">{acc.gmail || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm text-gray-400">Cookie:</span>
                        <span className="font-mono text-sm text-gray-300">
                          {showPassIds.includes(acc.id) ? (acc.cookie || 'N/A') : '••••••••••••••••••••••••••'}
                        </span>
                        <button onClick={() => togglePass(acc.id)} className="text-gray-500 hover:text-white transition p-1">
                          {showPassIds.includes(acc.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`px-4 py-2 rounded-xl text-center ${isFull ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
                        <div className={`text-lg font-bold ${isFull ? 'text-red-400' : 'text-emerald-400'}`}>
                          {assignedCount}/{acc.maxSlots || 0}
                        </div>
                        <div className="text-xs text-gray-500">ইউজার</div>
                      </div>
                      <button
                        onClick={() => handleDelete(acc.id)}
                        className="p-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all border border-red-500/10 hover:border-red-500/30"
                        title="অ্যাকাউন্ট মুছুন"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* User Slots Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                    {Array.from({ length: acc.maxSlots || 0 }).map((_, i) => {
                      const userId = (acc.assignedUsers || [])[i];
                      const userName = userId ? getUserName(userId) : null;
                      const userEmail = userId ? getUserEmail(userId) : null;
                      
                      return (
                        <div
                          key={i}
                          className={`rounded-xl p-3 text-center transition-all ${
                            userId 
                              ? 'bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/20' 
                              : 'bg-white/[0.02] border border-white/5 border-dashed'
                          }`}
                        >
                          {userId ? (
                            <div className="group relative">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-xs font-bold mx-auto mb-1.5 shadow-md">
                                {(userName || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div className="text-xs font-medium truncate text-gray-200">{userName || 'User'}</div>
                              <div className="text-[10px] text-gray-500 truncate">{userEmail || ''}</div>
                              <button
                                onClick={() => handleRemoveUser(acc.id, userId)}
                                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600"
                                title="ইউজার সরান"
                              >
                                <X className="w-3 h-3 text-white" />
                              </button>
                            </div>
                          ) : (
                            <div className="py-3">
                              <div className="w-9 h-9 rounded-full border border-dashed border-white/10 flex items-center justify-center mx-auto mb-1.5 text-gray-600">
                                <span className="text-xs">{i + 1}</span>
                              </div>
                              <div className="text-[10px] text-gray-600">খালি স্লট</div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ==================== SUBS PANEL ====================

function SubsPanel({ subs, r, adminUser }: { 
  subs: Subscription[]; r: () => void; adminUser: AdminUser 
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState('');
  const [form, setForm] = useState<SubForm>({
    name: '', price: 0, duration: '১ মাস', type: 'shared',
    maxUsers: 20, features: '', badge: '', color: 'violet', active: true
  });
  
  const safeSubs = subs || [];

  const resetForm = () => {
    setForm({
      name: '', price: 0, duration: '১ মাস', type: 'shared',
      maxUsers: 20, features: '', badge: '', color: 'violet', active: true
    });
    setEditId('');
  };

  const startEdit = (s: Subscription) => {
    setEditId(s.id);
    setForm({
      name: s.name || '', price: s.price || 0, duration: s.duration || '১ মাস',
      type: s.type || 'shared', maxUsers: s.maxUsers || 20,
      features: (s.features || []).join('\n'), badge: s.badge || '',
      color: s.color || 'violet', active: s.active ?? true
    });
    setShowAdd(true);
  };

  const handleSave = async () => {
    if (!adminUser?.id) return;
    if (!form.name.trim()) { alert('সাবস্ক্রিপশনের নাম দিন'); return; }
    if (form.price <= 0) { alert('মূল্য ০ এর বেশি হতে হবে'); return; }
    
    const data = { ...form, features: form.features.split('\n').filter(Boolean) };
    try {
      if (editId) { await updateSub(editId, data, adminUser.id); }
      else { await addSub(data, adminUser.id); }
      setShowAdd(false); resetForm(); r();
    } catch (err) { console.error(err); alert('সাবস্ক্রিপশন সেভ করতে সমস্যা হয়েছে'); }
  };

  const handleDelete = async (subId: string) => {
    if (!confirm('আপনি কি নিশ্চিত এই সাবস্ক্রিপশনটি মুছে ফেলতে চান?')) return;
    if (!adminUser?.id) return;
    try { await deleteSub(subId, adminUser.id); r(); } catch (err) { console.error(err); alert('সাবস্ক্রিপশন মুছতে সমস্যা হয়েছে'); }
  };

  const activeCount = safeSubs.filter(s => s.active).length;
  const inactiveCount = safeSubs.filter(s => !s.active).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'মোট প্ল্যান', value: safeSubs.length, color: 'bg-violet-500/15 text-violet-400' },
          { label: 'সক্রিয়', value: activeCount, color: 'bg-emerald-500/15 text-emerald-400' },
          { label: 'নিষ্ক্রিয়', value: inactiveCount, color: 'bg-red-500/15 text-red-400' },
        ].map((s, i) => (
          <div key={i} className={`p-3 rounded-xl text-center ${s.color}`}>
            <div className="text-xl font-bold">{s.value}</div>
            <div className="text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <p className="text-gray-400 text-sm">{safeSubs.length} টি সাবস্ক্রিপশন প্ল্যান</p>
        <button
          onClick={() => { resetForm(); setShowAdd(true); }}
          className="px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-sm font-medium flex items-center gap-2 hover:shadow-lg hover:shadow-violet-500/25 transition-all"
        >
          <Plus className="w-4 h-4" /> নতুন প্ল্যান তৈরি করুন
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAdd && (
        <div className="glass-card rounded-2xl p-6 border border-violet-500/20 bg-violet-500/5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-lg text-white">
              {editId ? 'সাবস্ক্রিপশন আপডেট করুন' : 'নতুন সাবস্ক্রিপশন প্ল্যান'}
            </h3>
            <button onClick={() => { setShowAdd(false); resetForm(); }} className="p-1 text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">প্ল্যানের নাম *</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="যেমন: Veo 3 Ultra" className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/40 transition-all text-sm" />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">মূল্য (টাকা) *</label>
              <input type="number" value={form.price} onChange={e => setForm({ ...form, price: Math.max(0, +e.target.value) })} placeholder="মূল্য লিখুন" className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/40 transition-all text-sm" />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">মেয়াদ</label>
              <input type="text" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} placeholder="যেমন: ১ মাস" className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/40 transition-all text-sm" />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">প্ল্যান টাইপ</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as 'shared' | 'personal' })} className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:border-violet-500/40 transition-all text-sm">
                <option value="shared" className="bg-dark-800">শেয়ারড (মাল্টিপল ইউজার)</option>
                <option value="personal" className="bg-dark-800">পার্সোনাল (একক ইউজার)</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">সর্বোচ্চ ইউজার</label>
              <input type="number" value={form.maxUsers} onChange={e => setForm({ ...form, maxUsers: Math.max(1, +e.target.value) })} placeholder="সর্বোচ্চ সংখ্যা" min={1} className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/40 transition-all text-sm" />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">ব্যাজ টেক্সট</label>
              <input type="text" value={form.badge} onChange={e => setForm({ ...form, badge: e.target.value })} placeholder="যেমন: জনপ্রিয়, প্রিমিয়াম" className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/40 transition-all text-sm" />
            </div>
          </div>
          
          <div className="mb-5">
            <label className="text-sm text-gray-400 mb-1.5 block">ফিচারসমূহ (প্রতি লাইনে একটি করে)</label>
            <textarea
              value={form.features}
              onChange={e => setForm({ ...form, features: e.target.value })}
              placeholder="ফিচার লিখুন...&#10;প্রতি লাইনে একটি ফিচার&#10;যেমন: 4K AI ভিডিও জেনারেশন"
              rows={5}
              className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/40 transition-all text-sm resize-none"
            />
          </div>
          
          <div className="flex items-center gap-3 mb-5">
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
              <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} className="w-5 h-5 rounded-lg accent-violet-500 cursor-pointer" />
              <span>এই প্ল্যান সক্রিয় রাখুন</span>
            </label>
          </div>
          
          <div className="flex gap-3">
            <button onClick={handleSave} className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-medium hover:shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center gap-2">
              <Check className="w-4 h-4" /> {editId ? 'আপডেট করুন' : 'প্ল্যান তৈরি করুন'}
            </button>
            <button onClick={() => { setShowAdd(false); resetForm(); }} className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-all">
              বাতিল করুন
            </button>
          </div>
        </div>
      )}

      {/* Subscriptions List */}
      <div className="grid gap-4">
        {safeSubs.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <Tag className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-400 mb-1">কোনো সাবস্ক্রিপশন নেই</h3>
            <p className="text-gray-500 text-sm">উপরের বাটনে ক্লিক করে নতুন প্ল্যান তৈরি করুন</p>
          </div>
        ) : (
          safeSubs.map(s => (
            <div key={s.id} className="glass-card rounded-2xl p-6 hover:bg-white/[0.02] transition-all">
              <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-bold text-xl text-white">{s.name || 'N/A'}</h4>
                    {s.badge && (
                      <span className="px-3 py-1 rounded-full bg-violet-500/15 text-violet-400 text-xs font-medium border border-violet-500/20">
                        {s.badge}
                      </span>
                    )}
                    {!s.active && (
                      <span className="px-3 py-1 rounded-full bg-red-500/15 text-red-400 text-xs font-medium border border-red-500/20">
                        নিষ্ক্রিয়
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                    <span className="text-emerald-400 font-bold text-lg">৳{s.price || 0}</span>
                    <span>/ {s.duration || 'N/A'}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-600" />
                    <span>{s.type === 'shared' ? 'শেয়ারড' : 'পার্সোনাল'}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-600" />
                    <span>সর্বোচ্চ {s.maxUsers || 0} ইউজার</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(s.features || []).map((f, i) => (
                      <span key={i} className="px-3 py-1 rounded-full bg-white/5 text-xs text-gray-400 border border-white/5">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(s)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm transition-all border border-white/5"
                  >
                    এডিট করুন
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm transition-all border border-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
// ==================== MESSAGES PANEL ====================

function MessagesPanel({ convos, r, refresh }: { 
  convos: Convo[]; r: () => void; refresh: number 
}) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [msgText, setMsgText] = useState('');
  const [msgImg, setMsgImg] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const msgEndRef = useRef<HTMLDivElement>(null);

  const safeConvos = convos || [];
  const selectedConvo = safeConvos.find(c => c.userId === selectedUserId);

  // Load messages when conversation is selected
  useEffect(() => {
    if (!selectedUserId) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    setLoadingMessages(true);

    (async () => {
      try {
        const msgs = await getUserMessages(selectedUserId);
        
        // Messages will auto-update via onMessagesChange listener
        if (!cancelled) {
          setMessages(Array.isArray(msgs) ? msgs : []);
        }
      } catch (error) {
        console.error('Failed to load messages:', error);
        if (!cancelled) setMessages([]);
      } finally {
        if (!cancelled) setLoadingMessages(false);
      }
    })();
    const interval = setInterval(() => {
  r();
}, 5000);

    return () => { cancelled = true; };clearInterval(interval);
  }, [selectedUserId, refresh]);

  // Auto scroll to bottom
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }
  }, [selectedUserId, messages.length]);

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('শুধুমাত্র ইমেজ ফাইল আপলোড করা যাবে');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('ফাইলের সাইজ 5MB এর বেশি হতে পারবে না');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxWidth = 800;
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
        setMsgImg(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => {
        alert('ছবি লোড করা যায়নি। অন্য ছবি চেষ্টা করুন।');
      };
      img.src = reader.result as string;
    };
    reader.onerror = () => {
      alert('ফাইল পড়তে সমস্যা হয়েছে');
    };
    reader.readAsDataURL(file);
  };

  // Send message
  const handleSendMessage = async () => {
    if (!selectedUserId) return;
    if (!msgText.trim() && !msgImg) return;

    const textToSend = msgText.trim();
    const imageToSend = msgImg || undefined;

    // Optimistic UI update
    const tempMsg: Message = {
      id: 'temp_' + Date.now(),
      userId: 'admin',
      userName: 'Admin',
      text: textToSend,
      image: imageToSend,
      timestamp: new Date().toISOString(),
      isAdmin: true
    };

    setMessages(prev => [...prev, tempMsg]);
    setMsgText('');
    setMsgImg('');

    try {
      await sendMessage(
        selectedUserId,
        selectedConvo?.userName || 'User',
        textToSend,
        imageToSend,
        true
      );
      // Refresh messages
      r();
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('মেসেজ পাঠাতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
      setMsgText(textToSend);
      setMsgImg(imageToSend || '');
    }
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] rounded-2xl overflow-hidden glass-card animate-fade-in border border-white/5">
      {/* Conversation List Sidebar */}
      <div className={`${selectedUserId ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col border-r border-white/5 bg-dark-800/50`}>
        {/* Sidebar Header */}
        <div className="p-5 border-b border-white/5">
          <h3 className="font-bold text-white text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-violet-400" />
            কথোপকথন সমূহ
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {safeConvos.length} টি সক্রিয় কথোপকথন
          </p>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {safeConvos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <MessageCircle className="w-16 h-16 text-gray-600 mb-4" />
              <p className="text-gray-500 text-sm">কোনো কথোপকথন নেই</p>
              <p className="text-gray-600 text-xs mt-1">ইউজাররা মেসেজ পাঠালে এখানে দেখতে পাবেন</p>
            </div>
          ) : (
            safeConvos.map(convo => {
              const isSelected = selectedUserId === convo.userId;
              const hasUnread = (convo.count || 0) > 0;
              
              return (
                <button
                  key={convo.userId}
                  onClick={() => setSelectedUserId(convo.userId)}
                  className={`w-full p-4 flex items-center gap-3 text-left transition-all border-b border-white/[0.03] hover:bg-white/[0.03] ${
                    isSelected ? 'bg-violet-500/10 border-l-2 border-l-violet-500' : ''
                  }`}
                >
                  {/* User Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold ${
                      isSelected
                        ? 'bg-gradient-to-br from-violet-500 to-cyan-500 text-white'
                        : 'bg-white/10 text-gray-400'
                    }`}>
                      {(convo.userName || 'U').charAt(0).toUpperCase()}
                    </div>
                    {hasUnread && (
                      <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-dark-800" />
                    )}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`font-medium text-sm truncate ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                        {convo.userName || 'Unknown User'}
                      </span>
                      <span className="text-[10px] text-gray-600 flex-shrink-0 ml-2">
                        {convo.time ? new Date(convo.time).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-500 truncate pr-2">
                        {convo.lastMsg || 'কোনো মেসেজ নেই'}
                      </p>
                      {hasUnread && (
                        <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex-shrink-0 min-w-[20px] text-center">
                          {convo.count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`${selectedUserId ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-dark-900/50`}>
        {selectedUserId ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-white/5 flex items-center gap-3 bg-dark-800/50">
              <button
                onClick={() => setSelectedUserId('')}
                className="md:hidden p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
              >
                <ChevronDown className="w-5 h-5 rotate-90" />
              </button>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-sm font-bold flex-shrink-0">
                {(selectedConvo?.userName || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-medium text-white">{selectedConvo?.userName || 'Unknown User'}</div>
                <div className="text-xs text-gray-500">
                  {selectedConvo?.count || 0} টি অপঠিত মেসেজ
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gradient-to-b from-dark-900/50 to-dark-800/30">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <RefreshCw className="w-8 h-8 text-gray-500 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Send className="w-12 h-12 text-gray-600 mb-3" />
                  <p className="text-gray-500">কোনো মেসেজ নেই</p>
                  <p className="text-gray-600 text-xs mt-1">নিচের ইনপুট থেকে মেসেজ পাঠান</p>
                </div>
              ) : (
                messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.isAdmin ? 'justify-end' : 'justify-start'} animate-fade-in`}
                  >
                    <div className={`max-w-[80%] sm:max-w-[70%] rounded-2xl p-4 ${
                      msg.isAdmin
                        ? 'bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/20 rounded-br-md'
                        : 'bg-white/[0.06] border border-white/5 rounded-bl-md'
                    }`}>
                      {/* Sender Name */}
                      {!msg.isAdmin && (
                        <div className="text-xs text-violet-400 font-medium mb-1.5">
                          {msg.userName || 'User'}
                        </div>
                      )}
                      
                      {/* Image */}
                      {msg.image && (
                        <img
                          src={msg.image}
                          alt="Attachment"
                          className="rounded-xl max-w-full mb-3 max-h-60 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(msg.image, '_blank')}
                        />
                      )}
                      
                      {/* Text */}
                      {msg.text && (
                        <p className={`text-sm leading-relaxed ${msg.isAdmin ? 'text-white' : 'text-gray-200'}`}>
                          {msg.text}
                        </p>
                      )}
                      
                      {/* Timestamp */}
                      <div className={`text-[10px] mt-2 text-right ${
                        msg.isAdmin ? 'text-red-400/70' : 'text-gray-500'
                      }`}>
                        {msg.timestamp
                          ? new Date(msg.timestamp).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })
                          : 'এখনই'
                        }
                        {msg.isAdmin && ' • আপনি'}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={msgEndRef} />
            </div>

            {/* Image Preview */}
            {msgImg && (
              <div className="px-4 py-3 bg-dark-800 border-t border-white/5 flex items-center gap-3">
                <div className="relative inline-block">
                  <img
                    src={msgImg}
                    alt="Preview"
                    className="h-20 rounded-xl object-contain border border-white/10"
                  />
                  <button
                    onClick={() => setMsgImg('')}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all shadow-lg"
                  >
                    <X className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
                <span className="text-xs text-gray-500">ছবি সিলেক্ট করা হয়েছে</span>
              </div>
            )}

            {/* Message Input */}
            <div className="p-4 border-t border-white/5 bg-dark-800/50 flex items-center gap-2">
              {/* Image Upload Button */}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="p-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-violet-400 transition-all flex-shrink-0"
                title="ছবি পাঠান"
              >
                <Image className="w-5 h-5" />
              </button>

              {/* Text Input */}
              <input
                type="text"
                value={msgText}
                onChange={e => setMsgText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="আপনার মেসেজ লিখুন..."
                className="flex-1 py-3 px-5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:border-red-500/40 transition-all text-sm"
              />

              {/* Send Button */}
              <button
                onClick={handleSendMessage}
                disabled={!msgText.trim() && !msgImg}
                className="p-3 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 text-white hover:shadow-lg hover:shadow-red-500/25 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
                title="মেসেজ পাঠান"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-sm">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/5 flex items-center justify-center">
                <MessageCircle className="w-10 h-10 text-gray-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-300 mb-2">মেসেজ সেন্টার</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                বাম পাশের তালিকা থেকে একটি কথোপকথন নির্বাচন করুন। ইউজারদের পাঠানো মেসেজ এখানে দেখতে পাবেন এবং রিপ্লাই দিতে পারবেন।
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== SETTINGS PANEL ====================

function SettingsPanel({ settings, r, adminUser }: { 
  settings: SettingsData; r: () => void; adminUser: AdminUser 
}) {
  const [form, setForm] = useState<SettingsData>({ ...settings });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('general');
  
  // File upload refs
  const logoFileRef = useRef<HTMLInputElement>(null);
  const extensionFileRef = useRef<HTMLInputElement>(null);
  const appImageFileRef = useRef<HTMLInputElement>(null);
  const thumbnailFileRef = useRef<HTMLInputElement>(null);

  // Sync form when settings change
  useEffect(() => {
    setForm({ ...settings });
  }, [settings]);

  // Handle file upload for various fields
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'logoUrl' | 'extensionUrl' | 'appImageUrl' | 'tutorialThumbnail'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Size validation
    if (file.size > 10 * 1024 * 1024) {
      alert('ফাইলের সাইজ 10MB এর বেশি হতে পারবে না');
      return;
    }

    try {
      const base64Data = await fileToBase64(file);
      setForm(prev => ({ ...prev, [field]: base64Data }));
    } catch (error) {
      console.error('File upload error:', error);
      alert('ফাইল আপলোড করতে সমস্যা হয়েছে');
    }
  };

  // Save all settings
  const handleSaveSettings = async () => {
    if (!adminUser?.id) {
      alert('অ্যাডমিন তথ্য পাওয়া যায়নি');
      return;
    }

    // Validation
    if (!form.siteName?.trim()) {
      alert('সাইটের নাম প্রয়োজন');
      return;
    }
    if (!form.adminEmail?.trim()) {
      alert('অ্যাডমিন ইমেইল প্রয়োজন');
      return;
    }

    setSaving(true);

    try {
      // Prepare data - encode password if changed
      const dataToSave = { ...form };
      
      // If password field is filled and different from current, encode it
      if (form.adminPassword && form.adminPassword !== settings?.adminPassword) {
        dataToSave.adminPassword = btoa(form.adminPassword);
      }

      await updateSettings(dataToSave, adminUser.id);
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      r(); // Refresh parent data
    } catch (error) {
      console.error('Settings save error:', error);
      alert('সেটিংস সেভ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { id: 'general', label: 'সাধারণ', icon: <Settings className="w-4 h-4" /> },
    { id: 'payment', label: 'পেমেন্ট', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'admin', label: 'অ্যাডমিন', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'extension', label: 'এক্সটেনশন', icon: <Download className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Save Confirmation */}
      {saved && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-3 animate-fade-in">
          <Check className="w-5 h-5 flex-shrink-0" />
          <span>সমস্ত সেটিংস সফলভাবে সেভ হয়েছে!</span>
        </div>
      )}

      {/* Section Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {sections.map(section => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all whitespace-nowrap ${
              activeSection === section.id
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'
            }`}
          >
            {section.icon}
            {section.label}
          </button>
        ))}
      </div>

      {/* ===== GENERAL SETTINGS ===== */}
      {activeSection === 'general' && (
        <div className="space-y-6">
          {/* Logo Upload */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="font-bold text-lg text-white mb-5 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              ওয়েবসাইট লোগো
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">
                  লোগো ইমেজ আপলোড করুন (PNG/SVG সুপারিশকৃত)
                </label>
                <input
                  ref={logoFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => handleFileUpload(e, 'logoUrl')}
                />
                <button
                  onClick={() => logoFileRef.current?.click()}
                  className="w-full px-5 py-4 rounded-xl bg-white/[0.03] border-2 border-dashed border-white/10 hover:border-amber-500/40 text-gray-400 hover:text-amber-400 flex items-center justify-center gap-3 transition-all group"
                >
                  <Upload className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="text-sm">
                    {form.logoUrl ? '✅ লোগো আপলোড করা আছে (পরিবর্তন করতে ক্লিক করুন)' : 'লোগো সিলেক্ট করতে ক্লিক করুন'}
                  </span>
                </button>
                {form.logoUrl && (
                  <div className="mt-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center">
                    <img
                      src={form.logoUrl}
                      alt="Website Logo"
                      className="max-h-20 object-contain"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Site Information */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="font-bold text-lg text-white mb-5">সাইটের তথ্য</h3>
            <div className="space-y-5">
              <FormField
                label="সাইটের নাম"
                value={form.siteName || ''}
                onChange={v => setForm({ ...form, siteName: v })}
                placeholder="আপনার সাইটের নাম লিখুন"
              />
              <FormField
                label="হিরো টাইটেল"
                value={form.heroTitle || ''}
                onChange={v => setForm({ ...form, heroTitle: v })}
                placeholder="মেইন হেডিং টাইটেল"
              />
              <div>
                <label className="text-sm text-gray-400 mb-1.5 block">হিরো সাব-টাইটেল</label>
                <textarea
                  value={form.heroSubtitle || ''}
                  onChange={e => setForm({ ...form, heroSubtitle: e.target.value })}
                  rows={3}
                  placeholder="সাব-হেডিং টেক্সট লিখুন"
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/40 transition-all text-sm resize-none"
                />
              </div>
              <FormField
                label="Flow AI URL"
                value={form.flowAiUrl || ''}
                onChange={v => setForm({ ...form, flowAiUrl: v })}
                type="url"
                mono
                placeholder="https://labs.google/fx/tools/flow"
              />
            </div>
          </div>
        </div>
      )}

      {/* ===== PAYMENT SETTINGS ===== */}
      {activeSection === 'payment' && (
        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-bold text-lg text-white mb-5 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-pink-400" />
            পেমেন্ট গেটওয়ে সেটিংস
          </h3>
          <div className="space-y-5">
            <FormField
              label="bKash মার্চেন্ট নম্বর"
              value={form.bkashNumber || ''}
              onChange={v => setForm({ ...form, bkashNumber: v })}
              placeholder="01XXXXXXXXX"
            />
            <FormField
              label="Nagad মার্চেন্ট নম্বর"
              value={form.nagadNumber || ''}
              onChange={v => setForm({ ...form, nagadNumber: v })}
              placeholder="01XXXXXXXXX"
            />
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
              <AlertCircle className="w-4 h-4 inline mr-2" />
              এই নম্বরগুলো ইউজারদের পেমেন্ট পেজে দেখানো হবে। সঠিক নম্বর দিন।
            </div>
          </div>
        </div>
      )}

      {/* ===== ADMIN SETTINGS ===== */}
      {activeSection === 'admin' && (
        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-bold text-lg text-white mb-5 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-red-400" />
            অ্যাডমিন ক্রেডেনশিয়াল
          </h3>
          <div className="space-y-5">
            <FormField
              label="অ্যাডমিন ইমেইল অ্যাড্রেস"
              value={form.adminEmail || ''}
              onChange={v => setForm({ ...form, adminEmail: v })}
              type="email"
              placeholder="admin@example.com"
            />
            <FormField
              label="অ্যাডমিন পাসওয়ার্ড"
              value={form.adminPassword || ''}
              onChange={v => setForm({ ...form, adminPassword: v })}
              type="password"
              placeholder="নতুন পাসওয়ার্ড লিখুন (পরিবর্তন না করলে খালি রাখুন)"
            />
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 inline mr-2" />
              পাসওয়ার্ড পরিবর্তন করলে সাথে সাথে কার্যকর হবে। শক্তিশালী পাসওয়ার্ড ব্যবহার করুন।
            </div>
          </div>
        </div>
      )}

      {/* ===== EXTENSION SETTINGS ===== */}
      {activeSection === 'extension' && (
        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-bold text-lg text-white mb-5 flex items-center gap-2">
            <Download className="w-5 h-5 text-emerald-400" />
            এক্সটেনশন ও টিউটোরিয়াল
          </h3>
          <div className="space-y-5">
            {/* Extension ZIP Upload */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                ক্রোম এক্সটেনশন ZIP ফাইল
              </label>
              <input
                ref={extensionFileRef}
                type="file"
                accept=".zip"
                className="hidden"
                onChange={e => handleFileUpload(e, 'extensionUrl')}
              />
              <button
                onClick={() => extensionFileRef.current?.click()}
                className="w-full px-5 py-4 rounded-xl bg-white/[0.03] border-2 border-dashed border-white/10 hover:border-emerald-500/40 text-gray-400 hover:text-emerald-400 flex items-center justify-center gap-3 transition-all group"
              >
                <Upload className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="text-sm">
                  {form.extensionUrl ? '✅ এক্সটেনশন আপলোড করা আছে (পরিবর্তন করতে ক্লিক করুন)' : 'ZIP ফাইল সিলেক্ট করুন'}
                </span>
              </button>
            </div>

            <FormField
              label="এক্সটেনশন ভার্সন"
              value={form.extensionVersion || ''}
              onChange={v => setForm({ ...form, extensionVersion: v })}
              placeholder="V1.0.0 LATEST"
            />

            {/* App Image Upload */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                মোবাইল অ্যাপ ইমেজ
              </label>
              <input
                ref={appImageFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => handleFileUpload(e, 'appImageUrl')}
              />
              <button
                onClick={() => appImageFileRef.current?.click()}
                className="w-full px-5 py-4 rounded-xl bg-white/[0.03] border-2 border-dashed border-white/10 hover:border-pink-500/40 text-gray-400 hover:text-pink-400 flex items-center justify-center gap-3 transition-all group"
              >
                <Image className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="text-sm">
                  {form.appImageUrl ? '✅ অ্যাপ ইমেজ আপলোড করা আছে (পরিবর্তন করতে ক্লিক করুন)' : 'অ্যাপ ইমেজ সিলেক্ট করুন'}
                </span>
              </button>
              {form.appImageUrl && (
                <div className="mt-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center">
                  <img src={form.appImageUrl} alt="App Preview" className="max-h-32 rounded-xl object-contain" />
                </div>
              )}
            </div>

            <FormField
              label="অ্যাপ ডাউনলোড URL (Google Play)"
              value={form.appDownloadUrl || ''}
              onChange={v => setForm({ ...form, appDownloadUrl: v })}
              type="url"
              mono
              placeholder="https://play.google.com/store/apps/details?id=..."
            />

            {/* Tutorial Thumbnail Upload */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                টিউটোরিয়াল ভিডিও থাম্বনেইল
              </label>
              <input
                ref={thumbnailFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => handleFileUpload(e, 'tutorialThumbnail')}
              />
              <button
                onClick={() => thumbnailFileRef.current?.click()}
                className="w-full px-5 py-4 rounded-xl bg-white/[0.03] border-2 border-dashed border-white/10 hover:border-violet-500/40 text-gray-400 hover:text-violet-400 flex items-center justify-center gap-3 transition-all group"
              >
                <Image className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="text-sm">
                  {form.tutorialThumbnail ? '✅ থাম্বনেইল আপলোড করা আছে (পরিবর্তন করতে ক্লিক করুন)' : 'থাম্বনেইল সিলেক্ট করুন'}
                </span>
              </button>
              {form.tutorialThumbnail && (
                <div className="mt-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center">
                  <img src={form.tutorialThumbnail} alt="Thumbnail Preview" className="max-h-32 rounded-xl object-contain" />
                </div>
              )}
            </div>

            <FormField
              label="টিউটোরিয়াল ভিডিও টাইটেল"
              value={form.tutorialTitle || ''}
              onChange={v => setForm({ ...form, tutorialTitle: v })}
              placeholder="কিভাবে ব্যবহার করবেন"
            />
            <FormField
              label="টিউটোরিয়াল ভিডিও URL (YouTube/Vimeo)"
              value={form.tutorialVideoUrl || ''}
              onChange={v => setForm({ ...form, tutorialVideoUrl: v })}
              type="url"
              mono
              placeholder="https://www.youtube.com/embed/..."
            />
          </div>
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={handleSaveSettings}
        disabled={saving}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-600 to-orange-600 font-bold text-lg hover:shadow-2xl hover:shadow-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
      >
        {saving ? (
          <>
            <RefreshCw className="w-5 h-5 animate-spin" />
            সেভ হচ্ছে...
          </>
        ) : (
          <>
            <Check className="w-5 h-5" />
            সমস্ত সেটিংস সেভ করুন
          </>
        )}
      </button>
    </div>
  );
}

// ==================== SHARED COMPONENTS ====================

function StatusBadge({ status }: { status: 'pending' | 'confirmed' | 'rejected' }) {
  const config: Record<string, { bg: string; label: string; dot: string }> = {
    confirmed: { bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20', label: 'কনফার্মড', dot: 'bg-emerald-400' },
    rejected: { bg: 'bg-red-500/15 text-red-400 border-red-500/20', label: 'বাতিল', dot: 'bg-red-400' },
    pending: { bg: 'bg-amber-500/15 text-amber-400 border-amber-500/20', label: 'পেন্ডিং', dot: 'bg-amber-400' },
  };
  
  const c = config[status] || config.pending;
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${c.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = 'text',
  mono = false,
  placeholder = ''
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  mono?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-sm text-gray-400 mb-1.5 block">{label}</label>
      <input
        type={type}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/40 transition-all text-sm ${
          mono ? 'font-mono text-xs' : ''
        }`}
      />
    </div>
  );
}