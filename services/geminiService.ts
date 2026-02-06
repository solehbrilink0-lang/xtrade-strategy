import { GoogleGenAI } from "@google/genai";
import { StrategyState } from "../types";

const initGemini = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("Gemini API Key missing");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeStrategyPerformance = async (
  btcStrategy: StrategyState,
  xauStrategy: StrategyState
): Promise<string> => {
  const ai = initGemini();
  if (!ai) return "API Key not configured. Please check your environment variables.";

  const btcStats = {
    equity: btcStrategy.currentEquity,
    pnl: btcStrategy.currentEquity - btcStrategy.initialBalance,
    trades: btcStrategy.trades.length,
    dd: btcStrategy.maxDrawdown.toFixed(2),
    winRate: (btcStrategy.trades.filter(t => t.pnl > 0).length / btcStrategy.trades.length || 0) * 100
  };

  const xauStats = {
    equity: xauStrategy.currentEquity,
    pnl: xauStrategy.currentEquity - xauStrategy.initialBalance,
    trades: xauStrategy.trades.length,
    dd: xauStrategy.maxDrawdown.toFixed(2),
    winRate: (xauStrategy.trades.filter(t => t.pnl > 0).length / xauStrategy.trades.length || 0) * 100
  };

  const prompt = `
    Analyze the following trading performance for two automated strategies.
    
    Strategy BTC (BTCUSD):
    - Current Equity: $${btcStats.equity} (Start: $${btcStrategy.initialBalance})
    - Net PnL: $${btcStats.pnl}
    - Total Trades: ${btcStats.trades}
    - Max Drawdown: ${btcStats.dd}%
    - Win Rate: ${btcStats.winRate}%

    Strategy XAU (XAUUSD):
    - Current Equity: $${xauStats.equity} (Start: $${xauStrategy.initialBalance})
    - Net PnL: $${xauStats.pnl}
    - Total Trades: ${xauStats.trades}
    - Max Drawdown: ${xauStats.dd}%
    - Win Rate: ${xauStats.winRate}%

    Provide a concise, professional executive summary of the performance. 
    Highlight the risk/reward profile based on the drawdown vs returns. 
    Give 1 specific suggestion for improvement if applicable.
    Keep it under 150 words.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Analysis complete but no text returned.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Failed to generate analysis. Please try again later.";
  }
};
