
import React, { useState } from 'react';
import { BookOpen, Save, X, Edit, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Flashcard {
  id?: string;
  front: string;
  back: string;
  isEditing?: boolean;
}

interface FlashcardCreatorProps {
  documentId?: string;
  videoId?: string;
  initialFlashcards?: Flashcard[];
  onSave?: (flashcards: Flashcard[]) => void;
}

const FlashcardCreator: React.FC<FlashcardCreatorProps> = ({
  documentId,
  videoId,
  initialFlashcards = [],
  onSave
}) => {
  const [flashcards, setFlashcards] = useState<Flashcard[]>(initialFlashcards);
  const [currentCard, setCurrentCard] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isAutoGenerating, setIsAutoGenerating] = useState<boolean>(false);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [generationOptions, setGenerationOptions] = useState({
    count: 10,
    difficulty: 'medium'
  });
  
  const { user } = useAuth();

  const handleNewCard = () => {
    setFlashcards([...flashcards, { front: '', back: '', isEditing: true }]);
    setCurrentCard(flashcards.length);
    setIsFlipped(false);
    setIsEditing(true);
  };

  const handleDeleteCard = (index: number) => {
    const newFlashcards = [...flashcards];
    newFlashcards.splice(index, 1);
    setFlashcards(newFlashcards);
    
    // Adjust current card if needed
    if (index <= currentCard && currentCard > 0) {
      setCurrentCard(currentCard - 1);
    }
    
    toast.success('Flashcard deleted');
  };

  const handleEditCard = (index: number) => {
    setCurrentCard(index);
    setIsEditing(true);
  };

  const handleSaveCard = (index: number, front: string, back: string) => {
    if (!front.trim() || !back.trim()) {
      toast.error('Both front and back of the card must have content');
      return;
    }
    
    const newFlashcards = [...flashcards];
    newFlashcards[index] = { ...newFlashcards[index], front, back, isEditing: false };
    setFlashcards(newFlashcards);
    setIsEditing(false);
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handlePrevCard = () => {
    if (currentCard > 0) {
      setCurrentCard(currentCard - 1);
      setIsFlipped(false);
    }
  };

  const handleNextCard = () => {
    if (currentCard < flashcards.length - 1) {
      setCurrentCard(currentCard + 1);
      setIsFlipped(false);
    }
  };

  const handleSaveFlashcards = async () => {
    if (!user) {
      toast.error('You must be logged in to save flashcards');
      return;
    }

    if (flashcards.length === 0) {
      toast.error('No flashcards to save');
      return;
    }

    // Check for empty cards
    if (flashcards.some(card => !card.front.trim() || !card.back.trim())) {
      toast.error('All cards must have content on both sides');
      return;
    }

    try {
      // Save all flashcards to the database
      const flashcardPromises = flashcards.map(card => {
        return supabase
          .from('flashcards')
          .insert({
            user_id: user.id,
            document_id: documentId,
            video_id: videoId,
            front: card.front,
            back: card.back,
            created_at: new Date().toISOString()
          });
      });
      
      await Promise.all(flashcardPromises);
      
      toast.success('Flashcards saved successfully');
      
      if (onSave) {
        onSave(flashcards);
      }
    } catch (error) {
      console.error('Error saving flashcards:', error);
      toast.error('Failed to save flashcards');
    }
  };

  const handleAutoGenerateFlashcards = async () => {
    if (!documentId && !videoId) {
      toast.error('You need a document or video to auto-generate flashcards');
      return;
    }

    try {
      setIsAutoGenerating(true);
      
      let functionName = '';
      let requestBody = {};
      
      if (documentId) {
        functionName = 'document-processor';
        requestBody = {
          documentId,
          action: 'extract_flashcards',
          options: generationOptions
        };
      } else if (videoId) {
        functionName = 'video-processor';
        requestBody = {
          videoId,
          action: 'extract_flashcards',
          options: generationOptions
        };
      }
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: requestBody,
      });
      
      if (error) {
        throw new Error('Failed to generate flashcards: ' + error.message);
      }
      
      if (!data || !data.flashcards || !Array.isArray(data.flashcards)) {
        throw new Error('Invalid response from flashcard generator');
      }
      
      const generatedFlashcards: Flashcard[] = data.flashcards.map(card => ({
        front: card.front,
        back: card.back
      }));
      
      setFlashcards(generatedFlashcards);
      setCurrentCard(0);
      setIsFlipped(false);
      setDialogOpen(false);
      
      toast.success(`Generated ${generatedFlashcards.length} flashcards`);
    } catch (error) {
      console.error('Error generating flashcards:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate flashcards');
    } finally {
      setIsAutoGenerating(false);
    }
  };

  const CardEditor = ({ index, front, back }: { index: number, front: string, back: string }) => {
    const [editFront, setEditFront] = useState(front);
    const [editBack, setEditBack] = useState(back);

    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="cardFront">Front (Question/Term)</Label>
          <Textarea
            id="cardFront"
            placeholder="Enter the question or term"
            value={editFront}
            onChange={(e) => setEditFront(e.target.value)}
            className="mt-1"
            rows={3}
          />
        </div>
        <div>
          <Label htmlFor="cardBack">Back (Answer/Definition)</Label>
          <Textarea
            id="cardBack"
            placeholder="Enter the answer or definition"
            value={editBack}
            onChange={(e) => setEditBack(e.target.value)}
            className="mt-1"
            rows={3}
          />
        </div>
        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(false)}
          >
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => handleSaveCard(index, editFront, editBack)}
          >
            <Save className="h-4 w-4 mr-1" /> Save
          </Button>
        </div>
      </div>
    );
  };

  const FlashcardDisplay = ({ card }: { card: Flashcard }) => {
    return (
      <div 
        className="relative w-full aspect-[3/2] mx-auto perspective-1000 cursor-pointer"
        onClick={isEditing ? undefined : handleFlip}
      >
        <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
          {/* Front of card */}
          <div className={`absolute w-full h-full backface-hidden bg-white rounded-xl shadow-lg border p-6 flex flex-col ${isFlipped ? 'hidden' : ''}`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-500">Question/Term</h3>
              {flashcards.length > 0 && (
                <span className="text-xs text-gray-400">
                  {currentCard + 1} / {flashcards.length}
                </span>
              )}
            </div>
            <div className="flex-grow flex items-center justify-center">
              <p className="text-lg font-medium text-center">{card.front}</p>
            </div>
            <div className="text-center text-sm text-gray-400 mt-2">
              Click to flip
            </div>
          </div>
          
          {/* Back of card */}
          <div className={`absolute w-full h-full backface-hidden bg-blue-50 rounded-xl shadow-lg border p-6 flex flex-col rotate-y-180 ${isFlipped ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-500">Answer/Definition</h3>
              {flashcards.length > 0 && (
                <span className="text-xs text-gray-400">
                  {currentCard + 1} / {flashcards.length}
                </span>
              )}
            </div>
            <div className="flex-grow flex items-center justify-center">
              <p className="text-lg font-medium text-center">{card.back}</p>
            </div>
            <div className="text-center text-sm text-gray-400 mt-2">
              Click to flip back
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center">
            <BookOpen className="h-5 w-5 text-blue-500 mr-2" />
            Flashcards
          </CardTitle>
          <div className="flex gap-2">
            {(documentId || videoId) && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    Auto Generate
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Generate Flashcards</DialogTitle>
                    <DialogDescription>
                      Automatically create flashcards from your document or video using AI.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="numCards" className="text-right">
                        Number of cards
                      </Label>
                      <Input
                        id="numCards"
                        type="number"
                        min="1"
                        max="20"
                        value={generationOptions.count}
                        onChange={(e) => setGenerationOptions({...generationOptions, count: parseInt(e.target.value)})}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="difficulty" className="text-right">
                        Difficulty
                      </Label>
                      <Select
                        value={generationOptions.difficulty}
                        onValueChange={(value) => setGenerationOptions({...generationOptions, difficulty: value})}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select difficulty" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button onClick={() => setDialogOpen(false)} variant="outline">
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleAutoGenerateFlashcards}
                      disabled={isAutoGenerating}
                    >
                      {isAutoGenerating ? 'Generating...' : 'Generate'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            
            <Button variant="outline" size="sm" onClick={handleNewCard}>
              <Plus className="h-4 w-4 mr-1" /> Add Card
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {flashcards.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-500 mb-2">No Flashcards Yet</h3>
            <p className="text-gray-400 text-sm mb-4">
              Create your own flashcards or generate them automatically from your learning materials.
            </p>
            <div className="flex justify-center gap-2">
              <Button onClick={handleNewCard}>
                <Plus className="h-4 w-4 mr-1" /> Create Flashcard
              </Button>
              {(documentId || videoId) && (
                <Button variant="outline" onClick={() => setDialogOpen(true)}>
                  Auto Generate
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Card view */}
            <div className="h-64 md:h-80 p-4 bg-gray-50 rounded-lg">
              {isEditing ? (
                <CardEditor
                  index={currentCard}
                  front={flashcards[currentCard]?.front || ''}
                  back={flashcards[currentCard]?.back || ''}
                />
              ) : (
                <FlashcardDisplay card={flashcards[currentCard]} />
              )}
            </div>
            
            {/* Card controls */}
            {!isEditing && flashcards.length > 0 && (
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={handlePrevCard}
                  disabled={currentCard === 0}
                >
                  Previous
                </Button>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleEditCard(currentCard)}
                  >
                    <Edit className="h-4 w-4 mr-1" /> Edit
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleDeleteCard(currentCard)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </Button>
                </div>
                <Button
                  variant="outline"
                  onClick={handleNextCard}
                  disabled={currentCard >= flashcards.length - 1}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between pt-0">
        <div className="text-xs text-gray-500">
          {flashcards.length} card{flashcards.length !== 1 ? 's' : ''}
        </div>
        {flashcards.length > 0 && (
          <Button onClick={handleSaveFlashcards}>
            <Save className="h-4 w-4 mr-1" /> Save Flashcards
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default FlashcardCreator;
