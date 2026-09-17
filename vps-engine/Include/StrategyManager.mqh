//+------------------------------------------------------------------+
//|                                             StrategyManager.mqh  |
//+------------------------------------------------------------------+
#property copyright "MK PRO"
#property strict

class StrategyManager
{
private:
   double stopLossPips;
   double takeProfitPips;

public:
   StrategyManager()
   {
      stopLossPips = 30;
      takeProfitPips = 60;
   }
   
   ~StrategyManager() {}
   
   //+------------------------------------------------------------------+
   //| Analyze market and return signal                                |
   //| Returns: 1 = BUY, -1 = SELL, 0 = NO SIGNAL                      |
   //+------------------------------------------------------------------+
   int AnalyzeMarket(string symbol, ENUM_TIMEFRAMES timeframe, string strategy)
   {
      if(strategy == "PRICE_ACTION")
         return PriceActionStrategy(symbol, timeframe);
      else if(strategy == "CANDLE_MOMENTUM")
         return CandleMomentumStrategy(symbol, timeframe);
      else if(strategy == "TREND_FOLLOWING")
         return TrendFollowingStrategy(symbol, timeframe);
      else if(strategy == "MARKET_STRUCTURE")
         return MarketStructureStrategy(symbol, timeframe);
      else if(strategy == "ICT")
         return ICTStrategy(symbol, timeframe);
      else
         return HybridStrategy(symbol, timeframe);
   }
   
   //+------------------------------------------------------------------+
   //| Price Action Strategy                                           |
   //+------------------------------------------------------------------+
   int PriceActionStrategy(string symbol, ENUM_TIMEFRAMES timeframe)
   {
      double close1 = iClose(symbol, timeframe, 1);
      double close2 = iClose(symbol, timeframe, 2);
      double close3 = iClose(symbol, timeframe, 3);
      
      double high1 = iHigh(symbol, timeframe, 1);
      double high2 = iHigh(symbol, timeframe, 2);
      
      double low1 = iLow(symbol, timeframe, 1);
      double low2 = iLow(symbol, timeframe, 2);
      
      double open1 = iOpen(symbol, timeframe, 1);
      double open2 = iOpen(symbol, timeframe, 2);
      
      // Calculate candle body and wick
      double body1 = MathAbs(close1 - open1);
      double upperWick1 = high1 - MathMax(close1, open1);
      double lowerWick1 = MathMin(close1, open1) - low1;
      
      // Bullish engulfing
      if(close2 < open2 && close1 > open1 && close1 > open2 && open1 < close2)
      {
         if(body1 > body1 * 0.6) // Strong body
         {
            stopLossPips = (high1 - low1) / SymbolInfoDouble(symbol, SYMBOL_POINT) * 1.5;
            takeProfitPips = stopLossPips * 2;
            return 1; // BUY
         }
      }
      
      // Bearish engulfing
      if(close2 > open2 && close1 < open1 && close1 < open2 && open1 > close2)
      {
         if(body1 > body1 * 0.6)
         {
            stopLossPips = (high1 - low1) / SymbolInfoDouble(symbol, SYMBOL_POINT) * 1.5;
            takeProfitPips = stopLossPips * 2;
            return -1; // SELL
         }
      }
      
      // Pin bar bullish
      if(lowerWick1 > body1 * 2 && upperWick1 < body1 * 0.5 && close1 > open1)
      {
         if(close1 > close2)
         {
            stopLossPips = (high1 - low1) / SymbolInfoDouble(symbol, SYMBOL_POINT) * 1.2;
            takeProfitPips = stopLossPips * 2;
            return 1;
         }
      }
      
      // Pin bar bearish
      if(upperWick1 > body1 * 2 && lowerWick1 < body1 * 0.5 && close1 < open1)
      {
         if(close1 < close2)
         {
            stopLossPips = (high1 - low1) / SymbolInfoDouble(symbol, SYMBOL_POINT) * 1.2;
            takeProfitPips = stopLossPips * 2;
            return -1;
         }
      }
      
      return 0;
   }
   
   //+------------------------------------------------------------------+
   //| Candle Momentum Strategy                                         |
   //+------------------------------------------------------------------+
   int CandleMomentumStrategy(string symbol, ENUM_TIMEFRAMES timeframe)
   {
      double close[], high[], low[], open[];
      ArraySetAsSeries(close, true);
      ArraySetAsSeries(high, true);
      ArraySetAsSeries(low, true);
      ArraySetAsSeries(open, true);
      
      CopyClose(symbol, timeframe, 0, 10, close);
      CopyHigh(symbol, timeframe, 0, 10, high);
      CopyLow(symbol, timeframe, 0, 10, low);
      CopyOpen(symbol, timeframe, 0, 10, open);
      
      // Calculate momentum
      double momentum = close[0] - close[5];
      double atr = CalculateATR(symbol, timeframe, 14);
      
      // Strong bullish momentum
      if(momentum > atr * 0.5)
      {
         if(close[0] > open[0] && close[1] > open[1])
         {
            stopLossPips = atr / SymbolInfoDouble(symbol, SYMBOL_POINT);
            takeProfitPips = stopLossPips * 2;
            return 1;
         }
      }
      
      // Strong bearish momentum
      if(momentum < -atr * 0.5)
      {
         if(close[0] < open[0] && close[1] < open[1])
         {
            stopLossPips = atr / SymbolInfoDouble(symbol, SYMBOL_POINT);
            takeProfitPips = stopLossPips * 2;
            return -1;
         }
      }
      
      return 0;
   }
   
   //+------------------------------------------------------------------+
   //| Trend Following Strategy                                         |
   //+------------------------------------------------------------------+
   int TrendFollowingStrategy(string symbol, ENUM_TIMEFRAMES timeframe)
   {
      double ma20 = iMA(symbol, timeframe, 20, 0, MODE_EMA, PRICE_CLOSE);
      double ma50 = iMA(symbol, timeframe, 50, 0, MODE_EMA, PRICE_CLOSE);
      double ma200 = iMA(symbol, timeframe, 200, 0, MODE_SMA, PRICE_CLOSE);
      
      double close1 = iClose(symbol, timeframe, 1);
      double close2 = iClose(symbol, timeframe, 2);
      
      // Uptrend confirmation
      if(ma20 > ma50 && ma50 > ma200 && close1 > ma20)
      {
         if(close2 < ma20 && close1 > ma20) // Pullback buy
         {
            double atr = CalculateATR(symbol, timeframe, 14);
            stopLossPips = atr / SymbolInfoDouble(symbol, SYMBOL_POINT);
            takeProfitPips = stopLossPips * 3;
            return 1;
         }
      }
      
      // Downtrend confirmation
      if(ma20 < ma50 && ma50 < ma200 && close1 < ma20)
      {
         if(close2 > ma20 && close1 < ma20) // Pullback sell
         {
            double atr = CalculateATR(symbol, timeframe, 14);
            stopLossPips = atr / SymbolInfoDouble(symbol, SYMBOL_POINT);
            takeProfitPips = stopLossPips * 3;
            return -1;
         }
      }
      
      return 0;
   }
   
   //+------------------------------------------------------------------+
   //| Market Structure Strategy                                        |
   //+------------------------------------------------------------------+
   int MarketStructureStrategy(string symbol, ENUM_TIMEFRAMES timeframe)
   {
      // Detect higher highs and higher lows for uptrend
      // Detect lower highs and lower lows for downtrend
      
      double high[], low[];
      ArraySetAsSeries(high, true);
      ArraySetAsSeries(low, true);
      
      CopyHigh(symbol, timeframe, 0, 20, high);
      CopyLow(symbol, timeframe, 0, 20, low);
      
      // Simple structure break detection
      bool higherHigh = (high[0] > high[5] && high[5] > high[10]);
      bool higherLow = (low[0] > low[5] && low[5] > low[10]);
      
      bool lowerHigh = (high[0] < high[5] && high[5] < high[10]);
      bool lowerLow = (low[0] < low[5] && low[5] < low[10]);
      
      if(higherHigh && higherLow)
      {
         stopLossPips = (high[0] - low[0]) / SymbolInfoDouble(symbol, SYMBOL_POINT);
         takeProfitPips = stopLossPips * 2;
         return 1;
      }
      
      if(lowerHigh && lowerLow)
      {
         stopLossPips = (high[0] - low[0]) / SymbolInfoDouble(symbol, SYMBOL_POINT);
         takeProfitPips = stopLossPips * 2;
         return -1;
      }
      
      return 0;
   }
   
   //+------------------------------------------------------------------+
   //| ICT/Smart Money Strategy                                         |
   //+------------------------------------------------------------------+
   int ICTStrategy(string symbol, ENUM_TIMEFRAMES timeframe)
   {
      // Simplified ICT concepts
      // Look for liquidity grabs, order blocks, fair value gaps
      
      double high[], low[], close[], open[];
      ArraySetAsSeries(high, true);
      ArraySetAsSeries(low, true);
      ArraySetAsSeries(close, true);
      ArraySetAsSeries(open, true);
      
      CopyHigh(symbol, timeframe, 0, 50, high);
      CopyLow(symbol, timeframe, 0, 50, low);
      CopyClose(symbol, timeframe, 0, 50, close);
      CopyOpen(symbol, timeframe, 0, 50, open);
      
      // Find recent swing high/low
      int swingHighIdx = ArrayMaximum(high, 10, 20);
      int swingLowIdx = ArrayMinimum(low, 10, 20);
      
      // Look for sweep and reversal
      if(high[1] > high[swingHighIdx] && close[1] < open[1])
      {
         // Bearish liquidity grab
         if(close[0] < open[0])
         {
            stopLossPips = 40;
            takeProfitPips = 80;
            return -1;
         }
      }
      
      if(low[1] < low[swingLowIdx] && close[1] > open[1])
      {
         // Bullish liquidity grab
         if(close[0] > open[0])
         {
            stopLossPips = 40;
            takeProfitPips = 80;
            return 1;
         }
      }
      
      return 0;
   }
   
   //+------------------------------------------------------------------+
   //| Hybrid Strategy (combines multiple methods)                      |
   //+------------------------------------------------------------------+
   int HybridStrategy(string symbol, ENUM_TIMEFRAMES timeframe)
   {
      int signal1 = PriceActionStrategy(symbol, timeframe);
      int signal2 = TrendFollowingStrategy(symbol, timeframe);
      
      // Require confirmation from both
      if(signal1 == 1 && signal2 == 1)
         return 1;
      if(signal1 == -1 && signal2 == -1)
         return -1;
      
      return 0;
   }
   
   //+------------------------------------------------------------------+
   //| Check if should exit position                                   |
   //+------------------------------------------------------------------+
   bool ShouldExit(string symbol, ENUM_TIMEFRAMES timeframe, ulong ticket)
   {
      if(!PositionSelectByTicket(ticket))
         return false;
      
      ENUM_POSITION_TYPE posType = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
      double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);
      double currentPrice = (posType == POSITION_TYPE_BUY) ? 
                           SymbolInfoDouble(symbol, SYMBOL_BID) : 
                           SymbolInfoDouble(symbol, SYMBOL_ASK);
      
      // Check for reversal signals
      double close1 = iClose(symbol, timeframe, 1);
      double open1 = iOpen(symbol, timeframe, 1);
      
      if(posType == POSITION_TYPE_BUY)
      {
         // Strong bearish candle
         if(close1 < open1 && (open1 - close1) > (iHigh(symbol, timeframe, 1) - iLow(symbol, timeframe, 1)) * 0.7)
         {
            return true;
         }
      }
      else
      {
         // Strong bullish candle
         if(close1 > open1 && (close1 - open1) > (iHigh(symbol, timeframe, 1) - iLow(symbol, timeframe, 1)) * 0.7)
         {
            return true;
         }
      }
      
      return false;
   }
   
   //+------------------------------------------------------------------+
   //| Calculate stop loss level                                       |
   //+------------------------------------------------------------------+
   double GetStopLoss(string symbol, int signal)
   {
      double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
      int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
      
      double price = (signal > 0) ? SymbolInfoDouble(symbol, SYMBOL_ASK) : SymbolInfoDouble(symbol, SYMBOL_BID);
      
      double sl = 0;
      if(signal > 0)
         sl = price - (stopLossPips * point);
      else
         sl = price + (stopLossPips * point);
      
      return NormalizeDouble(sl, digits);
   }
   
   //+------------------------------------------------------------------+
   //| Calculate take profit level                                     |
   //+------------------------------------------------------------------+
   double GetTakeProfit(string symbol, int signal)
   {
      double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
      int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
      
      double price = (signal > 0) ? SymbolInfoDouble(symbol, SYMBOL_ASK) : SymbolInfoDouble(symbol, SYMBOL_BID);
      
      double tp = 0;
      if(signal > 0)
         tp = price + (takeProfitPips * point);
      else
         tp = price - (takeProfitPips * point);
      
      return NormalizeDouble(tp, digits);
   }
   
   //+------------------------------------------------------------------+
   //| Get stop loss pips for lot calculation                          |
   //+------------------------------------------------------------------+
   double GetStopLossPips()
   {
      return stopLossPips;
   }
   
   //+------------------------------------------------------------------+
   //| Calculate ATR                                                    |
   //+------------------------------------------------------------------+
   double CalculateATR(string symbol, ENUM_TIMEFRAMES timeframe, int period)
   {
      double atr[];
      ArraySetAsSeries(atr, true);
      
      int handle = iATR(symbol, timeframe, period);
      if(handle == INVALID_HANDLE)
         return 0;
      
      if(CopyBuffer(handle, 0, 0, 1, atr) <= 0)
         return 0;
      
      IndicatorRelease(handle);
      return atr[0];
   }
   
   //+------------------------------------------------------------------+
   //| Calculate Moving Average                                         |
   //+------------------------------------------------------------------+
   double iMA(string symbol, ENUM_TIMEFRAMES timeframe, int period, int shift, 
             ENUM_MA_METHOD method, ENUM_APPLIED_PRICE price)
   {
      double ma[];
      ArraySetAsSeries(ma, true);
      
      int handle = ::iMA(symbol, timeframe, period, 0, method, price);
      if(handle == INVALID_HANDLE)
         return 0;
      
      if(CopyBuffer(handle, 0, shift, 1, ma) <= 0)
         return 0;
      
      IndicatorRelease(handle);
      return ma[0];
   }
};