import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { EMOJI_CATEGORIES, EMOJIS_BY_CATEGORY } from '@/utils/emoji/emoji-list';

function EmojiCell({
  emoji,
  onSelect
}: {
  emoji: string;
  onSelect: (emoji: string) => void;
}) {
  const start = React.useRef<{ x: number; y: number } | null>(null);
  const moved = React.useRef(false);
  const THRESHOLD = 8;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 p-0"
      onPointerDown={(e) => {
        start.current = { x: e.clientX, y: e.clientY };
        moved.current = false;
      }}
      onPointerMove={(e) => {
        if (!start.current) return;
        const dx = Math.abs(e.clientX - start.current.x);
        const dy = Math.abs(e.clientY - start.current.y);
        if (dx > THRESHOLD || dy > THRESHOLD) moved.current = true;
      }}
      onPointerUp={() => {
        if (!moved.current) onSelect(emoji);
        start.current = null;
        moved.current = false;
      }}
      onPointerCancel={() => {
        start.current = null;
        moved.current = false;
      }}
      onClick={(e) => {
        if (moved.current) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}>
      <span className="text-lg">{emoji}</span>
    </Button>
  );
}

type EmojiModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (emoji: string) => void;
};

export default function EmojiModal({
  open,
  onOpenChange,
  onSelect
}: EmojiModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[95%] sm:w-[500px] h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Select an Emoji</DialogTitle>
          <DialogClose />
        </DialogHeader>

        {/* Scrollable emoji list */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 touch-pan-y overscroll-contain [-webkit-overflow-scrolling:touch]">
          {EMOJI_CATEGORIES.map((category) => (
            <div key={category}>
              <p className="font-semibold text-sm py-2">{category}</p>
              <div className="flex flex-wrap gap-2 pb-2">
                {EMOJIS_BY_CATEGORY[category].map((emoji, i) => (
                  <EmojiCell
                    key={`${category}-${i}`}
                    emoji={emoji}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
