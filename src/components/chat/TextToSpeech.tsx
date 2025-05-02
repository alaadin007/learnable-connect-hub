
import React from 'react';
import { Button } from "@/components/ui/button";
import { Volume2 } from "lucide-react";
import { toast } from "sonner";

interface TextToSpeechProps {
  text: string;
}

const TextToSpeech: React.FC<TextToSpeechProps> = ({ text }) => {
  const speakText = () => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Get available voices
      let voices = window.speechSynthesis.getVoices();
      
      // If voices array is empty, wait for voices to load
      if (voices.length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          voices = window.speechSynthesis.getVoices();
          setVoice(utterance, voices);
          window.speechSynthesis.speak(utterance);
        };
      } else {
        setVoice(utterance, voices);
        window.speechSynthesis.speak(utterance);
      }
    } else {
      toast.error("Text-to-speech is not supported in your browser");
    }
  };

  const setVoice = (utterance: SpeechSynthesisUtterance, voices: SpeechSynthesisVoice[]) => {
    // Try to find a good English voice
    const preferredVoice = voices.find(voice => 
      voice.lang.startsWith('en') && (voice.name.includes('Google') || voice.name.includes('Microsoft') || voice.name.includes('Natural'))
    );
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    // Adjust speech parameters
    utterance.rate = 1.0;  // Normal speed
    utterance.pitch = 1.0; // Normal pitch
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6"
      onClick={speakText}
      title="Read aloud"
    >
      <Volume2 className="h-4 w-4 text-gray-400" />
    </Button>
  );
};

export default TextToSpeech;
