import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Mic, MicOff, Paperclip, FileText, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  content: string;
  timestamp: Date;
  attachmentType?: 'document' | 'video';
  attachmentId?: string;
  attachmentName?: string;
}

interface AIResponseSource {
  document_id: string;
  filename: string;
  relevance_score: number;
  excerpt?: string;
}

interface AIChatProps {
  conversationId?: string;
  onConversationCreated?: (id: string) => void;
  topic?: string;
  initialContext?: string;
  contextDocumentId?: string;
  contextVideoId?: string;
}

const AIChat: React.FC<AIChatProps> = ({
  conversationId,
  onConversationCreated,
  topic,
  initialContext,
  contextDocumentId,
  contextVideoId
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingAudio, setIsSendingAudio] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTextToSpeechEnabled, setIsTextToSpeechEnabled] = useState(false);
  const [sources, setSources] = useState<AIResponseSource[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const { user } = useAuth();
  
  useEffect(() => {
    if (conversationId) {
      loadMessages(conversationId);
    } else if (initialContext) {
      // If we have initial context but no conversation yet, create a system message
      const systemMessage: Message = {
        id: 'system-intro',
        sender: 'ai',
        content: initialContext,
        timestamp: new Date()
      };
      setMessages([systemMessage]);
    }

    return () => {
      // Clean up any active recordings
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [conversationId, initialContext]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async (convId: string) => {
    try {
      setIsLoading(true);
      
      // Fetch conversation messages
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('timestamp', { ascending: true });
      
      if (error) {
        throw error;
      }
      
      if (data) {
        const formattedMessages: Message[] = data.map(msg => ({
          id: msg.id,
          sender: msg.sender as 'user' | 'ai',
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          attachmentType: msg.attachment_type,
          attachmentId: msg.attachment_id,
          attachmentName: msg.attachment_name
        }));
        
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Could not load conversation history');
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !contextDocumentId && !contextVideoId) return;
    
    const messageText = newMessage.trim();
    setNewMessage('');
    
    // Generate a temporary ID for optimistic UI update
    const tempId = 'temp-' + Date.now();
    
    const userMessage: Message = {
      id: tempId,
      sender: 'user',
      content: messageText,
      timestamp: new Date()
    };
    
    // Add attachment details if context document/video is provided
    if (contextDocumentId) {
      userMessage.attachmentType = 'document';
      userMessage.attachmentId = contextDocumentId;
      
      // Fetch the document name
      const { data: docData } = await supabase
        .from('documents')
        .select('filename')
        .eq('id', contextDocumentId)
        .single();
        
      if (docData) {
        userMessage.attachmentName = docData.filename;
      }
    } else if (contextVideoId) {
      userMessage.attachmentType = 'video';
      userMessage.attachmentId = contextVideoId;
      
      // Fetch the video name/title
      const { data: videoData } = await supabase
        .from('videos')
        .select('title')
        .eq('id', contextVideoId)
        .single();
        
      if (videoData) {
        userMessage.attachmentName = videoData.title;
      }
    }
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    try {
      // Create or continue a conversation
      let currentConversationId = conversationId;
      let currentSessionId = sessionId;
      
      if (!currentConversationId) {
        // Create a new conversation
        const { data: convData, error: convError } = await supabase
          .from('conversations')
          .insert({
            user_id: user!.id,
            school_id: user!.user_metadata.school_id,
            title: messageText.slice(0, 50) + (messageText.length > 50 ? '...' : ''),
            topic: topic || null,
            tags: topic ? [topic] : []
          })
          .select()
          .single();
        
        if (convError) {
          throw new Error('Failed to create conversation: ' + convError.message);
        }
        
        currentConversationId = convData.id;
        
        // Create a new session log for analytics
        if (!currentSessionId) {
          const { data: sessionData } = await supabase.functions.invoke('create-session-log', {
            body: { topic },
          });
          
          if (sessionData?.id) {
            currentSessionId = sessionData.id;
            setSessionId(currentSessionId);
          }
        }
        
        // Notify parent component of new conversation
        if (onConversationCreated) {
          onConversationCreated(currentConversationId);
        }
      }
      
      // Save the user message
      const { data: msgData, error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: currentConversationId,
          content: messageText,
          sender: 'user',
          timestamp: new Date().toISOString(),
          attachment_type: userMessage.attachmentType,
          attachment_id: userMessage.attachmentId,
          attachment_name: userMessage.attachmentName
        })
        .select()
        .single();
      
      if (msgError) {
        throw new Error('Failed to save message: ' + msgError.message);
      }
      
      // Update the user message with the correct ID
      setMessages(prev => prev.map(msg => msg.id === tempId ? { ...msg, id: msgData.id } : msg));
      
      // Call the ask-ai function to get a response
      const { data: aiResponse, error: aiError } = await supabase.functions.invoke('ask-ai', {
        body: {
          question: messageText,
          topic,
          documentId: contextDocumentId,
          videoId: contextVideoId,
          conversationId: currentConversationId,
          sessionId: currentSessionId,
          useDocuments: true
        },
      });
      
      if (aiError) {
        throw new Error('Failed to get AI response: ' + aiError.message);
      }
      
      // Save the AI response
      const { data: aiMsgData, error: aiMsgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: currentConversationId,
          content: aiResponse.response,
          sender: 'ai',
          timestamp: new Date().toISOString()
        })
        .select()
        .single();
      
      if (aiMsgError) {
        throw new Error('Failed to save AI response: ' + aiMsgError.message);
      }
      
      // Add the AI message to the chat
      const aiMessage: Message = {
        id: aiMsgData.id,
        sender: 'ai',
        content: aiResponse.response,
        timestamp: new Date(aiMsgData.timestamp)
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // Store sources if available
      if (aiResponse.sourceCitations) {
        setSources(aiResponse.sourceCitations);
      } else {
        setSources([]);
      }
      
      // Use text-to-speech if enabled
      if (isTextToSpeechEnabled && aiResponse.response) {
        speakText(aiResponse.response);
      }
    } catch (error) {
      console.error('Error in chat:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send message');
      
      // Remove the temporary message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
    } finally {
      setIsLoading(false);
    }
  };

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
        try {
          setIsSendingAudio(true);
          
          // Combine audio chunks into a single blob
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          // Convert blob to base64
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = reader.result?.toString().split(',')[1];
            
            if (!base64Audio) {
              throw new Error('Failed to convert audio to base64');
            }
            
            // Send to the transcription endpoint
            const { data, error } = await supabase.functions.invoke('transcribe-audio', {
              body: { audio: base64Audio },
            });
            
            if (error) {
              throw new Error('Transcription failed: ' + error.message);
            }
            
            if (data?.text) {
              // Set the transcribed text as the new message
              setNewMessage(data.text);
              
              // Automatically send the message
              setTimeout(() => {
                handleSendMessage();
              }, 500);
            } else {
              toast.error('No speech detected. Please try again.');
            }
          };
        } catch (error) {
          console.error('Error processing audio:', error);
          toast.error(error instanceof Error ? error.message : 'Failed to process audio');
        } finally {
          setIsSendingAudio(false);
        }
      };
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Stop all audio tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const toggleVoiceMode = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const speakText = async (text: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text, voice: 'alloy' },
      });
      
      if (error) {
        throw new Error('Text-to-speech failed: ' + error.message);
      }
      
      if (data?.audioContent) {
        // Create audio from base64 content
        const audioSrc = `data:audio/mp3;base64,${data.audioContent}`;
        
        if (audioRef.current) {
          audioRef.current.src = audioSrc;
          audioRef.current.play();
        } else {
          const audio = new Audio(audioSrc);
          audioRef.current = audio;
          audio.play();
        }
      }
    } catch (error) {
      console.error('Error with text-to-speech:', error);
      toast.error('Failed to convert text to speech');
    }
  };

  const toggleTextToSpeech = () => {
    setIsTextToSpeechEnabled(!isTextToSpeechEnabled);
    toast.success(isTextToSpeechEnabled ? 'Voice responses disabled' : 'Voice responses enabled');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessage = (content: string) => {
    // Simple formatting for markdown-like content
    return content
      .split('\n')
      .map((line, i) => <div key={i}>{line}</div>);
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="p-4 border-b">
        <CardTitle className="text-lg flex items-center space-x-2">
          <MessageSquare className="h-5 w-5 text-blue-500" />
          <span>{topic ? `AI Chat: ${topic}` : 'AI Chat'}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow p-0 overflow-hidden flex flex-col">
        <div className="flex-grow p-4 overflow-y-auto">
          <div className="space-y-4">
            {messages.length === 0 && !isLoading && (
              <div className="flex items-center justify-center h-full text-center p-8">
                <div className="max-w-md">
                  <h3 className="text-lg font-semibold mb-2">Start a conversation with the AI tutor</h3>
                  <p className="text-gray-500 text-sm mb-4">
                    Ask questions about your learning materials, request summaries, or get help understanding difficult concepts.
                  </p>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <Button
                      variant="outline"
                      className="justify-start text-left"
                      onClick={() => setNewMessage("Can you summarize the main points from this material?")}
                    >
                      Summarize the main points
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start text-left"
                      onClick={() => setNewMessage("Explain this concept in simpler terms...")}
                    >
                      Explain a concept in simpler terms
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start text-left"
                      onClick={() => setNewMessage("Create 5 practice questions based on this material")}
                    >
                      Generate practice questions
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-3/4 rounded-lg p-4 ${
                    message.sender === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {message.attachmentType && (
                    <div className="flex items-center mb-2 text-xs p-2 rounded-md bg-white bg-opacity-20">
                      {message.attachmentType === 'document' ? (
                        <FileText className="h-3 w-3 mr-1" />
                      ) : (
                        <Video className="h-3 w-3 mr-1" />
                      )}
                      <span className="truncate">{message.attachmentName || message.attachmentType}</span>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">
                    {formatMessage(message.content)}
                  </div>
                  <div className={`text-right text-xs mt-1 ${message.sender === 'user' ? 'text-blue-200' : 'text-gray-500'}`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-3/4 rounded-lg p-4 bg-gray-100 text-gray-800">
                  <div className="flex space-x-2 items-center">
                    <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '250ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '500ms' }}></div>
                  </div>
                </div>
              </div>
            )}

            {sources.length > 0 && (
              <div className="border rounded-lg p-3 bg-blue-50">
                <h4 className="text-sm font-medium mb-2">Sources Referenced</h4>
                <div className="space-y-2">
                  {sources.map((source, index) => (
                    <div key={index} className="text-xs bg-white p-2 rounded border">
                      <div className="font-medium">{source.filename}</div>
                      {source.excerpt && <div className="mt-1 text-gray-600">{source.excerpt}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="p-4 border-t">
          <div className="flex items-end space-x-2">
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={toggleTextToSpeech}
              className={isTextToSpeechEnabled ? 'bg-blue-100' : ''}
              title={isTextToSpeechEnabled ? 'Disable voice responses' : 'Enable voice responses'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-volume-2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
              </svg>
            </Button>
            
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={toggleVoiceMode}
              disabled={isLoading || isSendingAudio}
              className={isRecording ? 'bg-red-100 text-red-500 animate-pulse' : ''}
              title="Toggle voice input"
            >
              {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
            </Button>
            
            <Textarea
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={isLoading || isSendingAudio || isRecording}
              className="flex-grow resize-none"
              rows={1}
            />
            
            <Button
              type="button"
              onClick={handleSendMessage}
              disabled={(!newMessage.trim() && !contextDocumentId && !contextVideoId) || isLoading || isSendingAudio || isRecording}
              size="icon"
              title="Send message"
            >
              <Send size={18} />
            </Button>
          </div>
          
          {isSendingAudio && (
            <div className="mt-2 text-xs text-center text-gray-500">
              Processing your voice message...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AIChat;
