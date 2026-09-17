//+------------------------------------------------------------------+
//|                                                  MKProEngine.mq5 |
//|                                          MK PRO Trading System   |
//|                                                                  |
//+------------------------------------------------------------------+
#property copyright "MK PRO"
#property version   "1.00"
#property strict

#include "Include/StrategyManager.mqh"
#include "Include/RiskManager.mqh"
#include "Include/TradeManager.mqh"

//--- Input parameters
input string   API_URL = "https://your-api-url.com/api";  // Backend API URL
input string   API_KEY = "";                                // API Authentication Key
input long     MAGIC_NUMBER = 123456;                      // Magic Number
input int      UPDATE_INTERVAL = 1000;                     // Update interval (ms)

//--- Global variables
StrategyManager* strategyManager;
RiskManager* riskManager;
TradeManager* tradeManager;

bool isActive = false;
bool isPaused = false;
datetime lastUpdateTime = 0;
datetime lastHeartbeat = 0;

string selectedSymbol = "";
string selectedStrategy = "PRICE_ACTION";
string selectedTimeframe = "M15";
double riskPercentage = 1.0;
bool useAutoLot = true;
double fixedLot = 0.01;

// Risk management settings
double maxDailyLoss = 5.0;
double maxDrawdown = 10.0;
int maxOpenTrades = 3;
int maxTradesPerDay = 10;
int maxConsecutiveLosses = 3;
double maxSpread = 30;

// Trade management settings
bool useStopLoss = true;
bool useTakeProfit = true;
bool useBreakEven = false;
double breakEvenPips = 10;
bool useTrailingStop = false;
double trailingStopPips = 15;
bool usePartialTP = false;
double partialTPPercent = 50;
double partialTPPips = 20;

// Statistics
double dailyPL = 0;
int dailyTrades = 0;
int consecutiveLosses = 0;
double startingBalance = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   Print("MK PRO Engine initializing...");
   
   // Initialize managers
   strategyManager = new StrategyManager();
   riskManager = new RiskManager();
   tradeManager = new TradeManager(MAGIC_NUMBER);
   
   // Get account info
   startingBalance = AccountInfoDouble(ACCOUNT_BALANCE);
   
   // Connect to API and get settings
   FetchSettings();
   
   // Send initial status
   SendStatusUpdate();
   
   // Set timer for updates
   EventSetTimer(1);
   
   Print("MK PRO Engine initialized successfully");
   Print("Account: ", AccountInfoInteger(ACCOUNT_LOGIN));
   Print("Server: ", AccountInfoString(ACCOUNT_SERVER));
   Print("Balance: ", startingBalance);
   
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   
   // Clean up
   delete strategyManager;
   delete riskManager;
   delete tradeManager;
   
   Print("MK PRO Engine stopped. Reason: ", reason);
}

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
{
   // Only process if active and not paused
   if(!isActive || isPaused)
      return;
   
   // Check connection
   if(!TerminalInfoInteger(TERMINAL_CONNECTED))
   {
      Print("Terminal not connected");
      return;
   }
   
   // Process each symbol
   ProcessSymbol(selectedSymbol);
   
   // Update positions
   tradeManager.UpdatePositions();
   
   // Manage existing trades
   ManageOpenTrades();
}

//+------------------------------------------------------------------+
//| Timer function                                                    |
//+------------------------------------------------------------------+
void OnTimer()
{
   // Send heartbeat every 30 seconds
   if(TimeCurrent() - lastHeartbeat >= 30)
   {
      SendHeartbeat();
      lastHeartbeat = TimeCurrent();
   }
   
   // Check for new commands from API
   CheckAPICommands();
   
   // Reset daily stats at midnight
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);
   if(dt.hour == 0 && dt.min == 0)
   {
      ResetDailyStats();
   }
}

//+------------------------------------------------------------------+
//| Trade transaction function                                        |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction& trans,
                       const MqlTradeRequest& request,
                       const MqlTradeResult& result)
{
   // Report trade events to API
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD)
   {
      ReportTradeToAPI(trans);
   }
}

//+------------------------------------------------------------------+
//| Process symbol for trading signals                               |
//+------------------------------------------------------------------+
void ProcessSymbol(string symbol)
{
   // Pre-trade checks
   if(!riskManager.CanTrade(symbol, maxDailyLoss, maxDrawdown, dailyPL, startingBalance))
   {
      if(!isPaused)
      {
         Print("Risk limits reached. Pausing trading.");
         isPaused = true;
         SendAlert("RISK_LIMIT_REACHED", "Daily loss or drawdown limit reached");
      }
      return;
   }
   
   // Check max open trades
   int openPositions = tradeManager.CountOpenPositions(symbol);
   if(openPositions >= maxOpenTrades)
      return;
   
   // Check max daily trades
   if(dailyTrades >= maxTradesPerDay)
   {
      Print("Max daily trades reached");
      return;
   }
   
   // Check consecutive losses
   if(consecutiveLosses >= maxConsecutiveLosses)
   {
      Print("Max consecutive losses reached");
      SendAlert("MAX_CONSECUTIVE_LOSSES", "Stopping after " + IntegerToString(consecutiveLosses) + " losses");
      return;
   }
   
   // Check spread
   double spread = SymbolInfoInteger(symbol, SYMBOL_SPREAD) * SymbolInfoDouble(symbol, SYMBOL_POINT) / SymbolInfoDouble(symbol, SYMBOL_POINT);
   if(spread > maxSpread)
   {
      Print("Spread too high: ", spread);
      return;
   }
   
   // Check trading session
   if(!IsInTradingSession())
      return;
   
   // Get current timeframe
   ENUM_TIMEFRAMES tf = StringToTimeframe(selectedTimeframe);
   
   // Analyze market
   int signal = strategyManager.AnalyzeMarket(symbol, tf, selectedStrategy);
   
   // No signal
   if(signal == 0)
      return;
   
   // Check for existing position
   if(tradeManager.HasPosition(symbol))
   {
      Print("Position already open for ", symbol);
      return;
   }
   
   // Calculate lot size
   double lot = 0;
   if(useAutoLot)
   {
      double stopLossPips = strategyManager.GetStopLossPips();
      lot = riskManager.CalculateLotSize(symbol, riskPercentage, stopLossPips);
   }
   else
   {
      lot = fixedLot;
   }
   
   // Validate lot size
   lot = NormalizeLot(symbol, lot);
   if(lot < SymbolInfoDouble(symbol, SYMBOL_VOLUME_MIN))
   {
      Print("Lot size too small: ", lot);
      return;
   }
   
   // Prepare trade parameters
   double sl = 0, tp = 0;
   if(useStopLoss)
      sl = strategyManager.GetStopLoss(symbol, signal);
   if(useTakeProfit)
      tp = strategyManager.GetTakeProfit(symbol, signal);
   
   // Execute trade
   ENUM_ORDER_TYPE orderType = (signal > 0) ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;
   ulong ticket = tradeManager.OpenTrade(symbol, orderType, lot, sl, tp, selectedStrategy);
   
   if(ticket > 0)
   {
      Print("Trade opened: ", symbol, " ", EnumToString(orderType), " Lot: ", lot);
      dailyTrades++;
      
      // Report to API
      ReportTradeOpen(ticket, symbol, orderType, lot, sl, tp);
      
      // Send notification
      SendNotification("TRADE_OPENED", StringFormat("%s %s opened\nLot: %.2f\nSL: %.5f\nTP: %.5f", 
                      symbol, 
                      (signal > 0) ? "BUY" : "SELL",
                      lot, sl, tp));
   }
   else
   {
      Print("Failed to open trade");
   }
}

//+------------------------------------------------------------------+
//| Manage open trades                                               |
//+------------------------------------------------------------------+
void ManageOpenTrades()
{
   int total = PositionsTotal();
   
   for(int i = total - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket <= 0) continue;
      
      if(PositionGetInteger(POSITION_MAGIC) != MAGIC_NUMBER)
         continue;
      
      string symbol = PositionGetString(POSITION_SYMBOL);
      double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);
      double currentPrice = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) ? 
                           SymbolInfoDouble(symbol, SYMBOL_BID) : 
                           SymbolInfoDouble(symbol, SYMBOL_ASK);
      
      double sl = PositionGetDouble(POSITION_SL);
      double tp = PositionGetDouble(POSITION_TP);
      
      bool modified = false;
      
      // Break even
      if(useBreakEven && sl != openPrice)
      {
         double distance = MathAbs(currentPrice - openPrice) / SymbolInfoDouble(symbol, SYMBOL_POINT);
         if(distance >= breakEvenPips)
         {
            sl = openPrice;
            modified = true;
            Print("Moving to break even: ", symbol);
         }
      }
      
      // Trailing stop
      if(useTrailingStop)
      {
         double newSL = tradeManager.CalculateTrailingStop(symbol, ticket, trailingStopPips);
         if(newSL != sl && newSL != 0)
         {
            sl = newSL;
            modified = true;
            Print("Trailing stop updated: ", symbol);
         }
      }
      
      // Partial take profit
      if(usePartialTP && !tradeManager.IsPartialClosed(ticket))
      {
         double distance = MathAbs(currentPrice - openPrice) / SymbolInfoDouble(symbol, SYMBOL_POINT);
         if(distance >= partialTPPips)
         {
            double currentVolume = PositionGetDouble(POSITION_VOLUME);
            double closeVolume = NormalizeLot(symbol, currentVolume * partialTPPercent / 100.0);
            
            if(tradeManager.PartialClose(ticket, closeVolume))
            {
               Print("Partial TP executed: ", symbol, " Volume: ", closeVolume);
            }
         }
      }
      
      // Modify position if needed
      if(modified)
      {
         tradeManager.ModifyPosition(ticket, sl, tp);
      }
      
      // Check for exit signals
      ENUM_TIMEFRAMES tf = StringToTimeframe(selectedTimeframe);
      if(strategyManager.ShouldExit(symbol, tf, ticket))
      {
         Print("Exit signal detected for ", symbol);
         tradeManager.ClosePosition(ticket);
      }
   }
}

//+------------------------------------------------------------------+
//| Fetch settings from API                                          |
//+------------------------------------------------------------------+
void FetchSettings()
{
   // In production, this would call the backend API
   // For now, using default values
   
   Print("Fetching settings from API...");
   
   // Simulate API call
   // In real implementation, use WebRequest to fetch settings
   
   selectedSymbol = Symbol();
   Print("Symbol: ", selectedSymbol);
   Print("Strategy: ", selectedStrategy);
   Print("Timeframe: ", selectedTimeframe);
   Print("Risk: ", riskPercentage, "%");
}

//+------------------------------------------------------------------+
//| Check for API commands                                           |
//+------------------------------------------------------------------+
void CheckAPICommands()
{
   // In production, this would poll the API for commands
   // Commands: START, STOP, PAUSE, CLOSE_ALL, UPDATE_SETTINGS
   
   // Example implementation would use WebRequest
}

//+------------------------------------------------------------------+
//| Send status update to API                                        |
//+------------------------------------------------------------------+
void SendStatusUpdate()
{
   string status = "CONNECTED";
   if(!TerminalInfoInteger(TERMINAL_CONNECTED))
      status = "DISCONNECTED";
   
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   double freeMargin = AccountInfoDouble(ACCOUNT_MARGIN_FREE);
   double marginLevel = AccountInfoDouble(ACCOUNT_MARGIN_LEVEL);
   
   // In production, send this data to API
   Print("Status: ", status, " Balance: ", balance, " Equity: ", equity);
}

//+------------------------------------------------------------------+
//| Send heartbeat to API                                            |
//+------------------------------------------------------------------+
void SendHeartbeat()
{
   SendStatusUpdate();
}

//+------------------------------------------------------------------+
//| Report trade to API                                              |
//+------------------------------------------------------------------+
void ReportTradeToAPI(const MqlTradeTransaction& trans)
{
   // In production, send trade data to API
   Print("Trade transaction: Type=", trans.type, " Order=", trans.order);
}

//+------------------------------------------------------------------+
//| Report trade open to API                                         |
//+------------------------------------------------------------------+
void ReportTradeOpen(ulong ticket, string symbol, ENUM_ORDER_TYPE type, 
                    double volume, double sl, double tp)
{
   // In production, POST to /api/trading/trades
   Print("Reporting trade open: Ticket=", ticket, " Symbol=", symbol);
}

//+------------------------------------------------------------------+
//| Send notification                                                |
//+------------------------------------------------------------------+
void SendNotification(string type, string message)
{
   // In production, send to API which forwards to mobile
   Print("Notification [", type, "]: ", message);
}

//+------------------------------------------------------------------+
//| Send alert                                                        |
//+------------------------------------------------------------------+
void SendAlert(string type, string message)
{
   Print("ALERT [", type, "]: ", message);
   SendNotification(type, message);
}

//+------------------------------------------------------------------+
//| Reset daily statistics                                           |
//+------------------------------------------------------------------+
void ResetDailyStats()
{
   dailyPL = 0;
   dailyTrades = 0;
   consecutiveLosses = 0;
   Print("Daily stats reset");
}

//+------------------------------------------------------------------+
//| Check if in trading session                                      |
//+------------------------------------------------------------------+
bool IsInTradingSession()
{
   // Implement session filtering based on settings
   return true;
}

//+------------------------------------------------------------------+
//| Convert string to timeframe                                      |
//+------------------------------------------------------------------+
ENUM_TIMEFRAMES StringToTimeframe(string tf)
{
   if(tf == "M1") return PERIOD_M1;
   if(tf == "M5") return PERIOD_M5;
   if(tf == "M15") return PERIOD_M15;
   if(tf == "M30") return PERIOD_M30;
   if(tf == "H1") return PERIOD_H1;
   if(tf == "H4") return PERIOD_H4;
   if(tf == "D1") return PERIOD_D1;
   return PERIOD_M15;
}

//+------------------------------------------------------------------+
//| Normalize lot size                                               |
//+------------------------------------------------------------------+
double NormalizeLot(string symbol, double lot)
{
   double minLot = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MIN);
   double maxLot = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MAX);
   double lotStep = SymbolInfoDouble(symbol, SYMBOL_VOLUME_STEP);
   
   lot = MathMax(lot, minLot);
   lot = MathMin(lot, maxLot);
   lot = MathFloor(lot / lotStep) * lotStep;
   
   return NormalizeDouble(lot, 2);
}