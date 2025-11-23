'use client';

import { useState, useEffect } from 'react';
import { useHousehold } from '@/lib/household-context';
import { useAuth } from '@/lib/auth-context';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@/lib/types';
import { Users, Settings, LogOut, UserPlus, Trash2, Crown, Link2, Copy, X } from 'lucide-react';

interface HouseholdMemberWithEmail {
  id: string;
  user_id: string;
  role: UserRole;
  email: string;
  joined_at: string;
}

interface HouseholdInvite {
  id: string;
  invite_code: string;
  email: string | null;
  created_at: string;
  expires_at: string;
}

interface ManageHouseholdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageHouseholdDialog({ open, onOpenChange }: ManageHouseholdDialogProps) {
  const { currentHousehold, refreshHouseholds, households } = useHousehold();
  const { user } = useAuth();
  const { toast } = useToast();

  const [householdName, setHouseholdName] = useState('');
  const [members, setMembers] = useState<HouseholdMemberWithEmail[]>([]);
  const [invites, setInvites] = useState<HouseholdInvite[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('member');
  const [loading, setLoading] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);

  useEffect(() => {
    if (open && currentHousehold) {
      setHouseholdName(currentHousehold.name);
      loadMembers();
      loadInvites();
    }
  }, [open, currentHousehold]);

  const loadMembers = async () => {
    if (!currentHousehold) return;

    try {
      const { data: membersData, error: membersError } = await supabase
        .from('household_members')
        .select('id, user_id, role, joined_at')
        .eq('household_id', currentHousehold.id);

      if (membersError) throw membersError;

      const memberIds = membersData?.map(m => m.user_id) || [];

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email')
        .in('id', memberIds);

      if (usersError) throw usersError;

      const membersWithEmails = membersData?.map(member => {
        const userInfo = usersData?.find(u => u.id === member.user_id);
        return {
          ...member,
          email: userInfo?.email || 'Unknown',
        };
      }) || [];

      setMembers(membersWithEmails);

      const currentMember = membersData?.find(m => m.user_id === user?.id);
      if (currentMember) {
        setCurrentUserRole(currentMember.role);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load household members',
        variant: 'destructive',
      });
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
        title: 'Success',
        description: 'Household name updated',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update household name',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
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

  const handleCreateInvite = async () => {
    if (!currentHousehold) return;

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

      if (error) throw error;

      const inviteUrl = `${window.location.origin}/invite?code=${data.invite_code}`;

      await navigator.clipboard.writeText(inviteUrl);

      if (inviteEmail.trim()) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: userData } = await supabase
            .from('users')
            .select('name')
            .eq('id', user?.id)
            .maybeSingle();

          const inviterName = userData?.name || user?.email?.split('@')[0] || 'Someone';

          const emailResponse = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-invite-email`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                inviteCode: data.invite_code,
                inviteEmail: inviteEmail.trim(),
                householdName: currentHousehold.name,
                inviterName,
              }),
            }
          );

          if (!emailResponse.ok) {
            console.error('Failed to send invite email:', await emailResponse.text());
            toast({
              title: 'Invite Created',
              description: 'Invite link copied, but email failed to send. Share the link manually.',
              variant: 'default',
            });
          } else {
            toast({
              title: 'Invite Created & Email Sent',
              description: `Invitation sent to ${inviteEmail.trim()} and link copied to clipboard`,
            });
          }
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

  const handleRemoveMember = async (memberId: string) => {
    if (!currentHousehold) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('household_members')
        .delete()
        .eq('id', memberId)
        .eq('household_id', currentHousehold.id);

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
      setShowLeaveDialog(false);
      onOpenChange(false);
      toast({
        title: 'Left Household',
        description: 'You have left the household',
      });
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

  if (!currentHousehold) return null;

  const isAdmin = currentUserRole === 'admin';
  const adminCount = members.filter(m => m.role === 'admin').length;
  const isLastAdmin = isAdmin && adminCount === 1;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Household</DialogTitle>
            <DialogDescription>
              Update household settings and manage members
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">
                <Settings className="h-4 w-4 mr-2" />
                Details
              </TabsTrigger>
              <TabsTrigger value="members">
                <Users className="h-4 w-4 mr-2" />
                Members
              </TabsTrigger>
              <TabsTrigger value="leave">
                <LogOut className="h-4 w-4 mr-2" />
                Leave
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="household-name">Household Name</Label>
                <Input
                  id="household-name"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  disabled={!isAdmin || loading}
                />
                {!isAdmin && (
                  <p className="text-sm text-muted-foreground">
                    Only admins can change the household name
                  </p>
                )}
              </div>
              {isAdmin && (
                <Button
                  onClick={handleUpdateHouseholdName}
                  disabled={loading || householdName === currentHousehold.name || !householdName.trim()}
                >
                  Update Name
                </Button>
              )}
            </TabsContent>

            <TabsContent value="members" className="space-y-4 mt-4">
              {isAdmin && (
                <div className="space-y-2 pb-4 border-b">
                  <Label htmlFor="invite-email">Create Invite Link</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Share the link with anyone to invite them to this household
                  </p>
                  <div className="flex gap-2">
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="user@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCreateInvite();
                        }
                      }}
                      disabled={loading}
                    />
                    <Button
                      onClick={handleCreateInvite}
                      disabled={loading}
                    >
                      <Link2 className="h-4 w-4 mr-2" />
                      Create
                    </Button>
                  </div>
                </div>
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
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{member.email}</p>
                          <p className="text-xs text-muted-foreground">
                            Joined {new Date(member.joined_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                          {member.role === 'admin' && <Crown className="h-3 w-3 mr-1" />}
                          {member.role}
                        </Badge>
                      </div>
                      {isAdmin && member.user_id !== user?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setMemberToRemove(member.id)}
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="leave" className="space-y-4 mt-4">
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <div className="space-y-2">
                  <h3 className="font-medium">Leave Household</h3>
                  <p className="text-sm text-muted-foreground">
                    {isLastAdmin
                      ? 'You are the last admin. Assign another admin before leaving or all members will lose access.'
                      : 'You will no longer have access to this household and its data.'}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setShowLeaveDialog(true)}
                  disabled={loading || (isLastAdmin && members.length > 1)}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Leave Household
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to leave {currentHousehold.name}. This action cannot be undone.
              You will need to be re-invited to join again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveHousehold}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? 'Leaving...' : 'Leave Household'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this member from the household?
              They will lose access to all household data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => memberToRemove && handleRemoveMember(memberToRemove)}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? 'Removing...' : 'Remove Member'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
