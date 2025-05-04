
import * as React from "react";
import { Check, ChevronDown, UserCheck } from "lucide-react";
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
import { Teacher } from "./types";

interface TeacherSelectorProps {
  teachers: Teacher[];
  selectedTeacherId?: string;
  onSelect: (teacherId: string | null) => void;
  className?: string;
}

export const TeacherSelector: React.FC<TeacherSelectorProps> = ({
  teachers,
  selectedTeacherId,
  onSelect,
  className,
}) => {
  const [open, setOpen] = React.useState(false);

  const selectedTeacher = teachers.find(
    (teacher) => teacher.id === selectedTeacherId
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
            <UserCheck className="h-4 w-4 text-muted-foreground" />
            {selectedTeacher ? selectedTeacher.name : "Select teacher"}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search teacher..." />
          <CommandEmpty>No teacher found.</CommandEmpty>
          <CommandGroup>
            {teachers.map((teacher) => (
              <CommandItem
                key={teacher.id}
                value={teacher.name}
                onSelect={() => {
                  onSelect(teacher.id === selectedTeacherId ? null : teacher.id);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedTeacherId === teacher.id
                      ? "opacity-100"
                      : "opacity-0"
                  )}
                />
                {teacher.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
