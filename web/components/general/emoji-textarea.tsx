import { Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import EmojiModal from '@/components/general/emoji-popover';
import { useState } from 'react';

interface EmojiTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  minHeight?: number;
}

export function EmojiTextArea({
  value,
  onChange,
  placeholder,
  id,
  minHeight = 80
}: EmojiTextAreaProps) {
  const [open, setOpen] = useState(false);

  const handleSelectEmoji = (emoji: string) => {
    onChange(value + emoji);
    setOpen(false);
  };

  return (
    <div className="relative">
      <Textarea
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pr-10"
        style={{ minHeight, whiteSpace: 'pre-wrap' }}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute bottom-2 right-2"
        onClick={() => setOpen(true)}>
        <Smile className="w-5 h-5 text-gray-500" />
      </Button>

      <EmojiModal
        open={open}
        onOpenChange={setOpen}
        onSelect={handleSelectEmoji}
      />
    </div>
  );
}
