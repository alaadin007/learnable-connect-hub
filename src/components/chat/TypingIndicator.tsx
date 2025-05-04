
import React from "react";

const TypingIndicator: React.FC = () => {
  return (
    <div className="flex items-center space-x-1 my-2 px-4">
      <div className="h-2 w-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: "0ms" }}></div>
      <div className="h-2 w-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: "300ms" }}></div>
      <div className="h-2 w-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: "600ms" }}></div>
    </div>
  );
};

export default TypingIndicator;
