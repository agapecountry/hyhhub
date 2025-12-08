'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Search, X, Trash2, Pencil, Plus } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface Chore {
  id: string;
  household_id?: string;
  name: string;
  description: string | null;
  points: number;
  frequency?: string;
  category: string;
  difficulty: string;
}

interface AvailableChoresProps {
  chores: Chore[];
  onAssignChore: (chore: any) => void;
  onDeleteChore: (choreId: string) => void;
  onEditChore: (chore: any) => void;
  onAddChore: () => void;
  loading?: boolean;
}

export function AvailableChores({ chores, onAssignChore, onDeleteChore, onEditChore, onAddChore, loading = false }: AvailableChoresProps) {
  const [choreSearch, setChoreSearch] = useState('');
  const [showChoreDropdown, setShowChoreDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const filteredChores = chores.filter(chore =>
    chore.name.toLowerCase().includes(choreSearch.toLowerCase()) ||
    chore.category.toLowerCase().includes(choreSearch.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowChoreDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      cleaning: '🧹',
      dishes: '🍽️',
      laundry: '🧺',
      pets: '🐾',
      yard: '🌱',
      other: '📋',
    };
    return icons[category] || '📋';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Available Chores</CardTitle>
            <CardDescription>Assign chores to household members</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={onAddChore} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Chore
            </Button>
            <div className="relative" ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search chores..."
                value={choreSearch}
                onChange={(e) => {
                  setChoreSearch(e.target.value);
                  setShowChoreDropdown(true);
                }}
                onFocus={() => setShowChoreDropdown(true)}
                className="pl-8 pr-8 w-48"
              />
              {choreSearch && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full w-8 hover:bg-transparent"
                  onClick={() => {
                    setChoreSearch('');
                    setShowChoreDropdown(false);
                  }}
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
            </div>
            {showChoreDropdown && choreSearch && filteredChores.length > 0 && (
              <div className="absolute z-50 top-full mt-1 w-64 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
                {filteredChores.map((chore) => (
                  <div
                    key={chore.id}
                    className="flex items-center gap-2 p-2 hover:bg-accent cursor-pointer"
                    onClick={() => {
                      setChoreSearch(chore.name);
                      setShowChoreDropdown(false);
                    }}
                  >
                    <span>{getCategoryIcon(chore.category)}</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{chore.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {chore.points} coins • {chore.difficulty}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {showChoreDropdown && choreSearch && filteredChores.length === 0 && (
              <div className="absolute z-50 top-full mt-1 w-64 bg-popover border rounded-md shadow-lg p-3">
                <p className="text-sm text-muted-foreground text-center">No chores found</p>
              </div>
            )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chores.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No chores available
          </p>
        ) : filteredChores.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No chores match your search
          </p>
        ) : (
          <div className="space-y-2">
            {filteredChores.map((chore) => (
              <div
                key={chore.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-lg">{getCategoryIcon(chore.category)}</span>
                  <div className="flex-1">
                    <div className="font-medium">{chore.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-semibold text-primary">
                        {chore.points} coins
                      </span>
                      <Badge variant="outline" className="text-xs capitalize">
                        {chore.difficulty}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAssignChore(chore)}
                  >
                    Assign
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEditChore(chore)}
                    disabled={loading}
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteChore(chore.id)}
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
