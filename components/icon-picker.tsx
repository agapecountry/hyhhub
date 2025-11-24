'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const POPULAR_ICONS = [
  // Expense icons
  { emoji: '🛒', name: 'Groceries', category: 'expense' },
  { emoji: '🍽️', name: 'Dining', category: 'expense' },
  { emoji: '🚗', name: 'Transportation', category: 'expense' },
  { emoji: '⛽', name: 'Gas', category: 'expense' },
  { emoji: '💡', name: 'Utilities', category: 'expense' },
  { emoji: '🏠', name: 'Housing', category: 'expense' },
  { emoji: '🛡️', name: 'Insurance', category: 'expense' },
  { emoji: '⚕️', name: 'Healthcare', category: 'expense' },
  { emoji: '🎬', name: 'Entertainment', category: 'expense' },
  { emoji: '🛍️', name: 'Shopping', category: 'expense' },
  { emoji: '📱', name: 'Subscriptions', category: 'expense' },
  { emoji: '💳', name: 'Credit Card', category: 'expense' },
  { emoji: '💸', name: 'Personal Loan', category: 'expense' },
  { emoji: '📚', name: 'Education', category: 'expense' },
  { emoji: '💆', name: 'Personal Care', category: 'expense' },
  { emoji: '🐾', name: 'Pet Care', category: 'expense' },
  { emoji: '🔨', name: 'Home Improvement', category: 'expense' },
  { emoji: '🎁', name: 'Gifts', category: 'expense' },
  { emoji: '❤️', name: 'Charity', category: 'expense' },
  { emoji: '📌', name: 'Miscellaneous', category: 'expense' },
  // Income icons
  { emoji: '💰', name: 'Salary', category: 'income' },
  { emoji: '💼', name: 'Freelance', category: 'income' },
  { emoji: '📈', name: 'Investment', category: 'income' },
  { emoji: '🎉', name: 'Bonus', category: 'income' },
  { emoji: '↩️', name: 'Refund', category: 'income' },
  { emoji: '💵', name: 'Money', category: 'income' },
  // Transfer
  { emoji: '🔄', name: 'Transfer', category: 'transfer' },
];

interface IconPickerProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function IconPicker({
  value,
  onValueChange,
  placeholder = 'Select icon...',
}: IconPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-20 justify-between px-2"
        >
          {value ? (
            <span className="text-xl">{value}</span>
          ) : (
            <span className="text-xs text-muted-foreground">Icon</span>
          )}
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search icons..." />
          <CommandList>
            <CommandEmpty>No icon found.</CommandEmpty>
            <CommandGroup>
              <div className="grid grid-cols-6 gap-1 p-2">
                {POPULAR_ICONS.map((icon) => (
                  <button
                    key={icon.emoji}
                    type="button"
                    onClick={() => {
                      onValueChange(icon.emoji);
                      setOpen(false);
                    }}
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-md text-xl hover:bg-accent transition-colors',
                      value === icon.emoji && 'bg-accent ring-2 ring-primary'
                    )}
                    title={icon.name}
                  >
                    {icon.emoji}
                  </button>
                ))}
              </div>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
