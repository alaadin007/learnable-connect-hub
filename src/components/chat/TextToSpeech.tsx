
import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, Loader2, VolumeX } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface TextToSpeechProps {
  text: string;
  autoPlay?: boolean;
}

const TextToSpeech: React.FC<TextToSpeechProps> = ({ text, autoPlay = false }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cachedAudioUrlRef = useRef<string | null>(null);

  // Handle auto play when component mounts
  useEffect(() => {
    if (autoPlay && text) {
      handleTextToSpeech();
    }
  }, [autoPlay, text]);

  // Create audio element when URL changes
  useEffect(() => {
    if (audioUrl && !audioRef.current) {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.volume = volume;
      
      audio.onended = () => {
        setIsPlaying(false);
      };
      
      audio.onplay = () => {
        setIsPlaying(true);
      };
      
      audio.onpause = () => {
        setIsPlaying(false);
      };
    }
  }, [audioUrl]);

  // Update volume when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const handleTextToSpeech = async () => {
    // If there's already an audio URL, just play it again
    if (cachedAudioUrlRef.current && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => {
        console.error("Failed to play audio:", err);
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("text-to-speech", {
        body: { text }
      });
      
      if (error) throw error;
      
      if (data?.audioUrl) {
        setAudioUrl(data.audioUrl);
        cachedAudioUrlRef.current = data.audioUrl;
        
        // Create and play audio element
        const audio = new Audio(data.audioUrl);
        audioRef.current = audio;
        audio.volume = isMuted ? 0 : volume;
        
        audio.onended = () => {
          setIsPlaying(false);
        };
        
        audio.onplay = () => {
          setIsPlaying(true);
        };
        
        audio.onpause = () => {
          setIsPlaying(false);
        };
        
        await audio.play();
      }
    } catch (error) {
      console.error("Text-to-speech error:", error);
      toast.error("Could not generate speech");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMute = () => {
    if (audioRef.current) {
      if (!isMuted) {
        audioRef.current.volume = 0;
      } else {
        audioRef.current.volume = volume;
      }
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    
    if (audioRef.current && !isMuted) {
      audioRef.current.volume = newVolume;
    }
    
    if (newVolume === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current) {
      handleTextToSpeech();
      return;
    }
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => {
        console.error("Failed to play audio:", err);
      });
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          disabled={isLoading} 
          onClick={!isPlaying ? handleTextToSpeech : handlePlayPause}
          title={isPlaying ? "Pause speech" : "Listen to this message"}
          className={isPlaying ? "text-blue-500" : ""}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-60">
        <div className="flex items-center space-x-2 mb-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleToggleMute}
            className="h-8 w-8"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <Slider
            value={[volume]}
            max={1}
            step={0.01}
            onValueChange={handleVolumeChange}
          />
        </div>
        <div className="text-xs text-muted-foreground">
          Click the speaker icon to listen to the message
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default TextToSpeech;
