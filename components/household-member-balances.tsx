'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Coins } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

interface HouseholdMember {
  id: string;
  name: string;
  color: string;
  current_coins: number;
}

interface HouseholdMemberBalancesProps {
  householdId: string;
  refreshKey?: number;
}

export function HouseholdMemberBalances({ householdId, refreshKey }: HouseholdMemberBalancesProps) {
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMembers();
  }, [householdId, refreshKey]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('household_members')
        .select('id, name, color, current_coins')
        .eq('household_id', householdId)
        .order('name');

      if (error) throw error;
      setMembers(data || []);
    } catch (error: any) {
      console.error('Error loading members:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Household Members</CardTitle>
        <CardDescription>Current coin balances</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse h-16 bg-muted rounded-lg"></div>
            ))}
          </div>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No members found
          </p>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-semibold"
                    style={{ backgroundColor: `${member.color}20`, color: member.color }}
                  >
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="font-medium">{member.name}</div>
                </div>
                <div className="flex items-center gap-1 text-primary font-semibold">
                  <Coins className="h-4 w-4" />
                  <span>{member.current_coins || 0}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
