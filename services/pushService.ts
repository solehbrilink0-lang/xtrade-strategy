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
  if (!supabase) return { success: false, error: "Supabase not initialized" };
  
  if (!('serviceWorker' in navigator)) {
    return { success: false, error: "Service Worker not supported" };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Cek apakah sudah subscribe
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      return { success: true, message: "Already subscribed" };
    }

    // Subscribe baru
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
    });

    // Simpan ke Database
    const { error } = await supabase
      .from('push_subscriptions')
      .insert({
        endpoint: subscription.endpoint,
        keys: subscription.toJSON().keys
      });

    if (error) {
        // Abaikan error duplicate key
        if (error.code !== '23505') throw error;
    }

    return { success: true, message: "Subscribed successfully" };

  } catch (error: any) {
    console.error("Push subscription error:", error);
    return { success: false, error: error.message };
  }
};