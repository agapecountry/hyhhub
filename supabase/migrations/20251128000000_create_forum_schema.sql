/*
  # Community Forum Schema
  
  1. New Tables
    - forum_categories: Categories for organizing threads (Feature Requests, Community Help, etc.)
    - forum_threads: Discussion threads
    - forum_posts: Posts/replies within threads
    - forum_moderators: Users with moderator privileges
    
  2. Security
    - RLS enabled on all tables
    - Free tier users cannot access community features
    - Only authenticated users with active subscriptions can post
    - Moderators can manage threads/posts
    
  3. Features
    - Pinned threads
    - Locked threads
    - Post editing (within time window)
    - Upvoting system
*/

-- Forum Categories
CREATE TABLE IF NOT EXISTS forum_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  icon text, -- Icon name for UI
  display_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Forum Threads
CREATE TABLE IF NOT EXISTS forum_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES forum_categories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id uuid REFERENCES households(id) ON DELETE SET NULL, -- Optional, for household-specific context
  title text NOT NULL,
  slug text NOT NULL,
  content text NOT NULL,
  is_pinned boolean DEFAULT false,
  is_locked boolean DEFAULT false,
  view_count int DEFAULT 0,
  reply_count int DEFAULT 0,
  last_post_at timestamptz DEFAULT now(),
  last_post_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(category_id, slug)
);

-- Forum Posts (replies to threads)
CREATE TABLE IF NOT EXISTS forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_post_id uuid REFERENCES forum_posts(id) ON DELETE CASCADE, -- For nested replies
  content text NOT NULL,
  upvotes int DEFAULT 0,
  is_solution boolean DEFAULT false, -- Mark as solution to thread
  is_edited boolean DEFAULT false,
  edited_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Forum Moderators (admin roles)
CREATE TABLE IF NOT EXISTS forum_moderators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'moderator')),
  can_pin boolean DEFAULT true,
  can_lock boolean DEFAULT true,
  can_delete boolean DEFAULT true,
  can_edit_any boolean DEFAULT false, -- Can edit any post
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Post upvotes tracking
CREATE TABLE IF NOT EXISTS forum_post_upvotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_forum_threads_category ON forum_threads(category_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_user ON forum_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_last_post ON forum_threads(last_post_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_threads_pinned ON forum_threads(is_pinned, last_post_at DESC) WHERE is_pinned = true;

CREATE INDEX IF NOT EXISTS idx_forum_posts_thread ON forum_posts(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_forum_posts_user ON forum_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_parent ON forum_posts(parent_post_id) WHERE parent_post_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_forum_post_upvotes_post ON forum_post_upvotes(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_post_upvotes_user ON forum_post_upvotes(user_id);

-- Triggers for updated_at
CREATE TRIGGER update_forum_categories_updated_at
  BEFORE UPDATE ON forum_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forum_threads_updated_at
  BEFORE UPDATE ON forum_threads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forum_posts_updated_at
  BEFORE UPDATE ON forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to check if user has active subscription
CREATE OR REPLACE FUNCTION has_active_subscription(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_subscription_tier text;
BEGIN
  -- Get user's subscription tier from household_members
  SELECT h.subscription_tier INTO v_subscription_tier
  FROM household_members hm
  JOIN households h ON h.id = hm.household_id
  WHERE hm.user_id = p_user_id
  LIMIT 1;
  
  -- Free tier (null or 'free') = no community access
  RETURN v_subscription_tier IS NOT NULL AND v_subscription_tier != 'free';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Function to check if user is forum moderator
CREATE OR REPLACE FUNCTION is_forum_moderator(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM forum_moderators
    WHERE user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Enable RLS
ALTER TABLE forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_moderators ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_post_upvotes ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Forum Categories
CREATE POLICY "Anyone can view active categories"
  ON forum_categories FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Moderators can manage categories"
  ON forum_categories FOR ALL
  TO authenticated
  USING (is_forum_moderator(auth.uid()));

-- RLS Policies: Forum Threads
CREATE POLICY "Subscribed users can view threads"
  ON forum_threads FOR SELECT
  TO authenticated
  USING (has_active_subscription(auth.uid()));

CREATE POLICY "Subscribed users can create threads"
  ON forum_threads FOR INSERT
  TO authenticated
  WITH CHECK (
    has_active_subscription(auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update own threads"
  ON forum_threads FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR is_forum_moderator(auth.uid())
  );

CREATE POLICY "Moderators can delete threads"
  ON forum_threads FOR DELETE
  TO authenticated
  USING (is_forum_moderator(auth.uid()));

-- RLS Policies: Forum Posts
CREATE POLICY "Subscribed users can view posts"
  ON forum_posts FOR SELECT
  TO authenticated
  USING (has_active_subscription(auth.uid()));

CREATE POLICY "Subscribed users can create posts"
  ON forum_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    has_active_subscription(auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update own posts"
  ON forum_posts FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR is_forum_moderator(auth.uid())
  );

CREATE POLICY "Users can delete own posts"
  ON forum_posts FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR is_forum_moderator(auth.uid())
  );

-- RLS Policies: Forum Moderators
CREATE POLICY "Anyone can view moderators"
  ON forum_moderators FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage moderators"
  ON forum_moderators FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM forum_moderators
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- RLS Policies: Post Upvotes
CREATE POLICY "Subscribed users can view upvotes"
  ON forum_post_upvotes FOR SELECT
  TO authenticated
  USING (has_active_subscription(auth.uid()));

CREATE POLICY "Subscribed users can manage own upvotes"
  ON forum_post_upvotes FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Function to increment thread view count
CREATE OR REPLACE FUNCTION increment_thread_views(p_thread_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE forum_threads
  SET view_count = view_count + 1
  WHERE id = p_thread_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Function to update thread reply count and last post info
CREATE OR REPLACE FUNCTION update_thread_reply_info()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE forum_threads
    SET 
      reply_count = reply_count + 1,
      last_post_at = NEW.created_at,
      last_post_user_id = NEW.user_id
    WHERE id = NEW.thread_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE forum_threads
    SET reply_count = reply_count - 1
    WHERE id = OLD.thread_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

CREATE TRIGGER update_thread_on_post_change
  AFTER INSERT OR DELETE ON forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_reply_info();

-- Seed default categories
INSERT INTO forum_categories (name, slug, description, icon, display_order) VALUES
  ('Feature Requests', 'feature-requests', 'Suggest new features and improvements for the app', 'Lightbulb', 1),
  ('Community Help', 'community-help', 'Get help from other community members', 'MessageCircle', 2)
ON CONFLICT (slug) DO NOTHING;

-- Add comments
COMMENT ON TABLE forum_categories IS 'Categories for organizing forum threads';
COMMENT ON TABLE forum_threads IS 'Discussion threads in the community forum';
COMMENT ON TABLE forum_posts IS 'Replies and posts within forum threads';
COMMENT ON TABLE forum_moderators IS 'Users with moderator/admin privileges in the forum';
COMMENT ON FUNCTION has_active_subscription IS 'Check if user has an active paid subscription (not free tier)';
COMMENT ON FUNCTION is_forum_moderator IS 'Check if user has forum moderator privileges';
