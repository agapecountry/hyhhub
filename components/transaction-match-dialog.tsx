'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link2, LinkIcon, AlertCircle, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  plaid_transaction_id: string | null;
  matched_transaction_id: string | null;
  match_confidence: 'high' | 'medium' | 'low' | null;
  manually_matched: boolean;
}

interface PotentialMatch {
  match_id: string;
  match_confidence: 'high' | 'medium' | 'low';
  date_diff: number;
  amount_diff: number;
  description_similarity: number;
  transaction: Transaction;
}

interface TransactionMatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  onMatchComplete: () => void;
}

export function TransactionMatchDialog({ 
  open, 
  onOpenChange, 
  transaction,
  onMatchComplete 
}: TransactionMatchDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [potentialMatches, setPotentialMatches] = useState<PotentialMatch[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);

  useEffect(() => {
    if (open && transaction) {
      findMatches();
    } else {
      setPotentialMatches([]);
      setSelectedMatch(null);
    }
  }, [open, transaction]);

  const findMatches = async () => {
    if (!transaction) return;

    setLoading(true);
    try {
      // Call the find_transaction_matches function
      const { data, error } = await supabase.rpc('find_transaction_matches', {
        p_transaction_id: transaction.id,
        p_date_range_days: 3,
        p_amount_tolerance: 0.50
      });

      if (error) throw error;

      // Fetch full transaction details for each match
      if (data && data.length > 0) {
        const matchIds = data.map((m: any) => m.match_id);
        const { data: matchTransactions, error: txError } = await supabase
          .from('transactions')
          .select('*')
          .in('id', matchIds);

        if (txError) throw txError;

        // Combine the match metadata with transaction details
        const enrichedMatches = data.map((match: any) => ({
          ...match,
          transaction: matchTransactions?.find((t: Transaction) => t.id === match.match_id)
        }));

        setPotentialMatches(enrichedMatches);
      }
    } catch (error) {
      console.error('Error finding matches:', error);
      toast({
        title: 'Error',
        description: 'Failed to find potential matches',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const matchTransactions = async () => {
    if (!transaction || !selectedMatch) return;

    setLoading(true);
    try {
      const selectedMatchData = potentialMatches.find(m => m.match_id === selectedMatch);
      const confidence = selectedMatchData?.match_confidence || 'high';

      const { error } = await supabase.rpc('match_transactions', {
        p_transaction1_id: transaction.id,
        p_transaction2_id: selectedMatch,
        p_confidence: confidence,
        p_manual: true
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Transactions matched successfully',
      });

      onMatchComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('Error matching transactions:', error);
      toast({
        title: 'Error',
        description: 'Failed to match transactions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const unmatchTransaction = async () => {
    if (!transaction) return;

    setLoading(true);
    try {
      const { error } = await supabase.rpc('unmatch_transactions', {
        p_transaction_id: transaction.id
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Transaction unmatched successfully',
      });

      onMatchComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('Error unmatching transaction:', error);
      toast({
        title: 'Error',
        description: 'Failed to unmatch transaction',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!transaction) return null;

  const isManual = !transaction.plaid_transaction_id;
  const isMatched = !!transaction.matched_transaction_id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isMatched ? 'Manage Transaction Match' : 'Find Matching Transaction'}
          </DialogTitle>
          <DialogDescription>
            {isMatched 
              ? 'This transaction is currently matched. You can unmatch it if needed.'
              : 'Find and link duplicate transactions (e.g., manual entry with Plaid sync)'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Transaction */}
          <div className="border rounded-lg p-4 bg-muted/50">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              Current Transaction
              <Badge variant={isManual ? 'secondary' : 'default'}>
                {isManual ? 'Manual' : 'Plaid Synced'}
              </Badge>
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Date:</span>{' '}
                {format(parseISO(transaction.date), 'MMM d, yyyy')}
              </div>
              <div>
                <span className="text-muted-foreground">Amount:</span>{' '}
                ${Math.abs(transaction.amount).toFixed(2)}
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Description:</span>{' '}
                {transaction.description}
              </div>
            </div>
          </div>

          {isMatched ? (
            <Alert>
              <Check className="h-4 w-4" />
              <AlertDescription>
                This transaction is matched with confidence: {transaction.match_confidence}
                {transaction.manually_matched && ' (manually matched)'}
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Potential Matches */}
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Finding potential matches...
                </div>
              ) : potentialMatches.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No potential matches found. This transaction appears to be unique.
                  </AlertDescription>
                </Alert>
              ) : (
                <div>
                  <h4 className="font-semibold mb-2">Potential Matches</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Confidence</TableHead>
                          <TableHead>Type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {potentialMatches.map((match) => (
                          <TableRow 
                            key={match.match_id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => setSelectedMatch(match.match_id)}
                          >
                            <TableCell>
                              <input
                                type="radio"
                                checked={selectedMatch === match.match_id}
                                onChange={() => setSelectedMatch(match.match_id)}
                                className="cursor-pointer"
                              />
                            </TableCell>
                            <TableCell>
                              {format(parseISO(match.transaction.date), 'MMM d')}
                              {match.date_diff > 0 && (
                                <span className="text-xs text-muted-foreground ml-1">
                                  ({match.date_diff}d diff)
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {match.transaction.description}
                            </TableCell>
                            <TableCell className="text-right">
                              ${Math.abs(match.transaction.amount).toFixed(2)}
                              {match.amount_diff > 0 && (
                                <span className="text-xs text-muted-foreground block">
                                  (${match.amount_diff.toFixed(2)} diff)
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  match.match_confidence === 'high' ? 'default' :
                                  match.match_confidence === 'medium' ? 'secondary' :
                                  'outline'
                                }
                              >
                                {match.match_confidence}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={match.transaction.plaid_transaction_id ? 'default' : 'secondary'}>
                                {match.transaction.plaid_transaction_id ? 'Plaid' : 'Manual'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {isMatched ? (
            <Button 
              variant="destructive" 
              onClick={unmatchTransaction}
              disabled={loading}
            >
              <LinkIcon className="h-4 w-4 mr-2" />
              Unmatch
            </Button>
          ) : (
            <Button 
              onClick={matchTransactions}
              disabled={loading || !selectedMatch}
            >
              <Link2 className="h-4 w-4 mr-2" />
              Match Selected
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
