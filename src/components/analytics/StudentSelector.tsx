
import * as React from "react";
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
import { useState } from "react";

interface Student {
  id: string;
  name: string;
}

interface StudentSelectorProps {
  students: Student[];
  selectedStudent: Student | null;
  onStudentSelect: (student: Student | null) => void;
}

export function StudentSelector({ students, selectedStudent, onStudentSelect }: StudentSelectorProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedStudent ? selectedStudent.name : "Select student..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Search student..." />
          <CommandEmpty>No student found.</CommandEmpty>
          <CommandGroup>
            <CommandItem
              key="all"
              value="all"
              onSelect={() => {
                onStudentSelect(null);
                setOpen(false);
              }}
            >
              <Check
                className={cn(
                  "mr-2 h-4 w-4",
                  !selectedStudent ? "opacity-100" : "opacity-0"
                )}
              />
              All Students
            </CommandItem>
            {students.map((student) => (
              <CommandItem
                key={student.id}
                value={student.name}
                onSelect={() => {
                  onStudentSelect(student);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedStudent?.id === student.id ? "opacity-100" : "opacity-0"
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
