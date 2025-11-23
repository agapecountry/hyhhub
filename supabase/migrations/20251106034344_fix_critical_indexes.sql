/*
  # Fix Critical Index Issues

  ## Changes Made

  ### 1. Missing Foreign Key Indexes
  - Add index on `chore_assignments.claimed_by` for better join performance
  - Add index on `reward_redemptions.reward_id` for better join performance

  ### 2. Remove Duplicate Index
  - Drop duplicate index `idx_rewards_household` (keeping `idx_rewards_household_id`)

  ## Impact
  - Improved query performance on foreign key joins
  - Reduced storage overhead from duplicate index
*/

-- Add missing foreign key indexes
CREATE INDEX IF NOT EXISTS idx_chore_assignments_claimed_by 
  ON chore_assignments(claimed_by);

CREATE INDEX IF NOT EXISTS idx_reward_redemptions_reward_id 
  ON reward_redemptions(reward_id);

-- Remove duplicate index
DROP INDEX IF EXISTS idx_rewards_household;
