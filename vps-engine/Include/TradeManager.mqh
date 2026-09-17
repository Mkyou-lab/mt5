//+------------------------------------------------------------------+
//|                                                TradeManager.mqh  |
//+------------------------------------------------------------------+
#property copyright "MK PRO"
#property strict

#include <Trade\Trade.mqh>

class TradeManager
{
private:
   CTrade trade;
   long magicNumber;
   bool partialClosedTickets[];

public:
   TradeManager(long magic)
   {
      magicNumber = magic;
      trade.SetExpertMagicNumber(magic);
      trade.SetDeviationInPoints(10);
      trade.SetTypeFilling(ORDER_FILLING_FOK);
      ArrayResize(partialClosedTickets, 0);
   }
   
   ~TradeManager() {}
   
   //+------------------------------------------------------------------+
   //| Open a new trade                                                 |
   //+------------------------------------------------------------------+
   ulong OpenTrade(string symbol, ENUM_ORDER_TYPE orderType, double volume, 
                   double sl, double tp, string comment = "")
   {
      double price = (orderType == ORDER_TYPE_BUY) ? 
                     SymbolInfoDouble(symbol, SYMBOL_ASK) : 
                     SymbolInfoDouble(symbol, SYMBOL_BID);
      
      // Normalize price levels
      int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
      price = NormalizeDouble(price, digits);
      sl = NormalizeDouble(sl, digits);
      tp = NormalizeDouble(tp, digits);
      
      // Validate stop levels
      int stopLevel = (int)SymbolInfoInteger(symbol, SYMBOL_TRADE_STOPS_LEVEL);
      double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
      double minDistance = stopLevel * point;
      
      if(sl != 0)
      {
         double slDistance = MathAbs(price - sl);
         if(slDistance < minDistance)
         {
            Print("Stop loss too close to price. Adjusting...");
            if(orderType == ORDER_TYPE_BUY)
               sl = price - minDistance;
            else
               sl = price + minDistance;
            sl = NormalizeDouble(sl, digits);
         }
      }
      
      if(tp != 0)
      {
         double tpDistance = MathAbs(price - tp);
         if(tpDistance < minDistance)
         {
            Print("Take profit too close to price. Adjusting...");
            if(orderType == ORDER_TYPE_BUY)
               tp = price + minDistance;
            else
               tp = price - minDistance;
            tp = NormalizeDouble(tp, digits);
         }
      }
      
      // Execute trade
      bool result = false;
      if(orderType == ORDER_TYPE_BUY)
         result = trade.Buy(volume, symbol, price, sl, tp, comment);
      else if(orderType == ORDER_TYPE_SELL)
         result = trade.Sell(volume, symbol, price, sl, tp, comment);
      
      if(result)
      {
         ulong ticket = trade.ResultOrder();
         Print("Trade opened successfully. Ticket: ", ticket);
         return ticket;
      }
      else
      {
         Print("Trade failed. Error: ", trade.ResultRetcode(), " - ", trade.ResultRetcodeDescription());
         return 0;
      }
   }
   
   //+------------------------------------------------------------------+
   //| Close a position                                                 |
   //+------------------------------------------------------------------+
   bool ClosePosition(ulong ticket)
   {
      if(!PositionSelectByTicket(ticket))
      {
         Print("Position not found: ", ticket);
         return false;
      }
      
      bool result = trade.PositionClose(ticket);
      
      if(result)
      {
         Print("Position closed successfully. Ticket: ", ticket);
         return true;
      }
      else
      {
         Print("Failed to close position. Error: ", trade.ResultRetcode());
         return false;
      }
   }
   
   //+------------------------------------------------------------------+
   //| Modify position                                                  |
   //+------------------------------------------------------------------+
   bool ModifyPosition(ulong ticket, double sl, double tp)
   {
      if(!PositionSelectByTicket(ticket))
      {
         Print("Position not found: ", ticket);
         return false;
      }
      
      string symbol = PositionGetString(POSITION_SYMBOL);
      int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
      
      sl = NormalizeDouble(sl, digits);
      tp = NormalizeDouble(tp, digits);
      
      bool result = trade.PositionModify(ticket, sl, tp);
      
      if(result)
      {
         Print("Position modified. Ticket: ", ticket, " SL: ", sl, " TP: ", tp);
         return true;
      }
      else
      {
         Print("Failed to modify position. Error: ", trade.ResultRetcode());
         return false;
      }
   }
   
   //+------------------------------------------------------------------+
   //| Partial close                                                    |
   //+------------------------------------------------------------------+
   bool PartialClose(ulong ticket, double volume)
   {
      if(!PositionSelectByTicket(ticket))
         return false;
      
      string symbol = PositionGetString(POSITION_SYMBOL);
      double currentVolume = PositionGetDouble(POSITION_VOLUME);
      
      if(volume >= currentVolume)
         return ClosePosition(ticket);
      
      bool result = trade.PositionClosePartial(ticket, volume);
      
      if(result)
      {
         Print("Partial close successful. Ticket: ", ticket, " Volume: ", volume);
         AddPartialClosedTicket(ticket);
         return true;
      }
      
      return false;
   }
   
   //+------------------------------------------------------------------+
   //| Calculate trailing stop                                          |
   //+------------------------------------------------------------------+
   double CalculateTrailingStop(string symbol, ulong ticket, double trailingPips)
   {
      if(!PositionSelectByTicket(ticket))
         return 0;
      
      ENUM_POSITION_TYPE posType = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
      double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);
      double currentSL = PositionGetDouble(POSITION_SL);
      
      double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
      double trailingDistance = trailingPips * point;
      
      double currentPrice = (posType == POSITION_TYPE_BUY) ? 
                            SymbolInfoDouble(symbol, SYMBOL_BID) : 
                            SymbolInfoDouble(symbol, SYMBOL_ASK);
      
      double newSL = 0;
      
      if(posType == POSITION_TYPE_BUY)
      {
         newSL = currentPrice - trailingDistance;
         if(newSL > currentSL && newSL < currentPrice)
            return newSL;
      }
      else
      {
         newSL = currentPrice + trailingDistance;
         if(newSL < currentSL || currentSL == 0)
            if(newSL > currentPrice)
               return newSL;
      }
      
      return 0;
   }
   
   //+------------------------------------------------------------------+
   //| Count open positions                                             |
   //+------------------------------------------------------------------+
   int CountOpenPositions(string symbol = "")
   {
      int count = 0;
      int total = PositionsTotal();
      
      for(int i = 0; i < total; i++)
      {
         ulong ticket = PositionGetTicket(i);
         if(ticket <= 0) continue;
         
         if(PositionGetInteger(POSITION_MAGIC) != magicNumber)
            continue;
         
         if(symbol != "" && PositionGetString(POSITION_SYMBOL) != symbol)
            continue;
         
         count++;
      }
      
      return count;
   }
   
   //+------------------------------------------------------------------+
   //| Check if position exists                                         |
   //+------------------------------------------------------------------+
   bool HasPosition(string symbol)
   {
      int total = PositionsTotal();
      
      for(int i = 0; i < total; i++)
      {
         ulong ticket = PositionGetTicket(i);
         if(ticket <= 0) continue;
         
         if(PositionGetInteger(POSITION_MAGIC) != magicNumber)
            continue;
         
         if(PositionGetString(POSITION_SYMBOL) == symbol)
            return true;
      }
      
      return false;
   }
   
   //+------------------------------------------------------------------+
   //| Update positions (calculate profit, etc.)                        |
   //+------------------------------------------------------------------+
   void UpdatePositions()
   {
      // Update position information
      // This can be extended to calculate floating P/L, etc.
   }
   
   //+------------------------------------------------------------------+
   //| Close all positions                                              |
   //+------------------------------------------------------------------+
   int CloseAllPositions()
   {
      int closed = 0;
      int total = PositionsTotal();
      
      for(int i = total - 1; i >= 0; i--)
      {
         ulong ticket = PositionGetTicket(i);
         if(ticket <= 0) continue;
         
         if(PositionGetInteger(POSITION_MAGIC) != magicNumber)
            continue;
         
         if(ClosePosition(ticket))
            closed++;
      }
      
      return closed;
   }
   
   //+------------------------------------------------------------------+
   //| Track partial closed tickets                                     |
   //+------------------------------------------------------------------+
   void AddPartialClosedTicket(ulong ticket)
   {
      int size = ArraySize(partialClosedTickets);
      ArrayResize(partialClosedTickets, size + 1);
      partialClosedTickets[size] = ticket;
   }
   
   bool IsPartialClosed(ulong ticket)
   {
      for(int i = 0; i < ArraySize(partialClosedTickets); i++)
      {
         if(partialClosedTickets[i] == ticket)
            return true;
      }
      return false;
   }
};