
import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronUp } from "lucide-react";

interface ScrollToTopButtonProps {
  onClick: () => void;
}

const ScrollToTopButton: React.FC<ScrollToTopButtonProps> = ({ onClick }) => {
  return (
    <Button
      onClick={onClick}
      size="icon"
      variant="outline"
      className="absolute bottom-4 right-4 rounded-full shadow-md border border-slate-200 bg-white hover:bg-slate-50"
    >
      <ChevronUp className="h-5 w-5" />
    </Button>
  );
};

export default ScrollToTopButton;
