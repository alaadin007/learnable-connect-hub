
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export type AIModel = {
  id: string;
  name: string;
  provider: "openai" | "gemini";
  description?: string;
};

interface AIModelSelectorProps {
  selectedModelId: string;
  onModelChange: (modelId: string) => void;
  disabled?: boolean;
}

const availableModels: AIModel[] = [
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini (OpenAI)",
    provider: "openai",
    description: "Fast and cost-effective for most queries"
  },
  {
    id: "gpt-4o",
    name: "GPT-4o (OpenAI)",
    provider: "openai",
    description: "More powerful but slower and costlier"
  },
  {
    id: "gemini-1.0-pro",
    name: "Gemini Pro (Google)",
    provider: "gemini",
    description: "Google's advanced AI model"
  }
];

export const getModelById = (modelId: string): AIModel | undefined => {
  return availableModels.find(model => model.id === modelId);
};

export const getModelProvider = (modelId: string): "openai" | "gemini" | undefined => {
  const model = getModelById(modelId);
  return model?.provider;
};

const AIModelSelector: React.FC<AIModelSelectorProps> = ({ 
  selectedModelId, 
  onModelChange,
  disabled = false
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="model-selector">AI Model</Label>
      <Select
        value={selectedModelId}
        onValueChange={onModelChange}
        disabled={disabled}
      >
        <SelectTrigger id="model-selector" className="w-full">
          <SelectValue placeholder="Select AI model" />
        </SelectTrigger>
        <SelectContent>
          {availableModels.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              <div className="flex flex-col">
                <span>{model.name}</span>
                {model.description && (
                  <span className="text-xs text-muted-foreground">{model.description}</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default AIModelSelector;
