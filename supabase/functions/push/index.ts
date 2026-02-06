// FILE INI ADALAH REFERENSI UNTUK SUPABASE EDGE FUNCTION
// DEPLOY MENGGUNAKAN SUPABASE CLI:
// supabase functions deploy push

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'https://esm.sh/web-push'

declare const Deno: any;

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  // UPDATE: Menggunakan variable SUPABASE_SERVICE_ROLE_KEY sesuai perintah Anda
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// Konfigurasi VAPID
const vapidKeys = {
  publicKey: Deno.env.get('VAPID_PUBLIC_KEY'),
  privateKey: Deno.env.get('VAPID_PRIVATE_KEY'),
  // UPDATE: Mengambil email dari Env Var sesuai perintah secrets set
  email: Deno.env.get('VAPID_EMAIL') ?? 'mailto:admin@tradeguard.app'
}

webpush.setVapidDetails(
  vapidKeys.email,
  vapidKeys.publicKey,
  vapidKeys.privateKey
)

Deno.serve(async (req: any) => {
  try {
    const payload = await req.json()
    const { record } = payload
    
    if (!record) {
       return new Response("No record found", {status: 200})
    }

    // LOGIKA UTAMA:
    // Jika ada 'alert_message' (dari TradingView), gunakan itu sebagai body.
    // Jika tidak ada, gunakan format default.
    let messageBody = '';
    
    if (record.alert_message) {
      messageBody = record.alert_message;
    } else {
      // Fallback jika user lupa mengirim alert_message di JSON
      messageBody = `${(record.side || 'TRADE').toUpperCase()}
PAIR ${record.symbol}
ENTRI : ${record.entry_price}
STOP LOSS : ${record.stop_loss}
TAKE PROFIT : ${record.take_profit}

Selalu jaga risk/trade 1% dan jaga money management`;
    }

    const notificationPayload = JSON.stringify({
      title: `xTrade Strategy Signal`,
      body: messageBody,
      url: '/'
    })

    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*')

    if (!subscriptions || subscriptions.length === 0) {
      return new Response("No subscribers", {status: 200})
    }

    const promises = subscriptions.map((sub: any) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: sub.keys
      }
      return webpush.sendNotification(pushSubscription, notificationPayload)
        .catch((err: any) => {
           if (err.statusCode === 410) {
             return supabase.from('push_subscriptions').delete().eq('id', sub.id)
           }
        })
    })

    await Promise.all(promises)

    return new Response(JSON.stringify({ message: `Sent to ${subscriptions.length} devices` }), { 
      headers: { "Content-Type": "application/json" } 
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})