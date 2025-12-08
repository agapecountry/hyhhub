'use client';

import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useHousehold } from '@/lib/household-context';
import { useAuth } from '@/lib/auth-context';
import { useSubscription } from '@/lib/subscription-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import { ChefHat, Plus, Trash2, Clock, Users, Calendar, ShoppingCart, BookOpen, Edit, X, Search, Loader2, ExternalLink, Crown, Package } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { PageHelpDialog } from '@/components/page-help-dialog';
import { pageHelpContent } from '@/lib/page-help-content';

type Recipe = {
  id: string;
  name: string;
  description: string | null;
  prep_time: number | null;
  cook_time: number | null;
  servings: number | null;
  instructions: string | null;
  notes: string | null;
  category: string | null;
  created_at: string;
};

type RecipeIngredient = {
  id: string;
  recipe_id: string;
  name: string;
  quantity: string | null;
  order_index: number;
};

type MealPlan = {
  id: string;
  household_id: string;
  recipe_id: string | null;
  meal_name: string | null;
  meal_type: string;
  meal_date: string;
  notes: string | null;
  recipe?: Recipe;
};

type GroceryItem = {
  id: string;
  name: string;
  quantity: string | null;
  category: string | null;
  is_purchased: boolean;
  recipe_id: string | null;
};

type SearchResult = {
  title: string;
  url: string;
  description: string;
};

export default function MealsPage() {
  const router = useRouter();
  const { currentHousehold } = useHousehold();
  const { user } = useAuth();
  const { hasFeature, tier } = useSubscription();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));

  const hasPantryIntegration = hasFeature('meal_pantry_integration');

  const [recipeDialogOpen, setRecipeDialogOpen] = useState(false);
  const [editRecipeDialogOpen, setEditRecipeDialogOpen] = useState(false);
  const [viewRecipeDialogOpen, setViewRecipeDialogOpen] = useState(false);
  const [customMealDialogOpen, setCustomMealDialogOpen] = useState(false);
  const [mealPlanDialogOpen, setMealPlanDialogOpen] = useState(false);
  const [editGroceryDialogOpen, setEditGroceryDialogOpen] = useState(false);
  const [editingGroceryItem, setEditingGroceryItem] = useState<GroceryItem | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [selectedMealPlan, setSelectedMealPlan] = useState<MealPlan | null>(null);
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
  const [editRecipe, setEditRecipe] = useState({
    name: '',
    description: '',
    prep_time: '',
    cook_time: '',
    servings: '',
    instructions: '',
    category: 'dinner',
    url: '',
  });
  const [editIngredients, setEditIngredients] = useState<{ name: string; quantity: string }[]>([{ name: '', quantity: '' }]);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [recipeUrl, setRecipeUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);
  const [deleteMealPlanDialogOpen, setDeleteMealPlanDialogOpen] = useState(false);
  const [mealPlanToDelete, setMealPlanToDelete] = useState<MealPlan | null>(null);
  const [deleteGroceryDialogOpen, setDeleteGroceryDialogOpen] = useState(false);
  const [groceryItemToDelete, setGroceryItemToDelete] = useState<GroceryItem | null>(null);

  const [newRecipe, setNewRecipe] = useState({
    name: '',
    description: '',
    prep_time: '',
    cook_time: '',
    servings: '',
    instructions: '',
    category: 'dinner',
    url: '',
  });

  const [newIngredients, setNewIngredients] = useState<{ name: string; quantity: string }[]>([
    { name: '', quantity: '' }
  ]);

  const [newMealPlan, setNewMealPlan] = useState({
    recipe_id: '',
    meal_name: '',
    meal_type: 'dinner',
    meal_date: format(new Date(), 'yyyy-MM-dd'),
  });

  const [newGroceryItem, setNewGroceryItem] = useState({
    name: '',
    quantity: '',
    category: 'other',
  });

  const [pantryDialogOpen, setPantryDialogOpen] = useState(false);
  const [selectedGroceryItem, setSelectedGroceryItem] = useState<GroceryItem | null>(null);
  const [pantryDetails, setPantryDetails] = useState({
    quantity: '',
    unit: 'unit',
    location: 'pantry',
    expiration_date: '',
    notes: '',
  });

  const [ingredientsDialogOpen, setIngredientsDialogOpen] = useState(false);
  const [pendingRecipeId, setPendingRecipeId] = useState<string | null>(null);
  const [missingIngredientsList, setMissingIngredientsList] = useState<RecipeIngredient[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set());

  const [quickAddGroceryDialogOpen, setQuickAddGroceryDialogOpen] = useState(false);

  // Multi-select for grocery items
  const [grocerySelectionMode, setGrocerySelectionMode] = useState(false);
  const [selectedGroceryItems, setSelectedGroceryItems] = useState<Set<string>>(new Set());
  const [bulkDeleteGroceryDialogOpen, setBulkDeleteGroceryDialogOpen] = useState(false);

  useEffect(() => {
    if (currentHousehold) {
      loadRecipes();
      loadMealPlans();
      loadGroceryItems();
    }
  }, [currentHousehold]);

  const loadRecipes = async () => {
    if (!currentHousehold) return;

    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('household_id', currentHousehold.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecipes(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load recipes',
        variant: 'destructive',
      });
    }
  };

  const loadMealPlans = async () => {
    if (!currentHousehold) return;

    try {
      const weekEnd = addDays(weekStart, 6);
      const { data, error } = await supabase
        .from('meal_plans')
        .select(`
          *,
          recipe:recipes(*)
        `)
        .eq('household_id', currentHousehold.id)
        .gte('meal_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('meal_date', format(weekEnd, 'yyyy-MM-dd'))
        .order('meal_date', { ascending: true });

      if (error) throw error;
      setMealPlans(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load meal plans',
        variant: 'destructive',
      });
    }
  };

  const loadGroceryItems = async () => {
    if (!currentHousehold) return;

    try {
      const { data, error } = await supabase
        .from('grocery_list_items')
        .select('*')
        .eq('household_id', currentHousehold.id)
        .order('is_purchased', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGroceryItems(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load grocery list',
        variant: 'destructive',
      });
    }
  };

  const handleExtractRecipe = async () => {
    if (!recipeUrl.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a recipe URL',
        variant: 'destructive',
      });
      return;
    }

    setExtracting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('You must be logged in to extract recipes');
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Application configuration error. Please contact support.');
      }

      const apiUrl = `${supabaseUrl}/functions/v1/extract-recipe`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabaseAnonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: recipeUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to extract recipe');
      }

      const data = await response.json();

      setNewRecipe({
        ...newRecipe,
        name: data.name || '',
        instructions: data.instructions || '',
        url: recipeUrl,
      });

      if (data.ingredients && data.ingredients.length > 0) {
        setNewIngredients(
          data.ingredients.map((ing: any) => ({
            name: ing.name || ing,
            quantity: ing.quantity || '',
          }))
        );
      }

      toast({
        title: 'Recipe Extracted',
        description: 'Recipe details have been populated. Review and adjust as needed.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to extract recipe',
        variant: 'destructive',
      });
    } finally {
      setExtracting(false);
    }
  };

  const handleSearchRecipes = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a search query',
        variant: 'destructive',
      });
      return;
    }

    setSearching(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('You must be logged in to search recipes');
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Application configuration error. Please contact support.');
      }

      const apiUrl = `${supabaseUrl}/functions/v1/search-recipes`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabaseAnonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: searchQuery }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to search recipes');
      }

      const data = await response.json();
      setSearchResults(data.results || []);
      setShowSearch(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to search recipes',
        variant: 'destructive',
      });
    } finally {
      setSearching(false);
    }
  };

  const handleCreateRecipe = async () => {
    if (!currentHousehold || !user || !newRecipe.name.trim()) {
      toast({
        title: 'Error',
        description: 'Recipe name is required',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data: recipeData, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          household_id: currentHousehold.id,
          name: newRecipe.name.trim(),
          description: newRecipe.description.trim() || null,
          prep_time: newRecipe.prep_time ? parseInt(newRecipe.prep_time) : null,
          cook_time: newRecipe.cook_time ? parseInt(newRecipe.cook_time) : null,
          servings: newRecipe.servings ? parseInt(newRecipe.servings) : null,
          instructions: newRecipe.instructions.trim() || null,
          category: newRecipe.category,
          created_by: user.id,
        })
        .select()
        .single();

      if (recipeError) throw recipeError;

      const validIngredients = newIngredients.filter(ing => ing.name.trim());
      if (validIngredients.length > 0) {
        const { error: ingredientsError } = await supabase
          .from('recipe_ingredients')
          .insert(
            validIngredients.map((ing, index) => ({
              recipe_id: recipeData.id,
              name: ing.name.trim(),
              quantity: ing.quantity.trim() || null,
              order_index: index,
            }))
          );

        if (ingredientsError) throw ingredientsError;
      }

      toast({
        title: 'Success',
        description: 'Recipe created successfully',
      });

      setRecipeDialogOpen(false);
      setNewRecipe({
        name: '',
        description: '',
        prep_time: '',
        cook_time: '',
        servings: '',
        instructions: '',
        category: 'dinner',
        url: '',
      });
      setNewIngredients([{ name: '', quantity: '' }]);
      setSearchQuery('');
      setSearchResults([]);
      setShowSearch(false);
      setRecipeUrl('');
      loadRecipes();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create recipe',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewRecipe = async (recipe: Recipe) => {
    setSelectedRecipe(recipe);

    try {
      const { data, error } = await supabase
        .from('recipe_ingredients')
        .select('*')
        .eq('recipe_id', recipe.id)
        .order('order_index');

      if (error) throw error;
      setRecipeIngredients(data || []);
    } catch (error: any) {
      console.error('Error loading ingredients:', error);
      setRecipeIngredients([]);
    }

    setViewRecipeDialogOpen(true);
  };

  const handleMealPlanClick = async (mealPlan: MealPlan) => {
    if (mealPlan.recipe_id && mealPlan.recipe) {
      await handleViewRecipe(mealPlan.recipe);
    } else {
      setSelectedMealPlan(mealPlan);
      setCustomMealDialogOpen(true);
    }
  };

  const handleOpenEditRecipe = async (recipe: Recipe) => {
    setEditingRecipeId(recipe.id);
    setEditRecipe({
      name: recipe.name,
      description: recipe.description || '',
      prep_time: recipe.prep_time?.toString() || '',
      cook_time: recipe.cook_time?.toString() || '',
      servings: recipe.servings?.toString() || '',
      instructions: recipe.instructions || '',
      category: recipe.category || 'dinner',
      url: '',
    });

    try {
      const { data, error } = await supabase
        .from('recipe_ingredients')
        .select('*')
        .eq('recipe_id', recipe.id)
        .order('order_index');

      if (error) throw error;

      if (data && data.length > 0) {
        setEditIngredients(data.map(ing => ({
          name: ing.name,
          quantity: ing.quantity || '',
        })));
      } else {
        setEditIngredients([{ name: '', quantity: '' }]);
      }
    } catch (error: any) {
      console.error('Error loading ingredients:', error);
      setEditIngredients([{ name: '', quantity: '' }]);
    }

    setEditRecipeDialogOpen(true);
  };

  const handleUpdateRecipe = async () => {
    if (!currentHousehold || !user || !editRecipe.name.trim() || !editingRecipeId) {
      toast({
        title: 'Error',
        description: 'Recipe name is required',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error: recipeError } = await supabase
        .from('recipes')
        .update({
          name: editRecipe.name.trim(),
          description: editRecipe.description.trim() || null,
          prep_time: editRecipe.prep_time ? parseInt(editRecipe.prep_time) : null,
          cook_time: editRecipe.cook_time ? parseInt(editRecipe.cook_time) : null,
          servings: editRecipe.servings ? parseInt(editRecipe.servings) : null,
          instructions: editRecipe.instructions.trim() || null,
          category: editRecipe.category,
        })
        .eq('id', editingRecipeId);

      if (recipeError) throw recipeError;

      const { error: deleteIngredientsError } = await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('recipe_id', editingRecipeId);

      if (deleteIngredientsError) throw deleteIngredientsError;

      const validIngredients = editIngredients.filter(ing => ing.name.trim());
      if (validIngredients.length > 0) {
        const { error: ingredientsError } = await supabase
          .from('recipe_ingredients')
          .insert(
            validIngredients.map((ing, index) => ({
              recipe_id: editingRecipeId,
              name: ing.name.trim(),
              quantity: ing.quantity.trim() || null,
              order_index: index,
            }))
          );

        if (ingredientsError) throw ingredientsError;
      }

      toast({
        title: 'Success',
        description: 'Recipe updated successfully',
      });

      setEditRecipeDialogOpen(false);
      setEditingRecipeId(null);
      setEditRecipe({
        name: '',
        description: '',
        prep_time: '',
        cook_time: '',
        servings: '',
        instructions: '',
        category: 'dinner',
        url: '',
      });
      setEditIngredients([{ name: '', quantity: '' }]);
      loadRecipes();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update recipe',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecipe = async () => {
    if (!recipeToDelete) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', recipeToDelete.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Recipe deleted successfully',
      });

      loadRecipes();
      if (selectedRecipe?.id === recipeToDelete.id) {
        setSelectedRecipe(null);
      }
      setDeleteDialogOpen(false);
      setRecipeToDelete(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete recipe',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMealPlan = async () => {
    if (!currentHousehold || !user) return;

    if (!newMealPlan.recipe_id && !newMealPlan.meal_name.trim()) {
      toast({
        title: 'Error',
        description: 'Please select a recipe or enter a meal name',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('meal_plans')
        .insert({
          household_id: currentHousehold.id,
          recipe_id: newMealPlan.recipe_id || null,
          meal_name: newMealPlan.meal_name.trim() || null,
          meal_type: newMealPlan.meal_type,
          meal_date: newMealPlan.meal_date,
          created_by: user.id,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Meal planned successfully',
      });

      setMealPlanDialogOpen(false);
      setNewMealPlan({
        recipe_id: '',
        meal_name: '',
        meal_type: 'dinner',
        meal_date: format(new Date(), 'yyyy-MM-dd'),
      });
      loadMealPlans();

      if (newMealPlan.recipe_id && hasPantryIntegration) {
        await checkAndShowMissingIngredients(newMealPlan.recipe_id);
      } else {
        setQuickAddGroceryDialogOpen(true);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create meal plan',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const checkAndShowMissingIngredients = async (recipeId: string) => {
    if (!currentHousehold || !user) return;

    if (!hasPantryIntegration) {
      toast({
        title: 'Premium Feature',
        description: 'Auto-generate grocery lists from recipes and check against pantry items with Premium or Elite plans.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data: ingredients, error: ingredientsError } = await supabase
        .from('recipe_ingredients')
        .select('*')
        .eq('recipe_id', recipeId)
        .order('order_index');

      if (ingredientsError) throw ingredientsError;
      if (!ingredients || ingredients.length === 0) return;

      const { data: pantryItems, error: pantryError } = await supabase
        .from('pantry_items')
        .select('name')
        .eq('household_id', currentHousehold.id);

      if (pantryError) throw pantryError;

      const pantryItemNames = new Set(
        (pantryItems || []).map(item => item.name.toLowerCase().trim())
      );

      const missingIngredients = ingredients.filter(
        ingredient => !pantryItemNames.has(ingredient.name.toLowerCase().trim())
      );

      if (missingIngredients.length === 0) {
        toast({
          title: 'All set!',
          description: 'All ingredients are already in your pantry',
        });
        return;
      }

      const { data: existingGroceryItems, error: groceryCheckError } = await supabase
        .from('grocery_list_items')
        .select('name')
        .eq('household_id', currentHousehold.id)
        .eq('is_purchased', false);

      if (groceryCheckError) throw groceryCheckError;

      const existingGroceryNames = new Set(
        (existingGroceryItems || []).map(item => item.name.toLowerCase().trim())
      );

      const itemsToAdd = missingIngredients.filter(
        ingredient => !existingGroceryNames.has(ingredient.name.toLowerCase().trim())
      );

      if (itemsToAdd.length === 0) {
        toast({
          title: 'Already on list',
          description: 'Missing ingredients are already on your grocery list',
        });
        return;
      }

      setPendingRecipeId(recipeId);
      setMissingIngredientsList(itemsToAdd);
      setSelectedIngredients(new Set(itemsToAdd.map(ing => ing.id)));
      setIngredientsDialogOpen(true);
    } catch (error: any) {
      console.error('Error checking ingredients:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to check ingredients',
        variant: 'destructive',
      });
    }
  };

  const handleConfirmAddIngredients = async () => {
    if (!currentHousehold || !user || !pendingRecipeId) return;

    const ingredientsToAdd = missingIngredientsList.filter(ing =>
      selectedIngredients.has(ing.id)
    );

    if (ingredientsToAdd.length === 0) {
      setIngredientsDialogOpen(false);
      setPendingRecipeId(null);
      setMissingIngredientsList([]);
      setSelectedIngredients(new Set());
      return;
    }

    setLoading(true);
    try {
      const { error: insertError } = await supabase
        .from('grocery_list_items')
        .insert(
          ingredientsToAdd.map(ingredient => ({
            household_id: currentHousehold.id,
            name: ingredient.name,
            quantity: ingredient.quantity,
            category: 'other',
            recipe_id: pendingRecipeId,
            added_by: user.id,
          }))
        );

      if (insertError) throw insertError;

      toast({
        title: 'Ingredients added',
        description: `${ingredientsToAdd.length} ingredient${ingredientsToAdd.length !== 1 ? 's' : ''} added to grocery list`,
      });

      setIngredientsDialogOpen(false);
      setPendingRecipeId(null);
      setMissingIngredientsList([]);
      setSelectedIngredients(new Set());
      loadGroceryItems();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add ingredients',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleIngredientSelection = (ingredientId: string) => {
    const newSelected = new Set(selectedIngredients);
    if (newSelected.has(ingredientId)) {
      newSelected.delete(ingredientId);
    } else {
      newSelected.add(ingredientId);
    }
    setSelectedIngredients(newSelected);
  };

  const handleDeleteMealPlan = async () => {
    if (!mealPlanToDelete) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('meal_plans')
        .delete()
        .eq('id', mealPlanToDelete.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Meal plan removed',
      });

      setDeleteMealPlanDialogOpen(false);
      setMealPlanToDelete(null);
      loadMealPlans();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete meal plan',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddGroceryItem = async () => {
    if (!currentHousehold || !user || !newGroceryItem.name.trim()) {
      toast({
        title: 'Error',
        description: 'Item name is required',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('grocery_list_items')
        .insert({
          household_id: currentHousehold.id,
          name: newGroceryItem.name.trim(),
          quantity: newGroceryItem.quantity.trim() || null,
          category: newGroceryItem.category,
          added_by: user.id,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Item added to grocery list',
      });

      setNewGroceryItem({
        name: '',
        quantity: '',
        category: 'other',
      });
      loadGroceryItems();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add grocery item',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleGroceryItem = async (item: GroceryItem) => {
    if (!user) return;

    if (!item.is_purchased) {
      setSelectedGroceryItem(item);
      setPantryDetails({
        quantity: item.quantity || '1',
        unit: 'unit',
        location: 'pantry',
        expiration_date: '',
        notes: '',
      });
      setPantryDialogOpen(true);
    } else {
      setLoading(true);
      try {
        const { error } = await supabase
          .from('grocery_list_items')
          .update({
            is_purchased: false,
            purchased_by: null,
            purchased_at: null,
          })
          .eq('id', item.id);

        if (error) throw error;

        loadGroceryItems();
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to update item',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAddToPantry = async () => {
    if (!currentHousehold || !user || !selectedGroceryItem) return;

    setLoading(true);
    try {
      const quantityNum = parseFloat(pantryDetails.quantity);
      if (isNaN(quantityNum) || quantityNum <= 0) {
        throw new Error('Please enter a valid quantity');
      }

      const { error: pantryError } = await supabase.from('pantry_items').insert({
        household_id: currentHousehold.id,
        name: selectedGroceryItem.name,
        quantity: quantityNum,
        unit: pantryDetails.unit,
        location: pantryDetails.location,
        expiration_date: pantryDetails.expiration_date || null,
        notes: pantryDetails.notes || null,
      });

      if (pantryError) throw pantryError;

      const { error: updateError } = await supabase
        .from('grocery_list_items')
        .update({
          is_purchased: true,
          purchased_by: user.id,
          purchased_at: new Date().toISOString(),
        })
        .eq('id', selectedGroceryItem.id);

      if (updateError) throw updateError;

      toast({
        title: 'Success',
        description: 'Item marked as purchased and added to pantry',
      });

      setPantryDialogOpen(false);
      setSelectedGroceryItem(null);
      setPantryDetails({
        quantity: '',
        unit: 'unit',
        location: 'pantry',
        expiration_date: '',
        notes: '',
      });
      loadGroceryItems();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add item to pantry',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditGroceryItem = (item: GroceryItem) => {
    setEditingGroceryItem(item);
    setEditGroceryDialogOpen(true);
  };

  const handleUpdateGroceryItem = async () => {
    if (!editingGroceryItem || !editingGroceryItem.name) return;

    try {
      const { error } = await supabase
        .from('grocery_list_items')
        .update({
          name: editingGroceryItem.name,
          quantity: editingGroceryItem.quantity || null,
          category: editingGroceryItem.category || null,
        })
        .eq('id', editingGroceryItem.id);

      if (error) throw error;

      toast({ title: 'Grocery item updated' });
      setEditGroceryDialogOpen(false);
      setEditingGroceryItem(null);
      loadGroceryItems();
    } catch (error: any) {
      toast({
        title: 'Error updating grocery item',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const logGroceryDeletion = async (item: GroceryItem) => {
    try {
      await supabase.from('security_audit_logs').insert({
        event_type: 'grocery_item_deleted',
        event_category: 'data_management',
        severity: 'info',
        user_id: user?.id,
        household_id: currentHousehold?.id,
        resource_type: 'grocery_list_items',
        resource_id: item.id,
        action: 'delete',
        status: 'success',
        details: {
          item_name: item.name,
          category: item.category,
          was_purchased: item.is_purchased,
          deleted_at: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to log grocery deletion:', error);
    }
  };

  const handleDeleteGroceryItem = async () => {
    if (!groceryItemToDelete) return;

    setLoading(true);
    try {
      await logGroceryDeletion(groceryItemToDelete);

      const { error } = await supabase
        .from('grocery_list_items')
        .delete()
        .eq('id', groceryItemToDelete.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Grocery item deleted',
      });

      setDeleteGroceryDialogOpen(false);
      setGroceryItemToDelete(null);
      loadGroceryItems();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete item',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleGroceryItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedGroceryItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedGroceryItems(newSelection);
  };

  const cancelGrocerySelectionMode = () => {
    setGrocerySelectionMode(false);
    setSelectedGroceryItems(new Set());
  };

  const handleBulkDeleteGroceryItems = async () => {
    if (selectedGroceryItems.size === 0) return;

    setLoading(true);
    try {
      const itemIds = Array.from(selectedGroceryItems);
      
      const { error } = await supabase
        .from('grocery_list_items')
        .delete()
        .in('id', itemIds);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${itemIds.length} item${itemIds.length > 1 ? 's' : ''} deleted`,
      });

      setBulkDeleteGroceryDialogOpen(false);
      setSelectedGroceryItems(new Set());
      setGrocerySelectionMode(false);
      loadGroceryItems();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete items',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getMealsForDay = (date: Date, type: string) => {
    return mealPlans.filter(
      (plan) =>
        isSameDay(parseISO(plan.meal_date), date) &&
        plan.meal_type === type
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Meal Planning</h1>
            <p className="text-muted-foreground">
              Plan meals, manage recipes, and create grocery lists
            </p>
          </div>
          <div className="flex items-center gap-2">
            <PageHelpDialog content={pageHelpContent.meals} />
            <Dialog
            open={recipeDialogOpen}
            onOpenChange={(open) => {
              setRecipeDialogOpen(open);
              if (!open) {
                setSearchQuery('');
                setSearchResults([]);
                setShowSearch(false);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Recipe
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Recipe</DialogTitle>
                <DialogDescription>
                  Add a new recipe to your collection or search the web for inspiration
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <Label htmlFor="search-query">Search for Recipe Ideas</Label>
                      <div className="flex gap-2">
                        <Input
                          id="search-query"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSearchRecipes()}
                          placeholder="e.g., chocolate cake, chicken stir fry"
                          disabled={searching}
                        />
                        <Button
                          onClick={handleSearchRecipes}
                          disabled={searching || !searchQuery.trim()}
                          variant="secondary"
                        >
                          {searching ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Search className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {showSearch && searchResults.length > 0 && (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {searchResults.map((result, index) => (
                            <a
                              key={index}
                              href={result.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block p-3 rounded-lg border bg-background hover:bg-accent transition-colors"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm flex items-center gap-2">
                                    {result.title}
                                    <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                  </div>
                                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                    {result.description}
                                  </p>
                                </div>
                              </div>
                            </a>
                          ))}
                        </div>
                      )}
                      {showSearch && searchResults.length === 0 && !searching && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No results found. Try a different search term.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Separator />

                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="recipe-url">Import from URL</Label>
                        <span className="text-xs text-muted-foreground">(Paste a recipe link to auto-fill)</span>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          id="recipe-url"
                          value={recipeUrl}
                          onChange={(e) => setRecipeUrl(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleExtractRecipe()}
                          placeholder="https://example.com/recipe"
                          disabled={extracting}
                        />
                        <Button
                          onClick={handleExtractRecipe}
                          disabled={extracting || !recipeUrl.trim()}
                          variant="default"
                        >
                          {extracting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Extract'
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="recipe-name">Recipe Name *</Label>
                  <Input
                    id="recipe-name"
                    value={newRecipe.name}
                    onChange={(e) => setNewRecipe({ ...newRecipe, name: e.target.value })}
                    placeholder="Spaghetti Carbonara"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={newRecipe.category}
                      onValueChange={(value) => setNewRecipe({ ...newRecipe, category: value })}
                    >
                      <SelectTrigger id="category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="breakfast">Breakfast</SelectItem>
                        <SelectItem value="lunch">Lunch</SelectItem>
                        <SelectItem value="dinner">Dinner</SelectItem>
                        <SelectItem value="dessert">Dessert</SelectItem>
                        <SelectItem value="snack">Snack</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="servings">Servings</Label>
                    <Input
                      id="servings"
                      type="number"
                      value={newRecipe.servings}
                      onChange={(e) => setNewRecipe({ ...newRecipe, servings: e.target.value })}
                      placeholder="4"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prep-time">Prep Time (minutes)</Label>
                    <Input
                      id="prep-time"
                      type="number"
                      value={newRecipe.prep_time}
                      onChange={(e) => setNewRecipe({ ...newRecipe, prep_time: e.target.value })}
                      placeholder="15"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cook-time">Cook Time (minutes)</Label>
                    <Input
                      id="cook-time"
                      type="number"
                      value={newRecipe.cook_time}
                      onChange={(e) => setNewRecipe({ ...newRecipe, cook_time: e.target.value })}
                      placeholder="30"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newRecipe.description}
                    onChange={(e) => setNewRecipe({ ...newRecipe, description: e.target.value })}
                    placeholder="A delicious Italian pasta dish..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Ingredients</Label>
                  {newIngredients.map((ingredient, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="Ingredient name"
                        value={ingredient.name}
                        onChange={(e) => {
                          const updated = [...newIngredients];
                          updated[index].name = e.target.value;
                          setNewIngredients(updated);
                        }}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Amount"
                        value={ingredient.quantity}
                        onChange={(e) => {
                          const updated = [...newIngredients];
                          updated[index].quantity = e.target.value;
                          setNewIngredients(updated);
                        }}
                        className="w-32"
                      />
                      {newIngredients.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setNewIngredients(newIngredients.filter((_, i) => i !== index));
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNewIngredients([...newIngredients, { name: '', quantity: '' }])}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Ingredient
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instructions">Instructions</Label>
                  <Textarea
                    id="instructions"
                    value={newRecipe.instructions}
                    onChange={(e) => setNewRecipe({ ...newRecipe, instructions: e.target.value })}
                    placeholder="1. Boil water&#10;2. Cook pasta..."
                    rows={6}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setRecipeDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateRecipe} disabled={loading}>
                    Create Recipe
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <Tabs defaultValue="week" className="space-y-4">
          <TabsList>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="recipes">Recipes</TabsTrigger>
            <TabsTrigger value="grocery">Grocery List</TabsTrigger>
          </TabsList>

          <TabsContent value="week" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Weekly Meal Plan</CardTitle>
                    <CardDescription>
                      {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setWeekStart(addDays(weekStart, -7))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }))}
                    >
                      Today
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setWeekStart(addDays(weekStart, 7))}
                    >
                      Next
                    </Button>
                    <Dialog open={mealPlanDialogOpen} onOpenChange={setMealPlanDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Plan Meal
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Plan a Meal</DialogTitle>
                          <DialogDescription>
                            Add a meal to your weekly plan
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="meal-date">Date</Label>
                            <Input
                              id="meal-date"
                              type="date"
                              value={newMealPlan.meal_date}
                              onChange={(e) =>
                                setNewMealPlan({ ...newMealPlan, meal_date: e.target.value })
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="meal-type">Meal Type</Label>
                            <Select
                              value={newMealPlan.meal_type}
                              onValueChange={(value) =>
                                setNewMealPlan({ ...newMealPlan, meal_type: value })
                              }
                            >
                              <SelectTrigger id="meal-type">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="breakfast">Breakfast</SelectItem>
                                <SelectItem value="lunch">Lunch</SelectItem>
                                <SelectItem value="dinner">Dinner</SelectItem>
                                <SelectItem value="snack">Snack</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="recipe">Recipe (Optional)</Label>
                            <Select
                              value={newMealPlan.recipe_id}
                              onValueChange={(value) =>
                                setNewMealPlan({ ...newMealPlan, recipe_id: value })
                              }
                            >
                              <SelectTrigger id="recipe">
                                <SelectValue placeholder="Select a recipe or enter custom name" />
                              </SelectTrigger>
                              <SelectContent>
                                {recipes.map((recipe) => (
                                  <SelectItem key={recipe.id} value={recipe.id}>
                                    {recipe.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="meal-name">Or Custom Meal Name</Label>
                            <Input
                              id="meal-name"
                              value={newMealPlan.meal_name}
                              onChange={(e) =>
                                setNewMealPlan({ ...newMealPlan, meal_name: e.target.value })
                              }
                              placeholder="Pizza night"
                            />
                          </div>

                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setMealPlanDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleCreateMealPlan} disabled={loading}>
                              Plan Meal
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                  {weekDays.map((day) => (
                    <div key={day.toISOString()} className="border rounded-lg p-3 space-y-2">
                      <div className="font-semibold text-sm">
                        {format(day, 'EEE')}
                        <div className="text-xs text-muted-foreground">{format(day, 'MMM d')}</div>
                      </div>
                      <div className="space-y-2">
                        {['breakfast', 'lunch', 'dinner'].map((type) => {
                          const meals = getMealsForDay(day, type);
                          return (
                            <div key={type} className="space-y-1">
                              <div className="text-xs font-medium text-muted-foreground capitalize">
                                {type}
                              </div>
                              {meals.length > 0 ? (
                                meals.map((meal) => (
                                  <div
                                    key={meal.id}
                                    className="text-xs bg-accent rounded p-2 group relative cursor-pointer hover:bg-accent/80 transition-colors"
                                    onClick={() => handleMealPlanClick(meal)}
                                  >
                                    <div className="pr-6">
                                      {meal.recipe ? meal.recipe.name : meal.meal_name}
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setMealPlanToDelete(meal);
                                        setDeleteMealPlanDialogOpen(true);
                                      }}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))
                              ) : (
                                <div className="text-xs text-muted-foreground italic">-</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recipes" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recipes.map((recipe) => (
                <Card key={recipe.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleViewRecipe(recipe)}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{recipe.name}</CardTitle>
                        {recipe.category && (
                          <Badge variant="secondary" className="mt-2 capitalize">
                            {recipe.category}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditRecipe(recipe)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setRecipeToDelete(recipe);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {recipe.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {recipe.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {recipe.prep_time && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Prep: {recipe.prep_time}m
                        </div>
                      )}
                      {recipe.cook_time && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Cook: {recipe.cook_time}m
                        </div>
                      )}
                      {recipe.servings && (
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {recipe.servings} servings
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {recipes.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <ChefHat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No recipes yet. Add your first recipe to get started!
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="grocery" className="space-y-4">
            {!hasPantryIntegration && (
              <Card className="border-2 border-primary mb-4">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Crown className="h-6 w-6 text-primary" />
                    <CardTitle>Premium Features Available</CardTitle>
                  </div>
                  <CardDescription>
                    Upgrade to Premium or Elite for advanced grocery list features
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      Auto-generate lists from recipe ingredients
                    </li>
                    <li className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      Check against pantry items to avoid duplicates
                    </li>
                  </ul>
                  <div className="flex gap-2 pt-4">
                    <Button onClick={() => router.push('/dashboard/subscription')} size="sm">
                      <Crown className="h-4 w-4 mr-2" />
                      View Plans
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Grocery List</CardTitle>
                    <CardDescription>Items to buy for your household</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {grocerySelectionMode ? (
                      <>
                        <span className="text-sm text-muted-foreground">
                          {selectedGroceryItems.size} selected
                        </span>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setBulkDeleteGroceryDialogOpen(true)}
                          disabled={selectedGroceryItems.size === 0 || loading}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete Selected
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={cancelGrocerySelectionMode}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setGrocerySelectionMode(true)}
                        disabled={groceryItems.length === 0}
                      >
                        Select Multiple
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Item name"
                    value={newGroceryItem.name}
                    onChange={(e) =>
                      setNewGroceryItem({ ...newGroceryItem, name: e.target.value })
                    }
                    onKeyPress={(e) => e.key === 'Enter' && handleAddGroceryItem()}
                  />
                  <Input
                    placeholder="Quantity"
                    value={newGroceryItem.quantity}
                    onChange={(e) =>
                      setNewGroceryItem({ ...newGroceryItem, quantity: e.target.value })
                    }
                    onKeyPress={(e) => e.key === 'Enter' && handleAddGroceryItem()}
                    className="w-32"
                  />
                  <Select
                    value={newGroceryItem.category}
                    onValueChange={(value) =>
                      setNewGroceryItem({ ...newGroceryItem, category: value })
                    }
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="produce">Produce</SelectItem>
                      <SelectItem value="dairy">Dairy</SelectItem>
                      <SelectItem value="meat">Meat</SelectItem>
                      <SelectItem value="bakery">Bakery</SelectItem>
                      <SelectItem value="pantry">Pantry</SelectItem>
                      <SelectItem value="frozen">Frozen</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddGroceryItem} disabled={loading}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <Separator />

                <div className="space-y-2">
                  {groceryItems.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 p-2 rounded hover:bg-accent group ${
                        grocerySelectionMode && selectedGroceryItems.has(item.id) ? 'bg-accent' : ''
                      }`}
                      onClick={grocerySelectionMode ? () => toggleGroceryItemSelection(item.id) : undefined}
                    >
                      {grocerySelectionMode ? (
                        <Checkbox
                          checked={selectedGroceryItems.has(item.id)}
                          onCheckedChange={() => toggleGroceryItemSelection(item.id)}
                        />
                      ) : (
                        <Checkbox
                          checked={item.is_purchased}
                          onCheckedChange={() => handleToggleGroceryItem(item)}
                        />
                      )}
                      <div
                        className={`flex-1 ${grocerySelectionMode ? 'cursor-pointer' : 'cursor-pointer'}`}
                        onClick={(e) => {
                          if (!grocerySelectionMode) {
                            e.stopPropagation();
                            handleEditGroceryItem(item);
                          }
                        }}
                      >
                        <div className={item.is_purchased ? 'line-through text-muted-foreground' : ''}>
                          {item.name}
                        </div>
                        {item.quantity && (
                          <div className="text-xs text-muted-foreground">{item.quantity}</div>
                        )}
                      </div>
                      {item.category && (
                        <Badge variant="outline" className="text-xs capitalize">
                          {item.category}
                        </Badge>
                      )}
                      {!grocerySelectionMode && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100"
                          onClick={() => {
                            setGroceryItemToDelete(item);
                            setDeleteGroceryDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {groceryItems.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p>Your grocery list is empty</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={editGroceryDialogOpen} onOpenChange={setEditGroceryDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Grocery Item</DialogTitle>
            <DialogDescription>Update the grocery item details</DialogDescription>
          </DialogHeader>
          {editingGroceryItem && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-item-name">Item Name</Label>
                <Input
                  id="edit-item-name"
                  value={editingGroceryItem.name}
                  onChange={(e) =>
                    setEditingGroceryItem({ ...editingGroceryItem, name: e.target.value })
                  }
                  placeholder="Item name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-item-quantity">Quantity</Label>
                <Input
                  id="edit-item-quantity"
                  value={editingGroceryItem.quantity || ''}
                  onChange={(e) =>
                    setEditingGroceryItem({ ...editingGroceryItem, quantity: e.target.value })
                  }
                  placeholder="e.g., 2 lbs, 1 gallon"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-item-category">Category</Label>
                <Select
                  value={editingGroceryItem.category || ''}
                  onValueChange={(value) =>
                    setEditingGroceryItem({ ...editingGroceryItem, category: value })
                  }
                >
                  <SelectTrigger id="edit-item-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="produce">Produce</SelectItem>
                    <SelectItem value="dairy">Dairy</SelectItem>
                    <SelectItem value="meat">Meat</SelectItem>
                    <SelectItem value="bakery">Bakery</SelectItem>
                    <SelectItem value="pantry">Pantry</SelectItem>
                    <SelectItem value="frozen">Frozen</SelectItem>
                    <SelectItem value="beverages">Beverages</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditGroceryDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateGroceryItem} disabled={!editingGroceryItem.name}>
                  Update Item
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={ingredientsDialogOpen} onOpenChange={setIngredientsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Missing Ingredients</DialogTitle>
            <DialogDescription>
              Select which ingredients to add to your grocery list. Uncheck any items you already have.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {missingIngredientsList.length > 0 ? (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {missingIngredientsList.map((ingredient) => (
                  <div
                    key={ingredient.id}
                    className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <Checkbox
                      checked={selectedIngredients.has(ingredient.id)}
                      onCheckedChange={() => toggleIngredientSelection(ingredient.id)}
                      id={`ingredient-${ingredient.id}`}
                    />
                    <label
                      htmlFor={`ingredient-${ingredient.id}`}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="font-medium">{ingredient.name}</div>
                      {ingredient.quantity && (
                        <div className="text-sm text-muted-foreground">
                          {ingredient.quantity}
                        </div>
                      )}
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No ingredients to add
              </p>
            )}
          </div>
          <div className="flex justify-between items-center pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (selectedIngredients.size === missingIngredientsList.length) {
                  setSelectedIngredients(new Set());
                } else {
                  setSelectedIngredients(new Set(missingIngredientsList.map(ing => ing.id)));
                }
              }}
            >
              {selectedIngredients.size === missingIngredientsList.length ? 'Deselect All' : 'Select All'}
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIngredientsDialogOpen(false);
                  setPendingRecipeId(null);
                  setMissingIngredientsList([]);
                  setSelectedIngredients(new Set());
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleConfirmAddIngredients} disabled={loading || selectedIngredients.size === 0}>
                Add {selectedIngredients.size > 0 ? `(${selectedIngredients.size})` : ''}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={pantryDialogOpen} onOpenChange={setPantryDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add to Pantry</DialogTitle>
            <DialogDescription>
              Mark "{selectedGroceryItem?.name}" as purchased and add it to your pantry
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pantry-quantity">Quantity</Label>
                <Input
                  id="pantry-quantity"
                  type="number"
                  step="0.01"
                  placeholder="1"
                  value={pantryDetails.quantity}
                  onChange={(e) => setPantryDetails({ ...pantryDetails, quantity: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pantry-unit">Unit</Label>
                <Select
                  value={pantryDetails.unit}
                  onValueChange={(value) => setPantryDetails({ ...pantryDetails, unit: value })}
                >
                  <SelectTrigger id="pantry-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unit">unit</SelectItem>
                    <SelectItem value="lb">lb</SelectItem>
                    <SelectItem value="oz">oz</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="cup">cup</SelectItem>
                    <SelectItem value="tbsp">tbsp</SelectItem>
                    <SelectItem value="tsp">tsp</SelectItem>
                    <SelectItem value="gal">gal</SelectItem>
                    <SelectItem value="qt">qt</SelectItem>
                    <SelectItem value="pt">pt</SelectItem>
                    <SelectItem value="l">l</SelectItem>
                    <SelectItem value="ml">ml</SelectItem>
                    <SelectItem value="can">can</SelectItem>
                    <SelectItem value="jar">jar</SelectItem>
                    <SelectItem value="box">box</SelectItem>
                    <SelectItem value="bag">bag</SelectItem>
                    <SelectItem value="package">package</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pantry-location">Location</Label>
              <Select
                value={pantryDetails.location}
                onValueChange={(value) => setPantryDetails({ ...pantryDetails, location: value })}
              >
                <SelectTrigger id="pantry-location">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pantry">Pantry</SelectItem>
                  <SelectItem value="fridge">Fridge</SelectItem>
                  <SelectItem value="freezer">Freezer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pantry-expiration">Expiration Date (Optional)</Label>
              <Input
                id="pantry-expiration"
                type="date"
                value={pantryDetails.expiration_date}
                onChange={(e) => setPantryDetails({ ...pantryDetails, expiration_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pantry-notes">Notes (Optional)</Label>
              <Textarea
                id="pantry-notes"
                placeholder="Any additional notes..."
                value={pantryDetails.notes}
                onChange={(e) => setPantryDetails({ ...pantryDetails, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPantryDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddToPantry} disabled={loading}>
              {loading ? 'Adding...' : 'Add to Pantry'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={quickAddGroceryDialogOpen} onOpenChange={setQuickAddGroceryDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Grocery Items</DialogTitle>
            <DialogDescription>
              Quickly add items you need for this meal to your grocery list
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Item name"
                  value={newGroceryItem.name}
                  onChange={(e) =>
                    setNewGroceryItem({ ...newGroceryItem, name: e.target.value })
                  }
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddGroceryItem();
                    }
                  }}
                />
                <Input
                  placeholder="Quantity"
                  value={newGroceryItem.quantity}
                  onChange={(e) =>
                    setNewGroceryItem({ ...newGroceryItem, quantity: e.target.value })
                  }
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddGroceryItem();
                    }
                  }}
                  className="w-32"
                />
              </div>
              <div className="flex gap-2">
                <Select
                  value={newGroceryItem.category}
                  onValueChange={(value) =>
                    setNewGroceryItem({ ...newGroceryItem, category: value })
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="produce">Produce</SelectItem>
                    <SelectItem value="dairy">Dairy</SelectItem>
                    <SelectItem value="meat">Meat</SelectItem>
                    <SelectItem value="bakery">Bakery</SelectItem>
                    <SelectItem value="pantry">Pantry</SelectItem>
                    <SelectItem value="frozen">Frozen</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleAddGroceryItem} disabled={loading || !newGroceryItem.name.trim()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              Press Enter to quickly add another item
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setQuickAddGroceryDialogOpen(false);
                setNewGroceryItem({ name: '', quantity: '', category: 'other' });
              }}
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                <Button
                  variant="outline"
                  onClick={() => {
                    setViewRecipeDialogOpen(false);
                    handleOpenEditRecipe(selectedRecipe);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Recipe
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

              <div className="flex justify-end pt-4">
                <Button onClick={() => setCustomMealDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editRecipeDialogOpen} onOpenChange={setEditRecipeDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Recipe</DialogTitle>
            <DialogDescription>Update your recipe details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-recipe-name">Recipe Name</Label>
              <Input
                id="edit-recipe-name"
                value={editRecipe.name}
                onChange={(e) => setEditRecipe({ ...editRecipe, name: e.target.value })}
                placeholder="Spaghetti Carbonara"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Select value={editRecipe.category} onValueChange={(value) => setEditRecipe({ ...editRecipe, category: value })}>
                <SelectTrigger id="edit-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="breakfast">Breakfast</SelectItem>
                  <SelectItem value="lunch">Lunch</SelectItem>
                  <SelectItem value="dinner">Dinner</SelectItem>
                  <SelectItem value="snack">Snack</SelectItem>
                  <SelectItem value="dessert">Dessert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-servings">Servings</Label>
                <Input
                  id="edit-servings"
                  type="number"
                  value={editRecipe.servings}
                  onChange={(e) => setEditRecipe({ ...editRecipe, servings: e.target.value })}
                  placeholder="4"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-prep-time">Prep Time (minutes)</Label>
                <Input
                  id="edit-prep-time"
                  type="number"
                  value={editRecipe.prep_time}
                  onChange={(e) => setEditRecipe({ ...editRecipe, prep_time: e.target.value })}
                  placeholder="15"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-cook-time">Cook Time (minutes)</Label>
                <Input
                  id="edit-cook-time"
                  type="number"
                  value={editRecipe.cook_time}
                  onChange={(e) => setEditRecipe({ ...editRecipe, cook_time: e.target.value })}
                  placeholder="30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editRecipe.description}
                onChange={(e) => setEditRecipe({ ...editRecipe, description: e.target.value })}
                placeholder="A delicious Italian pasta dish..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Ingredients</Label>
              {editIngredients.map((ingredient, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="Ingredient name"
                    value={ingredient.name}
                    onChange={(e) => {
                      const updated = [...editIngredients];
                      updated[index].name = e.target.value;
                      setEditIngredients(updated);
                    }}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Amount"
                    value={ingredient.quantity}
                    onChange={(e) => {
                      const updated = [...editIngredients];
                      updated[index].quantity = e.target.value;
                      setEditIngredients(updated);
                    }}
                    className="w-32"
                  />
                  {editIngredients.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditIngredients(editIngredients.filter((_, i) => i !== index));
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditIngredients([...editIngredients, { name: '', quantity: '' }])}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Ingredient
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-instructions">Instructions</Label>
              <Textarea
                id="edit-instructions"
                value={editRecipe.instructions}
                onChange={(e) => setEditRecipe({ ...editRecipe, instructions: e.target.value })}
                placeholder="1. Boil water&#10;2. Cook pasta..."
                rows={6}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditRecipeDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateRecipe} disabled={loading}>
                Update Recipe
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recipe</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{recipeToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRecipe} disabled={loading}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteMealPlanDialogOpen} onOpenChange={setDeleteMealPlanDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Meal Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{mealPlanToDelete?.recipe?.name || mealPlanToDelete?.meal_name}" from your meal plan? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMealPlanToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMealPlan}
              disabled={loading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {loading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteGroceryDialogOpen} onOpenChange={setDeleteGroceryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Grocery Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{groceryItemToDelete?.name}" from your grocery list? This action cannot be undone and will be logged in the audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setGroceryItemToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGroceryItem}
              disabled={loading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {loading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteGroceryDialogOpen} onOpenChange={setBulkDeleteGroceryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Multiple Grocery Items</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedGroceryItems.size} item{selectedGroceryItems.size > 1 ? 's' : ''} from your grocery list? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeleteGroceryItems}
              disabled={loading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {loading ? 'Deleting...' : `Delete ${selectedGroceryItems.size} Item${selectedGroceryItems.size > 1 ? 's' : ''}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
