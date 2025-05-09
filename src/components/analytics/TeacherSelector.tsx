
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeacherSelectorProps {
  value: string | null;
  onChange: (value: string) => void;
}

type Teacher = {
  id: string;
  full_name: string;
};

const TeacherSelector: React.FC<TeacherSelectorProps> = ({ value, onChange }) => {
  const { schoolId } = useAuth();
  const [open, setOpen] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchTeachers = async () => {
      if (!schoolId) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('teachers')
          .select('id, profiles:id (full_name)')
          .eq('school_id', schoolId);

        if (error) throw error;

        const formattedTeachers = data.map((t: any) => ({
          id: t.id,
          full_name: t.profiles?.full_name || 'Unknown Teacher'
        }));

        setTeachers(formattedTeachers);
      } catch (error) {
        console.error('Error fetching teachers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeachers();
  }, [schoolId]);

  const selectedTeacher = teachers.find(teacher => teacher.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={isLoading}
        >
          {value && selectedTeacher
            ? selectedTeacher.full_name
            : "Select teacher..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Search teachers..." />
          <CommandEmpty>No teacher found.</CommandEmpty>
          <CommandGroup>
            {teachers.map((teacher) => (
              <CommandItem
                key={teacher.id}
                value={teacher.id}
                onSelect={() => {
                  onChange(teacher.id === value ? '' : teacher.id);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === teacher.id ? "opacity-100" : "opacity-0"
                  )}
                />
                {teacher.full_name}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default TeacherSelector;
