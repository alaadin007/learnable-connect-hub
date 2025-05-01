
import React, { useState, useRef } from "react";
import { Volume, VolumeX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface TextToSpeechProps {
  text: string;
}

const TextToSpeech: React.FC<TextToSpeechProps> = ({ text }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const generateAndPlaySpeech = async () => {
    if (isPlaying && audioRef.current) {
      // If already playing, stop playback
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      return;
    }

    // Limit text length to prevent large requests
    const maxLength = 4000;
    const truncatedText = text.length > maxLength 
      ? text.substring(0, maxLength) + "... (text truncated for speech)"
      : text;

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("text-to-speech", {
        body: { 
          text: truncatedText,
          voice: "nova" // You can make this configurable
        },
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data.audio) {
        // Create audio from base64
        const audioSrc = `data:audio/mp3;base64,${data.audio}`;
        
        if (!audioRef.current) {
          audioRef.current = new Audio(audioSrc);
          
          audioRef.current.onended = () => {
            setIsPlaying(false);
          };
          
          audioRef.current.onerror = () => {
            setIsPlaying(false);
            toast({
              title: "Playback Error",
              description: "There was a problem playing the audio.",
              variant: "destructive",
            });
          };
        } else {
          audioRef.current.src = audioSrc;
        }
        
        // Play the audio
        await audioRef.current.play();
        setIsPlaying(true);
        
        toast({
          title: "Audio started",
          description: "AI response is being played.",
        });
      } else {
        throw new Error("No audio data received");
      }
    } catch (error: any) {
      console.error("Error generating speech:", error);
      toast({
        title: "Speech Generation Failed",
        description: "Could not generate speech for this response.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-6 w-6"
      onClick={generateAndPlaySpeech}
      disabled={isLoading || !text.trim()}
      title={isPlaying ? "Stop audio" : "Listen to response"}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isPlaying ? (
        <VolumeX className="h-4 w-4" />
      ) : (
        <Volume className="h-4 w-4" />
      )}
    </Button>
  );
};

export default TextToSpeech;
