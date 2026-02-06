// File ini adalah referensi untuk "Edge Function" Supabase.
// Anda harus mendeploy ini menggunakan Supabase CLI:
// supabase functions new tradingview-hook
// supabase functions deploy tradingview-hook

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const Deno: any;

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  // UPDATE: Menggunakan variable SUPABASE_SERVICE_ROLE_KEY sesuai perintah Anda
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

Deno.serve(async (req: any) => {
  try {
    const payload = await req.json()
    // Menambahkan alert_message ke destructuring
    const { symbol, event, side, entry_price, stop_loss, trade_id, alert_message } = payload

    // 1. Ambil data Strategy saat ini
    const { data: strategy, error: stratError } = await supabase
      .from('strategies')
      .select('*')
      .eq('symbol', symbol)
      .single()

    if (stratError || !strategy) {
      return new Response(JSON.stringify({ error: 'Strategy not found' }), { status: 404 })
    }

    // ----------------LOGIKA ENTRY----------------
    if (event === 'entry') {
      // Risk Management: 1% Equity
      const riskPerTrade = 0.01
      const equity = parseFloat(strategy.current_equity)
      const riskAmount = equity * riskPerTrade
      
      const dist = Math.abs(entry_price - stop_loss)
      let positionSize = 0
      
      if (dist > 0) {
        positionSize = riskAmount / dist
      }

      // Simpan Trade Baru beserta alert_message custom
      const { error: insertError } = await supabase
        .from('trades')
        .insert({
          id: trade_id || `t_${Date.now()}`,
          symbol: symbol,
          strategy_name: strategy.strategy_name,
          side: side,
          entry_price: entry_price,
          stop_loss: stop_loss,
          take_profit: payload.take_profit,
          position_size: positionSize,
          risk_amount: riskAmount,
          status: 'OPEN',
          entry_time: new Date().toISOString(),
          alert_message: alert_message || null // Simpan pesan dari TV
        })

      if (insertError) throw insertError

      // TRIGGER PUSH NOTIFICATION OTOMATIS
      // Memanggil fungsi 'push' agar notifikasi masuk ke HP
      await supabase.functions.invoke('push', {
        body: {
          record: {
            symbol,
            side,
            entry_price,
            stop_loss,
            take_profit: payload.take_profit,
            alert_message: alert_message || "Entry Signal Recieved"
          }
        }
      });

      return new Response(JSON.stringify({ message: 'Entry Recorded & Push Sent', size: positionSize }), { status: 200 })
    }

    // ----------------LOGIKA EXIT----------------
    if (event === 'exit') {
      const exitPrice = payload.exit_price || entry_price // Fallback

      // Cari trade yang masih OPEN
      const { data: openTrade, error: tradeError } = await supabase
        .from('trades')
        .select('*')
        .eq('symbol', symbol)
        .eq('status', 'OPEN')
        .single() // Asumsi 1 open trade per pair

      if (!openTrade) {
        return new Response(JSON.stringify({ message: 'No open trade found to close' }), { status: 200 })
      }

      // Hitung PnL
      const size = parseFloat(openTrade.position_size)
      let pnl = 0
      if (openTrade.side === 'buy') {
        pnl = (exitPrice - openTrade.entry_price) * size
      } else {
        pnl = (openTrade.entry_price - exitPrice) * size
      }

      // Update Equity & Drawdown
      const currentEquity = parseFloat(strategy.current_equity)
      const newEquity = currentEquity + pnl
      const peakEquity = Math.max(parseFloat(strategy.peak_equity), newEquity)
      const drawdown = ((peakEquity - newEquity) / peakEquity) * 100

      // Update Trade jadi CLOSED
      await supabase.from('trades').update({
        status: 'CLOSED',
        exit_price: exitPrice,
        exit_time: new Date().toISOString(),
        pnl: pnl
      }).eq('id', openTrade.id)

      // Update Strategy
      await supabase.from('strategies').update({
        current_equity: newEquity,
        peak_equity: peakEquity,
        max_drawdown: Math.max(parseFloat(strategy.max_drawdown), drawdown)
      }).eq('symbol', symbol)

      // TRIGGER PUSH NOTIFICATION OTOMATIS (EXIT)
      await supabase.functions.invoke('push', {
        body: {
          record: {
            symbol,
            side: 'CLOSE',
            entry_price: openTrade.entry_price,
            exit_price: exitPrice,
            alert_message: `Trade Closed. PnL: $${pnl.toFixed(2)}`
          }
        }
      });

      return new Response(JSON.stringify({ message: 'Exit Recorded & Push Sent', pnl: pnl }), { status: 200 })
    }

    return new Response(JSON.stringify({ message: 'Event not handled' }), { status: 400 })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})