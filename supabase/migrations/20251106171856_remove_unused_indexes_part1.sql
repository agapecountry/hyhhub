/*
  # Remove Unused Indexes - Part 1

  1. Performance Improvements
    - Remove indexes that are not being used
    - Reduces storage overhead and write performance impact
    - Simplifies maintenance
  
  2. Indexes Removed (Part 1 - Core Tables)
    - transactions table indexes
    - events table indexes
    - notifications table indexes
    - household_invites table indexes
    - member_relationships indexes
    - account_view_permissions indexes
    - household_members role index
    - payoff_scenarios indexes
    - calendar_events indexes
    - budgets indexes
*/

-- Transactions
DROP INDEX IF EXISTS idx_transactions_account_id;
DROP INDEX IF EXISTS idx_transactions_category_id;

-- Events
DROP INDEX IF EXISTS idx_events_start_time;
DROP INDEX IF EXISTS idx_events_created_by;

-- Event Participants
DROP INDEX IF EXISTS idx_event_participants_user_id;

-- Notifications
DROP INDEX IF EXISTS idx_notifications_user_id;
DROP INDEX IF EXISTS idx_notifications_read;
DROP INDEX IF EXISTS idx_notifications_household_id;
DROP INDEX IF EXISTS idx_notifications_event_id;

-- Household Invites
DROP INDEX IF EXISTS idx_household_invites_code;
DROP INDEX IF EXISTS idx_household_invites_created_by;
DROP INDEX IF EXISTS idx_household_invites_used_by;

-- Member Relationships
DROP INDEX IF EXISTS idx_member_relationships_household;

-- Account View Permissions
DROP INDEX IF EXISTS idx_account_view_permissions_account;
DROP INDEX IF EXISTS idx_account_view_permissions_granted_by;
DROP INDEX IF EXISTS idx_account_view_permissions_household_id;

-- Household Members
DROP INDEX IF EXISTS idx_household_members_role;

-- Payoff Scenarios
DROP INDEX IF EXISTS idx_payoff_scenarios_household_id;

-- Calendar Events
DROP INDEX IF EXISTS idx_calendar_events_created_by;
DROP INDEX IF EXISTS idx_calendar_events_color_category_id;

-- Budgets
DROP INDEX IF EXISTS idx_budgets_category_id;