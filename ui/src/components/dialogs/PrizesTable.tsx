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
import { TokenPrices } from "@/hooks/useEkuboPrices";
import { PositionPrizes } from "@/lib/types";
import { Token, Prize } from "@/generated/models.gen";
import { formatNumber, getOrdinalSuffix } from "@/lib/utils";
import { getTokenLogoUrl } from "@/lib/tokensMeta";
import { useDojo } from "@/context/dojo";
import { calculatePrizeValue } from "@/lib/utils/formatting";
import { useState, useMemo } from "react";
import { useGetTournamentPrizes, useGetTournamentPrizesAggregations } from "@/dojo/hooks/useSqlQueries";
import { BigNumberish } from "starknet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PrizesTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupedPrizes: PositionPrizes;
  prices: TokenPrices;
  tokens: Token[];
  tokenDecimals: Record<string, number>;
  tournamentId?: BigNumberish;
  entryFeePrizes?: Prize[];
}

export const PrizesTableDialog = ({
  open,
  onOpenChange,
  groupedPrizes: containerGroupedPrizes,
  prices,
  tokens,
  tokenDecimals,
  tournamentId,
  entryFeePrizes = [],
}: PrizesTableDialogProps) => {
  const { selectedChainConfig, namespace } = useDojo();
  const chainId = selectedChainConfig?.chainId ?? "";
  const [currentPage, setCurrentPage] = useState(0);
  const positionsPerPage = 5;

  // Fetch aggregations to get total positions
  const { data: aggregations } = useGetTournamentPrizesAggregations({
    namespace,
    tournamentId: tournamentId ?? 0,
    active: !!tournamentId && open,
  });

  const totalPositions = aggregations?.lowest_prize_position || 0;
  const totalPages = Math.ceil(totalPositions / positionsPerPage);

  // Calculate position range for current page
  const startPosition = currentPage * positionsPerPage + 1;
  const endPosition = Math.min(startPosition + positionsPerPage - 1, totalPositions);

  // Fetch paginated prizes
  const { data: prizesData, loading: prizesLoading } = useGetTournamentPrizes({
    namespace,
    tournamentId: tournamentId ?? 0,
    active: !!tournamentId && open,
    startPosition,
    endPosition,
  });

  // Process prizes data into grouped format
  const groupedPrizes: PositionPrizes = useMemo(() => {
    if (!open) return containerGroupedPrizes; // Use container data when not fetching
    if (!prizesData && entryFeePrizes.length === 0) return {};

    const currentPagePrizes = prizesData || [];
    
    // Filter entry fee prizes that match current position range
    const relevantEntryFeePrizes = entryFeePrizes.filter(
      (p) => Number(p.payout_position) >= startPosition && Number(p.payout_position) <= endPosition
    );
    
    const combinedPrizes = [...relevantEntryFeePrizes, ...currentPagePrizes];

    return combinedPrizes.reduce((acc: PositionPrizes, prize: any) => {
      const position = prize.payout_position;
      if (!acc[position]) acc[position] = {};

      const isErc20 = prize.token_type?.variant?.erc20 || prize.token_type === "erc20";
      const isErc721 = prize.token_type?.variant?.erc721 || prize.token_type === "erc721";
      const tokenType = isErc20 ? "erc20" : isErc721 ? "erc721" : "erc20";
      const tokenKey = `${prize.token_address}_${tokenType}`;

      acc[position][tokenKey] = {
        type: tokenType as "erc20" | "erc721",
        payout_position: position,
        address: prize.token_address,
        value:
          tokenType === "erc20"
            ? BigInt(
                prize.token_type?.variant?.erc20?.amount ||
                  prize["token_type.erc20.amount"] ||
                  0
              )
            : BigInt(
                prize.token_type?.variant?.erc721?.token_id ||
                  prize["token_type.erc721.id"] ||
                  0
              ),
      };

      return acc;
    }, {});
  }, [open, containerGroupedPrizes, prizesData, entryFeePrizes, startPosition, endPosition]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[600px] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="p-4">Prize Distribution</DialogTitle>
        </DialogHeader>
        <div className="flex-1 flex flex-col min-h-0">
          {/* Prize list */}
          <div className="flex-1 overflow-y-auto">
            {/* Mobile view - card layout */}
            <div className="sm:hidden">
              {prizesLoading ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="border border-brand/20 rounded-lg p-3">
                      <Skeleton className="h-5 w-20 mb-2" />
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3 p-4">
                  {Object.entries(groupedPrizes)
                    .sort((a, b) => Number(a[0]) - Number(b[0]))
                    .map(([position, prizes]) => {
                      // Calculate total value for this position
                      let totalPositionValue = 0;
                      const prizeDetails = Object.entries(prizes).map(([key, prize]) => {
                        const token = tokens.find((t) => t.address === prize.address);
                        const symbol = token?.symbol || key;
                        const value = calculatePrizeValue(prize, symbol, prices, tokenDecimals);
                        totalPositionValue += value;
                        return { key, symbol, prize, value };
                      });

                      return (
                        <div key={position} className="border border-brand/20 rounded-lg p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div className="font-bold text-brand">
                              {position}<sup>{getOrdinalSuffix(Number(position))}</sup> Place
                            </div>
                            {totalPositionValue > 0 && (
                              <span className="text-brand-muted">${totalPositionValue.toFixed(2)}</span>
                            )}
                          </div>
                          <div className="space-y-1">
                            {prizeDetails.map(({ key, symbol, prize }) => {
                              const token = tokens.find(t => t.address === prize.address);
                              const decimals = tokenDecimals[prize.address] || 18;
                              
                              return (
                                <div key={`${position}-${key}`} className="flex items-center gap-2 text-sm">
                                  {prize.type === "erc20" ? (
                                    <>
                                      <span>{formatNumber(Number(prize.value) / 10 ** decimals)}</span>
                                      {getTokenLogoUrl(chainId, prize.address) ? (
                                        <img
                                          src={getTokenLogoUrl(chainId, prize.address)}
                                          className="w-4 h-4 rounded-full"
                                          alt={symbol}
                                        />
                                      ) : null}
                                      <span className="text-xs text-muted-foreground">{token?.symbol || symbol}</span>
                                    </>
                                  ) : (
                                    <span>{`${Array.isArray(prize.value) ? prize.value.length : 1} NFT${
                                      (Array.isArray(prize.value) ? prize.value.length : 1) === 1 ? "" : "s"
                                    }`}</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Desktop view - table layout */}
            <Table className="hidden sm:table">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Position</TableHead>
                  <TableHead>Prize</TableHead>
                  <TableHead className="text-right">Value (USD)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prizesLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : (
                  Object.entries(groupedPrizes)
                  .sort(
                    (a, b) =>
                      Number(a[1].payout_position) -
                      Number(b[1].payout_position)
                  )
                  .map(([position, prizes]) => {
                    // Calculate total value for this position
                    let totalPositionValue = 0;
                    const prizeDetails = Object.entries(prizes).map(
                      ([key, prize]) => {
                        const token = tokens.find((t) => t.address === prize.address);
                        const symbol = token?.symbol || key;
                        const value = calculatePrizeValue(prize, symbol, prices, tokenDecimals);
                        totalPositionValue += value;
                        return { key, symbol, prize, value };
                      }
                    );

                    return (
                      <TableRow key={position}>
                        <TableCell className="font-medium">
                          {position}
                          <sup>{getOrdinalSuffix(Number(position))}</sup>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {prizeDetails.map(({ key, symbol, prize }) => {
                              const token = tokens.find(
                                (token) => token.address === prize.address
                              );
                              const decimals = tokenDecimals[prize.address] || 18;
                              
                              return (
                                <div
                                  key={`${position}-${key}`}
                                  className="flex items-center gap-2"
                                >
                                  {prize.type === "erc20" ? (
                                    <>
                                      <span>{`${formatNumber(
                                        Number(prize.value) / 10 ** decimals
                                      )}`}</span>
                                      {getTokenLogoUrl(chainId, prize.address) ? (
                                        <img
                                          src={getTokenLogoUrl(
                                            chainId,
                                            prize.address
                                          )}
                                          className="w-5 h-5 rounded-full"
                                          alt={symbol}
                                        />
                                      ) : (
                                        <span className="text-sm text-muted-foreground">
                                          {token?.symbol || symbol}
                                        </span>
                                      )}
                                    </>
                                  ) : (
                                    <span>{`${
                                      Array.isArray(prize.value) ? prize.value.length : 1
                                    } NFT${
                                      (Array.isArray(prize.value) ? prize.value.length : 1) === 1
                                        ? ""
                                        : "s"
                                    }`}</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {totalPositionValue > 0 ? (
                            <span>${totalPositionValue.toFixed(2)}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-brand/20">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">Prev</span>
              </Button>

              <div className="flex flex-col items-center gap-1">
                <span className="text-sm text-muted-foreground">
                  Page {currentPage + 1} of {totalPages}
                </span>
                {totalPositions > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {totalPositions} prizes total
                  </span>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
                className="flex items-center gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};