import React, { useState } from 'react';
import { StrategyState } from '../types';
import { 
  AreaChart, Area, 
  ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, Cell
} from 'recharts';
import { TrendingUp, TrendingDown, Activity, AlertTriangle, DollarSign, LineChart, Sparkles, Loader2, MessageSquare } from 'lucide-react';
import { StatsCard } from './StatsCard';
import { analyzeStrategyPerformance } from '../services/geminiService';

interface StrategyDashboardProps {
  strategy: StrategyState;
  colorTheme: 'orange' | 'yellow'; // BTC vs Gold
}

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    // Check if it's equity data or trade data
    if (data.balance !== undefined) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded shadow-xl text-xs">
          <p className="text-slate-400 mb-1">{new Date(label).toLocaleString()}</p>
          <p className="text-white font-bold">Equity: {formatCurrency(data.balance)}</p>
        </div>
      );
    }
    // Trade Data
    return (
      <div className="bg-slate-900 border border-slate-700 p-3 rounded shadow-xl text-xs">
        <p className="text-slate-400 mb-1">{new Date(data.x).toLocaleString()}</p>
        <p className={`font-bold uppercase ${data.side === 'buy' ? 'text-emerald-400' : 'text-red-400'}`}>
          {data.side} {data.type}
        </p>
        <p className="text-white font-mono mt-1">Price: {data.y}</p>
        {data.pnl && (
          <p className={`mt-1 font-bold ${data.pnl > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            PnL: {formatCurrency(data.pnl)}
          </p>
        )}
      </div>
    );
  }
  return null;
};

export const StrategyDashboard: React.FC<StrategyDashboardProps> = ({ strategy, colorTheme }) => {
  const [chartMode, setChartMode] = useState<'equity' | 'price'>('equity');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);

  const winCount = strategy.trades.filter(t => t.pnl > 0).length;
  const totalClosed = strategy.trades.filter(t => t.status === 'CLOSED').length;
  const winRate = totalClosed > 0 ? ((winCount / totalClosed) * 100).toFixed(1) : '0.0';
  const pnl = strategy.currentEquity - strategy.initialBalance;
  
  const chartColor = colorTheme === 'orange' ? '#f97316' : '#eab308'; // Tailwind Orange-500 or Yellow-500

  // Prepare Data for Price Chart
  const entryPoints = strategy.trades.map(t => ({
    x: new Date(t.entryTime).getTime(),
    y: t.entryPrice,
    type: 'Entry',
    side: t.side,
    id: t.id
  }));

  const exitPoints = strategy.trades
    .filter(t => t.status === 'CLOSED' && t.exitTime && t.exitPrice)
    .map(t => ({
      x: new Date(t.exitTime!).getTime(),
      y: t.exitPrice!,
      type: 'Exit',
      side: t.side,
      id: t.id,
      pnl: t.pnl
    }));

  const allPoints = [...entryPoints, ...exitPoints].sort((a, b) => a.x - b.x);
  
  // Calculate Y-Axis Domain for Price Chart to prevent flat lines
  const prices = allPoints.map(p => p.y);
  const minPrice = prices.length ? Math.min(...prices) * 0.99 : 'auto';
  const maxPrice = prices.length ? Math.max(...prices) * 1.01 : 'auto';

  const handleAiAnalysis = async () => {
    setIsAnalyzing(true);
    // Note: In a real app we might want to pass both strategies, but here we analyze the current one
    // We mock the "other" strategy as the current one for simplicity in this component scope, 
    // or you could refactor to pass both. For now, let's analyze the current strategy deeply.
    try {
      const result = await analyzeStrategyPerformance(strategy, strategy); 
      setAiAnalysis(result);
    } catch (e) {
      setAiAnalysis("Could not generate analysis. Please check API Key.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          title="Current Equity" 
          value={formatCurrency(strategy.currentEquity)} 
          subValue={`Start: ${formatCurrency(strategy.initialBalance)}`}
          icon={DollarSign}
          color={colorTheme}
        />
        <StatsCard 
          title="Total PnL" 
          value={formatCurrency(pnl)}
          subValue={pnl >= 0 ? "+ Profit" : "- Loss"}
          icon={pnl >= 0 ? TrendingUp : TrendingDown}
          color={pnl >= 0 ? 'green' : 'red'}
        />
        <StatsCard 
          title="Max Drawdown" 
          value={`${strategy.maxDrawdown.toFixed(2)}%`}
          subValue="Peak to Trough"
          icon={AlertTriangle}
          color="red"
        />
        <StatsCard 
          title="Win Rate" 
          value={`${winRate}%`}
          subValue={`${totalClosed} Trades Closed`}
          icon={Activity}
          color="blue"
        />
      </div>

      {/* AI Analysis Section */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-900 border border-slate-800 rounded-xl p-1 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full pointer-events-none"></div>
        <div className="bg-slate-950/50 p-5 rounded-lg">
          <div className="flex justify-between items-start mb-4">
             <h3 className="text-lg font-semibold text-white flex items-center gap-2">
               <Sparkles size={18} className="text-purple-400" /> AI Performance Insight
             </h3>
             {!aiAnalysis && (
               <button 
                 onClick={handleAiAnalysis}
                 disabled={isAnalyzing}
                 className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-full flex items-center gap-2 transition-all disabled:opacity-50"
               >
                 {isAnalyzing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                 {isAnalyzing ? 'Analyzing...' : 'Generate Analysis'}
               </button>
             )}
          </div>
          
          {aiAnalysis ? (
            <div className="prose prose-invert prose-sm max-w-none">
              <p className="text-slate-300 leading-relaxed text-sm animate-fade-in">
                {aiAnalysis}
              </p>
              <button onClick={() => setAiAnalysis(null)} className="text-[10px] text-slate-500 hover:text-slate-300 mt-2 underline">
                Refresh Analysis
              </button>
            </div>
          ) : (
             <p className="text-slate-500 text-sm italic">
               Click generate to get Gemini AI's review of your {strategy.symbol} strategy performance, risk profile, and optimization suggestions.
             </p>
          )}
        </div>
      </div>

      {/* Main Chart Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl relative">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            {chartMode === 'equity' ? <Activity className="text-slate-400" size={18} /> : <LineChart className="text-slate-400" size={18} />}
            {chartMode === 'equity' ? 'Equity Curve' : 'Trade Execution Map'}
          </h3>
          
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button 
              onClick={() => setChartMode('equity')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${chartMode === 'equity' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Equity
            </button>
            <button 
              onClick={() => setChartMode('price')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${chartMode === 'price' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Price Action
            </button>
          </div>
        </div>

        {/* 
            FIX: Use explicit style for height to avoid "height(-1)" error in Recharts.
            Added minWidth: 0 to handle flex container shrinking issues.
        */}
        <div style={{ width: '100%', height: 300, minWidth: 0 }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            {chartMode === 'equity' ? (
              <AreaChart data={strategy.equityCurve}>
                <defs>
                  <linearGradient id={`color${strategy.symbol}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColor} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(ts) => new Date(ts).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  stroke="#64748b"
                  tick={{fill: '#64748b', fontSize: 12}}
                />
                <YAxis 
                  domain={['auto', 'auto']}
                  stroke="#64748b"
                  tick={{fill: '#64748b', fontSize: 12}}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="balance" 
                  stroke={chartColor} 
                  fillOpacity={1} 
                  fill={`url(#color${strategy.symbol})`} 
                />
              </AreaChart>
            ) : (
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis 
                  dataKey="x" 
                  type="number" 
                  domain={['auto', 'auto']}
                  name="Time"
                  tickFormatter={(unix) => new Date(unix).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  stroke="#64748b"
                  tick={{fill: '#64748b', fontSize: 12}}
                />
                <YAxis 
                  dataKey="y" 
                  type="number" 
                  domain={[minPrice, maxPrice]}
                  name="Price" 
                  unit="$"
                  stroke="#64748b"
                  tick={{fill: '#64748b', fontSize: 12}}
                />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={36}/>
                
                {/* Entry Points */}
                <Scatter name="Entry" data={entryPoints} shape="circle">
                  {entryPoints.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.side === 'buy' ? '#10b981' : '#ef4444'} />
                  ))}
                </Scatter>

                {/* Exit Points */}
                <Scatter name="Exit" data={exitPoints} shape="cross">
                   {exitPoints.map((exit, index) => (
                    <Cell key={`cell-${index}`} fill="#94a3b8" />
                  ))}
                </Scatter>
              </ScatterChart>
            )}
          </ResponsiveContainer>
        </div>
        {chartMode === 'price' && strategy.trades.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none top-[60px]">
            <p className="text-slate-600 bg-slate-900/80 px-4 py-2 rounded">No price data available yet.</p>
          </div>
        )}
      </div>

      {/* Trade History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden relative">
        <div className="px-6 py-4 border-b border-slate-800">
          <h3 className="text-lg font-semibold text-slate-100">Trade History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-400">
            <thead className="text-xs uppercase bg-slate-950 text-slate-400">
              <tr>
                <th className="px-6 py-3">Time</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Entry</th>
                <th className="px-6 py-3 text-right">Exit</th>
                <th className="px-6 py-3 text-right">Size</th>
                <th className="px-6 py-3 text-right">PnL</th>
              </tr>
            </thead>
            <tbody>
              {strategy.trades.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-600">
                    No trades recorded yet. Waiting for webhook signals...
                  </td>
                </tr>
              ) : (
                [...strategy.trades].reverse().map((trade) => (
                  <tr key={trade.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-mono">{new Date(trade.entryTime).toLocaleTimeString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${trade.side === 'buy' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                          {trade.side.toUpperCase()}
                        </span>
                        {/* Display Message Icon if available */}
                        {trade.alertMessage && (
                          <button 
                            onClick={() => setSelectedMessage(selectedMessage === trade.id ? null : trade.id)}
                            className="text-slate-500 hover:text-white transition-colors relative"
                            title="View Signal Message"
                          >
                            <MessageSquare size={14} />
                            {/* Simple inline popup for the message */}
                            {selectedMessage === trade.id && (
                                <div className="absolute top-6 left-0 w-64 p-3 bg-slate-950 border border-slate-700 rounded shadow-xl z-20 text-xs text-slate-300 whitespace-pre-wrap font-mono text-left">
                                  {trade.alertMessage}
                                  <div className="mt-2 text-[10px] text-slate-600 border-t border-slate-800 pt-1">
                                    Source: TradingView Alert
                                  </div>
                                </div>
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs ${trade.status === 'OPEN' ? 'bg-blue-500/20 text-blue-400 animate-pulse' : 'bg-slate-700 text-slate-300'}`}>
                        {trade.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-slate-200">{trade.entryPrice.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right font-mono text-slate-200">
                      {trade.exitPrice ? trade.exitPrice.toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-right font-mono">{trade.positionSize.toFixed(4)}</td>
                    <td className={`px-6 py-4 text-right font-bold ${trade.pnl > 0 ? 'text-emerald-400' : trade.pnl < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                      {trade.status === 'CLOSED' ? formatCurrency(trade.pnl) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {selectedMessage && (
          <div className="fixed inset-0 z-10" onClick={() => setSelectedMessage(null)}></div>
        )}
      </div>
    </div>
  );
};