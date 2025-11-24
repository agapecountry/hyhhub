'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useHousehold } from '@/lib/household-context';
import { useAuth } from '@/lib/auth-context';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@/lib/types';
import { Users, Settings, LogOut, Trash2, Crown, Link2, Copy, X, ArrowLeft, UserCog, Palette, Edit, Shield } from 'lucide-react';
import { MemberPermissionsDialog } from '@/components/member-permissions-dialog';

interface HouseholdMemberWithEmail {
  id: string;
  user_id: string | null;
  name: string | null;
  role: UserRole;
  email: string;
  joined_at: string;
  is_account_member: boolean;
  color: string;
}

interface HouseholdInvite {
  id: string;
  invite_code: string;
  email: string | null;
  created_at: string;
  expires_at: string;
}

export default function ManageHouseholdPage() {
  const router = useRouter();
  const { currentHousehold, refreshHouseholds, households } = useHousehold();
  const { user } = useAuth();
  const { toast } = useToast();

  const [householdName, setHouseholdName] = useState('');
  const [members, setMembers] = useState<HouseholdMemberWithEmail[]>([]);
  const [invites, setInvites] = useState<HouseholdInvite[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<UserRole>('child');
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('member');
  const [loading, setLoading] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [editingMemberRole, setEditingMemberRole] = useState<{ id: string; role: UserRole } | null>(null);
  const [editingMemberColor, setEditingMemberColor] = useState<{ id: string; color: string } | null>(null);
  const [editingMemberName, setEditingMemberName] = useState<{ id: string; name: string; isUser: boolean } | null>(null);
  const [permissionsDialogMember, setPermissionsDialogMember] = useState<HouseholdMemberWithEmail | null>(null);
  const [accountMemberLimit, setAccountMemberLimit] = useState<number>(1);
  const [accountMemberCount, setAccountMemberCount] = useState<number>(0);
  const [householdBreakdown, setHouseholdBreakdown] = useState<Array<{
    household_id: string;
    household_name: string;
    member_count: number;
    total_limit: number;
    total_used: number;
  }>>([]);

  const memberColors = [
    { value: '#EF4444', label: 'Red' },
    { value: '#F59E0B', label: 'Amber' },
    { value: '#10B981', label: 'Emerald' },
    { value: '#3B82F6', label: 'Blue' },
    { value: '#8B5CF6', label: 'Violet' },
    { value: '#EC4899', label: 'Pink' },
    { value: '#14B8A6', label: 'Teal' },
    { value: '#F97316', label: 'Orange' },
    { value: '#6366F1', label: 'Indigo' },
    { value: '#84CC16', label: 'Lime' },
  ];

  useEffect(() => {
    if (!currentHousehold) {
      router.push('/dashboard');
      return;
    }
    setHouseholdName(currentHousehold.name);
    loadMembers();
    loadInvites();
    loadMemberLimits();
  }, [currentHousehold]);

  const loadMemberLimits = async () => {
    if (!currentHousehold || !user) return;

    try {
      // Get account-wide limits
      const { data: limitData, error: limitError } = await supabase
        .rpc('get_user_account_member_limit', { p_user_id: user.id });

      if (limitError) throw limitError;
      setAccountMemberLimit(limitData || 1);

      // Get account-wide count
      const { data: countData, error: countError } = await supabase
        .rpc('get_user_account_member_count', { p_user_id: user.id });

      if (countError) throw countError;
      setAccountMemberCount(countData || 0);

      // Get breakdown across all households
      const { data: breakdownData, error: breakdownError } = await supabase
        .rpc('get_user_household_member_breakdown', { p_user_id: user.id });

      if (breakdownError) throw breakdownError;
      setHouseholdBreakdown(breakdownData || []);
    } catch (error: any) {
      console.error('Failed to load member limits:', error);
    }
  };

  const loadMembers = async () => {
    if (!currentHousehold) return;

    try {
      const { data: membersData, error: membersError } = await supabase
        .from('household_members')
        .select('id, user_id, name, role, joined_at, is_account_member, color')
        .eq('household_id', currentHousehold.id)
        .order('joined_at', { ascending: true });

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

      const membersWithEmails = membersData?.map(member => {
        if (member.user_id) {
          const userInfo = usersData?.find(u => u.id === member.user_id);
          return {
            ...member,
            name: member.name || userInfo?.name || null,
            email: userInfo?.email || 'Unknown',
          };
        } else {
          return {
            ...member,
            email: member.name || 'No Account',
          };
        }
      }) || [];

      setMembers(membersWithEmails);

      const currentMember = membersData?.find(m => m.user_id === user?.id);
      if (currentMember) {
        setCurrentUserRole(currentMember.role);
      }
    } catch (error: any) {
      console.error('Failed to load members:', error);
    }
  };

  const loadInvites = async () => {
    if (!currentHousehold) return;

    try {
      const { data, error } = await supabase
        .from('household_invites')
        .select('id, invite_code, email, created_at, expires_at')
        .eq('household_id', currentHousehold.id)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      setInvites(data || []);
    } catch (error: any) {
      console.error('Failed to load invites:', error);
    }
  };

  const handleUpdateHouseholdName = async () => {
    if (!currentHousehold || !householdName.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('households')
        .update({ name: householdName.trim() })
        .eq('id', currentHousehold.id);

      if (error) throw error;

      await refreshHouseholds();
      toast({
        title: 'Household Updated',
        description: 'Household name has been updated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update household',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvite = async () => {
    if (!currentHousehold) return;

    // Check if user has reached account member limit
    if (accountMemberCount >= accountMemberLimit) {
      toast({
        title: 'Member Limit Reached',
        description: 'You have reached your account member limit. Upgrade your subscription to add more members.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('household_invites')
        .insert({
          household_id: currentHousehold.id,
          email: inviteEmail.trim() || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) {
        // Check for RLS policy violation and provide friendly message
        if (error.code === '42501' || error.message.includes('row-level security')) {
          throw new Error('You have reached your account member limit. Upgrade your subscription to add more members.');
        }
        throw error;
      }

      const inviteUrl = `${window.location.origin}/invite?code=${data.invite_code}`;

      await navigator.clipboard.writeText(inviteUrl);

      // Send email if email address provided
      if (inviteEmail.trim()) {
        try {
          const { data: { session } } = await supabase.auth.getSession();

          const response = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-invite-email`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session?.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                inviteCode: data.invite_code,
                inviteEmail: inviteEmail.trim(),
                householdName: currentHousehold.name,
                inviterName: user?.user_metadata?.name || user?.email || 'A household member',
              }),
            }
          );

          const result = await response.json();

          console.log('Email API response:', result);

          if (!result.success) {
            console.error('Failed to send invite email:', result);
            console.error('Error details:', result.details);
            console.error('Error code:', result.errorCode);

            toast({
              title: 'Invite Created',
              description: result.userExists
                ? 'User already has an account. They can use the invite link to join.'
                : `Email failed to send: ${result.details || result.error}. Link copied to clipboard.`,
              variant: result.userExists ? 'default' : 'destructive',
            });
          } else {
            console.log('Email API success response:', result);

            let description = '';
            if (result.userExists) {
              if (result.emailSent) {
                description = `Email sent to ${inviteEmail.trim()}. Invite link also copied to clipboard.`;
              } else {
                // User exists but email failed
                if (result.emailError) {
                  console.error('Resend error details:', result.emailError);
                  description = `User already has an account. Invite link copied to clipboard. Error: ${result.emailError.message || 'Unknown error from Resend'}`;
                } else {
                  description = `User already has an account. Invite link copied to clipboard. (Configure Resend API key in Supabase to send emails to existing users)`;
                }
              }
            } else {
              description = `Invite email sent to ${inviteEmail.trim()} and link copied to clipboard`;
            }

            toast({
              title: result.emailSent ? 'Invite Sent' : 'Invite Link Ready',
              description,
              variant: result.emailError ? 'destructive' : 'default',
            });
          }
        } catch (emailError: any) {
          console.error('Email send error:', emailError);
          console.error('Error message:', emailError.message);

          toast({
            title: 'Invite Created',
            description: `Email failed to send: ${emailError.message || 'Network error'}. Link copied to clipboard.`,
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: 'Invite Created',
          description: 'Invite link copied to clipboard',
        });
      }

      setInviteEmail('');
      await loadInvites();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create invite',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyInvite = async (inviteCode: string) => {
    const inviteUrl = `${window.location.origin}/invite?code=${inviteCode}`;
    await navigator.clipboard.writeText(inviteUrl);
    toast({
      title: 'Copied',
      description: 'Invite link copied to clipboard',
    });
  };

  const handleDeleteInvite = async (inviteId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('household_invites')
        .delete()
        .eq('id', inviteId);

      if (error) throw error;

      await loadInvites();
      toast({
        title: 'Invite Deleted',
        description: 'Invite has been removed',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete invite',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNonAccountMember = async () => {
    if (!currentHousehold || !newMemberName.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('household_members')
        .insert({
          household_id: currentHousehold.id,
          name: newMemberName.trim(),
          role: newMemberRole,
        });

      if (error) throw error;

      setNewMemberName('');
      setNewMemberRole('child');
      await loadMembers();
      toast({
        title: 'Member Added',
        description: `${newMemberName} has been added to the household`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add member',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMemberRole = async (memberId: string, newRole: UserRole) => {
    if (!currentHousehold) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('household_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      await loadMembers();
      setEditingMemberRole(null);
      toast({
        title: 'Role Updated',
        description: 'Member role has been updated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update role',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMemberColor = async (memberId: string, newColor: string) => {
    if (!currentHousehold) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('household_members')
        .update({ color: newColor })
        .eq('id', memberId);

      if (error) throw error;

      await loadMembers();
      setEditingMemberColor(null);
      toast({
        title: 'Color Updated',
        description: 'Member color has been updated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update color',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMemberName = async (memberId: string, newName: string, isUser: boolean) => {
    if (!currentHousehold) return;

    setLoading(true);
    try {
      if (isUser) {
        const member = members.find(m => m.id === memberId);
        if (!member?.user_id) throw new Error('User ID not found');

        const { error: userError } = await supabase
          .from('users')
          .update({ name: newName.trim() || null, updated_at: new Date().toISOString() })
          .eq('id', member.user_id);

        if (userError) throw userError;
      }

      const { error: memberError } = await supabase
        .from('household_members')
        .update({ name: newName.trim() || null })
        .eq('id', memberId);

      if (memberError) throw memberError;

      await loadMembers();
      setEditingMemberName(null);
      toast({
        title: 'Name Updated',
        description: 'Member name has been updated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update name',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!currentHousehold) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('household_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      await loadMembers();
      setMemberToRemove(null);
      toast({
        title: 'Member Removed',
        description: 'Member has been removed from the household',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove member',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveHousehold = async () => {
    if (!currentHousehold || !user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('household_members')
        .delete()
        .eq('household_id', currentHousehold.id)
        .eq('user_id', user.id);

      if (error) throw error;

      await refreshHouseholds();
      toast({
        title: 'Left Household',
        description: 'You have left the household',
      });
      router.push('/dashboard');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to leave household',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHousehold = async () => {
    if (!currentHousehold || !user || deleteConfirmText !== currentHousehold.name) return;

    setLoading(true);
    try {
      // Delete security logs first (they have NO ACTION constraint)
      await supabase
        .from('security_audit_logs')
        .delete()
        .eq('household_id', currentHousehold.id);

      await supabase
        .from('security_alerts')
        .delete()
        .eq('household_id', currentHousehold.id);

      // Now delete the household (will cascade to all other tables)
      const { error } = await supabase
        .from('households')
        .delete()
        .eq('id', currentHousehold.id);

      if (error) throw error;

      await refreshHouseholds();
      toast({
        title: 'Household Deleted',
        description: 'The household and all its data have been permanently deleted',
      });
      router.push('/dashboard');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete household',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setShowDeleteDialog(false);
      setDeleteConfirmText('');
    }
  };

  const isAdmin = currentUserRole === 'admin';
  const isLastAdmin = isAdmin && members.filter(m => m.role === 'admin').length === 1;

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'default';
      case 'co-parent':
        return 'secondary';
      case 'teen':
      case 'child':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'co-parent':
        return 'Co-Parent';
      case 'teen':
        return 'Teen';
      case 'child':
        return 'Child';
      default:
        return 'Member';
    }
  };

  if (!currentHousehold) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-primary">Manage Household</h1>
          <p className="text-muted-foreground">Configure your household settings and members</p>
        </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <TabsTrigger value="general">
            <Settings className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="h-4 w-4 mr-2" />
            Members
          </TabsTrigger>
          <TabsTrigger value="leave">
            <LogOut className="h-4 w-4 mr-2" />
            Leave
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="delete">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Household Settings</CardTitle>
              <CardDescription>Update your household information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="household-name">Household Name</Label>
                <Input
                  id="household-name"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  disabled={!isAdmin || loading}
                  placeholder="Enter household name"
                />
              </div>
              {isAdmin && (
                <Button
                  onClick={handleUpdateHouseholdName}
                  disabled={loading || !householdName.trim() || householdName === currentHousehold.name}
                >
                  Save Changes
                </Button>
              )}
              {!isAdmin && (
                <p className="text-sm text-muted-foreground">
                  Only admins can change household settings
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Members & Invites</CardTitle>
              <CardDescription>Manage who has access to this household</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Account Member Limit Display */}
              <div className="p-4 bg-slate-50 rounded-lg border space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Account Members (Account-Wide)</h3>
                    <p className="text-xs text-muted-foreground">
                      Total members across all your households
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      {accountMemberCount} / {accountMemberLimit}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {accountMemberCount >= accountMemberLimit ? 'Limit reached' : `${accountMemberLimit - accountMemberCount} remaining`}
                    </p>
                  </div>
                </div>

                {/* Household Breakdown */}
                {householdBreakdown.length > 1 && (
                  <div className="pt-3 border-t space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Breakdown by Household:</p>
                    <div className="space-y-1">
                      {householdBreakdown.map((hh) => (
                        <div key={hh.household_id} className="flex items-center justify-between text-xs">
                          <span className={hh.household_id === currentHousehold.id ? 'font-medium' : ''}>
                            {hh.household_name}
                            {hh.household_id === currentHousehold.id && ' (current)'}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {hh.member_count} {hh.member_count === 1 ? 'member' : 'members'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {accountMemberCount >= accountMemberLimit && (
                  <p className="mt-2 text-xs text-amber-700 font-medium">
                    Upgrade your subscription to add more account members
                  </p>
                )}
              </div>

              {isAdmin && (
                <>
                  <div className="space-y-2 pb-4 border-b">
                    <Label htmlFor="invite-email">Create Invite Link</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Invited users will have account access. {accountMemberCount >= accountMemberLimit ? 'Account member limit reached.' : `${accountMemberLimit - accountMemberCount} slots remaining.`}
                    </p>
                    <div className="flex gap-2">
                      <Input
                        id="invite-email"
                        type="email"
                        placeholder="user@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && accountMemberCount < accountMemberLimit) {
                            handleCreateInvite();
                          }
                        }}
                        disabled={loading || accountMemberCount >= accountMemberLimit}
                      />
                      <Button
                        onClick={handleCreateInvite}
                        disabled={loading || accountMemberCount >= accountMemberLimit}
                      >
                        <Link2 className="h-4 w-4 mr-2" />
                        Create
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 pb-4 border-b">
                    <Label htmlFor="new-member-name">Add Member Without Account</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Add household members who don't need app access (e.g., children, pets)
                    </p>
                    <div className="flex gap-2">
                      <Input
                        id="new-member-name"
                        type="text"
                        placeholder="Member name"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCreateNonAccountMember();
                          }
                        }}
                        disabled={loading}
                        className="flex-1"
                      />
                      <Select value={newMemberRole} onValueChange={(value) => setNewMemberRole(value as UserRole)}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="child">Child</SelectItem>
                          <SelectItem value="teen">Teen</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={handleCreateNonAccountMember}
                        disabled={loading || !newMemberName.trim()}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Add
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {isAdmin && invites.length > 0 && (
                <div className="space-y-2 pb-4 border-b">
                  <h3 className="text-sm font-medium">Active Invites ({invites.length})</h3>
                  <div className="space-y-2">
                    {invites.map((invite) => (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {invite.email || 'General invite'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Expires {new Date(invite.expires_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyInvite(invite.invite_code)}
                            disabled={loading}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteInvite(invite.id)}
                            disabled={loading}
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Current Members ({members.length})</h3>
                <div className="space-y-2">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {editingMemberColor?.id === member.id ? (
                          <div className="flex gap-2">
                            {memberColors.map((colorOption) => (
                              <button
                                key={colorOption.value}
                                className={`w-6 h-6 rounded-full border-2 ${
                                  editingMemberColor.color === colorOption.value
                                    ? 'border-black scale-110'
                                    : 'border-gray-300'
                                }`}
                                style={{ backgroundColor: colorOption.value }}
                                onClick={() => setEditingMemberColor({ id: member.id, color: colorOption.value })}
                                title={colorOption.label}
                              />
                            ))}
                          </div>
                        ) : (
                          <div
                            className="w-4 h-4 rounded-full border-2 border-gray-200 flex-shrink-0"
                            style={{ backgroundColor: member.color }}
                            title="Member color"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          {editingMemberName?.id === member.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editingMemberName.name}
                                onChange={(e) => setEditingMemberName({ ...editingMemberName, name: e.target.value })}
                                placeholder="Enter name"
                                className="h-8"
                                disabled={loading}
                              />
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium truncate">
                                  {member.name || member.email}
                                </p>
                                {member.name && (
                                  <p className="text-xs text-muted-foreground truncate">({member.email})</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <p className="text-xs text-muted-foreground">
                                  Joined {new Date(member.joined_at).toLocaleDateString()}
                                </p>
                                {!member.is_account_member && (
                                  <Badge variant="outline" className="text-xs">
                                    No Account
                                  </Badge>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                        {editingMemberRole?.id === member.id ? (
                          <Select
                            value={editingMemberRole.role}
                            onValueChange={(value) => setEditingMemberRole({ id: member.id, role: value as UserRole })}
                            disabled={loading}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="co-parent">Co-Parent</SelectItem>
                              <SelectItem value="teen">Teen</SelectItem>
                              <SelectItem value="child">Child</SelectItem>
                              <SelectItem value="member">Member</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant={getRoleBadgeVariant(member.role)}>
                            {member.role === 'admin' && <Crown className="h-3 w-3 mr-1" />}
                            {getRoleLabel(member.role)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {editingMemberName?.id === member.id ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUpdateMemberName(member.id, editingMemberName.name, editingMemberName.isUser)}
                              disabled={loading}
                            >
                              Save
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingMemberName(null)}
                              disabled={loading}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : editingMemberColor?.id === member.id ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUpdateMemberColor(member.id, editingMemberColor.color)}
                              disabled={loading}
                            >
                              Save
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingMemberColor(null)}
                              disabled={loading}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : editingMemberRole?.id === member.id ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUpdateMemberRole(member.id, editingMemberRole.role)}
                              disabled={loading}
                            >
                              Save
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingMemberRole(null)}
                              disabled={loading}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingMemberName({ id: member.id, name: member.name || '', isUser: member.is_account_member })}
                              disabled={loading}
                              title="Edit name"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {isAdmin && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingMemberColor({ id: member.id, color: member.color })}
                                  disabled={loading}
                                  title="Change color"
                                >
                                  <Palette className="h-4 w-4" />
                                </Button>
                                {member.is_account_member && member.user_id !== user?.id && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setPermissionsDialogMember(member)}
                                    disabled={loading}
                                    title="Manage permissions"
                                  >
                                    <Shield className="h-4 w-4" />
                                  </Button>
                                )}
                                {member.user_id !== user?.id && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setEditingMemberRole({ id: member.id, role: member.role })}
                                      disabled={loading}
                                      title="Change role"
                                    >
                                      <UserCog className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setMemberToRemove(member.id)}
                                      disabled={loading}
                                      title="Remove member"
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </>
                                )}
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leave">
          <Card>
            <CardHeader>
              <CardTitle>Leave Household</CardTitle>
              <CardDescription>Remove yourself from this household</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <div className="space-y-2">
                  <h3 className="font-medium">Before you leave:</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>You will lose access to all household data</li>
                    <li>You will need to be re-invited to rejoin</li>
                    {isLastAdmin && (
                      <li className="text-destructive font-medium">
                        You are the last admin. Assign another admin before leaving.
                      </li>
                    )}
                  </ul>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setShowLeaveDialog(true)}
                  disabled={isLastAdmin || loading}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Leave Household
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="delete">
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Delete Household</CardTitle>
                <CardDescription>Permanently delete this household and all associated data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4 p-4 border border-destructive rounded-lg bg-destructive/5">
                  <div className="space-y-2">
                    <h3 className="font-medium text-destructive">Warning: This action cannot be undone!</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>All household data will be permanently deleted</li>
                      <li>All members will lose access to this household</li>
                      <li>All accounts, transactions, budgets, and financial data will be deleted</li>
                      <li>All meal plans, recipes, pantry items, and grocery lists will be deleted</li>
                      <li>All calendar events, chores, and projects will be deleted</li>
                      <li>This includes all historical data and cannot be recovered</li>
                    </ul>
                  </div>
                  <div className="space-y-2 pt-4 border-t border-destructive/20">
                    <Label htmlFor="delete-confirm" className="text-sm font-medium">
                      Type <span className="font-bold">{currentHousehold.name}</span> to confirm deletion:
                    </Label>
                    <Input
                      id="delete-confirm"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder={currentHousehold.name}
                      className="font-mono"
                    />
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={deleteConfirmText !== currentHousehold.name || loading}
                    className="w-full"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Household Permanently
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be removed from {currentHousehold.name}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeaveHousehold} disabled={loading}>
              Leave Household
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this member from the household?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => memberToRemove && handleRemoveMember(memberToRemove)}
              disabled={loading}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Delete Household Forever?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-bold">{currentHousehold.name}</span> and all associated data.
              This action is irreversible and all {members.length} member{members.length !== 1 ? 's' : ''} will lose access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading} onClick={() => setDeleteConfirmText('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteHousehold}
              disabled={loading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {loading ? 'Deleting...' : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {permissionsDialogMember && (
        <MemberPermissionsDialog
          open={!!permissionsDialogMember}
          onOpenChange={(open) => !open && setPermissionsDialogMember(null)}
          memberId={permissionsDialogMember.id}
          memberName={permissionsDialogMember.name || ''}
          memberEmail={permissionsDialogMember.email}
          householdId={currentHousehold.id}
          isAdmin={permissionsDialogMember.role === 'admin'}
        />
      )}
      </div>
    </DashboardLayout>
  );
}
