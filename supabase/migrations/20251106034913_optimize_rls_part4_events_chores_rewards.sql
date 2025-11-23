/*
  # Optimize RLS Policies for Scale - Part 4: Events, Chores & Rewards

  ## Tables Updated
  - events
  - event_participants
  - chores
  - chore_assignments
  - rewards
  - redemptions
  - reward_redemptions
  - member_badges
  - member_streaks
  - family_challenges
  - member_relationships
  - account_view_permissions
*/

-- EVENTS
DROP POLICY IF EXISTS "Members can view events based on role" ON events;
CREATE POLICY "Members can view events based on role"
  ON events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = events.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Members can insert events based on role" ON events;
CREATE POLICY "Members can insert events based on role"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = events.household_id
      AND household_members.user_id = (SELECT auth.uid())
      AND household_members.role IN ('admin', 'co_parent')
    )
  );

DROP POLICY IF EXISTS "Members can update events based on role" ON events;
CREATE POLICY "Members can update events based on role"
  ON events FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = events.household_id
      AND household_members.user_id = (SELECT auth.uid())
      AND household_members.role IN ('admin', 'co_parent')
    )
  );

DROP POLICY IF EXISTS "Members can delete events based on role" ON events;
CREATE POLICY "Members can delete events based on role"
  ON events FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = events.household_id
      AND household_members.user_id = (SELECT auth.uid())
      AND household_members.role IN ('admin', 'co_parent')
    )
  );

-- EVENT_PARTICIPANTS
DROP POLICY IF EXISTS "Users can view event_participants of household events" ON event_participants;
CREATE POLICY "Users can view event_participants of household events"
  ON event_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events
      JOIN household_members ON household_members.household_id = events.household_id
      WHERE events.id = event_participants.event_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert event_participants to household events" ON event_participants;
CREATE POLICY "Users can insert event_participants to household events"
  ON event_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      JOIN household_members ON household_members.household_id = events.household_id
      WHERE events.id = event_participants.event_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete event_participants from household events" ON event_participants;
CREATE POLICY "Users can delete event_participants from household events"
  ON event_participants FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events
      JOIN household_members ON household_members.household_id = events.household_id
      WHERE events.id = event_participants.event_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- CHORES
DROP POLICY IF EXISTS "Household members can view chores" ON chores;
CREATE POLICY "Household members can view chores"
  ON chores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = chores.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can insert chores" ON chores;
CREATE POLICY "Household members can insert chores"
  ON chores FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = chores.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can update chores" ON chores;
CREATE POLICY "Household members can update chores"
  ON chores FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = chores.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can delete chores" ON chores;
CREATE POLICY "Household members can delete chores"
  ON chores FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = chores.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- CHORE_ASSIGNMENTS
DROP POLICY IF EXISTS "Members can view chore assignments based on role" ON chore_assignments;
CREATE POLICY "Members can view chore assignments based on role"
  ON chore_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chores
      JOIN household_members ON household_members.household_id = chores.household_id
      WHERE chores.id = chore_assignments.chore_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can insert chore_assignments" ON chore_assignments;
CREATE POLICY "Household members can insert chore_assignments"
  ON chore_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chores
      JOIN household_members ON household_members.household_id = chores.household_id
      WHERE chores.id = chore_assignments.chore_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Members can update chore assignments based on role" ON chore_assignments;
CREATE POLICY "Members can update chore assignments based on role"
  ON chore_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chores
      JOIN household_members ON household_members.household_id = chores.household_id
      WHERE chores.id = chore_assignments.chore_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can delete chore_assignments" ON chore_assignments;
CREATE POLICY "Household members can delete chore_assignments"
  ON chore_assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chores
      JOIN household_members ON household_members.household_id = chores.household_id
      WHERE chores.id = chore_assignments.chore_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- REWARDS
DROP POLICY IF EXISTS "Household members can view rewards" ON rewards;
CREATE POLICY "Household members can view rewards"
  ON rewards FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = rewards.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can insert rewards" ON rewards;
CREATE POLICY "Household members can insert rewards"
  ON rewards FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = rewards.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can update rewards" ON rewards;
CREATE POLICY "Household members can update rewards"
  ON rewards FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = rewards.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can delete rewards" ON rewards;
CREATE POLICY "Household members can delete rewards"
  ON rewards FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = rewards.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- REDEMPTIONS
DROP POLICY IF EXISTS "Household members can view redemptions" ON redemptions;
CREATE POLICY "Household members can view redemptions"
  ON redemptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = redemptions.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can insert redemptions" ON redemptions;
CREATE POLICY "Household members can insert redemptions"
  ON redemptions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = redemptions.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- REWARD_REDEMPTIONS
DROP POLICY IF EXISTS "Members can view redemptions in their household" ON reward_redemptions;
CREATE POLICY "Members can view redemptions in their household"
  ON reward_redemptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm1
      JOIN household_members hm2 ON hm1.household_id = hm2.household_id
      WHERE hm1.id = reward_redemptions.member_id
      AND hm2.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Members can create redemptions" ON reward_redemptions;
CREATE POLICY "Members can create redemptions"
  ON reward_redemptions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members hm1
      JOIN household_members hm2 ON hm1.household_id = hm2.household_id
      WHERE hm1.id = reward_redemptions.member_id
      AND hm2.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can manage redemptions" ON reward_redemptions;
CREATE POLICY "Admins can manage redemptions"
  ON reward_redemptions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm1
      JOIN household_members hm2 ON hm1.household_id = hm2.household_id
      WHERE hm1.id = reward_redemptions.member_id
      AND hm2.user_id = (SELECT auth.uid())
      AND hm2.role = 'admin'
    )
  );

-- MEMBER_BADGES
DROP POLICY IF EXISTS "Members can view badges in their household" ON member_badges;
CREATE POLICY "Members can view badges in their household"
  ON member_badges FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm1
      JOIN household_members hm2 ON hm1.household_id = hm2.household_id
      WHERE hm1.id = member_badges.member_id
      AND hm2.user_id = (SELECT auth.uid())
    )
  );

-- MEMBER_STREAKS
DROP POLICY IF EXISTS "Members can view streaks in their household" ON member_streaks;
CREATE POLICY "Members can view streaks in their household"
  ON member_streaks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm1
      JOIN household_members hm2 ON hm1.household_id = hm2.household_id
      WHERE hm1.id = member_streaks.member_id
      AND hm2.user_id = (SELECT auth.uid())
    )
  );

-- FAMILY_CHALLENGES
DROP POLICY IF EXISTS "Members can view challenges in their household" ON family_challenges;
CREATE POLICY "Members can view challenges in their household"
  ON family_challenges FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = family_challenges.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- MEMBER_RELATIONSHIPS
DROP POLICY IF EXISTS "Household members can view relationships" ON member_relationships;
CREATE POLICY "Household members can view relationships"
  ON member_relationships FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = member_relationships.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can create relationships" ON member_relationships;
CREATE POLICY "Admins can create relationships"
  ON member_relationships FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = member_relationships.household_id
      AND household_members.user_id = (SELECT auth.uid())
      AND household_members.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete relationships" ON member_relationships;
CREATE POLICY "Admins can delete relationships"
  ON member_relationships FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = member_relationships.household_id
      AND household_members.user_id = (SELECT auth.uid())
      AND household_members.role = 'admin'
    )
  );

-- ACCOUNT_VIEW_PERMISSIONS
DROP POLICY IF EXISTS "Members can view their account permissions" ON account_view_permissions;
CREATE POLICY "Members can view their account permissions"
  ON account_view_permissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM accounts
      JOIN household_members ON household_members.household_id = accounts.household_id
      WHERE accounts.id = account_view_permissions.account_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can grant account permissions" ON account_view_permissions;
CREATE POLICY "Admins can grant account permissions"
  ON account_view_permissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM accounts
      JOIN household_members ON household_members.household_id = accounts.household_id
      WHERE accounts.id = account_view_permissions.account_id
      AND household_members.user_id = (SELECT auth.uid())
      AND household_members.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can revoke account permissions" ON account_view_permissions;
CREATE POLICY "Admins can revoke account permissions"
  ON account_view_permissions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM accounts
      JOIN household_members ON household_members.household_id = accounts.household_id
      WHERE accounts.id = account_view_permissions.account_id
      AND household_members.user_id = (SELECT auth.uid())
      AND household_members.role = 'admin'
    )
  );
