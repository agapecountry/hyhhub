'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Coins, Medal } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

interface MemberStats {
  id: string;
  name: string;
  color: string;
  current_coins: number;
  total_coins: number;
  completed_count: number;
}

interface ChoreLeaderboardProps {
  householdId: string;
  refreshKey?: number;
}

export function ChoreLeaderboard({ householdId, refreshKey }: ChoreLeaderboardProps) {
  const [memberStats, setMemberStats] = useState<MemberStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [householdId, refreshKey]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);

      const { data: members, error: membersError } = await supabase
        .from('household_members')
        .select('id, name, color, current_coins, total_coins')
        .eq('household_id', householdId)
        .order('total_coins', { ascending: false });

      if (membersError) throw membersError;

      const statsPromises = (members || []).map(async (member) => {
        const { count, error: countError } = await supabase
          .from('chore_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('household_id', householdId)
          .eq('assigned_to', member.id)
          .eq('completed', true);

        if (countError) throw countError;

        return {
          ...member,
          completed_count: count || 0,
        };
      });

      const stats = await Promise.all(statsPromises);
      stats.sort((a, b) => b.total_coins - a.total_coins);

      setMemberStats(stats);
    } catch (error: any) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Medal className="h-5 w-5 text-amber-600" />;
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Leaderboard</CardTitle>
            <CardDescription>Top performers by total coins earned</CardDescription>
          </div>
          <Trophy className="h-6 w-6 text-yellow-500" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Loading leaderboard...</p>
          </div>
        ) : memberStats.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No members yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {memberStats.map((member, index) => (
              <div
                key={member.id}
                className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg"
                    style={{
                      backgroundColor: `${member.color}20`,
                      color: member.color,
                    }}
                  >
                    #{index + 1}
                  </div>
                  {getRankIcon(index)}
                </div>

                <div className="flex-1">
                  <div className="font-semibold text-lg">{member.name}</div>
                  <div className="flex items-center gap-4 mt-1">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Coins className="h-3.5 w-3.5" />
                      <span className="font-medium">{member.total_coins}</span>
                      <span>total</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">{member.completed_count}</span>
                      <span> chores</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Current Balance</div>
                  <div className="flex items-center gap-1 text-primary font-bold text-xl">
                    <Coins className="h-5 w-5" />
                    <span>{member.current_coins}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
