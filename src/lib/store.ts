// store.ts - সবার উপরে
/// <reference lib="dom" />
// =============================================
// AI Bajar - Data Store (Firebase-based)
// FINAL PRODUCTION VERSION - ALL 6 FIXES
// =============================================

import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  query,
  where
} from "firebase/firestore";

import { app } from "./firebase";

const db = getFirestore(app);

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  role: "admin" | "user";
  verified: boolean;
  blocked: boolean;
  sessionToken?: string;
  verificationCode?: string;
  lastLoginAt?: string;
  createdAt: string;
}

export interface Subscription {
  id: string;
  name: string;
  price: number;
  duration: string;
  features: string[];
  type: 'shared' | 'personal';
  maxUsers: number;
  active: boolean;
  badge?: string;
  color: string;
}

export interface UltraAccount {
  id: string;
  gmail: string;
  cookie?: string;
  subscriptionId: string;
  subscriptionName: string;
  assignedUsers: string[];
  maxSlots: number;
  active: boolean;
  createdAt: string;
  expiresAt?: string;
}

export interface Order {
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
  currentStep: number;
  createdAt: string;
  assignedAccountId?: string;
  expiresAt?: string;
  paymentMethod: string;
  reason?: string;
}

export interface Message {
  id: string;
  userId: string;
  userName: string;
  text: string;
  image?: string;
  timestamp: string;
  isAdmin: boolean;
}

export interface AdminSettings {
  bkashNumber: string;
  nagadNumber: string;
  adminEmail: string;
  adminPassword: string;
  siteName: string;
  heroTitle: string;
  heroSubtitle: string;
  announcementText: string;
  flowAiUrl: string;
  logoUrl: string;
  extensionUrl: string;
  extensionVersion: string;
  appImageUrl: string;
  appDownloadUrl: string;
  tutorialVideoUrl: string;
  tutorialTitle: string;
  tutorialThumbnail: string;
}

const gid = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

const defaultSubs: Subscription[] = [
  {
    id: 'sub_shared',
    name: 'Veo 3 Ultra Shared',
    price: 400,
    duration: '১ মাস',
    features: [
      'Google Veo 3 Ultra অ্যাক্সেস',
      '4K AI ভিডিও জেনারেশন',
      'আনলিমিটেড ক্রিয়েটিভিটি',
      'প্রায়োরিটি রেন্ডারিং',
      'Flow AI ডাইরেক্ট অ্যাক্সেস',
      'কমিউনিটি সাপোর্ট',
    ],
    type: 'shared',
    maxUsers: 20,
    active: true,
    badge: 'জনপ্রিয়',
    color: 'violet',
  },
  {
    id: 'sub_personal',
    name: 'Veo 3 Ultra Personal',
    price: 2500,
    duration: '১ মাস',
    features: [
      'সম্পূর্ণ ব্যক্তিগত অ্যাকাউন্ট',
      '4K AI ভিডিও জেনারেশন',
      'আনলিমিটেড প্রজেক্ট',
      'সর্বোচ্চ প্রায়োরিটি রেন্ডারিং',
      'Flow AI ডাইরেক্ট অ্যাক্সেস',
      'ডেডিকেটেড সাপোর্ট',
      'কোনো শেয়ারিং নেই',
    ],
    type: 'personal',
    maxUsers: 1,
    active: true,
    badge: 'প্রিমিয়াম',
    color: 'amber',
  },
];

const defaultSettings: AdminSettings = {
  bkashNumber: '01XXXXXXXXX',
  nagadNumber: '01XXXXXXXXX',
  adminEmail: 'admin@aibajar.com',
  adminPassword: 'admin123',
  siteName: 'Hunny Flow',
  heroTitle: 'AI দিয়ে তৈরি করুন অসাধারণ ভিডিও',
  heroSubtitle: 'Google Veo 3 Ultra দিয়ে প্রফেশনাল মানের 4K AI ভিডিও তৈরি করুন। সাশ্রয়ী মূল্যে প্রিমিয়াম অ্যাক্সেস পান।',
  announcementText: '',
  flowAiUrl: 'https://labs.google/fx/tools/flow',
  logoUrl: '',
  extensionUrl: '',
  extensionVersion: 'V1.0.0 LATEST',
  appImageUrl: '',
  appDownloadUrl: 'https://play.google.com/store/apps/details?id=com.lemurbrowser.exts',
  tutorialVideoUrl: '',
  tutorialTitle: 'কিভাবে ব্যবহার করবেন',
  tutorialThumbnail: '',
};

// ===== HELPER FUNCTIONS =====

async function isAdminUser(userId: string): Promise<boolean> {
  try {
    if (!userId) return false;
    const userSnap = await getDoc(doc(db, "users", userId));
    if (!userSnap.exists()) return false;
    const data = userSnap.data();
    if (data.role !== "admin") return false;
    if (data.blocked === true) return false;
    return true;
  } catch (error) {
    console.error('isAdminUser error:', error);
    return false;
  }
}

async function removeUserFromAccountSilent(accountId: string, userId: string): Promise<void> {
  try {
    const accountRef = doc(db, "accounts", accountId);
    const snap = await getDoc(accountRef);
    if (snap.exists()) {
      const data = snap.data();
      const assignedUsers = Array.isArray(data['assignedUsers']) ? data['assignedUsers'] : [];
      const updated = assignedUsers.filter((id: string) => id !== userId);
      await updateDoc(accountRef, { assignedUsers: updated });
    }
  } catch (error) {
    console.error('removeUserFromAccountSilent error:', error);
  }
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ===== AUTH FUNCTIONS =====

export async function signUp(
  name: string,
  email: string,
  phone: string,
  password: string
): Promise<{ ok: boolean; error?: string; code?: string; userId?: string }> {
  try {
    const cleanEmail = email.toLowerCase().trim();
    const cleanPassword = password.trim();
    const cleanName = name.trim();
    const cleanPhone = phone.trim();

    const q = query(collection(db, "users"), where("email", "==", cleanEmail));
    const existingSnap = await getDocs(q);

    if (!existingSnap.empty) {
      return { ok: false, error: 'এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট আছে' };
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    const newUser: User = {
      id: gid(),
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      password: cleanPassword,
      role: "user",
      verified: false,
      blocked: false,
      sessionToken: "",
      verificationCode: verificationCode,
      createdAt: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, "users"), newUser);
    await updateDoc(docRef, { id: docRef.id });

    return { ok: true, code: verificationCode, userId: docRef.id };
  } catch (error) {
    console.error('signUp error:', error);
    return { ok: false, error: 'সাইনআপ করতে সমস্যা হয়েছে' };
  }
}

export async function verifyEmail(email: string, code: string): Promise<boolean> {
  try {
    const cleanEmail = email.toLowerCase().trim();
    const cleanCode = code.trim();

    const q = query(collection(db, "users"), where("email", "==", cleanEmail));
    const snap = await getDocs(q);

    if (snap.empty) return false;

    const docSnap = snap.docs[0];
    const userData = docSnap.data() as User;

    if (userData.verificationCode === cleanCode) {
      await updateDoc(doc(db, "users", docSnap.id), {
        verified: true,
        verificationCode: null
      });
      return true;
    }

    return false;
  } catch (error) {
    console.error('verifyEmail error:', error);
    return false;
  }
}

export async function resendCode(email: string): Promise<string | null> {
  try {
    const cleanEmail = email.toLowerCase().trim();

    const q = query(collection(db, "users"), where("email", "==", cleanEmail));
    const snap = await getDocs(q);

    if (snap.empty) return null;

    const docSnap = snap.docs[0];
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();

    await updateDoc(doc(db, "users", docSnap.id), {
      verificationCode: newCode
    });

    return newCode;
  } catch (error) {
    console.error('resendCode error:', error);
    return null;
  }
}

export async function login(
  email: string,
  password: string
): Promise<{ ok: boolean; user?: User; error?: string; needsVerify?: boolean }> {
  try {
    const cleanEmail = email.toLowerCase().trim();
    const cleanPassword = password.trim();
    const encodedPassword = cleanPassword;

    const q = query(collection(db, "users"), where("email", "==", cleanEmail));
    const snap = await getDocs(q);

    if (snap.empty) {
      return { ok: false, error: 'ইমেইল বা পাসওয়ার্ড ভুল হয়েছে' };
    }

    const docSnap = snap.docs[0];
    const userData = { id: docSnap.id, ...docSnap.data() } as User;

    if (userData.password !== encodedPassword) {
      return { ok: false, error: 'ইমেইল বা পাসওয়ার্ড ভুল হয়েছে' };
    }

    if (!userData.verified) {
      return { ok: false, error: 'ইমেইল ভেরিফাই করা হয়নি', needsVerify: true };
    }

    if (userData.blocked) {
      return { ok: false, error: 'আপনার অ্যাকাউন্ট ব্লক করা হয়েছে। সাপোর্টে যোগাযোগ করুন।' };
    }

    // Set session for current device
    await setSession(userData.id);

    return { ok: true, user: userData };
  } catch (error) {
    console.error('login error:', error);
    return { ok: false, error: 'লগইন করতে সমস্যা হয়েছে' };
  }
}

export async function deleteUserAccount(email: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const cleanEmail = email.toLowerCase().trim();

    const q = query(collection(db, "users"), where("email", "==", cleanEmail));
    const snap = await getDocs(q);

    if (snap.empty) {
      return { ok: false, error: 'এই ইমেইল দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি' };
    }

    const docSnap = snap.docs[0];
    const userData = { id: docSnap.id, ...docSnap.data() } as User;

    if (userData.role === 'admin') {
      return { ok: false, error: 'অ্যাডমিন অ্যাকাউন্ট ডিলিট করা যাবে না' };
    }

    const userOrders = await getUserOrders(userData.id);
    for (const order of userOrders) {
      await deleteDoc(doc(db, "orders", order.id));
    }

    const msgQuery = query(collection(db, "messages"), where("userId", "==", userData.id));
    const msgSnap = await getDocs(msgQuery);
    for (const m of msgSnap.docs) {
      await deleteDoc(doc(db, "messages", m.id));
    }

    const allAccounts = await getAccounts();
    for (const acc of allAccounts) {
      if (acc.assignedUsers.includes(userData.id)) {
        await removeUserFromAccountSilent(acc.id, userData.id);
      }
    }

await updateDoc(doc(db, "users", userData.id), {
     sessionToken: ""
});

await deleteDoc(doc(db, "users", userData.id));

    return { ok: true };
  } catch (error) {
    console.error('forgotPassword error:', error);
    return { ok: false, error: 'অ্যাকাউন্ট ডিলিট করতে সমস্যা হয়েছে' };
  }
}

export async function logout(): Promise<void> {
  await clearSession();
}

// ===== SUPER SECURE ADMIN LOGIN =====
export async function adminLogin(email: string, password: string): Promise<boolean> {
  try {
    const appSettings = await getSettings();

    const inputEmail = email.toLowerCase().trim();
    const inputPassword = password.trim();
    const encodedInputPassword = inputPassword;

    const adminEmail = (appSettings.adminEmail || "admin@aibajar.com").toLowerCase();
    const adminPassword = appSettings.adminPassword || "admin123";

    // STRICT CHECK
    if (inputEmail !== adminEmail) {
      console.log('Admin login failed: Email mismatch');
      return false;
    }

    if (encodedInputPassword !== adminPassword) {
      console.log('Admin login failed: Password mismatch');
      return false;
    }

    // Find or sync admin user
    const q = query(
      collection(db, "users"), 
      where("email", "==", adminEmail),
      where("role", "==", "admin")
    );
    const snap = await getDocs(q);

    let adminUserId = "";

    if (snap.empty) {
      const newAdminRef = await addDoc(collection(db, "users"), {
        name: "Admin",
        email: adminEmail,
        phone: "",
        password: adminPassword,
        role: "admin",
        verified: true,
        blocked: false,
        sessionToken: "",
        createdAt: new Date().toISOString(),
      });
      adminUserId = newAdminRef.id;
      await updateDoc(newAdminRef, { id: newAdminRef.id });
    } else {
      const adminDoc = snap.docs[0];
      adminUserId = adminDoc.id;
      
      // FIX 2: SYNC password from settings to user record EVERY TIME admin logs in
      await updateDoc(doc(db, "users", adminUserId), {
        password: adminPassword,
        email: adminEmail,
        role: "admin",
        verified: true,
        blocked: false
      });
    }

    // Set session for current device
    await setSession(adminUserId);
    return true;
  } catch (error) {
    console.error('adminLogin error:', error);
    return false;
  }
}

// ===== SESSION MANAGEMENT =====

// Store session token for current device
export async function setSession(userId: string): Promise<void> {
  try {
    if (!userId) return;

    const token =
      Math.random().toString(36).slice(2) +
      Date.now().toString(36);

    localStorage.setItem("ai_bajar_session", token);

    await updateDoc(doc(db, "users", userId), {
      sessionToken: token,
      lastLoginAt: new Date().toISOString()
    });

    console.log("[SESSION] Logged in:", userId);
  } catch (error) {
    console.error("setSession error:", error);
  }
}

export async function getSession(): Promise<User | null> {
  try {
    const token = localStorage.getItem("ai_bajar_session");

    if (!token) return null;

const q = query(
  collection(db, "users"),
  where("sessionToken", "==", token)
);

const snap = await getDocs(q);

if (snap.empty) return null;

const user = {
  id: snap.docs[0].id,
  ...snap.docs[0].data()
} as User;

    if (!user) return null;

    if (user.blocked) {
      localStorage.removeItem("ai_bajar_session");
      return null;
    }

    return user;
  } catch (error) {
    console.error("getSession error:", error);
    return null;
  }
}

export async function clearSession(): Promise<void> {
  try {
    const token = localStorage.getItem("ai_bajar_session");

    if (!token) return;

    const snap = await getDocs(collection(db, "users"));

    const users = snap.docs.map(d => {
     const data = d.data();

  return {
    id: d.id,
    ...data
  } as User;
});

    const user = users.find(u => u.sessionToken === token);

    if (user) {
      await updateDoc(doc(db, "users", user.id), {
        sessionToken: ""
      });
    }

    localStorage.removeItem("ai_bajar_session");

    console.log("[SESSION] Logged out");
  } catch (error) {
    console.error("clearSession error:", error);
  }
}

// ===== SUBSCRIPTIONS =====

export async function getSubs(): Promise<Subscription[]> {
  try {
    const snap = await getDocs(collection(db, "subscriptions"));

    if (snap.empty) {
      for (const sub of defaultSubs) {
        await addDoc(collection(db, "subscriptions"), sub);
      }
      return defaultSubs;
    }

    return snap.docs.map(d => {
      const data = d.data();
      return {
        id: data['id'] || d.id,
        name: data['name'] || '',
        price: data['price'] || 0,
        duration: data['duration'] || '',
        features: Array.isArray(data['features']) ? data['features'] : [],
        type: data['type'] || 'shared',
        maxUsers: data['maxUsers'] || 0,
        active: data['active'] ?? true,
        badge: data['badge'] || '',
        color: data['color'] || 'violet',
      } as Subscription;
    });
  } catch (error) {
    console.error('getSubs error:', error);
    return defaultSubs;
  }
}

export async function getActiveSubs(): Promise<Subscription[]> {
  try {
    const subs = await getSubs();
    return subs.filter(s => s.active);
  } catch (error) {
    console.error('getActiveSubs error:', error);
    return [];
  }
}

export async function addSub(
  sub: Omit<Subscription, 'id'>,
  adminUserId: string
): Promise<void> {
  const isAdmin = await isAdminUser(adminUserId);
  if (!isAdmin) {
    throw new Error("Unauthorized: Admin access required");
  }

  await addDoc(collection(db, "subscriptions"), {
    name: sub.name,
    price: sub.price,
    duration: sub.duration,
    features: sub.features,
    type: sub.type,
    maxUsers: sub.maxUsers,
    active: sub.active,
    badge: sub.badge,
    color: sub.color,
    id: gid()
  });
}

export async function updateSub(
  id: string,
  data: Partial<Subscription>,
  adminUserId: string
): Promise<void> {
  const isAdmin = await isAdminUser(adminUserId);
  if (!isAdmin) {
    throw new Error("Unauthorized: Admin access required");
  }

  // FIX 6: Find subscription by custom id field, not Firestore doc id
  const snap = await getDocs(collection(db, "subscriptions"));
  const docRef = snap.docs.find(d => d.data().id === id);
  
  if (docRef) {
    await updateDoc(doc(db, "subscriptions", docRef.id), data);
  }
}

export async function deleteSub(
  id: string,
  adminUserId: string
): Promise<void> {
  const isAdmin = await isAdminUser(adminUserId);
  if (!isAdmin) {
    throw new Error("Unauthorized: Admin access required");
  }

  // FIX 6: Find subscription by custom id field, then delete
  const snap = await getDocs(collection(db, "subscriptions"));
  const docRef = snap.docs.find(d => d.data().id === id);
  
  if (docRef) {
    await deleteDoc(doc(db, "subscriptions", docRef.id));
    console.log('[SUB] Deleted subscription:', id);
  } else {
    console.warn('[SUB] Subscription not found for deletion:', id);
  }
}

// ===== ULTRA ACCOUNTS =====

export async function getAccounts(): Promise<UltraAccount[]> {
  try {
    const snap = await getDocs(collection(db, "accounts"));

    return snap.docs.map(doc => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        gmail: data.gmail || "",
        cookie: data.cookie || "",
        subscriptionId: data.subscriptionId || "",
        subscriptionName: data.subscriptionName || "",
        assignedUsers: Array.isArray(data.assignedUsers) ? data.assignedUsers : [],
        maxSlots: data.maxSlots || 0,
        active: data.active ?? true,
        createdAt: data.createdAt || "",
        expiresAt: data.expiresAt || undefined
      };
    });
  } catch (error) {
    console.error('getAccounts error:', error);
    return [];
  }
}

export async function addAccount(
  gmail: string,
  cookie: string,
  subId: string,
  subName: string,
  maxSlots: number,
  adminUserId: string
): Promise<void> {
  const isAdmin = await isAdminUser(adminUserId);
  if (!isAdmin) {
    throw new Error("Unauthorized: Admin access required");
  }

  if (!cookie || cookie.trim().length === 0) {
    throw new Error("Cookie is required and cannot be empty");
  }

  await addDoc(collection(db, "accounts"), {
    gmail: gmail.trim(),
    cookie: cookie.trim(),
    subscriptionId: subId,
    subscriptionName: subName,
    assignedUsers: [],
    maxSlots: maxSlots,
    active: true,
    createdAt: new Date().toISOString()
  });
}

export async function assignUser(
  accountId: string,
  userId: string,
  adminUserId: string
): Promise<void> {
  const isAdmin = await isAdminUser(adminUserId);
  if (!isAdmin) {
    throw new Error("Unauthorized: Admin access required");
  }

  const accountRef = doc(db, "accounts", accountId);
  const snap = await getDoc(accountRef);

  if (snap.exists()) {
    const data = snap.data();
    const currentUsers = Array.isArray(data['assignedUsers']) ? data['assignedUsers'] : [];

    if (!currentUsers.includes(userId)) {
      await updateDoc(accountRef, {
        assignedUsers: [...currentUsers, userId]
      });
    }
  }
}

export async function removeUserFromAccount(
  accountId: string,
  userId: string,
  adminUserId: string
): Promise<void> {
  const isAdmin = await isAdminUser(adminUserId);
  if (!isAdmin) {
    throw new Error("Unauthorized: Admin access required");
  }

  const accountRef = doc(db, "accounts", accountId);
  const snap = await getDoc(accountRef);

  if (snap.exists()) {
    const data = snap.data();
    const currentUsers = Array.isArray(data['assignedUsers']) ? data['assignedUsers'] : [];
    const updated = currentUsers.filter((id: string) => id !== userId);
    await updateDoc(accountRef, { assignedUsers: updated });
  }
}

export async function deleteAccount(
  id: string,
  adminUserId: string
): Promise<void> {
  const isAdmin = await isAdminUser(adminUserId);
  if (!isAdmin) {
    throw new Error("Unauthorized: Admin access required");
  }

  const accountRef = doc(db, "accounts", id);
  const accountSnap = await getDoc(accountRef);

  if (accountSnap.exists()) {
    const accountData = accountSnap.data();
    const assignedUsers = Array.isArray(accountData.assignedUsers) ? accountData.assignedUsers : [];

    const allOrders = await getOrders();
    const affectedOrders = allOrders.filter(o => o.assignedAccountId === id);

    for (const order of affectedOrders) {
      await updateDoc(doc(db, "orders", order.id), {
        assignedAccountId: null,
        status: "rejected",
        reason: "account_deleted"
      });
    }

    for (const userId of assignedUsers) {
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData.assignedAccountId === id) {
          await updateDoc(userRef, { assignedAccountId: null });
        }
      }
    }
  }

  await deleteDoc(accountRef);
}

// ===== ORDERS =====

export async function getOrders(): Promise<Order[]> {
  try {
    const snap = await getDocs(collection(db, "orders"));

    return snap.docs.map(doc => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        userId: data.userId || '',
        userName: data.userName || '',
        userEmail: data.userEmail || '',
        userPhone: data.userPhone || '',
        subscriptionId: data.subscriptionId || '',
        subscriptionName: data.subscriptionName || '',
        subscriptionPrice: data.subscriptionPrice || 0,
        status: data.status || 'pending',
        screenshot: data.screenshot || '',
        currentStep: data.currentStep || 0,
        createdAt: data.createdAt || '',
        assignedAccountId: data.assignedAccountId || undefined,
        expiresAt: data.expiresAt || undefined,
        paymentMethod: data.paymentMethod || '',
        reason: data.reason || undefined,
      } as Order;
    });
  } catch (error) {
    console.error('getOrders error:', error);
    return [];
  }
}

export async function getUserOrders(userId: string): Promise<Order[]> {
  try {
    const allOrders = await getOrders();
    return allOrders.filter(o => o.userId === userId);
  } catch (error) {
    console.error('getUserOrders error:', error);
    return [];
  }
}

export async function createOrder(
  userId: string,
  userName: string,
  userEmail: string,
  userPhone: string,
  subId: string,
  subName: string,
  subPrice: number,
  screenshot: string,
  paymentMethod: string
): Promise<void> {
  await addDoc(collection(db, "orders"), {
    userId,
    userName,
    userEmail,
    userPhone,
    subscriptionId: subId,
    subscriptionName: subName,
    subscriptionPrice: subPrice,
    status: "pending",
    screenshot,
    currentStep: 5,
    createdAt: new Date().toISOString(),
    paymentMethod
  });
}

export async function confirmOrder(
  orderId: string,
  accountId: string,
  adminUserId: string
): Promise<void> {
  const isAdmin = await isAdminUser(adminUserId);
  if (!isAdmin) {
    throw new Error("Unauthorized: Admin access required");
  }

  const orderRef = doc(db, "orders", orderId);
  const orderSnap = await getDoc(orderRef);
  
  if (!orderSnap.exists()) return;

  if (!accountId) {
    await updateDoc(orderRef, {
      status: "confirmed",
      currentStep: 6
    });
    return;
  }

  const accountRef = doc(db, "accounts", accountId);
  const accountSnap = await getDoc(accountRef);

if (!accountSnap.exists()) return;

const orderData = orderSnap.data();
const accountData = accountSnap.data();

if (orderData.status === "confirmed") {
  throw new Error("Already confirmed");
}

 // Allow subscription matching by name too
if (orderData.subscriptionId !== accountData.subscriptionId && 
    orderData.subscriptionName !== accountData.subscriptionName) {
    throw new Error("Subscription mismatch");
  }

  const currentAssignedUsers = Array.isArray(accountData.assignedUsers) ? accountData.assignedUsers : [];
  if (currentAssignedUsers.length >= accountData.maxSlots) {
    throw new Error("Account is full");
  }

  const expire = new Date();
  expire.setDate(expire.getDate() + 30);

  await updateDoc(orderRef, {
    status: "confirmed",
    assignedAccountId: accountId,
    currentStep: 6,
    expiresAt: expire.toISOString()
  });

  const updatedUsers = currentAssignedUsers.includes(orderData.userId)
  ? currentAssignedUsers
  : [...currentAssignedUsers, orderData.userId];
  const uniqueUsers = [...new Set(updatedUsers)];

  await updateDoc(accountRef, {
    assignedUsers: uniqueUsers
  });

  // FIX 4: Auto-send confirmation message to customer
  const confirmMessage = `🎉 অভিনন্দন! আপনার "${orderData.subscriptionName || 'N/A'}" প্ল্যানের অর্ডারটি কনফার্ম করা হয়েছে। এখন আপনি Flow AI Ultra ব্যবহার করতে পারবেন। আপনার Dashboard থেকে অ্যাক্সেস নিন।`;
  
  await sendMessage(
    orderData.userId,
    orderData.userName || 'User',
    confirmMessage,
    undefined,
    true
  );
}

export async function rejectOrder(
  orderId: string,
  adminUserId: string
): Promise<void> {
  const isAdmin = await isAdminUser(adminUserId);
  if (!isAdmin) {
    throw new Error("Unauthorized: Admin access required");
  }

  const orderRef = doc(db, "orders", orderId);
  await updateDoc(orderRef, {
    status: "rejected"
  });
}

export async function getUserAccount(userId: string): Promise<UltraAccount | null> {
  try {
    const accounts = await getAccounts();
    return accounts.find(acc => acc.assignedUsers.includes(userId) && acc.cookie) || null;
  } catch (error) {
    console.error('getUserAccount error:', error);
    return null;
  }
}

export async function getValidUserAccount(userId: string): Promise<UltraAccount | null> {
  try {
    const acc = await getUserAccount(userId);
    if (!acc) return null;
    if (!acc.cookie || acc.cookie.trim().length === 0) return null;
    return acc;
  } catch (error) {
    console.error('getValidUserAccount error:', error);
    return null;
  }
}

export async function hasActiveAccess(userId: string): Promise<boolean> {
  try {
    const orders = await getUserOrders(userId);
    return orders.some(o => {
      if (o.status !== "confirmed") return false;
      if (!o.expiresAt) return false;
      return new Date(o.expiresAt) > new Date();
    });
  } catch (error) {
    console.error('hasActiveAccess error:', error);
    return false;
  }
}

// ===== MESSAGES =====

export async function getMessages(): Promise<Message[]> {
  try {
    const snap = await getDocs(collection(db, "messages"));
    return snap.docs.map(doc => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        userId: data.userId || '',
        userName: data.userName || 'Unknown',
        text: data.text || '',
        image: data.image || undefined,
        timestamp: data.timestamp || '',
        isAdmin: data.isAdmin || false,
      } as Message;
    });
  } catch (error) {
    console.error('getMessages error:', error);
    return [];
  }
}

export async function getUserMessages(userId: string): Promise<Message[]> {
  try {
    const messages = await getMessages();
    return messages.filter(m => m.userId === userId);
  } catch (error) {
    console.error('getUserMessages error:', error);
    return [];
  }
}

export async function getConversations(): Promise<{ userId: string; userName: string; lastMsg: string; time: string; count: number }[]> {
  try {
    const msgs = await getMessages();
    const conversationMap: Record<string, { userId: string; userName: string; lastMsg: string; time: string; count: number }> = {};

    msgs.forEach(msg => {
      if (!conversationMap[msg.userId]) {
        conversationMap[msg.userId] = {
          userId: msg.userId,
          userName: msg.userName || 'Unknown',
          lastMsg: '',
          time: '',
          count: 0
        };
      }

      const convo = conversationMap[msg.userId];

      if (!convo.time || msg.timestamp > convo.time) {
        convo.lastMsg = msg.text || '📷 ছবি';
        convo.time = msg.timestamp;
      }

      if (!msg.isAdmin) {
        convo.count++;
      }
    });

    return Object.values(conversationMap).sort((a, b) => b.time.localeCompare(a.time));
  } catch (error) {
    console.error('getConversations error:', error);
    return [];
  }
}

export async function sendMessage(
  userId: string,
  userName: string,
  text: string,
  image: string | undefined,
  isAdmin: boolean
): Promise<void> {
  await addDoc(collection(db, "messages"), {
    userId,
    userName: userName || 'Unknown',
    text: text || '',
    image: image || null,
    timestamp: new Date().toISOString(),
    isAdmin: isAdmin || false
  });
}

// ===== USERS =====

export async function getUsers(): Promise<User[]> {
  try {
    const snap = await getDocs(collection(db, "users"));

    return snap.docs.map(doc => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        password: data.password || '',
        role: data.role || 'user',
        verified: data.verified ?? false,
        blocked: data.blocked ?? false,
        sessionToken: data.sessionToken || "",
        verificationCode: data.verificationCode || undefined,
        lastLoginAt: data.lastLoginAt || undefined,
        createdAt: data.createdAt || '',
      } as User;
    });
  } catch (error) {
    console.error('getUsers error:', error);
    return [];
  }
}

export async function blockUser(
  userId: string,
  adminUserId: string
): Promise<void> {
  const isAdmin = await isAdminUser(adminUserId);
  if (!isAdmin) {
    throw new Error("Unauthorized: Admin access required");
  }

  await updateDoc(doc(db, "users", userId), {
    blocked: true,
    sessionToken: ""
  });
}

export async function unblockUser(
  userId: string,
  adminUserId: string
): Promise<void> {
  const isAdmin = await isAdminUser(adminUserId);
  if (!isAdmin) {
    throw new Error("Unauthorized: Admin access required");
  }

  await updateDoc(doc(db, "users", userId), { blocked: false });
}

// ===== SETTINGS =====

export async function getSettings(): Promise<AdminSettings> {
  try {
    const settingsRef = doc(db, "settings", "default");
    const settingsSnap = await getDoc(settingsRef);

    if (!settingsSnap.exists()) {
      await setDoc(settingsRef, defaultSettings);
      return defaultSettings;
    }

    const data = settingsSnap.data() as AdminSettings;
    
    return {
      ...defaultSettings,
      ...data,
    };
  } catch (error) {
    console.error('getSettings error:', error);
    return defaultSettings;
  }
}

export async function updateSettings(
  data: Partial<AdminSettings>,
  adminUserId: string
): Promise<void> {
  const isAdmin = await isAdminUser(adminUserId);
  if (!isAdmin) {
    throw new Error("Unauthorized: Admin access required");
  }

  const settingsRef = doc(db, "settings", "default");
  const settingsSnap = await getDoc(settingsRef);

  // Save settings
  if (settingsSnap.exists()) {
    await updateDoc(settingsRef, data);
  } else {
    await setDoc(settingsRef, data, { merge: true });
  }

  // FIX 2: Read back and SYNC admin password to user record
  const updatedSnap = await getDoc(settingsRef);
  const currentSettings = updatedSnap.exists() 
    ? { ...defaultSettings, ...updatedSnap.data() } as AdminSettings
    : defaultSettings;

  if (data.adminPassword || data.adminEmail) {
    const adminEmail = data.adminEmail || currentSettings.adminEmail;
    const adminPassword = data.adminPassword || currentSettings.adminPassword;

    console.log('[SETTINGS] Syncing admin password for:', adminEmail);

    const adminQuery = query(
      collection(db, "users"), 
      where("email", "==", adminEmail),
      where("role", "==", "admin")
    );
    const adminSnap = await getDocs(adminQuery);

    if (!adminSnap.empty) {
      const adminDocId = adminSnap.docs[0].id;
      await updateDoc(doc(db, "users", adminDocId), {
        password: adminPassword,
        email: adminEmail,
        role: "admin",
        verified: true,
        blocked: false
      });
      console.log('[SETTINGS] Admin password synced to user record');
    } else {
      const newAdminRef = await addDoc(collection(db, "users"), {
        name: "Admin",
        email: adminEmail,
        phone: "",
        password: adminPassword,
        role: "admin",
        verified: true,
        blocked: false,
        sessionToken: "",
        createdAt: new Date().toISOString(),
      });
      await updateDoc(newAdminRef, { id: newAdminRef.id });
      console.log('[SETTINGS] New admin user created');
    }
  }
}

export async function ensureAdminUser() {
  try {
    const appSettings = await getSettings();

    const adminQuery = query(
      collection(db, "users"),
      where("email", "==", appSettings.adminEmail),
      where("role", "==", "admin")
    );
    const adminSnap = await getDocs(adminQuery);

    if (adminSnap.empty) {
      const newAdminRef = await addDoc(collection(db, "users"), {
        name: "Admin",
        email: appSettings.adminEmail,
        phone: "",
        password: appSettings.adminPassword,
        role: "admin",
        verified: true,
        blocked: false,
        sessionToken: "",
        createdAt: new Date().toISOString(),
      });
      await updateDoc(newAdminRef, { id: newAdminRef.id });
    } else {
      const adminDocId = adminSnap.docs[0].id;
      await updateDoc(doc(db, "users", adminDocId), {
        password: appSettings.adminPassword,
        email: appSettings.adminEmail,
        role: "admin",
        verified: true,
        blocked: false
      });
    }
  } catch (error) {
    console.error('ensureAdminUser error:', error);
  }
}

export async function initStore() {
  try {
    const settingsRef = doc(db, "settings", "default");
    const settingsSnap = await getDoc(settingsRef);
    
    if (!settingsSnap.exists()) {
      await setDoc(settingsRef, defaultSettings);
    }

    await ensureAdminUser();
  } catch (error) {
    console.error('initStore error:', error);
  }
}
export async function forgotPassword(email: string) {
  try {
    const users = await getUsers();

    const user = users.find(
      (u: any) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!user) {
      return {
        ok: false,
        error: 'এই ইমেইলে কোনো অ্যাকাউন্ট নেই'
      };
    }

    await deleteDoc(doc(db, "users", user.id));

    return {
    ok: true
   };
  } catch (error) {
    console.error('forgotPassword error:', error);

    return {
      ok: false,
      error: 'সমস্যা হয়েছে'
    };
  }
}