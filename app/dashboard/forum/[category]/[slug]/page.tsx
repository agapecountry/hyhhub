'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useSubscription } from '@/lib/subscription-context';
import { supabase } from '@/lib/supabase';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { 
  ArrowLeft,
  Pin,
  Lock,
  Eye,
  MessageSquare,
  ThumbsUp,
  CheckCircle,
  Edit,
  Trash2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Thread {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  is_locked: boolean;
  view_count: number;
  reply_count: number;
  created_at: string;
  user_id: string;
  category_id: string;
}

interface Post {
  id: string;
  content: string;
  upvotes: number;
  is_solution: boolean;
  is_edited: boolean;
  edited_at: string | null;
  created_at: string;
  user_id: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function ThreadPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const { tier } = useSubscription();
  const { toast } = useToast();

  const [thread, setThread] = useState<Thread | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isModerator, setIsModerator] = useState(false);

  useEffect(() => {
    if (user && params.category && params.slug) {
      loadThreadData();
      checkModeratorStatus();
    }
  }, [user, params.category, params.slug]);

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

  const loadThreadData = async () => {
    try {
      setLoading(true);

      // Load category
      const { data: categoryData, error: categoryError } = await supabase
        .from('forum_categories')
        .select('id, name, slug')
        .eq('slug', params.category)
        .single();

      if (categoryError) throw categoryError;
      setCategory(categoryData);

      // Load thread
      const { data: threadData, error: threadError } = await supabase
        .from('forum_threads')
        .select('*')
        .eq('slug', params.slug)
        .eq('category_id', categoryData.id)
        .single();

      if (threadError) throw threadError;
      setThread(threadData);

      // Increment view count
      await supabase.rpc('increment_thread_views', { p_thread_id: threadData.id });

      // Load posts
      const { data: postsData, error: postsError } = await supabase
        .from('forum_posts')
        .select('*')
        .eq('thread_id', threadData.id)
        .order('created_at', { ascending: true });

      if (postsError) throw postsError;
      setPosts(postsData || []);
    } catch (error) {
      console.error('Error loading thread:', error);
      toast({
        title: 'Error',
        description: 'Failed to load thread',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !thread || !replyContent.trim()) {
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase
        .from('forum_posts')
        .insert({
          thread_id: thread.id,
          user_id: user.id,
          content: replyContent.trim(),
        });

      if (error) throw error;

      toast({
        title: 'Reply Posted',
        description: 'Your reply has been added',
      });

      setReplyContent('');
      loadThreadData(); // Reload to show new post
    } catch (error: any) {
      console.error('Error posting reply:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to post reply',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Check access - allow moderators or subscribers
  const hasAccess = isModerator || (tier && tier.name !== 'free');

  if (!hasAccess) {
    router.push('/dashboard/forum');
    return null;
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading thread...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!thread || !category) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto text-center py-12">
          <p className="text-muted-foreground">Thread not found</p>
          <Button asChild className="mt-4">
            <Link href="/dashboard/forum">Back to Forum</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/forum">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <Badge variant="outline">{category.name}</Badge>
        </div>

        {/* Thread */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  {thread.is_pinned && <Pin className="h-4 w-4 text-yellow-600" />}
                  {thread.is_locked && <Lock className="h-4 w-4 text-muted-foreground" />}
                  <h1 className="text-2xl font-bold">{thread.title}</h1>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {thread.view_count} views
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {thread.reply_count} replies
                  </span>
                  <span>
                    {formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <p className="whitespace-pre-wrap">{thread.content}</p>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Posts/Replies */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            {posts.length} {posts.length === 1 ? 'Reply' : 'Replies'}
          </h2>

          {posts.map((post) => (
            <Card key={post.id}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="prose max-w-none mb-3">
                      <p className="whitespace-pre-wrap">{post.content}</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </span>
                      {post.is_edited && <span className="italic">edited</span>}
                      {post.is_solution && (
                        <Badge variant="outline" className="gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Solution
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <ThumbsUp className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground">{post.upvotes}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Reply Form */}
        {!thread.is_locked && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Post a Reply</h3>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleReply} className="space-y-4">
                <Textarea
                  placeholder="Write your reply..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  required
                  rows={6}
                  className="resize-none"
                  disabled={submitting}
                />
                <div className="flex justify-end">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Posting...' : 'Post Reply'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {thread.is_locked && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm">
                <Lock className="h-4 w-4" />
                <span>This thread is locked and no longer accepting replies</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
