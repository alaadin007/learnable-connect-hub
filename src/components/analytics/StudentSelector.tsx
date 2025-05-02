
import React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Student } from "./types";

interface StudentSelectorProps {
  students?: Student[];
  selectedStudent?: Student | null;
  selectedStudentId?: string;
  onStudentSelect?: (student: Student | null) => void;
  onStudentChange?: (studentId: string | undefined) => void;
}

export function StudentSelector({ 
  students = [], 
  selectedStudent, 
  selectedStudentId,
  onStudentSelect,
  onStudentChange
}: StudentSelectorProps) {
  const [open, setOpen] = React.useState(false);

  // Handle both the new and old API
  const handleSelect = (student: Student | null) => {
    if (onStudentSelect) {
      onStudentSelect(student);
    }
    if (onStudentChange) {
      onStudentChange(student?.id);
    }
    setOpen(false);
  };

  // Determine what to display in the button
  const displayName = selectedStudent?.name || 
    (selectedStudentId ? `Student ${selectedStudentId.substring(0, 5)}...` : "Select student...");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {displayName}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Search students..." />
          <CommandEmpty>No student found.</CommandEmpty>
          <CommandGroup>
            <CommandItem 
              onSelect={() => handleSelect(null)}
            >
              <Check
                className={cn(
                  "mr-2 h-4 w-4",
                  (!selectedStudent && !selectedStudentId) ? "opacity-100" : "opacity-0"
                )}
              />
              All Students
            </CommandItem>
            {students.map((student) => (
              <CommandItem
                key={student.id}
                onSelect={() => handleSelect(student)}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    (selectedStudent?.id === student.id || selectedStudentId === student.id)
                      ? "opacity-100"
                      : "opacity-0"
                  )}
                />
                {student.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
