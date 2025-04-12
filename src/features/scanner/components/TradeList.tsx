import React, { useState } from "react";
import { TradeListItem } from "@/services/types/tradeTypes";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { 
  TrendingUp, 
  TrendingDown, 
  Trash2, 
  Check, 
  MoreVertical, 
  Brain,
  LineChart,
  AlertTriangle,
  Clock,
  ArrowUpRight
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import TradeExitAnalysis from "../ai/TradeExitAnalysis";
import { Motion } from "../ui/motion";

interface TradeListProps {
  trades: TradeListItem[];
  onRemoveTrade: (tradeId: string) => void;
  onCompleteTrade: (tradeId: string, exitPrice: number) => void;
}

const TradeList: React.FC<TradeListProps> = ({ 
  trades, 
  onRemoveTrade,
  onCompleteTrade
}) => {
  const [selectedTrade, setSelectedTrade] = useState<TradeListItem | null>(null);
  const [showAiAnalysis, setShowAiAnalysis] = useState(false);
  const [exitPrice, setExitPrice] = useState<string>("");
  
  const formatDate = (date: string) => {
    if (!date) return 'N/A';
    
    const dateObj = new Date(date);
    return formatDistanceToNow(dateObj, { addSuffix: true });
  };
  
  const calculatePL = (trade: TradeListItem) => {
    if (trade.performance !== undefined) {
      return trade.performance;
    }
    
    const diff = trade.targetPrice - trade.entryPrice;
    const percent = (diff / trade.entryPrice) * 100;
    return trade.direction === 'bullish' ? percent : -percent;
  };
  
  const handleCompleteTrade = (trade: TradeListItem) => {
    if (!exitPrice || isNaN(parseFloat(exitPrice))) {
      toast.error("Please enter a valid exit price");
      return;
    }
    
    onCompleteTrade(trade.id, parseFloat(exitPrice));
    setExitPrice("");
  };
  
  const handleShowAnalysis = (trade: TradeListItem) => {
    setSelectedTrade(trade);
    setShowAiAnalysis(true);
  };
  
  const activeTrades = trades.filter(trade => trade.status === 'active');
  const completedTrades = trades.filter(trade => trade.status === 'completed');
  
  const renderProgressBar = (progress: number = 0) => {
    const width = `${Math.min(100, Math.max(0, progress))}%`;
    return (
      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
        <div 
          className={`h-1.5 rounded-full ${progress < 50 ? 'bg-amber-500' : 'bg-green-500'}`}
          style={{ width }}
        ></div>
      </div>
    );
  };
  
  const renderExitButton = (trade: TradeListItem) => {
    if (!trade.exitSignal) return null;
    
    return (
      <Motion animate={true} className="animate-pulse">
        <Button 
          size="sm" 
          className="bg-red-500 hover:bg-red-600 gap-1.5 text-xs px-2.5 py-1 h-7"
          onClick={() => {
            setExitPrice(trade.lastUpdated ? (trade.entryPrice * 1.1).toFixed(2) : trade.entryPrice.toFixed(2));
            setSelectedTrade(trade);
          }}
        >
          <AlertTriangle className="h-3 w-3" />
          EXIT NOW
        </Button>
      </Motion>
    );
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Active Trades</CardTitle>
        </CardHeader>
        <CardContent>
          {activeTrades.length === 0 ? (
            <div className="text-center p-6 border border-dashed rounded-md">
              <p className="text-muted-foreground">No active trades. Add trades from the pattern scanner.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Entry</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Stop</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeTrades.map((trade) => (
                    <TableRow key={trade.id} className={trade.exitSignal ? 'bg-red-50' : ''}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1">
                          {trade.symbol}
                          {trade.exitSignal && (
                            <Badge className="bg-red-100 text-red-800 hover:bg-red-100 animate-pulse">
                              EXIT
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {trade.patternType} - {trade.timeframe}
                        </div>
                      </TableCell>
                      <TableCell>
                        {trade.direction === 'bullish' ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            Bullish
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <TrendingDown className="h-3 w-3 mr-1" />
                            Bearish
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>${trade.entryPrice.toFixed(2)}</TableCell>
                      <TableCell>${trade.targetPrice.toFixed(2)}</TableCell>
                      <TableCell>${trade.stopLoss.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="w-24">
                          {renderProgressBar(trade.breakoutProgress || 0)}
                          <div className="flex justify-between text-xs">
                            <span>{trade.breakoutProgress || 0}%</span>
                            <span className="text-muted-foreground">
                              <Clock className="h-3 w-3 inline mr-1" />
                              {formatDate(trade.entryDate)}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          {trade.lastUpdated ? (
                            <>Updated {formatDate(trade.lastUpdated)}</>
                          ) : (
                            <>Created {formatDate(trade.entryDate)}</>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {renderExitButton(trade)}
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleShowAnalysis(trade)}>
                                <Brain className="h-4 w-4 mr-2" />
                                AI Analysis
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setSelectedTrade(trade)}>
                                <Check className="h-4 w-4 mr-2" />
                                Mark Complete
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onRemoveTrade(trade.id)}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {completedTrades.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Completed Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Entry/Exit</TableHead>
                    <TableHead>P/L</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedTrades.map((trade) => {
                    const pl = calculatePL(trade);
                    return (
                      <TableRow key={trade.id}>
                        <TableCell className="font-medium">
                          {trade.symbol}
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {trade.patternType} - {trade.timeframe}
                          </div>
                        </TableCell>
                        <TableCell>
                          {trade.direction === 'bullish' ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              Bullish
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <TrendingDown className="h-3 w-3 mr-1" />
                              Bearish
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <div className="text-xs">
                              Entry: ${trade.entryPrice.toFixed(2)}
                            </div>
                            <div className="text-xs">
                              Exit: ${trade.exitPrice?.toFixed(2) || 'N/A'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={pl >= 0 
                            ? 'bg-green-100 text-green-800 hover:bg-green-100' 
                            : 'bg-red-100 text-red-800 hover:bg-red-100'
                          }>
                            {pl >= 0 ? '+' : ''}{pl.toFixed(2)}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            <div>Entry: {formatDate(trade.entryDate)}</div>
                            <div>Exit: {trade.exitDate ? formatDate(trade.exitDate) : 'N/A'}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={() => handleShowAnalysis(trade)}
                            >
                              <Brain className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={() => onRemoveTrade(trade.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
      
      {selectedTrade && (
        <Dialog open={!!selectedTrade && !showAiAnalysis} onOpenChange={(open) => {
          if (!open) setSelectedTrade(null);
        }}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {selectedTrade.status === 'active' ? 'Complete Trade' : 'Trade Details'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="py-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{selectedTrade.symbol}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedTrade.patternType} ({selectedTrade.timeframe})
                  </p>
                </div>
                
                <Badge className={selectedTrade.direction === 'bullish' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
                }>
                  {selectedTrade.direction === 'bullish' ? 'Bullish' : 'Bearish'}
                </Badge>
              </div>
              
              {selectedTrade.status === 'active' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">AI Trade Summary</p>
                    <p className="text-sm bg-slate-50 p-2 rounded-md">
                      {selectedTrade.aiSummary || 'No AI summary available'}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Entry Price</p>
                      <p className="text-lg">${selectedTrade.entryPrice.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Target Price</p>
                      <p className="text-lg">${selectedTrade.targetPrice.toFixed(2)}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 pt-2">
                    <p className="text-sm font-medium">Complete Trade</p>
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        value={exitPrice}
                        onChange={(e) => setExitPrice(e.target.value)}
                        placeholder="Exit Price"
                        className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 flex-1"
                      />
                      <Button 
                        onClick={() => handleCompleteTrade(selectedTrade)}
                        className="gap-1"
                      >
                        <Check className="h-4 w-4" />
                        Complete
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              {selectedTrade.status === 'completed' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Performance</p>
                    <div className={`text-lg font-semibold flex items-center ${
                      (selectedTrade.performance || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {(selectedTrade.performance || 0) >= 0 ? (
                        <ArrowUpRight className="h-4 w-4 mr-1" />
                      ) : (
                        <TrendingDown className="h-4 w-4 mr-1" />
                      )}
                      {(selectedTrade.performance || 0) >= 0 ? '+' : ''}
                      {(selectedTrade.performance || 0).toFixed(2)}%
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Entry Price</p>
                      <p className="text-lg">${selectedTrade.entryPrice.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Exit Price</p>
                      <p className="text-lg">${selectedTrade.exitPrice?.toFixed(2) || 'N/A'}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Entry Date</p>
                      <p className="text-sm">{formatDate(selectedTrade.entryDate)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Exit Date</p>
                      <p className="text-sm">{selectedTrade.exitDate ? formatDate(selectedTrade.exitDate) : 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      <Dialog open={showAiAnalysis} onOpenChange={setShowAiAnalysis}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>AI Trade Analysis</DialogTitle>
          </DialogHeader>
          {selectedTrade && (
            <TradeExitAnalysis 
              trade={selectedTrade}
              showCard={false} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TradeList;
