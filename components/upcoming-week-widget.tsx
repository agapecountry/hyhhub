'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, CreditCard, Apple, AlertCircle, Clock, Users, Edit, CheckSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/lib/supabase';
import { useHousehold } from '@/lib/household-context';
import { useAuth } from '@/lib/auth-context';
import { format, addDays, startOfDay, endOfDay, isToday, isTomorrow, parseISO } from 'date-fns';
import { formatCurrency } from '@/lib/format';
import Link from 'next/link';

interface DayItem {
  id: string;
  type: 'debt' | 'event' | 'pantry' | 'chore';
  title: string;
  subtitle?: string;
  time?: string;
  color?: string;
  priority?: 'high' | 'medium' | 'low';
}

interface Recipe {
  id: string;
  name: string;
  description: string | null;
  prep_time: number | null;
  cook_time: number | null;
  servings: number | null;
  instructions: string | null;
  category: string | null;
}

interface RecipeIngredient {
  id: string;
  recipe_id: string;
  name: string;
  quantity: string | null;
  order_index: number;
}

interface MealPlan {
  id: string;
  meal_date: string;
  meal_type: string;
  meal_name: string | null;
  recipe_id: string | null;
  notes: string | null;
  recipe?: Recipe;
}

interface DayData {
  date: Date;
  label: string;
  items: DayItem[];
  dinner?: string | null;
  mealPlan?: MealPlan;
}

export function UpcomingWeekWidget() {
  const { currentHousehold } = useHousehold();
  const { user } = useAuth();
  const [weekData, setWeekData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);
  const [viewRecipeDialogOpen, setViewRecipeDialogOpen] = useState(false);
  const [customMealDialogOpen, setCustomMealDialogOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [selectedMealPlan, setSelectedMealPlan] = useState<MealPlan | null>(null);
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);

  // Get the current user's household member ID
  useEffect(() => {
    const loadCurrentMember = async () => {
      if (!currentHousehold || !user) return;
      
      const { data } = await supabase
        .from('household_members')
        .select('id')
        .eq('household_id', currentHousehold.id)
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setCurrentMemberId(data.id);
      }
    };
    
    loadCurrentMember();
  }, [currentHousehold, user]);

  const loadWeekData = useCallback(async () => {
    if (!currentHousehold || !currentMemberId) return;

    setLoading(true);
    try {
      const today = startOfDay(new Date());
      const endOfWeek = endOfDay(addDays(today, 6));

      const [debtsResult, eventsResult, pantryResult, mealsResult, choresResult] = await Promise.all([
        supabase
          .from('debts')
          .select('id, name, payment_day, minimum_payment, is_active')
          .eq('household_id', currentHousehold.id)
          .eq('is_active', true),
        supabase
          .from('calendar_events')
          .select('id, title, start_time, end_time, all_day, color')
          .eq('household_id', currentHousehold.id)
          .gte('start_time', today.toISOString())
          .lte('start_time', endOfWeek.toISOString())
          .order('start_time'),
        supabase
          .from('pantry_items')
          .select('id, name, expiration_date, location')
          .eq('household_id', currentHousehold.id)
          .not('expiration_date', 'is', null)
          .gte('expiration_date', format(today, 'yyyy-MM-dd'))
          .lte('expiration_date', format(endOfWeek, 'yyyy-MM-dd'))
          .order('expiration_date'),
        supabase
          .from('meal_plans')
          .select('id, meal_date, meal_type, meal_name, recipe_id, notes, recipe:recipes(*)')
          .eq('household_id', currentHousehold.id)
          .eq('meal_type', 'dinner')
          .gte('meal_date', format(today, 'yyyy-MM-dd'))
          .lte('meal_date', format(endOfWeek, 'yyyy-MM-dd'))
          .order('meal_date'),
        supabase
          .from('chore_assignments')
          .select(`
            id,
            due_date,
            completed,
            assigned_to,
            chores(id, name, points),
            assigned_member:household_members!assigned_to(id, name, color)
          `)
          .eq('household_id', currentHousehold.id)
          .eq('completed', false)
          .eq('assigned_to', currentMemberId)
          .gte('due_date', format(today, 'yyyy-MM-dd'))
          .lte('due_date', format(endOfWeek, 'yyyy-MM-dd'))
          .order('due_date'),
      ]);

      if (debtsResult.error) throw debtsResult.error;
      if (eventsResult.error) throw eventsResult.error;
      if (pantryResult.error) throw pantryResult.error;
      if (mealsResult.error) throw mealsResult.error;
      if (choresResult.error) throw choresResult.error;

      const debts = debtsResult.data || [];
      const events = eventsResult.data || [];
      const pantryItems = pantryResult.data || [];
      const meals = mealsResult.data || [];
      const chores = choresResult.data || [];

      const days: DayData[] = [];
      for (let i = 0; i < 7; i++) {
        const date = addDays(today, i);
        const dayOfMonth = date.getDate();
        const items: DayItem[] = [];

        debts.forEach((debt) => {
          if (debt.payment_day === dayOfMonth) {
            items.push({
              id: debt.id,
              type: 'debt',
              title: debt.name,
              subtitle: `Payment: ${formatCurrency(debt.minimum_payment)}`,
              priority: 'high',
            });
          }
        });

        events.forEach((event) => {
          const eventStart = parseISO(event.start_time);
          if (format(eventStart, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')) {
            items.push({
              id: event.id,
              type: 'event',
              title: event.title,
              time: event.all_day ? 'All Day' : format(eventStart, 'h:mm a'),
              color: event.color,
              priority: 'medium',
            });
          }
        });

        pantryItems.forEach((item) => {
          if (item.expiration_date === format(date, 'yyyy-MM-dd')) {
            items.push({
              id: item.id,
              type: 'pantry',
              title: item.name,
              subtitle: `Expires (${item.location})`,
              priority: i === 0 ? 'high' : i <= 2 ? 'medium' : 'low',
            });
          }
        });

        // Add chore assignments for this day
        chores.forEach((chore: any) => {
          if (chore.due_date === format(date, 'yyyy-MM-dd')) {
            const assignedName = chore.assigned_member?.name || 'Unassigned';
            items.push({
              id: chore.id,
              type: 'chore',
              title: chore.chores?.name || 'Chore',
              subtitle: assignedName,
              color: chore.assigned_member?.color,
              priority: i === 0 ? 'high' : 'medium',
            });
          }
        });

        let label = format(date, 'EEE, MMM d');
        if (isToday(date)) {
          label = 'Today';
        } else if (isTomorrow(date)) {
          label = 'Tomorrow';
        }

        const dinnerPlan = meals.find(m => m.meal_date === format(date, 'yyyy-MM-dd')) as MealPlan | undefined;
        const dinnerName = dinnerPlan?.recipe?.name || dinnerPlan?.meal_name;

        days.push({ date, label, items, dinner: dinnerName, mealPlan: dinnerPlan });
      }

      setWeekData(days);
    } catch (error: any) {
      console.error('Error loading week data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentHousehold, currentMemberId]);

  useEffect(() => {
    if (currentHousehold && currentMemberId) {
      loadWeekData();
    }
  }, [currentHousehold, currentMemberId, loadWeekData]);

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'debt':
        return <CreditCard className="h-4 w-4" />;
      case 'event':
        return <Calendar className="h-4 w-4" />;
      case 'pantry':
        return <Apple className="h-4 w-4" />;
      case 'chore':
        return <CheckSquare className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 dark:text-red-400';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'low':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-muted-foreground';
    }
  };

  const handleMealClick = async (mealPlan: MealPlan) => {
    if (mealPlan.recipe_id && mealPlan.recipe) {
      setSelectedRecipe(mealPlan.recipe);

      try {
        const { data, error } = await supabase
          .from('recipe_ingredients')
          .select('*')
          .eq('recipe_id', mealPlan.recipe.id)
          .order('order_index');

        if (error) throw error;
        setRecipeIngredients(data || []);
      } catch (error: any) {
        console.error('Error loading ingredients:', error);
        setRecipeIngredients([]);
      }

      setViewRecipeDialogOpen(true);
    } else {
      setSelectedMealPlan(mealPlan);
      setCustomMealDialogOpen(true);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Next 7 Days</CardTitle>
          <CardDescription>Loading upcoming items...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-3">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-full mb-2"></div>
                <div className="h-24 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalItems = weekData.reduce((sum, day) => sum + day.items.length, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Next 7 Days
            </CardTitle>
            <CardDescription>
              {totalItems === 0
                ? 'No upcoming items'
                : `${totalItems} upcoming ${totalItems === 1 ? 'item' : 'items'}`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
          {weekData.map((day) => (
            <div key={day.label} className="flex flex-col border-t-2 border-primary/20 pt-3 min-h-[200px]">
              <div className="flex flex-col items-start mb-2">
                <h3 className="font-semibold text-sm mb-1">
                  {day.label}
                </h3>
              </div>

              <div className="flex flex-col flex-1">
                <div className="flex-1">
                  {day.items.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Nothing</p>
                  ) : (
                    <div className="space-y-2">
                      {day.items.map((item) => {
                        const getItemLink = () => {
                          switch (item.type) {
                            case 'event':
                              return '/dashboard/calendar';
                            case 'debt':
                              return '/dashboard/debt';
                            case 'pantry':
                              return '/dashboard/pantry';
                            case 'chore':
                              return '/dashboard/chores';
                            default:
                              return null;
                          }
                        };

                        const itemLink = getItemLink();
                        const content = (
                          <div className="flex items-start gap-2">
                            <div className={getPriorityColor(item.priority)}>
                              {getItemIcon(item.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium leading-tight line-clamp-2">{item.title}</p>
                              {item.time && (
                                <span className="text-xs text-muted-foreground block mt-0.5">
                                  {item.time}
                                </span>
                              )}
                              {item.subtitle && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.subtitle}</p>
                              )}
                              {item.priority === 'high' && (
                                <div className="flex items-center gap-1 mt-1">
                                  <AlertCircle className="h-3 w-3 text-red-500" />
                                </div>
                              )}
                            </div>
                          </div>
                        );

                        return itemLink ? (
                          <Link
                            key={item.id}
                            href={itemLink}
                            className="block p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                          >
                            {content}
                          </Link>
                        ) : (
                          <div
                            key={item.id}
                            className="p-2 rounded-lg bg-muted/30"
                          >
                            {content}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-auto pt-3 border-t border-border">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Dinner:</p>
                  {day.dinner && day.mealPlan ? (
                    <button
                      onClick={() => handleMealClick(day.mealPlan!)}
                      className="text-xs font-medium line-clamp-2 text-left hover:underline cursor-pointer"
                    >
                      {day.dinner}
                    </button>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Not planned</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog open={viewRecipeDialogOpen} onOpenChange={setViewRecipeDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedRecipe?.name}</DialogTitle>
            <DialogDescription>
              {selectedRecipe?.category && (
                <Badge variant="secondary" className="capitalize mt-2">
                  {selectedRecipe.category}
                </Badge>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedRecipe && (
            <div className="space-y-6">
              {selectedRecipe.description && (
                <div>
                  <p className="text-muted-foreground">{selectedRecipe.description}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-6 text-sm">
                {selectedRecipe.servings && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span><strong>Servings:</strong> {selectedRecipe.servings}</span>
                  </div>
                )}
                {selectedRecipe.prep_time && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span><strong>Prep:</strong> {selectedRecipe.prep_time} min</span>
                  </div>
                )}
                {selectedRecipe.cook_time && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span><strong>Cook:</strong> {selectedRecipe.cook_time} min</span>
                  </div>
                )}
              </div>

              <Separator />

              {recipeIngredients.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Ingredients</h3>
                  <ul className="space-y-2">
                    {recipeIngredients.map((ingredient) => (
                      <li key={ingredient.id} className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>
                          {ingredient.quantity && <strong>{ingredient.quantity}</strong>}{' '}
                          {ingredient.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedRecipe.instructions && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Instructions</h3>
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap">{selectedRecipe.instructions}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" asChild>
                  <Link href="/dashboard/meals">
                    <Edit className="h-4 w-4 mr-2" />
                    Go to Meals
                  </Link>
                </Button>
                <Button onClick={() => setViewRecipeDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={customMealDialogOpen} onOpenChange={setCustomMealDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Meal Details</DialogTitle>
            <DialogDescription>
              Custom meal entry
            </DialogDescription>
          </DialogHeader>
          {selectedMealPlan && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">Meal Name</Label>
                <p className="text-lg font-semibold">{selectedMealPlan.meal_name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Date</Label>
                  <p className="font-medium">{format(parseISO(selectedMealPlan.meal_date), 'MMM d, yyyy')}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Meal Type</Label>
                  <p className="font-medium capitalize">{selectedMealPlan.meal_type}</p>
                </div>
              </div>

              {selectedMealPlan.notes && (
                <div>
                  <Label className="text-sm text-muted-foreground">Notes</Label>
                  <p className="text-sm">{selectedMealPlan.notes}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" asChild>
                  <Link href="/dashboard/meals">
                    Go to Meals
                  </Link>
                </Button>
                <Button onClick={() => setCustomMealDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
