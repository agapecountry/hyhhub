'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gift, Coins, Plus, Trash2, ShoppingCart, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Reward {
  id: string;
  household_id: string;
  name: string;
  description: string | null;
  cost: number;
  icon: string;
  available: boolean;
}

interface RewardRedemption {
  id: string;
  reward_id: string;
  redeemed_by: string;
  redeemed_at: string;
  rewards: Reward;
  household_members: {
    id: string;
    name: string;
    color: string;
  };
}

interface HouseholdMember {
  id: string;
  name: string;
  current_coins: number;
}

interface RewardsShopProps {
  householdId: string;
  onCoinsUpdate: () => void;
}

export function RewardsShop({ householdId, onCoinsUpdate }: RewardsShopProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [rewardDialogOpen, setRewardDialogOpen] = useState(false);
  const [redeemDialogOpen, setRedeemDialogOpen] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rewardToDelete, setRewardToDelete] = useState<Reward | null>(null);

  const [rewardForm, setRewardForm] = useState({
    name: '',
    description: '',
    cost: 50,
    icon: '🎁',
  });

  const [redeemForm, setRedeemForm] = useState({
    member_id: '',
  });

  useEffect(() => {
    loadRewards();
    loadRedemptions();
    loadMembers();
  }, [householdId]);

  const loadRewards = async () => {
    try {
      const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .eq('household_id', householdId)
        .eq('available', true)
        .order('cost');

      if (error) throw error;
      setRewards(data || []);
    } catch (error: any) {
      console.error('Error loading rewards:', error);
    }
  };

  const loadRedemptions = async () => {
    try {
      const { data, error } = await supabase
        .from('reward_redemptions')
        .select(`
          *,
          rewards(*),
          household_members(id, name, color)
        `)
        .eq('household_id', householdId)
        .order('redeemed_at', { ascending: false });

      if (error) throw error;
      setRedemptions(data || []);
    } catch (error: any) {
      console.error('Error loading redemptions:', error);
    }
  };

  const loadMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('household_members')
        .select('id, name, current_coins')
        .eq('household_id', householdId)
        .order('name');

      if (error) throw error;
      setMembers(data || []);
    } catch (error: any) {
      console.error('Error loading members:', error);
    }
  };

  const handleOpenRewardDialog = () => {
    setRewardForm({
      name: '',
      description: '',
      cost: 50,
      icon: '🎁',
    });
    setRewardDialogOpen(true);
  };

  const handleSaveReward = async () => {
    if (!rewardForm.name.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a reward name',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('rewards')
        .insert({
          household_id: householdId,
          name: rewardForm.name.trim(),
          description: rewardForm.description.trim() || null,
          cost: rewardForm.cost,
          icon: rewardForm.icon,
          available: true,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Reward created successfully',
      });

      setRewardDialogOpen(false);
      loadRewards();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save reward',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRedeemDialog = (reward: Reward) => {
    setSelectedReward(reward);
    setRedeemForm({ member_id: '' });
    setRedeemDialogOpen(true);
  };

  const handleRedeemReward = async () => {
    if (!selectedReward || !redeemForm.member_id) {
      toast({
        title: 'Error',
        description: 'Please select a member',
        variant: 'destructive',
      });
      return;
    }

    const member = members.find(m => m.id === redeemForm.member_id);
    if (!member) return;

    if (member.current_coins < selectedReward.cost) {
      toast({
        title: 'Insufficient Coins',
        description: `${member.name} needs ${selectedReward.cost - member.current_coins} more coins`,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error: redeemError } = await supabase
        .from('reward_redemptions')
        .insert({
          household_id: householdId,
          reward_id: selectedReward.id,
          redeemed_by: redeemForm.member_id,
        });

      if (redeemError) throw redeemError;

      const newBalance = member.current_coins - selectedReward.cost;
      const { error: updateError } = await supabase
        .from('household_members')
        .update({ current_coins: newBalance })
        .eq('id', redeemForm.member_id);

      if (updateError) throw updateError;

      toast({
        title: 'Success',
        description: `${member.name} redeemed ${selectedReward.name}!`,
      });

      setRedeemDialogOpen(false);
      loadRedemptions();
      loadMembers();
      onCoinsUpdate();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to redeem reward',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReward = async () => {
    if (!rewardToDelete) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('rewards')
        .delete()
        .eq('id', rewardToDelete.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Reward deleted successfully',
      });

      loadRewards();
      setDeleteDialogOpen(false);
      setRewardToDelete(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete reward',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const rewardIcons = ['🎁', '🎮', '🍕', '🎬', '🎨', '📱', '🎧', '🍦', '🎪', '⭐'];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Rewards Shop</CardTitle>
              <CardDescription>Spend coins on rewards</CardDescription>
            </div>
            <Button onClick={handleOpenRewardDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Reward
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="shop">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="shop">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Shop
              </TabsTrigger>
              <TabsTrigger value="history">
                <Check className="h-4 w-4 mr-2" />
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="shop" className="space-y-3 mt-4">
              {rewards.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No rewards available</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {rewards.map((reward) => (
                    <div
                      key={reward.id}
                      className="p-4 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-3xl">{reward.icon}</span>
                          <div>
                            <h3 className="font-semibold">{reward.name}</h3>
                            {reward.description && (
                              <p className="text-sm text-muted-foreground">{reward.description}</p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setRewardToDelete(reward);
                            setDeleteDialogOpen(true);
                          }}
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <Badge variant="secondary" className="font-bold text-base">
                          <Coins className="h-4 w-4 mr-1" />
                          {reward.cost}
                        </Badge>
                        <Button
                          size="sm"
                          onClick={() => handleOpenRedeemDialog(reward)}
                        >
                          Redeem
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-2 mt-4">
              {redemptions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No redemptions yet</p>
                </div>
              ) : (
                redemptions.map((redemption) => (
                  <div
                    key={redemption.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{redemption.rewards.icon}</span>
                      <div>
                        <div className="font-medium">{redemption.rewards.name}</div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span
                            className="font-medium"
                            style={{ color: redemption.household_members.color }}
                          >
                            {redemption.household_members.name}
                          </span>
                          <span>•</span>
                          <span>{new Date(redemption.redeemed_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline">
                      <Coins className="h-3 w-3 mr-1" />
                      {redemption.rewards.cost}
                    </Badge>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={rewardDialogOpen} onOpenChange={setRewardDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Reward</DialogTitle>
            <DialogDescription>Create a new reward for household members</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reward-name">Reward Name</Label>
              <Input
                id="reward-name"
                value={rewardForm.name}
                onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })}
                placeholder="e.g., Extra screen time"
              />
            </div>
            <div>
              <Label htmlFor="reward-description">Description (optional)</Label>
              <Textarea
                id="reward-description"
                value={rewardForm.description}
                onChange={(e) => setRewardForm({ ...rewardForm, description: e.target.value })}
                placeholder="Additional details"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="reward-cost">Cost (coins)</Label>
                <Input
                  id="reward-cost"
                  type="number"
                  min={1}
                  value={rewardForm.cost}
                  onChange={(e) => setRewardForm({ ...rewardForm, cost: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <Label>Icon</Label>
                <div className="grid grid-cols-5 gap-1 mt-1">
                  {rewardIcons.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setRewardForm({ ...rewardForm, icon })}
                      className={`text-2xl p-2 rounded hover:bg-accent ${
                        rewardForm.icon === icon ? 'bg-accent ring-2 ring-primary' : ''
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setRewardDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveReward} disabled={loading}>
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={redeemDialogOpen} onOpenChange={setRedeemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redeem Reward</DialogTitle>
            <DialogDescription>
              {selectedReward && (
                <span>
                  Redeem {selectedReward.name} for {selectedReward.cost} coins
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="redeem-member">Select Member</Label>
              <Select
                value={redeemForm.member_id}
                onValueChange={(value) => setRedeemForm({ member_id: value })}
              >
                <SelectTrigger id="redeem-member">
                  <SelectValue placeholder="Choose who redeems this" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem
                      key={member.id}
                      value={member.id}
                      disabled={selectedReward ? member.current_coins < selectedReward.cost : false}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span>{member.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({member.current_coins} coins)
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setRedeemDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleRedeemReward} disabled={loading}>
                Redeem
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reward</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{rewardToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteReward} disabled={loading}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
