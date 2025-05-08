
// Update the VoiceRecorder component to support the onSendMessage prop
import React, { useState, useRef } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export interface VoiceRecorderProps {
  placeholder?: string;
  isLoading?: boolean;
  onSendMessage?: (message: string) => Promise<void>;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ 
  placeholder = "Voice recording...",
  isLoading = false,
  onSendMessage
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        await processAudio();
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Unable to access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      
      // Stop all audio tracks
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getAudioTracks().forEach(track => track.stop());
      }
      
      setIsRecording(false);
    }
  };

  const processAudio = async () => {
    if (audioChunksRef.current.length === 0) return;
    
    setIsProcessing(true);
    
    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        const base64Data = base64Audio.split(',')[1]; // Remove the data URL prefix
        
        const { data, error } = await supabase.functions.invoke('transcribe-audio', {
          body: { audio: base64Data }
        });
        
        if (error) {
          console.error('Error transcribing audio:', error);
          toast.error('Failed to transcribe audio');
          return;
        }
        
        const transcription = data.text;
        
        if (transcription && transcription.trim() && onSendMessage) {
          toast.success('Audio transcribed successfully');
          await onSendMessage(transcription);
        } else {
          toast.info('No speech detected');
        }
      };
    } catch (error) {
      console.error('Error processing audio:', error);
      toast.error('Failed to process recording');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      {!isRecording ? (
        <Button 
          type="button"
          variant="outline"
          size="icon"
          disabled={isLoading || isProcessing}
          onClick={startRecording}
          className="rounded-full"
          title="Start voice recording"
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>
      ) : (
        <Button 
          type="button"
          variant="destructive"
          size="icon" 
          onClick={stopRecording}
          className="rounded-full animate-pulse"
          title="Stop recording"
        >
          <Square className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default VoiceRecorder;
