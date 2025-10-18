import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Pagination from "@/components/table/Pagination";
import { useState, useEffect } from "react";
import { BigNumberish, addAddressPadding } from "starknet";
import { useGameTokens, useGameTokensCount } from "metagame-sdk/sql";
import { useTournamentContracts } from "@/dojo/hooks/useTournamentContracts";
import { REFRESH } from "@/components/Icons";
import { Search } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

interface ScoreTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentId: BigNumberish;
  entryCount: number;
  isStarted: boolean;
  isEnded: boolean;
}

export const ScoreTableDialog = ({
  open,
  onOpenChange,
  tournamentId,
  entryCount,
  isStarted,
  isEnded,
}: ScoreTableDialogProps) => {
  const { tournamentAddress } = useTournamentContracts();
  const [searchQuery, setSearchQuery] = useState("");

  // Debounce search query to avoid too many requests
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const {
    games,
    pagination: {
      currentPage,
      hasNextPage,
      hasPreviousPage,
      nextPage,
      previousPage,
      goToPage,
    },
    refetch,
    loading,
  } = useGameTokens({
    context: {
      id: Number(tournamentId),
    },
    pagination: {
      pageSize: 10,
    },
    sortBy: "score",
    sortOrder: "desc",
    mintedByAddress: addAddressPadding(tournamentAddress),
    includeMetadata: true,
    // Pass the player name string directly for server-side search
    playerName: debouncedSearchQuery.trim() || undefined,
  });

  // Get the filtered count based on the same search parameters
  const { count: filteredCount } = useGameTokensCount({
    context: {
      id: Number(tournamentId),
    },
    mintedByAddress: addAddressPadding(tournamentAddress),
    playerName: debouncedSearchQuery.trim() || undefined,
  });

  // Use filtered count if available, otherwise fall back to total entry count
  const totalCount = filteredCount ?? entryCount;

  // Clear search when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
    }
  }, [open]);

  // Reset page when search changes
  useEffect(() => {
    // Reset to first page when search query changes
    if (goToPage && debouncedSearchQuery !== undefined) {
      goToPage(0);
    }
  }, [debouncedSearchQuery, goToPage]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[600px] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="flex-shrink-0 border-b border-border">
          <DialogTitle className="p-4">
            <span>{isStarted ? "Scores" : "Entrants"} Table</span>
          </DialogTitle>
          <div className="px-4 pb-4 flex gap-3">
            <div className="flex-1 flex items-center border rounded border-brand-muted bg-background">
              <Search className="w-4 h-4 ml-3 text-muted-foreground" />
              <Input
                placeholder="Search by player name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            {/* Mobile refresh button */}
            <Button
              onClick={refetch}
              disabled={loading}
              size="xs"
              variant="outline"
              className="sm:hidden"
            >
              <REFRESH className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            </Button>
            {/* Desktop refresh button */}
            <Button
              onClick={refetch}
              disabled={loading}
              size="sm"
              variant="outline"
              className="hidden sm:flex items-center gap-2"
            >
              <REFRESH className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-center">Rank</TableHead>
                <TableHead>Player</TableHead>
                <TableHead className="text-right">Score</TableHead>
                {isEnded && (
                  <TableHead className="text-center">Position</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody className="overflow-y-auto">
              {games && games.length > 0 ? (
                games.map((game, index) => {
                  const globalIndex = currentPage * 10 + index;
                  const playerName = game?.player_name || "";
                  const ownerAddress = game?.owner ?? "0x0";
                  const shortAddress = `${ownerAddress?.slice(
                    0,
                    6
                  )}...${ownerAddress?.slice(-4)}`;

                  return (
                    <TableRow key={index}>
                      <TableCell className="text-center font-medium">
                        {globalIndex + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {playerName || shortAddress}
                          </span>
                          {playerName && (
                            <span className="text-xs text-muted-foreground">
                              {shortAddress}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {game?.score || 0}
                      </TableCell>
                      {isEnded && (
                        <TableCell className="text-center">
                          {(game as any)?.winner_position || "-"}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={isEnded ? 4 : 3}
                    className="text-center text-muted-foreground py-8"
                  >
                    {loading
                      ? "Loading..."
                      : searchQuery
                      ? "No players found matching your search"
                      : "No entries yet"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalCount > 10 && (
          <div className="flex-shrink-0 p-4 border-t border-border">
            <Pagination
              totalPages={Math.ceil(totalCount / 10)}
              currentPage={currentPage}
              nextPage={nextPage}
              previousPage={previousPage}
              hasNextPage={hasNextPage}
              hasPreviousPage={hasPreviousPage}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
