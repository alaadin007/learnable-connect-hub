
import React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Student } from "./types";

interface StudentSelectorProps {
  students: Student[];
  selectedStudentId: string | undefined;
  onStudentChange: (studentId: string | undefined) => void;
  className?: string;
  placeholder?: string;
}

export const StudentSelector: React.FC<StudentSelectorProps> = ({
  students,
  selectedStudentId,
  onStudentChange,
  className,
  placeholder = "Select student..."
}) => {
  const [open, setOpen] = React.useState(false);
  
  const selectedStudent = students.find(s => s.id === selectedStudentId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {selectedStudent ? (selectedStudent.name || selectedStudent.full_name) : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Search students..." />
          <CommandEmpty>No student found.</CommandEmpty>
          <CommandGroup>
            <CommandItem
              onSelect={() => {
                onStudentChange(undefined);
                setOpen(false);
              }}
              className="text-muted-foreground"
            >
              {!selectedStudentId && <Check className="mr-2 h-4 w-4" />}
              All Students
            </CommandItem>
            {students.map((student) => (
              <CommandItem
                key={student.id}
                onSelect={() => {
                  onStudentChange(student.id);
                  setOpen(false);
                }}
              >
                {student.id === selectedStudentId && (
                  <Check className="mr-2 h-4 w-4" />
                )}
                {student.name || student.full_name}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
