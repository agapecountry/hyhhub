'use client';

import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Payee {
  id: string;
  name: string;
  debt_id?: string | null;
  bill_id?: string | null;
  debt_name?: string | null;
}

interface SearchablePayeeSelectProps {
  payees: Payee[];
  value: string;
  onValueChange: (value: string) => void;
  onAddNew?: (name?: string) => void;
  placeholder?: string;
  allowNone?: boolean;
}

export function SearchablePayeeSelect({
  payees,
  value,
  onValueChange,
  onAddNew,
  placeholder = 'Select payee...',
  allowNone = true,
}: SearchablePayeeSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [pendingPayeeName, setPendingPayeeName] = useState('');

  const selectedPayee = useMemo(() => {
    if (!value || value === 'none') return null;
    return payees.find((payee) => payee.id === value);
  }, [payees, value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchValue.trim()) {
      // Check if search value matches any existing payee
      const matchingPayee = payees.find(
        (p) => p.name.toLowerCase() === searchValue.toLowerCase()
      );
      
      if (!matchingPayee) {
        // No match found, ask to create new payee
        e.preventDefault();
        setPendingPayeeName(searchValue.trim());
        setShowAddDialog(true);
        setOpen(false);
      }
    }
  };

  const handleAddNewPayee = () => {
    setShowAddDialog(false);
    if (onAddNew) {
      onAddNew(pendingPayeeName);
    }
    setPendingPayeeName('');
    setSearchValue('');
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedPayee ? (
              <span className="flex items-center gap-2">
                <span>{selectedPayee.debt_name || selectedPayee.name}</span>
                {selectedPayee.debt_id && (
                  <Badge variant="outline" className="text-xs">Debt</Badge>
                )}
                {selectedPayee.bill_id && (
                  <Badge variant="outline" className="text-xs">Bill</Badge>
                )}
              </span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Search or type new payee..." 
              value={searchValue}
              onValueChange={setSearchValue}
              onKeyDown={handleKeyDown}
            />
            <CommandList>
              <CommandEmpty>
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground mb-3">No payee found.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setPendingPayeeName(searchValue.trim());
                      setShowAddDialog(true);
                      setOpen(false);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add "{searchValue}" as payee
                  </Button>
                </div>
              </CommandEmpty>
              <CommandGroup>
                {allowNone && (
                  <CommandItem
                    value="none"
                    onSelect={() => {
                      onValueChange('none');
                      setOpen(false);
                      setSearchValue('');
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
                {payees.map((payee) => (
                  <CommandItem
                    key={payee.id}
                    value={payee.name}
                    onSelect={() => {
                      onValueChange(payee.id);
                      setOpen(false);
                      setSearchValue('');
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === payee.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="flex items-center gap-2 flex-1">
                      <span>{payee.debt_name || payee.name}</span>
                      {payee.debt_id && (
                        <Badge variant="outline" className="text-xs">Debt</Badge>
                      )}
                      {payee.bill_id && (
                        <Badge variant="outline" className="text-xs">Bill</Badge>
                      )}
                    </span>
                  </CommandItem>
                ))}
                {onAddNew && (
                  <CommandItem
                    onSelect={() => {
                      setOpen(false);
                      onAddNew();
                      setSearchValue('');
                    }}
                    className="border-t"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Payee
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <AlertDialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add New Payee?</AlertDialogTitle>
            <AlertDialogDescription>
              Would you like to add <span className="font-semibold">"{pendingPayeeName}"</span> as a new payee?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setPendingPayeeName('');
              setSearchValue('');
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleAddNewPayee}>
              Add Payee
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
