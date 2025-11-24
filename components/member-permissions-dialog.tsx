'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lock, Eye, Edit, Crown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AppSection {
  name: string;
  display_name: string;
  description: string;
  icon: string;
  is_default: boolean;
}

interface MemberPermission {
  section_name: string;
  can_view: boolean;
  can_edit: boolean;
}

interface MemberPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  memberName: string;
  memberEmail: string;
  householdId: string;
  isAdmin: boolean;
}

export function MemberPermissionsDialog({
  open,
  onOpenChange,
  memberId,
  memberName,
  memberEmail,
  householdId,
  isAdmin,
}: MemberPermissionsDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sections, setSections] = useState<AppSection[]>([]);
  const [permissions, setPermissions] = useState<Record<string, MemberPermission>>({});

  useEffect(() => {
    if (open) {
      loadSectionsAndPermissions();
    }
  }, [open, memberId]);

  const loadSectionsAndPermissions = async () => {
    setLoading(true);
    try {
      // Load all app sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('app_sections')
        .select('*')
        .order('name');

      if (sectionsError) throw sectionsError;

      setSections(sectionsData || []);

      // Load member permissions
      const { data: permsData, error: permsError } = await supabase
        .from('member_permissions')
        .select('section_name, can_view, can_edit')
        .eq('member_id', memberId);

      if (permsError) throw permsError;

      // Convert to map for easy lookup
      const permsMap: Record<string, MemberPermission> = {};
      permsData?.forEach(perm => {
        permsMap[perm.section_name] = {
          section_name: perm.section_name,
          can_view: perm.can_view,
          can_edit: perm.can_edit,
        };
      });

      setPermissions(permsMap);
    } catch (error: any) {
      console.error('Error loading permissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load permissions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = async (
    sectionName: string,
    field: 'can_view' | 'can_edit',
    value: boolean
  ) => {
    // Update local state optimistically
    const newPermissions = { ...permissions };
    if (!newPermissions[sectionName]) {
      newPermissions[sectionName] = {
        section_name: sectionName,
        can_view: false,
        can_edit: false,
      };
    }
    newPermissions[sectionName][field] = value;

    // If disabling view, also disable edit
    if (field === 'can_view' && !value) {
      newPermissions[sectionName].can_edit = false;
    }

    // If enabling edit, also enable view
    if (field === 'can_edit' && value) {
      newPermissions[sectionName].can_view = true;
    }

    setPermissions(newPermissions);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Delete existing permissions and recreate
      const { error: deleteError } = await supabase
        .from('member_permissions')
        .delete()
        .eq('member_id', memberId);

      if (deleteError) throw deleteError;

      // Insert new permissions
      const permissionsToInsert = Object.values(permissions).map(perm => ({
        household_id: householdId,
        member_id: memberId,
        section_name: perm.section_name,
        can_view: perm.can_view,
        can_edit: perm.can_edit,
      }));

      if (permissionsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('member_permissions')
          .insert(permissionsToInsert);

        if (insertError) throw insertError;
      }

      toast({
        title: 'Success',
        description: 'Permissions updated successfully',
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving permissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to save permissions',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Permissions</DialogTitle>
          <DialogDescription>
            Control which sections {memberName || memberEmail} can access
          </DialogDescription>
        </DialogHeader>

        {isAdmin && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md flex items-center gap-2">
            <Crown className="h-4 w-4 text-amber-700" />
            <span className="text-sm text-amber-900">
              This user is an admin and has full access to all sections
            </span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {sections.map(section => {
              const perm = permissions[section.name] || {
                section_name: section.name,
                can_view: false,
                can_edit: false,
              };
              const isDashboard = section.name === 'dashboard';
              const isLocked = isAdmin || isDashboard;

              return (
                <Card key={section.name}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{section.icon}</span>
                        <div>
                          <CardTitle className="text-base">
                            {section.display_name}
                            {isDashboard && (
                              <Badge variant="secondary" className="ml-2">
                                Always Accessible
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {section.description}
                          </CardDescription>
                        </div>
                      </div>
                      {isLocked && (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`${section.name}-view`}
                          checked={isLocked || perm.can_view}
                          onCheckedChange={value =>
                            !isLocked &&
                            handlePermissionChange(section.name, 'can_view', value)
                          }
                          disabled={isLocked}
                        />
                        <Label
                          htmlFor={`${section.name}-view`}
                          className="flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="h-3 w-3" />
                          <span className="text-sm">View</span>
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`${section.name}-edit`}
                          checked={isLocked || perm.can_edit}
                          onCheckedChange={value =>
                            !isLocked &&
                            handlePermissionChange(section.name, 'can_edit', value)
                          }
                          disabled={isLocked}
                        />
                        <Label
                          htmlFor={`${section.name}-edit`}
                          className="flex items-center gap-1 cursor-pointer"
                        >
                          <Edit className="h-3 w-3" />
                          <span className="text-sm">Edit</span>
                        </Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || isAdmin || loading}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
