# Member Permissions & Access Control Guide

## Overview
Handle Your House now includes a comprehensive member management system with granular permissions tied to subscription tiers. This allows household admins to control exactly which sections of the app each member can access.

## Subscription Tier Member Limits

### Account Member Limits (Account-Wide)
Account members are users with login access who can use the app. **Member limits are shared across ALL households owned by the subscription holder**, not per-household.

- **Free Tier**: 1 account member total (admin only)
- **Basic Tier**: 1 account member total (admin only)
- **Premium Tier**: 4 account members total across all households
- **Elite Tier**: 8 account members total across all households
- **Influencer Tiers**: Same as Premium (4) or Elite (8) across all households

**Example**: If you have an Elite subscription and own 3 households:
- Household A uses 4 account members
- Household B uses 2 account members
- Household C uses 2 account members
- **Total**: 8/8 members used (limit reached)

### Non-Account Members
**All tiers** support **unlimited** non-account members. These are household members without login access (e.g., children, pets) who can be assigned to chores and appear on the calendar.

## App Sections

The following sections can have permissions assigned:

1. **Dashboard** - Always accessible to all account members
2. **Accounts** - Financial accounts and transactions
3. **Budget** - Budget planning and tracking
4. **Debt** - Debt tracking and payoff planning
5. **Calendar** - Family calendar and events
6. **Meals** - Meal planning and recipes
7. **Pantry** - Pantry inventory management
8. **Chores** - Chore assignments and rewards
9. **Projects** - Savings projects and goals

## Permission Types

Each section has two permission levels:

- **View**: Member can view data in this section
- **Edit**: Member can create, update, and delete data in this section

## How It Works

### For Admins

1. **Navigate** to Dashboard > Manage Household > Members tab
2. **View** the account member limit for your subscription tier
3. **Invite** new members (if under the limit) using email invites
4. **Add** non-account members without login access
5. **Manage** permissions by clicking the shield icon next to any account member
6. **Assign** which sections each member can view or edit

### Default Permissions

- **Admins**: Full access to all sections (cannot be changed)
- **New account members**: Dashboard access only (must be manually granted other permissions)
- **Non-account members**: No app access (display only in chores and calendar)

### Permission Inheritance

- Granting "Edit" permission automatically grants "View" permission
- Removing "View" permission automatically removes "Edit" permission
- Dashboard access cannot be removed from any account member

## Database Structure

### Tables

#### `app_sections`
Reference table defining all available app sections with display information.

#### `member_permissions`
Stores the specific permissions each member has for each section:
- `member_id` - References household_members
- `section_name` - References app_sections
- `can_view` - Boolean for view permission
- `can_edit` - Boolean for edit permission

### Functions

#### `has_section_permission(household_id, user_id, section_name, permission_type)`
Checks if a user has permission to access a specific section. Returns boolean.

```sql
SELECT has_section_permission(
  'household-uuid',
  'user-uuid',
  'accounts',
  'view'
);
```

#### `get_user_account_member_limit(user_id)`
Returns the account-wide member limit for a user based on their subscription tier.

```sql
SELECT get_user_account_member_limit('user-uuid');
-- Returns: 1, 4, or 8
```

#### `get_user_account_member_count(user_id)`
Returns the current count of account members across all households owned by the user.

```sql
SELECT get_user_account_member_count('user-uuid');
-- Returns: total number of account members
```

#### `get_account_member_limit(household_id)`
Returns the account member limit for a household (looks up the subscription owner's limit).

```sql
SELECT get_account_member_limit('household-uuid');
-- Returns: 1, 4, or 8
```

#### `can_add_account_member(household_id)`
Checks if a household can add more account members based on the subscription owner's account-wide count and limit.

```sql
SELECT can_add_account_member('household-uuid');
-- Returns: true or false
```

#### `get_user_household_member_breakdown(user_id)`
Returns a breakdown showing member usage across all households owned by the user.

```sql
SELECT * FROM get_user_household_member_breakdown('user-uuid');
-- Returns table with household_id, household_name, member_count, total_limit, total_used
```

## Using Permissions in Code

### Checking Permissions

```typescript
// Check if current user has permission
const { data: hasPermission } = await supabase
  .rpc('has_section_permission', {
    p_household_id: householdId,
    p_user_id: userId,
    p_section_name: 'accounts',
    p_permission_type: 'view'
  });

if (!hasPermission) {
  // Redirect or show error
  return;
}
```

### Loading Member Permissions

```typescript
const { data: permissions } = await supabase
  .from('member_permissions')
  .select('section_name, can_view, can_edit')
  .eq('member_id', memberId);
```

### Updating Permissions (Admin Only)

```typescript
// Delete existing permissions
await supabase
  .from('member_permissions')
  .delete()
  .eq('member_id', memberId);

// Insert new permissions
const newPermissions = [
  {
    household_id: householdId,
    member_id: memberId,
    section_name: 'accounts',
    can_view: true,
    can_edit: false
  },
  {
    household_id: householdId,
    member_id: memberId,
    section_name: 'budget',
    can_view: true,
    can_edit: true
  }
];

await supabase
  .from('member_permissions')
  .insert(newPermissions);
```

## Upgrading for More Members

When users reach their account member limit:

1. A message appears showing "Limit reached"
2. Invite button is disabled
3. A prompt suggests upgrading the subscription
4. Navigate to Dashboard > Subscription to upgrade tier

## Security

- All permission checks use RLS (Row Level Security)
- Only admins can modify permissions
- Members can only view permissions for their own household
- Permission functions use SECURITY DEFINER with proper search_path
- Non-account members cannot log in or access the app

## Troubleshooting

### Member can't access a section
1. Check if they're an account member (is_account_member = true)
2. Verify permissions are set in member_permissions table
3. Confirm they're not trying to access while logged out
4. Check if the section exists in app_sections

### Can't add more members
1. Check current subscription tier
2. Verify account member count vs limit
3. Consider upgrading subscription
4. Add as non-account member if login access isn't needed

### Permissions not saving
1. Verify user is an admin
2. Check RLS policies are enabled
3. Confirm member_id and household_id are correct
4. Check for database errors in console

## Future Enhancements

Potential future improvements:
- Permission templates (e.g., "Full Access", "View Only", "Finances Only")
- Time-based permissions (temporary access)
- Permission change audit log
- Bulk permission updates
- Custom permission roles beyond the built-in roles
