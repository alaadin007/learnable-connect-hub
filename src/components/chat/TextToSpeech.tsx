
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Volume2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface TextToSpeechProps {
  text: string;
}

const TextToSpeech: React.FC<TextToSpeechProps> = ({ text }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  const speakText = async () => {
    // If already speaking, stop
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      setAudio(null);
      return;
    }

    try {
      setIsLoading(true);

      // Use the browser's built-in speech synthesis
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
        
        // Set up listeners
        utterance.onend = () => {
          setIsLoading(false);
        };
        
        utterance.onerror = () => {
          setIsLoading(false);
          toast.error("Error playing speech");
        };
      } else {
        throw new Error("Speech synthesis not supported by your browser");
      }
    } catch (err) {
      console.error("Text-to-speech error:", err);
      toast.error("Could not generate speech. Browser may not support this feature.");
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6"
      onClick={speakText}
      title={audio ? "Stop reading" : "Read aloud"}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
      ) : (
        <Volume2 className={`h-4 w-4 ${audio ? 'text-primary' : 'text-gray-400'}`} />
      )}
    </Button>
  );
};

export default TextToSpeech;
