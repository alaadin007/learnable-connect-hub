
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX } from 'lucide-react';

export interface TextToSpeechProps {
  message: string;
}

export const TextToSpeech: React.FC<TextToSpeechProps> = ({ message }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speech, setSpeech] = useState<SpeechSynthesis | null>(null);

  useEffect(() => {
    setSpeech(window.speechSynthesis);
  }, []);

  const speak = () => {
    if (!speech || isSpeaking) {
      stop();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    speech.speak(utterance);
    setIsSpeaking(true);
  };

  const stop = () => {
    if (speech) {
      speech.cancel();
      setIsSpeaking(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={speak}
      disabled={!message}
    >
      {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
    </Button>
  );
};

export default TextToSpeech;
