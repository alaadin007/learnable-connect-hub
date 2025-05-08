
import React from "react";
import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  className?: string;
}

const TypingIndicator = ({ className }: TypingIndicatorProps) => {
  return (
    <div className={cn("flex items-center px-3 py-2", className)}>
      <div className="text-sm">AI ready</div>
    </div>
  );
};

export default TypingIndicator;
