import React, { useState, useEffect, useCallback } from 'react';
import { 
  GlobalState, 
  Trade, 
  PairSymbol,
  StrategyState
} from './types';
import { initStrategy } from './services/tradingEngine';
import { StrategyDashboard } from './components/StrategyDashboard';
import { subscribeToPush } from './services/pushService';
import { supabase } from './services/supabaseClient';
import { 
  LayoutDashboard, 
  Bitcoin, 
  Coins, 
  Bell, 
  Menu,
  X,
  Activity,
  Smartphone,
  Radio
} from 'lucide-react';

// --- CUSTOM COMPONENTS ---

const ExstradeLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 115" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Left Side (White) - Abstract E shape */}
    <path d="M50 0L5 25V75L50 100V65L28 53V47L50 35V0Z" fill="white" />
    {/* Right Side (Yellow) - Abstract S shape */}
    <path d="M50 0L95 25V75L50 100V65L72 53V47L50 35V0Z" fill="#fbbf24" />
  </svg>
);

const App: React.FC = () => {
  // --- STATE ---
  const [globalState, setGlobalState] = useState<GlobalState>({
    strategies: {
      BTCUSD: initStrategy('BTCUSD', 'Strategy_BTC', 2400),
      XAUUSD: initStrategy('XAUUSD', 'Strategy_XAU', 2900),
    }
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'BTCUSD' | 'XAUUSD'>('dashboard');
  const [notifications, setNotifications] = useState<{id: number, msg: string, type: 'info' | 'success' | 'alert'}[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [dbConnected, setDbConnected] = useState<boolean>(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  // --- LOGIC ---

  const addNotification = useCallback((msg: string, type: 'info' | 'success' | 'alert' = 'info') => {
    const id = Date.now();
    setNotifications(prev => [{id, msg, type}, ...prev].slice(0, 5));
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  const handlePushSubscribe = async () => {
    setIsSubscribing(true);
    const result = await subscribeToPush();
    setIsSubscribing(false);
    
    if (result.success) {
      addNotification("Notifications Enabled! You will receive alerts even when offline.", 'success');
    } else {
      addNotification(`Failed to subscribe: ${result.error}`, 'alert');
    }
  };

  // Function to fetch data, hoisted so it can be used by realtime subscription
  const fetchData = useCallback(async () => {
    if (!supabase) return;
    
    const { data: strategiesData } = await supabase.from('strategies').select('*');
    const { data: tradesData } = await supabase.from('trades').select('*').order('entry_time', { ascending: true });

    setGlobalState(prev => {
      const newState = { ...prev };
      
      // Clear trades arrays to avoid duplicates during re-sync
      newState.strategies.BTCUSD.trades = [];
      newState.strategies.XAUUSD.trades = [];

      if (strategiesData) {
        strategiesData.forEach((s: any) => {
          if (newState.strategies[s.symbol as PairSymbol]) {
            newState.strategies[s.symbol as PairSymbol].currentEquity = s.current_equity;
            newState.strategies[s.symbol as PairSymbol].peakEquity = s.peak_equity;
            newState.strategies[s.symbol as PairSymbol].maxDrawdown = s.max_drawdown;
          }
        });
      }
      if (tradesData) {
        tradesData.forEach((t: any) => {
          const tradeObj: Trade = {
            id: t.id,
            symbol: t.symbol,
            strategyName: t.strategy_name,
            side: t.side,
            entryPrice: t.entry_price,
            stopLoss: 0,
            takeProfit: 0,
            entryTime: t.entry_time,
            exitTime: t.exit_time,
            exitPrice: t.exit_price,
            positionSize: t.position_size,
            riskAmount: 0, 
            status: t.status,
            pnl: t.pnl || 0,
            alertMessage: t.alert_message 
          };
          if (newState.strategies[t.symbol as PairSymbol]) {
              newState.strategies[t.symbol as PairSymbol].trades.push(tradeObj);
          }
        });
      }
      return newState;
    });
  }, []);

  // 1. Initial Load
  useEffect(() => {
    if (!supabase) {
      console.warn("Supabase client not initialized.");
      return;
    }
    setDbConnected(true);
    fetchData();
  }, [fetchData]);

  // 2. Real-time Subscriptions
  useEffect(() => {
    if (!supabase) return;

    // Listen to changes in TRADES (Entries/Exits)
    const tradesChannel = supabase.channel('trades-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trades' },
        (payload) => {
          const newTrade = payload.new as any;
          const eventType = payload.eventType;
          
          if (eventType === 'INSERT') {
            addNotification(`New Signal: ${newTrade.symbol} ${newTrade.side}`, 'success');
          } else if (eventType === 'UPDATE' && newTrade.status === 'CLOSED') {
             const pnl = newTrade.pnl || 0;
             addNotification(`Trade Closed: ${newTrade.symbol} PnL: $${pnl.toFixed(2)}`, pnl > 0 ? 'success' : 'alert');
          }
          fetchData();
        }
      )
      .subscribe();

    // Listen to changes in STRATEGIES (Equity updates)
    const strategiesChannel = supabase.channel('strategies-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'strategies' },
        () => {
          // Silent update for equity changes
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tradesChannel);
      supabase.removeChannel(strategiesChannel);
    };
  }, [addNotification, fetchData]);

  // 3. PWA Install Logic
  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    });
  }, []);

  const handleInstallClick = () => {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') setInstallPrompt(null);
      });
    }
  };

  const SidebarItem = ({ id, label, icon: Icon, color }: any) => (
    <button
      onClick={() => { setActiveTab(id); setIsMobileMenuOpen(false); }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
        activeTab === id 
        ? 'bg-slate-800 text-white shadow-lg border-l-4 border-blue-500' 
        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
      }`}
    >
      <Icon size={20} className={activeTab === id ? color : ''} />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex overflow-hidden">
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 lg:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 lg:relative lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-slate-800 flex flex-col items-center gap-4 text-center">
          {/* LOGO SECTION REPLACEMENT */}
          <div className="flex flex-col items-center gap-3">
            <ExstradeLogo className="w-16 h-16 drop-shadow-2xl" />
            <div className="flex flex-col">
              <h1 className="font-serif font-bold text-xl tracking-wide text-white leading-none">EXSTRADE</h1>
              <span className="text-[10px] font-sans tracking-[0.2em] text-slate-400 uppercase mt-1">Strategy</span>
            </div>
          </div>
          
          <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden absolute top-4 right-4 text-slate-400"><X size={24} /></button>
        </div>

        <nav className="p-4 space-y-2 mt-2">
          {/* Notification Button Moved to Top */}
          <button 
             onClick={handlePushSubscribe}
             disabled={isSubscribing}
             className={`w-full mb-6 text-xs font-bold py-3 rounded flex items-center justify-center gap-2 border transition-all ${
               isSubscribing 
               ? 'bg-slate-800 text-slate-500 border-slate-700' 
               : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-blue-500/50 shadow-lg shadow-blue-900/20'
             }`}
           >
             <Radio size={16} className={isSubscribing ? 'animate-pulse' : ''} /> 
             {isSubscribing ? 'Activating...' : 'ENABLE ALERTS'}
           </button>

          <SidebarItem id="dashboard" label="Overview" icon={LayoutDashboard} color="text-blue-500" />
          <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Strategies</div>
          <SidebarItem id="BTCUSD" label="Bitcoin (BTC)" icon={Bitcoin} color="text-orange-500" />
          <SidebarItem id="XAUUSD" label="Gold (XAU)" icon={Coins} color="text-yellow-500" />
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800 space-y-3">
           {installPrompt && (
             <button onClick={handleInstallClick} className="w-full bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold py-3 rounded flex items-center justify-center gap-2 animate-pulse border border-slate-700">
               <Smartphone size={16} /> Install App
             </button>
           )}
           <div className="mt-3 text-center">
             <p className="text-[10px] text-slate-600">
               Connection: {dbConnected ? <span className="text-emerald-500">Live Sync</span> : <span className="text-slate-500">Local View</span>}
             </p>
           </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur flex items-center justify-between px-6 z-10">
          <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden text-slate-400 p-2"><Menu size={24} /></button>
          <div className="flex-1 flex items-center gap-2">
            {dbConnected && (
              <div className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-emerald-400 font-mono">SYSTEM ACTIVE</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Bell size={20} className="text-slate-400 hover:text-white cursor-pointer transition-colors" />
              {notifications.length > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>}
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 border border-slate-700"></div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' ? (
              <div className="space-y-8 animate-fade-in">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Portfolio Overview</h2>
                  <p className="text-slate-400">Monitoring EXSTRADE STRATEGY performance and risk exposure.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="bg-gradient-to-br from-blue-900/40 to-slate-900 border border-blue-500/20 p-6 rounded-2xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Activity size={100} />
                      </div>
                      <p className="text-blue-400 text-sm font-medium mb-1">Total Equity</p>
                      <h3 className="text-3xl font-bold text-white tracking-tight">
                        ${(globalState.strategies.BTCUSD.currentEquity + globalState.strategies.XAUUSD.currentEquity).toLocaleString()}
                      </h3>
                      <div className="mt-4 flex items-center gap-2">
                         <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded">Combined PnL</span>
                      </div>
                   </div>

                   <div 
                      onClick={() => setActiveTab('BTCUSD')}
                      className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center justify-between cursor-pointer hover:border-orange-500/50 transition-colors group"
                   >
                      <div>
                        <p className="text-slate-400 text-sm font-medium">BTC Strategy</p>
                        <h3 className="text-xl font-bold text-orange-500">${globalState.strategies.BTCUSD.currentEquity.toLocaleString()}</h3>
                        <p className="text-xs text-slate-500 mt-1 group-hover:text-orange-400 transition-colors">Click to view details &rarr;</p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                         <Bitcoin className="text-orange-500" size={24} />
                      </div>
                   </div>

                   <div 
                      onClick={() => setActiveTab('XAUUSD')}
                      className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center justify-between cursor-pointer hover:border-yellow-500/50 transition-colors group"
                   >
                      <div>
                        <p className="text-slate-400 text-sm font-medium">Gold Strategy</p>
                        <h3 className="text-xl font-bold text-yellow-500">${globalState.strategies.XAUUSD.currentEquity.toLocaleString()}</h3>
                        <p className="text-xs text-slate-500 mt-1 group-hover:text-yellow-400 transition-colors">Click to view details &rarr;</p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center group-hover:bg-yellow-500/20 transition-colors">
                         <Coins className="text-yellow-500" size={24} />
                      </div>
                   </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Activity className="text-blue-500" size={24} />
                    <h3 className="text-lg font-semibold text-white">System Status</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
                      <h4 className="text-blue-400 font-medium mb-2">Sync Status</h4>
                      {dbConnected ? (
                         <p className="text-emerald-400 text-sm font-bold flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Online</p>
                      ) : <p className="text-slate-500 text-sm font-mono">Local / Demo</p>}
                    </div>
                    <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
                      <h4 className="text-purple-400 font-medium mb-2">Mobile Notification</h4>
                      <p className="text-slate-300 text-sm">{Notification.permission === 'granted' ? <span className="text-emerald-400 font-bold">Active</span> : <span className="text-slate-500">Disabled</span>}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
                      <h4 className="text-orange-400 font-medium mb-2">Risk Engine</h4>
                      <p className="text-emerald-400 text-sm font-bold">Running</p>
                      <p className="text-slate-500 text-xs mt-1">Max Risk 1.00%</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTab === 'BTCUSD' ? (
              <StrategyDashboard strategy={globalState.strategies.BTCUSD} colorTheme="orange" />
            ) : (
              <StrategyDashboard strategy={globalState.strategies.XAUUSD} colorTheme="yellow" />
            )}
          </div>
        </div>

        <div className="absolute top-20 right-6 z-50 flex flex-col gap-2 pointer-events-none">
          {notifications.map(n => (
            <div key={n.id} className={`pointer-events-auto min-w-[300px] p-4 rounded-lg shadow-2xl border-l-4 transform transition-all animate-slide-in flex items-start gap-3 bg-slate-900/90 backdrop-blur text-white ${n.type === 'alert' ? 'border-red-500' : n.type === 'success' ? 'border-emerald-500' : 'border-blue-500'}`}>
              <div className={`mt-1 w-2 h-2 rounded-full ${n.type === 'alert' ? 'bg-red-500' : n.type === 'success' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
              <p className="text-sm font-medium">{n.msg}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default App;