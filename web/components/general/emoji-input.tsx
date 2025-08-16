import { Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import EmojiModal from '@/components/general/emoji-popover';
import { useState } from 'react';

interface EmojiInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
}

export function EmojiInput({
  value,
  onChange,
  placeholder,
  id
}: EmojiInputProps) {
  const [open, setOpen] = useState(false);

  const handleSelectEmoji = (emoji: string) => {
    onChange(value + emoji);
    setOpen(false);
  };

  return (
    <div className="relative w-full">
      <Input
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pr-10"
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-1 rounded-md"
        onClick={() => setOpen(true)}>
        <Smile className="w-4 h-4 text-gray-500" />
      </Button>

      <EmojiModal
        open={open}
        onOpenChange={setOpen}
        onSelect={handleSelectEmoji}
      />
    </div>
  );
}
