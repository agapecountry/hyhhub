/*
  # Optimize RLS Policies - Part 4: Calendar and Events
  
  Tables optimized:
  - calendar_events
  - calendar_color_categories
  - event_participants
  - events
  - notifications
*/

-- CALENDAR_EVENTS
DROP POLICY IF EXISTS "Household members can view events" ON calendar_events;
DROP POLICY IF EXISTS "Household members can create events" ON calendar_events;
DROP POLICY IF EXISTS "Creator and assigned members can update events" ON calendar_events;
DROP POLICY IF EXISTS "Only creator can delete events" ON calendar_events;

CREATE POLICY "Household members can view events" ON calendar_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members hm WHERE hm.household_id = calendar_events.household_id AND hm.user_id = (SELECT auth.uid())));

CREATE POLICY "Household members can create events" ON calendar_events FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM household_members hm WHERE hm.household_id = calendar_events.household_id AND hm.user_id = (SELECT auth.uid())) AND created_by = (SELECT auth.uid()));

CREATE POLICY "Creator and assigned members can update events" ON calendar_events FOR UPDATE TO authenticated
  USING (created_by = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM household_members hm WHERE hm.household_id = calendar_events.household_id AND hm.user_id = (SELECT auth.uid()) AND (calendar_events.assigned_to @> ARRAY[hm.id] OR hm.role = 'admin'::text)))
  WITH CHECK (created_by = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM household_members hm WHERE hm.household_id = calendar_events.household_id AND hm.user_id = (SELECT auth.uid()) AND (calendar_events.assigned_to @> ARRAY[hm.id] OR hm.role = 'admin'::text)));

CREATE POLICY "Only creator can delete events" ON calendar_events FOR DELETE TO authenticated
  USING (created_by = (SELECT auth.uid()));

-- CALENDAR_COLOR_CATEGORIES
DROP POLICY IF EXISTS "Household members can view color categories" ON calendar_color_categories;
DROP POLICY IF EXISTS "Household members can create color categories" ON calendar_color_categories;
DROP POLICY IF EXISTS "Household members can update color categories" ON calendar_color_categories;
DROP POLICY IF EXISTS "Household members can delete color categories" ON calendar_color_categories;

CREATE POLICY "Household members can view color categories" ON calendar_color_categories FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members hm WHERE hm.household_id = calendar_color_categories.household_id AND hm.user_id = (SELECT auth.uid())));

CREATE POLICY "Household members can create color categories" ON calendar_color_categories FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM household_members hm WHERE hm.household_id = calendar_color_categories.household_id AND hm.user_id = (SELECT auth.uid())));

CREATE POLICY "Household members can update color categories" ON calendar_color_categories FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members hm WHERE hm.household_id = calendar_color_categories.household_id AND hm.user_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM household_members hm WHERE hm.household_id = calendar_color_categories.household_id AND hm.user_id = (SELECT auth.uid())));

CREATE POLICY "Household members can delete color categories" ON calendar_color_categories FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members hm WHERE hm.household_id = calendar_color_categories.household_id AND hm.user_id = (SELECT auth.uid())));

-- EVENT_PARTICIPANTS
DROP POLICY IF EXISTS "Household members can view event participants" ON event_participants;
DROP POLICY IF EXISTS "Event creator can add participants" ON event_participants;
DROP POLICY IF EXISTS "Event creator can remove participants" ON event_participants;

CREATE POLICY "Household members can view event participants" ON event_participants FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM events e JOIN household_members hm ON hm.household_id = e.household_id WHERE e.id = event_participants.event_id AND hm.user_id = (SELECT auth.uid())));

CREATE POLICY "Event creator can add participants" ON event_participants FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM events e WHERE e.id = event_participants.event_id AND e.created_by = (SELECT auth.uid())));

CREATE POLICY "Event creator can remove participants" ON event_participants FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM events e WHERE e.id = event_participants.event_id AND e.created_by = (SELECT auth.uid())));

-- EVENTS
DROP POLICY IF EXISTS "Household members can view events" ON events;
DROP POLICY IF EXISTS "Household members can create events" ON events;
DROP POLICY IF EXISTS "Event creator can update events" ON events;
DROP POLICY IF EXISTS "Event creator can delete events" ON events;

CREATE POLICY "Household members can view events" ON events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = events.household_id AND household_members.user_id = (SELECT auth.uid())));

CREATE POLICY "Household members can create events" ON events FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = events.household_id AND household_members.user_id = (SELECT auth.uid())) AND created_by = (SELECT auth.uid()));

CREATE POLICY "Event creator can update events" ON events FOR UPDATE TO authenticated
  USING (created_by = (SELECT auth.uid()));

CREATE POLICY "Event creator can delete events" ON events FOR DELETE TO authenticated
  USING (created_by = (SELECT auth.uid()));

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Users can view their notifications" ON notifications;
DROP POLICY IF EXISTS "Users can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their notifications" ON notifications;

CREATE POLICY "Users can view their notifications" ON notifications FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can create notifications" ON notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their notifications" ON notifications FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their notifications" ON notifications FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));