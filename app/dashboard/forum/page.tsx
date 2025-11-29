'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useHousehold } from '@/lib/household-context';
import { useSubscription } from '@/lib/subscription-context';
import { supabase } from '@/lib/supabase';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { 
  MessageCircle, 
  Pin, 
  Lock, 
  Eye, 
  MessageSquare, 
  TrendingUp,
  HelpCircle,
  Lightbulb,
  AlertCircle,
  Crown,
  Settings
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  display_order: number;
}

interface Thread {
  id: string;
  title: string;
  slug: string;
  content: string;
  is_pinned: boolean;
  is_locked: boolean;
  view_count: number;
  reply_count: number;
  last_post_at: string;
  created_at: string;
  user_id: string;
  last_post_user_id: string | null;
  category_id: string;
}

const iconMap: Record<string, any> = {
  Lightbulb,
  MessageCircle,
  TrendingUp,
  HelpCircle,
  AlertCircle,
};

export default function ForumPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentHousehold } = useHousehold();
  const { tier } = useSubscription();
  const [categories, setCategories] = useState<Category[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isModerator, setIsModerator] = useState(false);

  useEffect(() => {
    if (user && currentHousehold) {
      loadForumData();
      checkModeratorStatus();
    }
  }, [user, currentHousehold, selectedCategory]);

  const checkModeratorStatus = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('forum_moderators')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        setIsModerator(true);
      }
    } catch (error) {
      console.error('Error checking moderator status:', error);
    }
  };

  const loadForumData = async () => {
    try {
      setLoading(true);

      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('forum_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // Load threads
      let threadsQuery = supabase
        .from('forum_threads')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('last_post_at', { ascending: false })
        .limit(50);

      if (selectedCategory) {
        threadsQuery = threadsQuery.eq('category_id', selectedCategory);
      }

      const { data: threadsData, error: threadsError } = await threadsQuery;

      if (threadsError) throw threadsError;
      setThreads(threadsData || []);
    } catch (error) {
      console.error('Error loading forum data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check if user has access to community features - allow moderators or subscribers
  const hasAccess = isModerator || (tier && tier.name !== 'free');

  if (!hasAccess) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Help & Community</h1>
              <p className="text-muted-foreground">Connect with other users and get support</p>
            </div>
          </div>

          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Crown className="h-6 w-6 text-yellow-600" />
                <CardTitle>Premium Feature</CardTitle>
              </div>
              <CardDescription>
                Community access is available for Premium and Elite subscribers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Upgrade your subscription to access the community forum where you can:
              </p>
              <ul className="space-y-2 mb-4">
                <li className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-yellow-600" />
                  <span>Get help from other users and the community</span>
                </li>
                <li className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-600" />
                  <span>Request new features and improvements</span>
                </li>
                <li className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-yellow-600" />
                  <span>Share tips and best practices</span>
                </li>
              </ul>
              <Button asChild>
                <Link href="/dashboard/subscription">Upgrade Subscription</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>FAQ & Help Center</CardTitle>
              <CardDescription>
                Find answers to common questions and learn about app features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard/forum/faq">
                  <HelpCircle className="h-4 w-4 mr-2" />
                  View FAQ & Documentation
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Help & Community</h1>
            <p className="text-muted-foreground">Connect, discuss, and get support</p>
          </div>
          <div className="flex gap-2">
            {isModerator && (
              <Button variant="outline" asChild>
                <Link href="/dashboard/forum/admin/categories">
                  <Settings className="h-4 w-4 mr-2" />
                  Admin
                </Link>
              </Button>
            )}
            <Button asChild>
              <Link href="/dashboard/forum/faq">
                <HelpCircle className="h-4 w-4 mr-2" />
                FAQ & Help
              </Link>
            </Button>
          </div>
        </div>

        {/* Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((category) => {
            const Icon = iconMap[category.icon] || MessageCircle;
            const categoryThreads = threads.filter(t => t.category_id === category.id);
            
            return (
              <Card key={category.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{category.name}</CardTitle>
                      <CardDescription>{category.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                    <span>{categoryThreads.length} threads</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
                    >
                      {selectedCategory === category.id ? 'Show All' : 'Filter'}
                    </Button>
                  </div>
                  <Button asChild className="w-full" size="sm">
                    <Link href={`/dashboard/forum/new?category=${category.id}`}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      New Thread
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Separator />

        {/* Thread List */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedCategory 
                ? categories.find(c => c.id === selectedCategory)?.name 
                : 'Recent Discussions'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : threads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No threads yet. Be the first to start a discussion!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {threads.map((thread) => (
                  <Link
                    key={thread.id}
                    href={`/dashboard/forum/${categories.find(c => c.id === thread.category_id)?.slug}/${thread.slug}`}
                    className="block p-4 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {thread.is_pinned && (
                            <Pin className="h-4 w-4 text-yellow-600" />
                          )}
                          {thread.is_locked && (
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          )}
                          <h3 className="font-medium truncate">{thread.title}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {thread.content}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {thread.view_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {thread.reply_count}
                          </span>
                          <span>
                            {formatDistanceToNow(new Date(thread.last_post_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {categories.find(c => c.id === thread.category_id)?.name}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
