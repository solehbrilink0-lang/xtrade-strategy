import { supabase } from './supabaseClient';

// ANDA HARUS MENGGENERATE VAPID KEYS SENDIRI UNTUK PRODUCTION
// Jalankan di terminal: npx web-push generate-vapid-keys
// Masukkan Public Key di sini:
const PUBLIC_VAPID_KEY = 'BE57lOOb8IQmx2CZMvjlk55UlT4taUzX-0E3cF4U2w_2sadSJ-XP-bzUU5dO2tHzd1xeC0_cC2Zc2LAeIUg4ES8'; 

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const subscribeToPush = async () => {
  if (!supabase) return { success: false, error: "Database connection failed." };
  
  // Cek dukungan browser
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { success: false, error: "Push notifications tidak didukung di browser/device ini." };
  }

  try {
    // 1. Minta Izin Notifikasi Secara Eksplisit
    // Browser Mobile sering memblokir jika tidak ada requestPermission eksplisit
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: "Izin notifikasi ditolak. Mohon aktifkan di pengaturan browser." };
    }

    // 2. Pastikan Service Worker Teregistrasi dengan Benar
    // Kita register ulang secara eksplisit untuk memastikan file sw.js termuat dari root
    const registration = await navigator.serviceWorker.register('/sw.js');
    
    // Tunggu sampai Service Worker benar-benar aktif
    await navigator.serviceWorker.ready;

    // 3. Cek apakah sudah subscribe sebelumnya
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      // (Opsional) Sync ulang ke DB untuk memastikan data konsisten
      await saveSubscriptionToDb(existingSubscription);
      return { success: true, message: "Already subscribed" };
    }

    // 4. Lakukan Subscribe Baru ke Push Service (FCM/Mozilla/Apple)
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
    });

    // 5. Simpan Endpoint & Keys ke Database Supabase
    const saved = await saveSubscriptionToDb(subscription);
    if (!saved.success) throw new Error(saved.error);

    return { success: true, message: "Subscribed successfully" };

  } catch (error: any) {
    console.error("Push subscription error:", error);
    
    // Deteksi Error khusus iOS
    // Di iOS (iPhone/iPad), Push Notification hanya jalan jika app di "Add to Home Screen" (PWA)
    if (error.name === 'NotAllowedError' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)) {
       return { success: false, error: "Di iOS, mohon 'Add to Home Screen' aplikasi ini terlebih dahulu untuk mengaktifkan notifikasi." };
    }

    return { success: false, error: error.message || "Gagal mengaktifkan notifikasi." };
  }
};

// Helper function untuk menyimpan ke DB
async function saveSubscriptionToDb(subscription: PushSubscription) {
  try {
    const { error } = await supabase!
      .from('push_subscriptions')
      .upsert({
        endpoint: subscription.endpoint,
        keys: subscription.toJSON().keys
      }, { onConflict: 'endpoint' }); // Upsert berdasarkan endpoint unik agar tidak error duplicate

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}