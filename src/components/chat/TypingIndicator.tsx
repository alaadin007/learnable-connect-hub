import React from "react";
import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  className?: string;
}

const TypingIndicator = ({ className }: TypingIndicatorProps) => {
  return (
    <div className={cn("flex items-center space-x-1 px-3 py-2", className)}>
      <div className="text-muted-foreground text-sm">AI ready</div>
      <div className="flex space-x-1">
        <div className="h-2 w-2 rounded-full bg-blue-500" />
        <div className="h-2 w-2 rounded-full bg-blue-500" />
        <div className="h-2 w-2 rounded-full bg-blue-500" />
      </div>
    </div>
  );
};

export default TypingIndicator;
