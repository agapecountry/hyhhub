'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar as CalendarIcon, Plus, Clock, MapPin, Trash2, Edit, ChevronLeft, ChevronRight, Palette, X } from 'lucide-react';
import { useHousehold } from '@/lib/household-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, startOfDay } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CalendarEvent {
  id: string;
  household_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  all_day: boolean;
  location: string | null;
  color: string;
  color_category_id: string | null;
  created_by: string;
  assigned_to: string[] | null;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

interface ColorCategory {
  id: string;
  household_id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

interface HouseholdMember {
  id: string;
  user_id: string | null;
  name: string | null;
  email: string;
}

interface MealPlan {
  id: string;
  household_id: string;
  recipe_id: string | null;
  meal_name: string | null;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  meal_date: string;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  recipes?: {
    name: string;
  };
}

export default function CalendarPage() {
  const { currentHousehold } = useHousehold();
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [meals, setMeals] = useState<MealPlan[]>([]);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [colorCategories, setColorCategories] = useState<ColorCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isQuickTaskDialogOpen, setIsQuickTaskDialogOpen] = useState(false);
  const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editingTask, setEditingTask] = useState<CalendarEvent | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isManagingColors, setIsManagingColors] = useState(false);
  const [newColorCategory, setNewColorCategory] = useState({ name: '', color: '#3B82F6' });
  const [quickTaskData, setQuickTaskData] = useState({
    title: '',
    date: '',
    time: '09:00',
  });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: '',
    start_time: '09:00',
    end_date: '',
    end_time: '10:00',
    all_day: false,
    location: '',
    color_category_id: '',
    assigned_to: [] as string[],
    is_private: false,
  });


  useEffect(() => {
    if (currentHousehold) {
      loadEvents();
      loadMeals();
      loadMembers();
      loadColorCategories();
    }
  }, [currentHousehold]);

  useEffect(() => {
    if (formData.start_date && formData.start_time && !editingEvent) {
      const startDateTime = new Date(`${formData.start_date}T${formData.start_time}`);
      const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);

      const endDate = endDateTime.toISOString().split('T')[0];
      const endTime = endDateTime.toTimeString().slice(0, 5);

      setFormData(prev => ({
        ...prev,
        end_date: endDate,
        end_time: endTime,
      }));
    }
  }, [formData.start_date, formData.start_time, editingEvent]);

  const loadEvents = async () => {
    if (!currentHousehold) return;

    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('household_id', currentHousehold.id)
        .order('start_time', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load events',
        variant: 'destructive',
      });
    }
  };

  const loadMeals = async () => {
    if (!currentHousehold) return;

    try {
      const { data, error } = await supabase
        .from('meal_plans')
        .select('*, recipes(name)')
        .eq('household_id', currentHousehold.id)
        .order('meal_date', { ascending: true });

      if (error) throw error;
      setMeals(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load meals',
        variant: 'destructive',
      });
    }
  };

  const loadMembers = async () => {
    if (!currentHousehold) return;

    try {
      const { data: membersData, error: membersError } = await supabase
        .from('household_members')
        .select('id, user_id, name')
        .eq('household_id', currentHousehold.id);

      if (membersError) throw membersError;

      const accountMemberIds = membersData?.filter(m => m.user_id).map(m => m.user_id!) || [];
      let usersData: any[] = [];

      if (accountMemberIds.length > 0) {
        const { data, error: usersError } = await supabase
          .from('users')
          .select('id, email, name')
          .in('id', accountMemberIds);

        if (usersError) throw usersError;
        usersData = data || [];
      }

      const membersWithInfo = membersData?.map(member => {
        if (member.user_id) {
          const userInfo = usersData.find(u => u.id === member.user_id);
          return {
            id: member.id,
            user_id: member.user_id,
            name: member.name || userInfo?.name || null,
            email: userInfo?.email || 'Unknown',
          };
        } else {
          return {
            id: member.id,
            user_id: null,
            name: member.name,
            email: member.name || 'No Account',
          };
        }
      }) || [];

      setMembers(membersWithInfo);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load members',
        variant: 'destructive',
      });
    }
  };

  const loadColorCategories = async () => {
    if (!currentHousehold) return;

    try {
      const { data, error } = await supabase
        .from('calendar_color_categories')
        .select('*')
        .eq('household_id', currentHousehold.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        await createDefaultCategories();
      } else {
        setColorCategories(data || []);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load color categories',
        variant: 'destructive',
      });
    }
  };

  const createDefaultCategories = async () => {
    if (!currentHousehold) return;

    const defaultCategories = [
      { name: 'Work', color: '#3B82F6' },
      { name: 'Personal', color: '#10B981' },
      { name: 'Family', color: '#F59E0B' },
      { name: 'Health', color: '#EF4444' },
      { name: 'Social', color: '#8B5CF6' },
    ];

    try {
      const { data, error } = await supabase
        .from('calendar_color_categories')
        .insert(
          defaultCategories.map(cat => ({
            household_id: currentHousehold.id,
            name: cat.name,
            color: cat.color,
          }))
        )
        .select();

      if (error) throw error;
      setColorCategories(data || []);
    } catch (error: any) {
      console.error('Failed to create default categories:', error);
    }
  };

  const handleCreateColorCategory = async () => {
    if (!currentHousehold || !newColorCategory.name.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a category name',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('calendar_color_categories')
        .insert({
          household_id: currentHousehold.id,
          name: newColorCategory.name.trim(),
          color: newColorCategory.color,
        });

      if (error) throw error;

      await loadColorCategories();
      setNewColorCategory({ name: '', color: '#3B82F6' });
      toast({
        title: 'Color Category Created',
        description: 'Your color category has been added',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create color category',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteColorCategory = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('calendar_color_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadColorCategories();
      toast({
        title: 'Color Category Deleted',
        description: 'The color category has been removed',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete color category',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async () => {
    if (!currentHousehold || !user) return;
    if (!formData.title.trim() || !formData.start_date) {
      toast({
        title: 'Error',
        description: 'Please fill in required fields',
        variant: 'destructive',
      });
      return;
    }

    const selectedCategory = colorCategories.find(c => c.id === formData.color_category_id);
    const eventColor = selectedCategory?.color || '#3B82F6';

    const startTime = formData.all_day
      ? `${formData.start_date}T12:00:00.000Z`
      : new Date(`${formData.start_date}T${formData.start_time}:00`).toISOString();

    const endTime = formData.all_day || !formData.end_date
      ? null
      : new Date(`${formData.end_date}T${formData.end_time}:00`).toISOString();

    if (endTime && parseISO(startTime) >= parseISO(endTime)) {
      toast({
        title: 'Invalid Time Range',
        description: 'Start date and time must be before end date and time',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('calendar_events')
        .insert({
          household_id: currentHousehold.id,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          start_time: startTime,
          end_time: endTime,
          all_day: formData.all_day,
          location: formData.location.trim() || null,
          color: eventColor,
          color_category_id: formData.color_category_id || null,
          created_by: user.id,
          assigned_to: formData.assigned_to.length > 0 ? formData.assigned_to : null,
          is_private: formData.is_private,
        });

      if (error) throw error;

      await loadEvents();
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: 'Event Created',
        description: 'Your event has been added to the calendar',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create event',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent) return;

    const selectedCategory = colorCategories.find(c => c.id === formData.color_category_id);
    const eventColor = selectedCategory?.color || editingEvent.color;

    const startTime = formData.all_day
      ? `${formData.start_date}T12:00:00.000Z`
      : new Date(`${formData.start_date}T${formData.start_time}:00`).toISOString();

    const endTime = formData.all_day || !formData.end_date
      ? null
      : new Date(`${formData.end_date}T${formData.end_time}:00`).toISOString();

    if (endTime && parseISO(startTime) >= parseISO(endTime)) {
      toast({
        title: 'Invalid Time Range',
        description: 'Start date and time must be before end date and time',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('calendar_events')
        .update({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          start_time: startTime,
          end_time: endTime,
          all_day: formData.all_day,
          location: formData.location.trim() || null,
          color: eventColor,
          color_category_id: formData.color_category_id || null,
          assigned_to: formData.assigned_to.length > 0 ? formData.assigned_to : null,
          is_private: formData.is_private,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingEvent.id);

      if (error) throw error;

      await loadEvents();
      setEditingEvent(null);
      resetForm();
      toast({
        title: 'Event Updated',
        description: 'Your event has been updated',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update event',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      await loadEvents();
      toast({
        title: 'Event Deleted',
        description: 'The event has been removed',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete event',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuickTask = async () => {
    if (!currentHousehold || !user) return;
    if (!quickTaskData.title.trim() || !quickTaskData.date) {
      toast({
        title: 'Error',
        description: 'Please enter a title and date',
        variant: 'destructive',
      });
      return;
    }

    const startTime = new Date(`${quickTaskData.date}T${quickTaskData.time}:00`).toISOString();

    setLoading(true);
    try {
      const { error } = await supabase
        .from('calendar_events')
        .insert({
          household_id: currentHousehold.id,
          title: quickTaskData.title.trim(),
          description: null,
          start_time: startTime,
          end_time: null,
          all_day: false,
          location: null,
          color: '#3B82F6',
          color_category_id: null,
          created_by: user.id,
          assigned_to: null,
          is_private: false,
        });

      if (error) throw error;

      await loadEvents();
      setIsQuickTaskDialogOpen(false);
      setQuickTaskData({ title: '', date: '', time: '09:00' });
      toast({
        title: 'Task Created',
        description: 'Your task has been added to the calendar',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create task',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTask = async () => {
    if (!editingTask || !currentHousehold || !user) return;
    if (!quickTaskData.title.trim() || !quickTaskData.date) {
      toast({
        title: 'Error',
        description: 'Please enter a title and date',
        variant: 'destructive',
      });
      return;
    }

    const startTime = new Date(`${quickTaskData.date}T${quickTaskData.time}:00`).toISOString();

    setLoading(true);
    try {
      const { error } = await supabase
        .from('calendar_events')
        .update({
          title: quickTaskData.title.trim(),
          start_time: startTime,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingTask.id);

      if (error) throw error;

      await loadEvents();
      setIsEditTaskDialogOpen(false);
      setEditingTask(null);
      setQuickTaskData({ title: '', date: '', time: '09:00' });
      toast({
        title: 'Task Updated',
        description: 'Your task has been updated',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update task',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    const now = new Date();
    const dateStr = format(now, 'yyyy-MM-dd');
    setFormData({
      title: '',
      description: '',
      start_date: dateStr,
      start_time: '09:00',
      end_date: dateStr,
      end_time: '10:00',
      all_day: false,
      location: '',
      color_category_id: '',
      assigned_to: [],
      is_private: false,
    });
  };

  const openCreateDialogWithDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setFormData({
      title: '',
      description: '',
      start_date: dateStr,
      start_time: '09:00',
      end_date: dateStr,
      end_time: '10:00',
      all_day: false,
      location: '',
      color_category_id: '',
      assigned_to: [],
      is_private: false,
    });
    setEditingEvent(null);
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (event: CalendarEvent) => {
    if (!event.end_time && !event.description && !event.location) {
      setEditingTask(event);
      const startDate = event.start_time.slice(0, 10);
      const startTime = event.start_time.slice(11, 16);
      setQuickTaskData({
        title: event.title,
        date: startDate,
        time: startTime,
      });
      setIsEditTaskDialogOpen(true);
    } else {
      setEditingEvent(event);
      const startDate = event.start_time.slice(0, 10);
      const startTime = event.start_time.slice(11, 16);

      let endDate = startDate;
      let endTime = startTime;

      if (event.end_time) {
        endDate = event.end_time.slice(0, 10);
        endTime = event.end_time.slice(11, 16);
      } else {
        const startDateTime = parseISO(event.start_time);
        const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
        endDate = endDateTime.toISOString().split('T')[0];
        endTime = endDateTime.toTimeString().slice(0, 5);
      }

      setFormData({
        title: event.title,
        description: event.description || '',
        start_date: startDate,
        start_time: startTime,
        end_date: endDate,
        end_time: endTime,
        all_day: event.all_day,
        location: event.location || '',
        color_category_id: event.color_category_id || '',
        assigned_to: event.assigned_to || [],
        is_private: event.is_private,
      });
    }
  };

  const getCurrentUserMemberId = () => {
    return members.find(m => m.user_id === user?.id)?.id;
  };

  const canViewEventDetails = (event: CalendarEvent) => {
    if (!event.is_private) return true;
    if (event.created_by === user?.id) return true;
    const currentMemberId = getCurrentUserMemberId();
    if (currentMemberId && event.assigned_to?.includes(currentMemberId)) return true;
    return false;
  };

  const canEditEvent = (event: CalendarEvent) => {
    if (event.created_by === user?.id) return true;
    const currentMemberId = getCurrentUserMemberId();
    if (currentMemberId && event.assigned_to?.includes(currentMemberId)) return true;
    return false;
  };

  const canDeleteEvent = (event: CalendarEvent) => {
    return event.created_by === user?.id;
  };

  const getEventDisplay = (event: CalendarEvent) => {
    if (canViewEventDetails(event)) {
      return event;
    }
    return {
      ...event,
      title: 'Private Event',
      description: null,
      location: null,
    };
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = monthStart.getDay();

  const upcomingEvents = events
    .filter(e => parseISO(e.start_time) >= startOfDay(new Date()))
    .map(e => getEventDisplay(e))
    .slice(0, 5);

  const selectedDateEvents = selectedDate
    ? events.filter(e => {
        const eventDate = parseISO(e.start_time);
        return isSameDay(eventDate, selectedDate);
      }).map(e => getEventDisplay(e))
    : [];

  const selectedDateMeals = selectedDate
    ? meals.filter(m => isSameDay(parseISO(m.meal_date), selectedDate))
    : [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">Calendar & Scheduling</h1>
            <p className="text-muted-foreground">Shared family calendar and events</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsManagingColors(true)}>
              <Palette className="h-4 w-4 mr-2" />
              Manage Colors
            </Button>
            <Dialog open={isQuickTaskDialogOpen} onOpenChange={setIsQuickTaskDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Clock className="h-4 w-4 mr-2" />
                  Quick Task
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Quick Task</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="quick-task-title">Task *</Label>
                    <Input
                      id="quick-task-title"
                      value={quickTaskData.title}
                      onChange={(e) => setQuickTaskData({ ...quickTaskData, title: e.target.value })}
                      placeholder="What needs to be done?"
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quick-task-date">Date *</Label>
                    <Input
                      id="quick-task-date"
                      type="date"
                      value={quickTaskData.date}
                      onChange={(e) => setQuickTaskData({ ...quickTaskData, date: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quick-task-time">Time</Label>
                    <Input
                      id="quick-task-time"
                      type="time"
                      value={quickTaskData.time}
                      onChange={(e) => setQuickTaskData({ ...quickTaskData, time: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                  <Button onClick={handleCreateQuickTask} disabled={loading} className="w-full">
                    Add Task
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={isEditTaskDialogOpen} onOpenChange={(open) => {
              setIsEditTaskDialogOpen(open);
              if (!open) {
                setEditingTask(null);
                setQuickTaskData({ title: '', date: '', time: '09:00' });
              }
            }}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit Task</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-task-title">Task *</Label>
                    <Input
                      id="edit-task-title"
                      value={quickTaskData.title}
                      onChange={(e) => setQuickTaskData({ ...quickTaskData, title: e.target.value })}
                      placeholder="What needs to be done?"
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-task-date">Date *</Label>
                    <Input
                      id="edit-task-date"
                      type="date"
                      value={quickTaskData.date}
                      onChange={(e) => setQuickTaskData({ ...quickTaskData, date: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-task-time">Time</Label>
                    <Input
                      id="edit-task-time"
                      type="time"
                      value={quickTaskData.time}
                      onChange={(e) => setQuickTaskData({ ...quickTaskData, time: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleUpdateTask} disabled={loading} className="flex-1">
                      Update Task
                    </Button>
                    {editingTask && (
                      <Button
                        variant="destructive"
                        onClick={() => {
                          handleDeleteEvent(editingTask.id);
                          setIsEditTaskDialogOpen(false);
                          setEditingTask(null);
                        }}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Event
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Event</DialogTitle>
                </DialogHeader>
                <EventForm
                  formData={formData}
                  setFormData={setFormData}
                  members={members}
                  colorCategories={colorCategories}
                  onSubmit={handleCreateEvent}
                  loading={loading}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    {format(currentMonth, 'MMMM yyyy')}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
                      Today
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}
                  {Array.from({ length: startDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square" />
                  ))}
                  {daysInMonth.map(day => {
                    const dayEvents = events.filter(e => isSameDay(parseISO(e.start_time), day));
                    const dayMeals = meals.filter(m => isSameDay(parseISO(m.meal_date), day));
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isToday = isSameDay(day, new Date());

                    return (
                      <button
                        key={day.toString()}
                        onClick={() => setSelectedDate(day)}
                        onDoubleClick={() => openCreateDialogWithDate(day)}
                        className={`aspect-square p-1 border rounded-lg hover:bg-accent transition-colors ${
                          isSelected ? 'bg-primary text-primary-foreground' : ''
                        } ${isToday ? 'border-primary border-2' : ''}`}
                      >
                        <div className="text-sm font-medium">{format(day, 'd')}</div>
                        {(dayEvents.length > 0 || dayMeals.length > 0) && (
                          <div className="flex gap-0.5 mt-1 flex-wrap">
                            {dayEvents.slice(0, 2).map(event => (
                              <div
                                key={event.id}
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: event.color }}
                              />
                            ))}
                            {dayMeals.slice(0, 2).map(meal => (
                              <div
                                key={meal.id}
                                className="w-1.5 h-1.5 rounded-full bg-orange-500"
                                title={`${meal.meal_type}: ${meal.recipes?.name || meal.meal_name}`}
                              />
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {selectedDate && (selectedDateEvents.length > 0 || selectedDateMeals.length > 0) && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Events & Meals on {format(selectedDate, 'MMMM d, yyyy')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedDateMeals.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-muted-foreground">Meals</h3>
                      {selectedDateMeals.map(meal => (
                        <div key={meal.id} className="flex items-center gap-2 p-2 rounded-lg bg-orange-50 border border-orange-200">
                          <div className="w-2 h-2 rounded-full bg-orange-500" />
                          <div className="flex-1">
                            <div className="font-medium capitalize">{meal.meal_type}</div>
                            <div className="text-sm text-muted-foreground">
                              {meal.recipes?.name || meal.meal_name || 'No meal specified'}
                            </div>
                            {meal.notes && (
                              <div className="text-xs text-muted-foreground mt-1">{meal.notes}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedDateEvents.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-muted-foreground">Events</h3>
                      {selectedDateEvents.map(event => {
                        const originalEvent = events.find(e => e.id === event.id)!;
                        return (
                          <EventCard
                            key={event.id}
                            event={event}
                            members={members}
                            onEdit={openEditDialog}
                            onDelete={handleDeleteEvent}
                            loading={loading}
                            canEdit={canEditEvent(originalEvent)}
                            canDelete={canDeleteEvent(originalEvent)}
                          />
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Events</CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingEvents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No upcoming events
                  </div>
                ) : (
                  <div className="space-y-2">
                    {upcomingEvents.map(event => {
                      const originalEvent = events.find(e => e.id === event.id)!;
                      return (
                        <EventCard
                          key={event.id}
                          event={event}
                          members={members}
                          onEdit={openEditDialog}
                          onDelete={handleDeleteEvent}
                          loading={loading}
                          compact
                          canEdit={canEditEvent(originalEvent)}
                          canDelete={canDeleteEvent(originalEvent)}
                        />
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {editingEvent && (
          <Dialog open={!!editingEvent} onOpenChange={() => setEditingEvent(null)}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Event</DialogTitle>
              </DialogHeader>
              <EventForm
                formData={formData}
                setFormData={setFormData}
                members={members}
                colorCategories={colorCategories}
                onSubmit={handleUpdateEvent}
                loading={loading}
                isEdit
              />
            </DialogContent>
          </Dialog>
        )}

        <Dialog open={isManagingColors} onOpenChange={setIsManagingColors}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Manage Color Categories</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Create New Category</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Category name (e.g., Sports)"
                    value={newColorCategory.name}
                    onChange={(e) => setNewColorCategory({ ...newColorCategory, name: e.target.value })}
                    disabled={loading}
                  />
                  <Input
                    type="color"
                    value={newColorCategory.color}
                    onChange={(e) => setNewColorCategory({ ...newColorCategory, color: e.target.value })}
                    className="w-20"
                    disabled={loading}
                  />
                </div>
                <Button onClick={handleCreateColorCategory} disabled={loading} className="w-full">
                  Add Category
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Existing Categories</Label>
                {colorCategories.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No color categories yet</p>
                ) : (
                  <div className="space-y-2">
                    {colorCategories.map(category => (
                      <div key={category.id} className="flex items-center justify-between p-2 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded" style={{ backgroundColor: category.color }} />
                          <span className="font-medium">{category.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteColorCategory(category.id)}
                          disabled={loading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

interface EventFormProps {
  formData: any;
  setFormData: (data: any) => void;
  members: HouseholdMember[];
  colorCategories: ColorCategory[];
  onSubmit: () => void;
  loading: boolean;
  isEdit?: boolean;
}

function EventForm({ formData, setFormData, members, colorCategories, onSubmit, loading, isEdit }: EventFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Event title"
          disabled={loading}
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Event details"
          disabled={loading}
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="all_day"
          checked={formData.all_day}
          onCheckedChange={(checked) => setFormData({ ...formData, all_day: checked })}
          disabled={loading}
        />
        <Label htmlFor="all_day">All day event</Label>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="is_private"
          checked={formData.is_private}
          onCheckedChange={(checked) => setFormData({ ...formData, is_private: checked })}
          disabled={loading}
        />
        <Label htmlFor="is_private">Private event (only you and assigned members see details)</Label>
      </div>

      <div className={formData.all_day ? "" : "grid grid-cols-2 gap-2"}>
        <div>
          <Label htmlFor="start_date">Start Date *</Label>
          <Input
            id="start_date"
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            disabled={loading}
          />
        </div>
        {!formData.all_day && (
          <div>
            <Label htmlFor="start_time">Time</Label>
            <Input
              id="start_time"
              type="time"
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              disabled={loading}
            />
          </div>
        )}
      </div>

      {!formData.all_day && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="end_date">End Date</Label>
            <Input
              id="end_date"
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              disabled={loading}
            />
          </div>
          <div>
            <Label htmlFor="end_time">Time</Label>
            <Input
              id="end_time"
              type="time"
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              disabled={loading}
            />
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          placeholder="Event location"
          disabled={loading}
        />
      </div>

      <div>
        <Label>Color Category</Label>
        <Select
          value={formData.color_category_id || "none"}
          onValueChange={(value) => setFormData({ ...formData, color_category_id: value === "none" ? "" : value })}
          disabled={loading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No category</SelectItem>
            {colorCategories.map(category => (
              <SelectItem key={category.id} value={category.id}>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: category.color }} />
                  {category.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Assign to Members</Label>
        <div className="space-y-2 mt-2">
          {members.map(member => (
            <div key={member.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`member-${member.id}`}
                checked={formData.assigned_to.includes(member.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setFormData({ ...formData, assigned_to: [...formData.assigned_to, member.id] });
                  } else {
                    setFormData({ ...formData, assigned_to: formData.assigned_to.filter((id: string) => id !== member.id) });
                  }
                }}
                className="rounded"
                disabled={loading}
              />
              <Label htmlFor={`member-${member.id}`} className="font-normal cursor-pointer">
                {member.name || member.email}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <Button onClick={onSubmit} disabled={loading} className="w-full">
        {isEdit ? 'Update Event' : 'Create Event'}
      </Button>
    </div>
  );
}

interface EventCardProps {
  event: CalendarEvent;
  members: HouseholdMember[];
  onEdit: (event: CalendarEvent) => void;
  onDelete: (eventId: string) => void;
  loading: boolean;
  compact?: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

function EventCard({ event, members, onEdit, onDelete, loading, compact, canEdit, canDelete }: EventCardProps) {
  const assignedMembers = event.assigned_to
    ? members.filter(m => event.assigned_to?.includes(m.id))
    : [];

  const isPrivatePlaceholder = event.title === 'Private Event';

  return (
    <div className="border rounded-lg p-3" style={{ borderLeftColor: event.color, borderLeftWidth: '4px' }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium truncate">{event.title}</h4>
            {isPrivatePlaceholder && (
              <Badge variant="outline" className="text-xs">Private</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {event.all_day ? (
              format(parseISO(event.start_time), 'MMM d, yyyy')
            ) : (
              <>
                {format(parseISO(event.start_time), 'MMM d, h:mm a')}
                {event.end_time && ` - ${format(parseISO(event.end_time), 'h:mm a')}`}
              </>
            )}
          </div>
          {event.location && (
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {event.location}
            </div>
          )}
          {assignedMembers.length > 0 && !compact && !isPrivatePlaceholder && (
            <div className="flex gap-1 mt-2">
              {assignedMembers.map(member => (
                <Badge key={member.id} variant="secondary" className="text-xs">
                  {member.name || member.email}
                </Badge>
              ))}
            </div>
          )}
        </div>
        {!isPrivatePlaceholder && (
          <div className="flex gap-1">
            {canEdit && (
              <Button variant="ghost" size="sm" onClick={() => onEdit(event)} disabled={loading}>
                <Edit className="h-3 w-3" />
              </Button>
            )}
            {canDelete && (
              <Button variant="ghost" size="sm" onClick={() => onDelete(event.id)} disabled={loading}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            )}
          </div>
        )}
      </div>
      {event.description && !compact && (
        <p className="text-sm text-muted-foreground mt-2">{event.description}</p>
      )}
    </div>
  );
}
