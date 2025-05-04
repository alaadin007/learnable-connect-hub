
import * as React from "react";
import { Check, ChevronDown, User } from "lucide-react";
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
  students: Student[];
  selectedStudentId?: string;
  onSelect: (studentId: string | null) => void;
  className?: string;
}

export const StudentSelector: React.FC<StudentSelectorProps> = ({
  students,
  selectedStudentId,
  onSelect,
  className,
}) => {
  const [open, setOpen] = React.useState(false);

  const selectedStudent = students.find(
    (student) => student.id === selectedStudentId
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-[200px] justify-between", className)}
        >
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            {selectedStudent ? selectedStudent.name : "Select student"}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search student..." />
          <CommandEmpty>No student found.</CommandEmpty>
          <CommandGroup>
            {students.map((student) => (
              <CommandItem
                key={student.id}
                value={student.name}
                onSelect={() => {
                  onSelect(student.id === selectedStudentId ? null : student.id);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedStudentId === student.id
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
};
