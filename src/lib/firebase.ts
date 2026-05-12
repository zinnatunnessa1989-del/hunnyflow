import { initializeApp } from "firebase/app";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCzreGVTCH1-QfNNWGCa13fHoHzFbIVEWg",
  authDomain: "veo-3ultra.firebaseapp.com",
  projectId: "veo-3ultra",
  storageBucket: "veo-3ultra.firebasestorage.app",
  messagingSenderId: "637668092596",
  appId: "1:637668092596:web:df565658ad5ea1136585e1"
};

// 🔥 IMPORTANT: export করতে হবে
export const app = initializeApp(firebaseConfig);