
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TextToSpeechProps {
  text: string;
}

const TextToSpeech: React.FC<TextToSpeechProps> = ({ text }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const handleTextToSpeech = async () => {
    // If there's already an audio URL, just play it again
    if (audioUrl && audioRef.current) {
      audioRef.current.play();
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
        
        // Create and play audio element
        const audio = new Audio(data.audioUrl);
        audioRef.current = audio;
        audio.play();
      }
    } catch (error) {
      console.error("Text-to-speech error:", error);
      toast.error("Could not generate speech");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Button 
        variant="ghost" 
        size="icon"
        disabled={isLoading} 
        onClick={handleTextToSpeech}
        title="Listen to this message"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
};

export default TextToSpeech;
