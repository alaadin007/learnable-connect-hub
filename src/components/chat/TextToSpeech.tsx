
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Volume2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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

      // Call our edge function to generate speech
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text, voice: 'alloy' }  // alloy is a neutral voice, can be customized
      });

      if (error) throw error;

      if (data?.audio) {
        // Create audio from base64
        const audioSrc = `data:audio/mp3;base64,${data.audio}`;
        const newAudio = new Audio(audioSrc);
        
        // Set up audio event handlers
        newAudio.onended = () => {
          setAudio(null);
        };
        
        newAudio.onerror = () => {
          toast.error("Error playing audio");
          setAudio(null);
        };
        
        // Play the audio
        setAudio(newAudio);
        await newAudio.play();
      } else {
        throw new Error("No audio data received");
      }
    } catch (err) {
      console.error("Text-to-speech error:", err);
      toast.error("Could not generate speech. Please try again.");
      
      // Fallback to browser's built-in speech synthesis
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
      }
    } finally {
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
