import { StrategyState } from "../types";

// Fitur AI dimatikan untuk menghilangkan ketergantungan API Key
export const analyzeStrategyPerformance = async (
  btcStrategy: StrategyState,
  xauStrategy: StrategyState
): Promise<string> => {
  return "AI Analysis feature is currently disabled.";
};