'use client';

import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
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

interface Category {
  id: string;
  name: string;
  icon?: string;
}

interface SearchableCategorySelectProps {
  categories: Category[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  onAddNew?: () => void;
  allowNone?: boolean;
}

export function SearchableCategorySelect({
  categories,
  value,
  onValueChange,
  placeholder = 'Select category...',
  onAddNew,
  allowNone = true,
}: SearchableCategorySelectProps) {
  const [open, setOpen] = useState(false);

  const selectedCategory = useMemo(() => {
    if (!value || value === 'none') return null;
    return categories.find((cat) => cat.id === value);
  }, [categories, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedCategory ? (
            <span className="flex items-center gap-2">
              {selectedCategory.icon && <span>{selectedCategory.icon}</span>}
              <span>{selectedCategory.name}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search categories..." />
          <CommandList>
            <CommandEmpty>No category found.</CommandEmpty>
            <CommandGroup>
              {allowNone && (
                <CommandItem
                  value="none"
                  onSelect={() => {
                    onValueChange('none');
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === 'none' || !value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  None
                </CommandItem>
              )}
              {categories.map((category) => (
                <CommandItem
                  key={category.id}
                  value={category.name}
                  onSelect={() => {
                    onValueChange(category.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === category.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className="flex items-center gap-2">
                    {category.icon && <span>{category.icon}</span>}
                    <span>{category.name}</span>
                  </span>
                </CommandItem>
              ))}
              {onAddNew && (
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    onAddNew();
                  }}
                  className="border-t"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Category
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
