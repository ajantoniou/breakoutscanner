
import React, { useState, useEffect } from "react";
import MainNav from "@/components/MainNav";
import StatsCard from "@/components/StatsCard";
import TimeframeSelector from "@/components/TimeframeSelector";
import AlertCard from "@/components/AlertCard";
import { Bell, CheckCircle, Filter, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import {
  initialAlerts,
  getAlertStats,
  filterPatternsByTimeframe,
} from "@/services/mockAlertData";
import type { AlertData, PatternData } from "@/services/types/patternTypes";

const Alerts = () => {
  const [alerts, setAlerts] = useState<AlertData[]>(initialAlerts);
  const [filteredAlerts, setFilteredAlerts] = useState<AlertData[]>(initialAlerts);
  const [timeframe, setTimeframe] = useState<string>("all");
  const [patternTypeFilter, setPatternTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stats, setStats] = useState(getAlertStats(alerts));

  useEffect(() => {
    let filtered = [...alerts];
    
    if (timeframe !== "all") {
      filtered = filtered.filter(alert => {
        // Access timeframe from pattern or directly from alert
        return (alert.pattern?.timeframe === timeframe) || (alert.timeframe === timeframe);
      });
    }
    
    if (patternTypeFilter !== "all") {
      filtered = filtered.filter(alert => {
        // Access patternType from pattern or directly from alert
        const patternType = alert.pattern?.patternType || alert.patternType || "";
        
        if (patternTypeFilter === "bullish") {
          return patternType.includes('Bull') || 
                 patternType.includes('Cup') || 
                 patternType.includes('Bottom') ||
                 patternType.includes('Ascending');
        }
        if (patternTypeFilter === "bearish") {
          return patternType.includes('Bear') || 
                 patternType.includes('Top') ||
                 patternType.includes('Descending');
        }
        return patternType.includes('Symmetrical');
      });
    }
    
    if (statusFilter !== "all") {
      filtered = filtered.filter(alert => {
        // Access status from pattern or use default if not available
        return alert.pattern?.status === statusFilter;
      });
    }
    
    setFilteredAlerts(filtered);
  }, [alerts, timeframe, patternTypeFilter, statusFilter]);

  const handleTimeframeChange = (newTimeframe: string) => {
    setTimeframe(newTimeframe);
  };

  const handleMarkAsRead = (alertId: string) => {
    const updatedAlerts = alerts.map(alert => {
      if (alert.id === alertId) {
        return { ...alert, isRead: true };
      }
      return alert;
    });
    
    setAlerts(updatedAlerts);
  };

  const handleMarkAllAsRead = () => {
    const updatedAlerts = alerts.map(alert => ({ ...alert, isRead: true }));
    setAlerts(updatedAlerts);
  };

  const unreadCount = alerts.filter(alert => !alert.isRead).length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MainNav />
      
      <div className="flex-1 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Pattern Alerts</h1>
            <p className="text-muted-foreground mt-1">
              Stay updated on pattern breakouts and trading opportunities
            </p>
          </div>
          
          {unreadCount > 0 && (
            <Button variant="outline" onClick={handleMarkAllAsRead}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark All as Read
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard
            title="Success Rate"
            value={`${stats.successRate}%`}
            icon={<BarChart3 className="h-4 w-4" />}
          />
          
          <StatsCard
            title="Active Patterns"
            value={stats.activeCount}
            icon={<Bell className="h-4 w-4" />}
          />
          
          <StatsCard
            title="Total Patterns"
            value={stats.totalCount}
            icon={<CheckCircle className="h-4 w-4" />}
          />
        </div>
        
        <div className="bg-white rounded-md shadow-card p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-medium">Filter Alerts</h2>
              
              {unreadCount > 0 && (
                <Badge className="ml-2 bg-primary">
                  {unreadCount} unread
                </Badge>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <div className="w-full sm:w-auto">
                <Select
                  value={patternTypeFilter}
                  onValueChange={setPatternTypeFilter}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Pattern Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Patterns</SelectItem>
                    <SelectItem value="bullish">Bullish Patterns</SelectItem>
                    <SelectItem value="bearish">Bearish Patterns</SelectItem>
                    <SelectItem value="neutral">Neutral Patterns</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="w-full sm:w-auto">
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <TimeframeSelector
                selectedTimeframe={timeframe}
                onTimeframeChange={handleTimeframeChange}
                className="w-full sm:w-auto flex-wrap"
              />
            </div>
          </div>
          
          <Tabs defaultValue="all" className="mb-4">
            <TabsList>
              <TabsTrigger value="all">All Alerts</TabsTrigger>
              <TabsTrigger value="unread">Unread</TabsTrigger>
              <TabsTrigger value="read">Read</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-4">
              <div className="grid grid-cols-1 gap-4">
                {filteredAlerts.length === 0 ? (
                  <div className="bg-muted p-8 rounded-md text-center">
                    <p className="text-muted-foreground">No alerts match your filters</p>
                  </div>
                ) : (
                  filteredAlerts.map(alert => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      onMarkAsRead={handleMarkAsRead}
                    />
                  ))
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="unread" className="mt-4">
              <div className="grid grid-cols-1 gap-4">
                {filteredAlerts.filter(a => !a.isRead).length === 0 ? (
                  <div className="bg-muted p-8 rounded-md text-center">
                    <p className="text-muted-foreground">No unread alerts</p>
                  </div>
                ) : (
                  filteredAlerts
                    .filter(a => !a.isRead)
                    .map(alert => (
                      <AlertCard
                        key={alert.id}
                        alert={alert}
                        onMarkAsRead={handleMarkAsRead}
                      />
                    ))
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="read" className="mt-4">
              <div className="grid grid-cols-1 gap-4">
                {filteredAlerts.filter(a => a.isRead).length === 0 ? (
                  <div className="bg-muted p-8 rounded-md text-center">
                    <p className="text-muted-foreground">No read alerts</p>
                  </div>
                ) : (
                  filteredAlerts
                    .filter(a => a.isRead)
                    .map(alert => (
                      <AlertCard
                        key={alert.id}
                        alert={alert}
                        onMarkAsRead={handleMarkAsRead}
                      />
                    ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Alerts;
