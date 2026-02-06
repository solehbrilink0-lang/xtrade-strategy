import React, { useState, useEffect } from 'react';
import { WebhookPayload } from '../types';
import { supabase } from '../services/supabaseClient';
import { Send, AlertCircle, Terminal, CheckCircle2, XCircle, MessageSquare } from 'lucide-react';

export const WebhookSimulator: React.FC = () => {
  const [selectedPair, setSelectedPair] = useState<'BTCUSD' | 'XAUUSD'>('BTCUSD');
  const [event, setEvent] = useState<'entry' | 'exit'>('entry');
  const [entryPrice, setEntryPrice] = useState<number>(selectedPair === 'BTCUSD' ? 42000 : 2050);
  const [stopLoss, setStopLoss] = useState<number>(selectedPair === 'BTCUSD' ? 41500 : 2040);
  const [takeProfit, setTakeProfit] = useState<number>(selectedPair === 'BTCUSD' ? 43500 : 2080);
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [exitPrice, setExitPrice] = useState<number>(selectedPair === 'BTCUSD' ? 42500 : 2060);
  const [customMessage, setCustomMessage] = useState<string>('');
  const [useCustomMessage, setUseCustomMessage] = useState<boolean>(true);
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  // Auto-generate message based on inputs to mimic Pine Script logic
  useEffect(() => {
    if (!useCustomMessage) return;

    if (event === 'entry') {
      const signalType = side === 'buy' ? "📈 *SINYAL BELI*" : "📉 *SINYAL JUAL*";
      const msg = `${signalType}
🪙 Pair: ${selectedPair}
💰 Harga Entri: ${entryPrice}
📊 Resiko: 1%
🔒 Stop Loss: ${stopLoss}
🎯 Take Profit: ${takeProfit}

Selalu jaga risk/trade 1% dan jaga money management
Silahkan cek hasil statistik di dashboard aplikasi.`;
      setCustomMessage(msg);
    } else {
      const msg = `✅ *TRADE CLOSED*
🪙 Pair: ${selectedPair}
💰 Exit Price: ${exitPrice}

Trade ditutup sesuai strategi.`;
      setCustomMessage(msg);
    }
  }, [event, side, selectedPair, entryPrice, stopLoss, takeProfit, exitPrice, useCustomMessage]);

  const handleSend = async () => {
    if (!supabase) {
      setStatus({ msg: "Supabase client missing", type: "error" });
      return;
    }

    setLoading(true);
    setStatus(null);

    const payload: WebhookPayload = {
      symbol: selectedPair,
      strategy_name: selectedPair === 'BTCUSD' ? 'Strategy_BTC' : 'Strategy_XAU',
      side: side,
      entry_price: entryPrice,
      stop_loss: stopLoss,
      take_profit: takeProfit,
      timestamp: new Date().toISOString(),
      trade_id: `trade_${Date.now().toString().slice(-4)}`,
      event: event,
      exit_price: event === 'exit' ? exitPrice : undefined,
      alert_message: useCustomMessage ? customMessage : undefined
    };

    try {
      // Call the Database Function (RPC) directly
      const { data, error } = await supabase.rpc('handle_webhook', { payload });

      if (error) throw error;

      if (data && data.error) {
         throw new Error(data.error);
      }

      setStatus({ 
        msg: event === 'entry' 
          ? `Signal Sent! Msg: ${useCustomMessage ? 'Custom' : 'Default'}` 
          : `Trade Closed! PnL: $${data.pnl?.toFixed(2) || '0'}`, 
        type: 'success' 
      });

    } catch (err: any) {
      console.error(err);
      setStatus({ msg: err.message || "Failed to send webhook", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-5 w-full max-w-md mx-auto shadow-2xl overflow-y-auto max-h-[90vh]">
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 text-slate-200">
          <Terminal size={18} className="text-blue-400" />
          <h3 className="font-semibold">Live Webhook Test</h3>
        </div>
        <div className="text-[10px] uppercase bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">
          RPC Mode
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Target Pair</label>
          <select 
            value={selectedPair} 
            onChange={(e) => {
              const pair = e.target.value as any;
              setSelectedPair(pair);
              if (pair === 'BTCUSD') { setEntryPrice(42000); setStopLoss(41500); setTakeProfit(43500); setExitPrice(42500); }
              else { setEntryPrice(2050); setStopLoss(2040); setTakeProfit(2080); setExitPrice(2060); }
            }}
            className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded p-2 text-sm focus:border-blue-500 outline-none font-mono"
          >
            <option value="BTCUSD">BTCUSD</option>
            <option value="XAUUSD">XAUUSD</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-1">Action</label>
          <div className="flex rounded bg-slate-950 border border-slate-800 p-1">
            <button 
              onClick={() => { setEvent('entry'); setStatus(null); }}
              className={`flex-1 text-xs py-1.5 rounded transition-all ${event === 'entry' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              ENTRY
            </button>
            <button 
              onClick={() => { setEvent('exit'); setStatus(null); }}
              className={`flex-1 text-xs py-1.5 rounded transition-all ${event === 'exit' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              EXIT
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {event === 'entry' && (
          <>
             <div className="flex gap-2 mb-2">
              <button 
                onClick={() => setSide('buy')} 
                className={`flex-1 py-1 rounded text-sm font-bold border transition-all ${side === 'buy' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'border-slate-800 text-slate-500 hover:bg-slate-800'}`}
              >
                BUY
              </button>
              <button 
                onClick={() => setSide('sell')} 
                className={`flex-1 py-1 rounded text-sm font-bold border transition-all ${side === 'sell' ? 'bg-red-500/20 border-red-500 text-red-400' : 'border-slate-800 text-slate-500 hover:bg-slate-800'}`}
              >
                SELL
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-slate-500">Entry</label>
                <input type="number" value={entryPrice} onChange={(e) => setEntryPrice(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-500">SL</label>
                <input type="number" value={stopLoss} onChange={(e) => setStopLoss(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-sm text-red-400" />
              </div>
              <div>
                <label className="block text-xs text-slate-500">TP</label>
                <input type="number" value={takeProfit} onChange={(e) => setTakeProfit(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-sm text-emerald-400" />
              </div>
            </div>
          </>
        )}

        {event === 'exit' && (
          <div className="animate-fade-in">
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded mb-3">
              <p className="text-xs text-yellow-500 flex items-start gap-2">
                <AlertCircle size={14} className="mt-0.5 min-w-[14px]" />
                <span>Will close the oldest <strong>OPEN</strong> trade for {selectedPair}.</span>
              </p>
            </div>
             <div>
                <label className="block text-xs text-slate-500">Exit Price</label>
                <input type="number" value={exitPrice} onChange={(e) => setExitPrice(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-sm text-white" />
              </div>
          </div>
        )}

        {/* Custom Message Section */}
        <div className="pt-2 border-t border-slate-800 mt-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <MessageSquare size={14} className="text-slate-400" />
              <label className="text-xs font-semibold text-slate-300">TradingView Message</label>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={useCustomMessage} onChange={(e) => setUseCustomMessage(e.target.checked)} className="sr-only peer" />
              <div className="w-7 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          {useCustomMessage && (
            <textarea 
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full h-32 bg-slate-950 border border-slate-800 rounded p-2 text-xs font-mono text-slate-300 focus:border-blue-500 outline-none resize-none"
              placeholder="Paste your TradingView message format here..."
            />
          )}
        </div>

        <button 
          onClick={handleSend}
          disabled={loading}
          className={`w-full font-bold py-2.5 rounded transition-all flex items-center justify-center gap-2 mt-4 shadow-lg ${
            loading ? 'bg-slate-700 text-slate-400 cursor-not-allowed' :
            event === 'entry' ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-purple-600 hover:bg-purple-500 text-white'
          }`}
        >
          {loading ? (
             <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <>
              <Send size={16} />
              {event === 'entry' ? 'Send Entry Signal' : 'Send Exit Signal'}
            </>
          )}
        </button>

        {status && (
          <div className={`mt-3 p-2 rounded text-xs flex items-center gap-2 ${
            status.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            {status.type === 'success' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
            {status.msg}
          </div>
        )}
      </div>
    </div>
  );
};