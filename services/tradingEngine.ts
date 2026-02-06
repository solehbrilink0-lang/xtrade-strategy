import { Trade, StrategyState, WebhookPayload, PairSymbol } from '../types';

// Constants
export const RISK_PERCENTAGE = 0.01; // 1%

/**
 * Calculates the position size based on risk management rules.
 * Risk = 1% of Current Equity.
 * Size = Risk Amount / |Entry - SL|
 */
export const calculatePositionSize = (
  equity: number,
  entryPrice: number,
  stopLoss: number
): { size: number; riskAmount: number } => {
  const riskAmount = equity * RISK_PERCENTAGE;
  const priceDistance = Math.abs(entryPrice - stopLoss);
  
  // Prevent division by zero
  if (priceDistance === 0) return { size: 0, riskAmount: 0 };

  const size = riskAmount / priceDistance;
  return { size, riskAmount };
};

/**
 * Calculates PnL for a closed trade.
 */
export const calculatePnL = (
  side: 'buy' | 'sell',
  entryPrice: number,
  exitPrice: number,
  positionSize: number
): number => {
  if (side === 'buy') {
    return (exitPrice - entryPrice) * positionSize;
  } else {
    return (entryPrice - exitPrice) * positionSize;
  }
};

/**
 * Updates drawdown statistics.
 */
export const updateDrawdown = (
  currentEquity: number,
  peakEquity: number,
  currentMaxDrawdown: number
): { peak: number; dd: number } => {
  const newPeak = Math.max(peakEquity, currentEquity);
  const drawdown = ((newPeak - currentEquity) / newPeak) * 100;
  const maxDrawdown = Math.max(currentMaxDrawdown, drawdown);
  
  return { peak: newPeak, dd: maxDrawdown };
};

/**
 * Initialize Strategy State
 */
export const initStrategy = (symbol: PairSymbol, name: string, startBalance: number): StrategyState => ({
  symbol,
  strategyName: name,
  initialBalance: startBalance,
  currentEquity: startBalance,
  peakEquity: startBalance,
  maxDrawdown: 0,
  trades: [],
  equityCurve: [{ timestamp: new Date().toISOString(), balance: startBalance }],
});
