import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TrendingUp, BarChart3, ListChecks, Home } from "lucide-react";

const MainNav = () => {
  const location = useLocation();
  
  const navItems = [
    {
      name: "Home",
      href: "/",
      icon: <Home className="h-4 w-4 mr-2" />,
    },
    {
      name: "Scanner",
      href: "/scanner",
      icon: <BarChart3 className="h-4 w-4 mr-2" />,
    },
    {
      name: "ExitAlert",
      href: "/alerts",
      icon: <ListChecks className="h-4 w-4 mr-2" />,
    },
  ];

  return (
    <div className="sticky top-0 z-10 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 md:px-6">
        <Link to="/" className="flex items-center mr-6">
          <TrendingUp className="h-5 w-5 text-primary mr-2" />
          <span className="hidden font-bold sm:inline-block">
            PatternScan
          </span>
        </Link>
        <nav className="flex items-center space-x-2 md:space-x-4">
          {navItems.map((item) => (
            <Button
              key={item.href}
              variant={location.pathname === item.href ? "default" : "ghost"}
              size="sm"
              className={cn(
                "h-9 justify-start",
                location.pathname === item.href
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                  : "hover:bg-muted"
              )}
              asChild
            >
              <Link to={item.href} className="flex items-center">
                {item.icon}
                {item.name}
              </Link>
            </Button>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default MainNav;
