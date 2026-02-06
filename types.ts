export type TradeSide = 'buy' | 'sell';
export type TradeStatus = 'OPEN' | 'CLOSED';
export type PairSymbol = 'BTCUSD' | 'XAUUSD';

export interface WebhookPayload {
  symbol: string;
  strategy_name: string;
  side: TradeSide;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  timestamp: string; // ISO String
  trade_id: string;
  event: 'entry' | 'exit'; // Strict event type as requested
  exit_price?: number; // Optional, usually strictly for exit event logic
  alert_message?: string; // Custom message from TradingView
}

export interface Trade {
  id: string;
  symbol: PairSymbol;
  strategyName: string;
  side: TradeSide;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  entryTime: string;
  exitTime?: string;
  exitPrice?: number;
  positionSize: number; // Calculated Lots/Units
  riskAmount: number;
  status: TradeStatus;
  pnl: number;
  alertMessage?: string;
}

export interface EquityPoint {
  timestamp: string;
  balance: number;
}

export interface StrategyState {
  symbol: PairSymbol;
  strategyName: string;
  initialBalance: number;
  currentEquity: number;
  peakEquity: number;
  maxDrawdown: number; // Percentage
  trades: Trade[];
  equityCurve: EquityPoint[];
}

export interface GlobalState {
  strategies: {
    BTCUSD: StrategyState;
    XAUUSD: StrategyState;
  };
}