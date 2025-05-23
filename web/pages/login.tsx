import { Card } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const activties = [
  { value: "volleyball", label: "Volleyball" },
  {
    value: "basketball",
    label: "Basketball",
  },
  { value: "soccer", label: "Soccer" },
  { value: "tennis", label: "Tennis" },
  { value: "swimming", label: "Swimming" },
  { value: "running", label: "Running" },
  { value: "cycling", label: "Cycling" },
];

export default function Login() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<string | null>(null);

  return (
    // feel free to remove everything inside this div
    // I was just messing around
    <div className="flex  min-h-[calc(100svh-164px)] flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <Card className="p-6 w-full max-w-sm">
        <h1>Login</h1>
        <p>Login page</p>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-[200px] justify-between"
            >
              {value
                ? activties.find((activity) => activity.value === value)?.label
                : "Select a hobby..."}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
            <Command>
              <CommandInput placeholder="Search hobbies..." className="h-9" />
              <CommandList>
                <CommandEmpty>No hobbies found.</CommandEmpty>
                <CommandGroup>
                  {activties.map((activity) => (
                    <CommandItem
                      key={activity.value}
                      onSelect={(currentValue) => {
                        setValue(currentValue === value ? null : currentValue);
                        setOpen(false);
                      }}
                      value={activity.value}
                    >
                      {activity.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </Card>
    </div>
  );
}
