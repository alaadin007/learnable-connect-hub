
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Mic, Loader2, StopCircle } from "lucide-react";
import { toast } from "sonner";

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onTranscriptionComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Add timer for recording duration
  useEffect(() => {
    if (isRecording) {
      timerRef.current = window.setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setRecordingDuration(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  const startRecording = useCallback(async () => {
    try {
      chunksRef.current = [];
      
      // Check if browser supports speech recognition
      const speechRecognitionSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
      
      if (speechRecognitionSupported) {
        // Use the Speech Recognition API if available
        // TypeScript-safe way to access the SpeechRecognition constructor
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        
        recognition.continuous = true;
        recognition.interimResults = false;
        
        recognition.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join(' ');
          
          if (transcript) {
            stopRecording();
            onTranscriptionComplete(transcript);
            toast.success("Voice input processed successfully!");
          }
        };
        
        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          stopRecording();
          toast.error("Error processing voice input. Please try again.");
        };
        
        recognition.start();
        setIsRecording(true);
        toast.success("Recording started. Speak clearly into your microphone.");
      } else {
        // Fallback to MediaRecorder API
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };
        
        mediaRecorder.onstop = async () => {
          setIsProcessing(true);
          
          // Create a simple alert since we can't transcribe
          toast.info("Voice recording completed, but automatic transcription is not available in this browser.");
          setIsProcessing(false);
        };
        
        mediaRecorder.start();
        setIsRecording(true);
        toast.success("Recording started. Speak clearly into your microphone.");
      }
    } catch (err) {
      console.error('Error accessing microphone:', err);
      toast.error("Could not access microphone. Please check permissions.");
    }
  }, [onTranscriptionComplete]);

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsRecording(false);
    }
    
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      
      // Stop all audio tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      
      setIsRecording(false);
      toast.info("Processing your voice input...");
    }
  };

  // Format recording time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Button 
      variant={isRecording ? "destructive" : "outline"} 
      size="icon"
      onClick={isRecording ? stopRecording : startRecording}
      disabled={isProcessing}
      className="flex items-center justify-center"
      type="button"
      title={isRecording ? "Stop recording" : "Record voice message"}
    >
      {isProcessing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isRecording ? (
        <div className="flex items-center">
          <StopCircle className="h-4 w-4" />
          <span className="ml-1 text-xs">{formatTime(recordingDuration)}</span>
        </div>
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </Button>
  );
};

export default VoiceRecorder;
