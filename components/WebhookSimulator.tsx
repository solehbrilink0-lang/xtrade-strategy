import React, { useState, useEffect } from 'react';
import { WebhookPayload } from '../types';
import { supabase } from '../services/supabaseClient';
import { Send, AlertCircle, Terminal, CheckCircle2, XCircle, MessageSquare, Copy, ExternalLink, Monitor, Command, AlertTriangle, Database } from 'lucide-react';

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
  const [showIntegrationInfo, setShowIntegrationInfo] = useState(false);
  const [curlPlatform, setCurlPlatform] = useState<'windows' | 'unix'>('windows');
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [schemaError, setSchemaError] = useState(false);

  // Constants derived from project config
  const PROJECT_ID = "xcoaqykpbmaiaawheefj"; 
  const WEBHOOK_URL = `https://${PROJECT_ID}.supabase.co/functions/v1/tradingview-hook`;

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
    setLoading(true);
    setStatus(null);
    setSchemaError(false);

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
      // USE FETCH TO EDGE FUNCTION INSTEAD OF RPC
      // This ensures we test the actual webhook logic and benefit from the schema fallback
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}` // Optional if function is public
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      setStatus({ 
        msg: event === 'entry' 
          ? `Signal Sent! Msg: ${useCustomMessage ? 'Custom' : 'Default'}` 
          : `Trade Closed! PnL: $${data.pnl?.toFixed(2) || '0'}`, 
        type: 'success' 
      });

    } catch (err: any) {
      console.error(err);
      const errString = err.message || JSON.stringify(err);
      
      // Detect specifically if the alert_message column is missing
      if (errString.includes('alert_message') && (errString.includes('column') || errString.includes('does not exist'))) {
        setSchemaError(true);
        setStatus({ msg: "Database Schema Mismatch!", type: 'error' });
      } else {
        setStatus({ msg: err.message || "Failed to send webhook", type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setStatus({ msg: "Copied to clipboard!", type: 'success' });
    setTimeout(() => setStatus(null), 2000);
  };

  const generateCurl = () => {
    const payload: any = {
      symbol: selectedPair,
      event: event
    };

    if (event === 'entry') {
      payload.side = side;
      payload.entry_price = entryPrice;
      payload.stop_loss = stopLoss;
      payload.take_profit = takeProfit;
      if (useCustomMessage) payload.alert_message = customMessage.replace(/\n/g, '\\n');
    } else {
      payload.exit_price = exitPrice;
      if (useCustomMessage) payload.alert_message = customMessage.replace(/\n/g, '\\n');
    }

    const jsonString = JSON.stringify(payload);

    if (curlPlatform === 'windows') {
      // Escape quotes for Windows CMD: " -> \"
      const escapedJson = jsonString.replace(/"/g, '\\"');
      return `curl -X POST ${WEBHOOK_URL} -H "Content-Type: application/json" -d "${escapedJson}"`;
    } else {
      return `curl -X POST "${WEBHOOK_URL}" \\
  -H "Content-Type: application/json" \\
  -d '${jsonString}'`;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-5 w-full max-w-md mx-auto shadow-2xl overflow-y-auto max-h-[90vh]">
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 text-slate-200">
          <Terminal size={18} className="text-blue-400" />
          <h3 className="font-semibold">Live Webhook Test</h3>
        </div>
        <button 
          onClick={() => setShowIntegrationInfo(!showIntegrationInfo)}
          className={`text-[10px] uppercase px-2 py-1 rounded border flex items-center gap-1 transition-colors ${
            showIntegrationInfo 
            ? 'bg-blue-600 text-white border-blue-500' 
            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600'
          }`}
        >
          {showIntegrationInfo ? 'Hide Info' : 'Show Integration Info'} <ExternalLink size={10} />
        </button>
      </div>

      {/* SCHEMA ERROR ALERT - ONLY SHOWS WHEN ERROR DETECTED */}
      {schemaError && (
        <div className="bg-red-900/40 p-4 rounded border border-red-500 mb-4 animate-bounce-in">
          <div className="flex items-center gap-2 mb-2">
            <Database className="text-red-400" size={18} />
            <p className="font-bold text-red-200 text-sm">Database Update Required</p>
          </div>
          <p className="text-xs text-red-200 mb-2 leading-relaxed">
            The database is missing the <code>alert_message</code> column. Run this command in your Supabase SQL Editor to fix it:
          </p>
          <div className="relative group">
            <code className="block bg-black/60 p-3 rounded text-[10px] font-mono select-all text-yellow-400 border border-red-500/30">
              ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS alert_message TEXT;
            </code>
            <button 
              onClick={() => copyToClipboard('ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS alert_message TEXT;')}
              className="absolute top-2 right-2 p-1 bg-white/10 hover:bg-white/20 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Copy size={12}/>
            </button>
          </div>
        </div>
      )}

      {showIntegrationInfo ? (
        <div className="mb-6 animate-fade-in space-y-4 bg-slate-950 p-4 rounded border border-blue-900/50">
           
           {/* Webhook URL */}
           <div>
             <label className="text-xs font-bold text-blue-400 mb-1 block">Your Webhook URL</label>
             <div className="flex gap-2">
               <code className="flex-1 bg-black/50 p-2 rounded text-[10px] text-slate-300 font-mono break-all border border-slate-800">
                 {WEBHOOK_URL}
               </code>
               <button onClick={() => copyToClipboard(WEBHOOK_URL)} className="bg-slate-800 p-2 rounded hover:bg-slate-700 text-slate-400">
                 <Copy size={14} />
               </button>
             </div>
           </div>

           {/* cURL Generator */}
           <div>
             <div className="flex items-center justify-between mb-1">
               <label className="text-xs font-bold text-blue-400 block">Generated cURL Command</label>
               <div className="flex bg-slate-900 rounded border border-slate-800 p-0.5">
                 <button 
                   onClick={() => setCurlPlatform('windows')}
                   className={`px-2 py-0.5 text-[10px] rounded flex items-center gap-1 ${curlPlatform === 'windows' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}
                 >
                   <Monitor size={10} /> Windows
                 </button>
                 <button 
                   onClick={() => setCurlPlatform('unix')}
                   className={`px-2 py-0.5 text-[10px] rounded flex items-center gap-1 ${curlPlatform === 'unix' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}
                 >
                   <Command size={10} /> Mac/Linux
                 </button>
               </div>
             </div>
             <div className="relative">
               <pre className="bg-black/50 p-2 rounded text-[10px] text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap break-all border border-slate-800 max-h-32">
                 {generateCurl()}
               </pre>
               <button onClick={() => copyToClipboard(generateCurl())} className="absolute top-2 right-2 bg-slate-800/80 p-1.5 rounded hover:bg-slate-700 text-slate-400 backdrop-blur">
                 <Copy size={12} />
               </button>
             </div>
             
             {/* Troubleshooting Box */}
             <div className="bg-red-500/10 border border-red-500/20 p-2 rounded mt-2">
                <p className="text-red-400 text-[10px] font-bold flex items-center gap-1"><AlertTriangle size={10}/> Deployment Issue</p>
                <p className="text-slate-400 text-[10px] mt-1 leading-relaxed">
                  If cURL returns <code>{`{"message":"Hello undefined!"}`}</code>, your function is not deployed yet.
                  Run this command:
                  <div className="bg-black/40 p-1.5 rounded font-mono text-white mt-1 select-all">
                     npx supabase functions deploy tradingview-hook --no-verify-jwt
                  </div>
                </p>
             </div>
           </div>

           {/* TradingView Template */}
           <div>
             <label className="text-xs font-bold text-blue-400 mb-1 block">TradingView JSON Template</label>
             <div className="relative">
               <pre className="bg-black/50 p-2 rounded text-[10px] text-green-400 font-mono overflow-x-auto border border-slate-800">
{`{
  "symbol": "{{ticker}}",
  "event": "entry",
  "side": "{{strategy.order.action}}",
  "entry_price": {{strategy.order.price}},
  "stop_loss": 65000, 
  "take_profit": 68000,
  "alert_message": "{{strategy.order.alert_message}}"
}`}
               </pre>
               <button onClick={() => copyToClipboard(`{
  "symbol": "{{ticker}}",
  "event": "entry",
  "side": "{{strategy.order.action}}",
  "entry_price": {{strategy.order.price}},
  "stop_loss": 65000,
  "take_profit": 68000,
  "alert_message": "{{strategy.order.alert_message}}"
}`)} className="absolute top-2 right-2 bg-slate-800/50 p-1.5 rounded hover:bg-slate-700 text-slate-400">
                 <Copy size={12} />
               </button>
             </div>
           </div>
           
           <button 
             onClick={() => setShowIntegrationInfo(false)}
             className="w-full py-1 text-xs text-slate-500 hover:text-white border-t border-slate-800 mt-2"
           >
             Close Info
           </button>
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
};