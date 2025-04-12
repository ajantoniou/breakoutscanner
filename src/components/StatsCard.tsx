
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  change?: string;
  loading?: boolean;
  className?: string;
  subtitle?: string;
}

const StatsCard = ({
  title,
  value,
  icon,
  change,
  loading = false,
  className,
  subtitle,
}: StatsCardProps) => {
  return (
    <Card className={cn("shadow-card overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className={cn("text-2xl font-bold mt-1", loading && "animate-pulse-light")}>
              {loading ? "..." : value}
            </h3>
            {change && (
              <p className={cn("text-xs font-medium mt-1", 
                change.startsWith("+") ? "text-green-600" : "text-red-600"
              )}>
                {change}
              </p>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          {icon && (
            <div className="rounded-md bg-primary/10 p-2 text-primary">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StatsCard;
