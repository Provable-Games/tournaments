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
import { formatNumber, indexAddress } from "@/lib/utils";
import { getTokenLogoUrl, getTokenSymbol } from "@/lib/tokensMeta";
import { useDojo } from "@/context/dojo";
import { useMemo } from "react";
import { useGetAllTournamentPrizes } from "@/dojo/hooks/useSqlQueries";
import { BigNumberish } from "starknet";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetUsernames } from "@/hooks/useController";

interface SponsorsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prices: TokenPrices;
  tokenDecimals: Record<string, number>;
  tournamentId?: BigNumberish;
}

interface TokenContribution {
  tokenAddress: string;
  tokenType: "erc20" | "erc721";
  totalAmount: bigint;
  count: number;
  usdValue: number;
}

interface SponsorContribution {
  sponsorAddress: string;
  tokens: Map<string, TokenContribution>;
  totalUsdValue: number;
  totalPrizes: number;
}

export const SponsorsDialog = ({
  open,
  onOpenChange,
  prices,
  tokenDecimals,
  tournamentId,
}: SponsorsDialogProps) => {
  const { selectedChainConfig, namespace } = useDojo();
  const chainId = selectedChainConfig?.chainId ?? "";

  // Fetch all prizes to get sponsored ones
  const { data: prizesData, loading: prizesLoading } =
    useGetAllTournamentPrizes({
      namespace,
      tournamentId: tournamentId ?? 0,
      active: !!tournamentId && open,
    });

  // Group prizes by sponsor and aggregate by token
  const sponsorContributions = useMemo(() => {
    if (!prizesData) return [];

    const sponsorMap = new Map<string, SponsorContribution>();

    prizesData.forEach((prize: any) => {
      // Only include prizes with sponsor_address (sponsored prizes)
      if (!prize.sponsor_address || prize.sponsor_address === "0x0") return;

      const sponsorAddress = prize.sponsor_address;

      if (!sponsorMap.has(sponsorAddress)) {
        sponsorMap.set(sponsorAddress, {
          sponsorAddress,
          tokens: new Map<string, TokenContribution>(),
          totalUsdValue: 0,
          totalPrizes: 0,
        });
      }

      const sponsor = sponsorMap.get(sponsorAddress)!;
      sponsor.totalPrizes++;

      // Determine token type and amount
      const isErc20 =
        prize.token_type?.variant?.erc20 || prize.token_type === "erc20";
      const tokenType = isErc20 ? "erc20" : "erc721";
      const tokenAddress = prize.token_address;

      // Get or create token entry for this sponsor
      if (!sponsor.tokens.has(tokenAddress)) {
        sponsor.tokens.set(tokenAddress, {
          tokenAddress,
          tokenType,
          totalAmount: 0n,
          count: 0,
          usdValue: 0,
        });
      }

      const tokenContribution = sponsor.tokens.get(tokenAddress)!;
      tokenContribution.count++;

      if (isErc20) {
        const amount = BigInt(
          prize.token_type?.variant?.erc20?.amount ||
            prize["token_type.erc20.amount"] ||
            0
        );

        tokenContribution.totalAmount += amount;

        const decimals = tokenDecimals[tokenAddress] || 18;
        const tokenAmount = Number(amount) / 10 ** decimals;
        const tokenSymbol = getTokenSymbol(chainId, tokenAddress);
        const tokenPrice = prices[tokenSymbol ?? ""] ?? 0;
        const usdValue = tokenAmount * tokenPrice;

        tokenContribution.usdValue += usdValue;
        sponsor.totalUsdValue += usdValue;
      }
    });

    // Sort sponsors by total USD value (descending)
    return Array.from(sponsorMap.values()).sort(
      (a, b) => b.totalUsdValue - a.totalUsdValue
    );
  }, [prizesData, prices, tokenDecimals, chainId]);

  const totalSponsors = sponsorContributions.length;
  const totalSponsoredValue = sponsorContributions.reduce(
    (sum, sponsor) => sum + sponsor.totalUsdValue,
    0
  );

  // Get all sponsor addresses for username lookup
  const sponsorAddresses = useMemo(
    () => sponsorContributions.map((s) => s.sponsorAddress),
    [sponsorContributions]
  );

  // Fetch Cartridge usernames for sponsor addresses
  const { usernames } = useGetUsernames(sponsorAddresses);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span>Prize Sponsors ({totalSponsors})</span>
              {totalSponsoredValue > 0 && (
                <span className="text-brand-muted text-sm sm:text-base">
                  ${totalSponsoredValue.toFixed(2)} Total
                </span>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {prizesLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : sponsorContributions.length === 0 ? (
          <div className="text-center py-8 text-brand-muted">
            No sponsors for this tournament
          </div>
        ) : (
          <div className="space-y-6">
            {sponsorContributions.map((sponsor, index) => (
              <div
                key={sponsor.sponsorAddress}
                className="border border-brand/20 rounded-lg p-3 sm:p-4"
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 mb-3">
                  <div>
                    {usernames?.get(indexAddress(sponsor.sponsorAddress)) ? (
                      <>
                        <h3 className="font-semibold text-base sm:text-lg">
                          {usernames.get(indexAddress(sponsor.sponsorAddress))}
                        </h3>
                        <p className="text-xs sm:text-sm text-brand-muted font-mono">
                          {sponsor.sponsorAddress.slice(0, 6)}...
                          {sponsor.sponsorAddress.slice(-4)}
                        </p>
                      </>
                    ) : (
                      <>
                        <h3 className="font-semibold text-base sm:text-lg">
                          Sponsor {index + 1}
                        </h3>
                        <p className="text-xs sm:text-sm text-brand-muted font-mono">
                          {sponsor.sponsorAddress.slice(0, 6)}...
                          {sponsor.sponsorAddress.slice(-4)}
                        </p>
                      </>
                    )}
                  </div>
                  {sponsor.totalUsdValue > 0 && (
                    <div className="sm:text-right">
                      <p className="text-lg sm:text-xl font-bold text-brand">
                        ${sponsor.totalUsdValue.toFixed(2)}
                      </p>
                      <p className="text-xs sm:text-sm text-brand-muted">
                        {sponsor.totalPrizes} prize
                        {sponsor.totalPrizes !== 1 ? "s" : ""}
                      </p>
                    </div>
                  )}
                </div>

                {/* Mobile: Card layout */}
                <div className="sm:hidden space-y-2">
                  {Array.from(sponsor.tokens.values()).map((tokenContrib) => {
                    const decimals =
                      tokenDecimals[tokenContrib.tokenAddress] || 18;
                    const tokenAmount =
                      tokenContrib.tokenType === "erc20"
                        ? Number(tokenContrib.totalAmount) / 10 ** decimals
                        : 0;

                    return (
                      <div
                        key={tokenContrib.tokenAddress}
                        className="bg-brand/5 rounded p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img
                              src={getTokenLogoUrl(
                                chainId,
                                tokenContrib.tokenAddress
                              )}
                              className="w-5 h-5"
                              alt="token"
                            />
                            <span className="font-medium text-sm">
                              {getTokenSymbol(
                                chainId,
                                tokenContrib.tokenAddress
                              ) || "Unknown"}
                            </span>
                          </div>
                          <span className="text-xs text-brand-muted">
                            {tokenContrib.count} prize
                            {tokenContrib.count !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-brand-muted">Amount:</span>
                          <span className="font-medium">
                            {tokenContrib.tokenType === "erc20" ? (
                              formatNumber(tokenAmount)
                            ) : (
                              <span className="text-brand-muted">
                                {tokenContrib.count} NFT
                                {tokenContrib.count !== 1 ? "s" : ""}
                              </span>
                            )}
                          </span>
                        </div>
                        {tokenContrib.tokenType === "erc20" && (
                          <div className="flex justify-between text-sm">
                            <span className="text-brand-muted">USD Value:</span>
                            <span className="font-medium text-brand">
                              ${tokenContrib.usdValue.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Desktop: Table layout */}
                <div className="hidden sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Token</TableHead>
                        <TableHead className="text-right">
                          Total Amount
                        </TableHead>
                        <TableHead className="text-right">USD Value</TableHead>
                        <TableHead className="text-right">
                          Prize Count
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from(sponsor.tokens.values()).map(
                        (tokenContrib) => {
                          const decimals =
                            tokenDecimals[tokenContrib.tokenAddress] || 18;
                          const tokenAmount =
                            tokenContrib.tokenType === "erc20"
                              ? Number(tokenContrib.totalAmount) /
                                10 ** decimals
                              : 0;

                          return (
                            <TableRow key={tokenContrib.tokenAddress}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <img
                                    src={getTokenLogoUrl(
                                      chainId,
                                      tokenContrib.tokenAddress
                                    )}
                                    className="w-6 h-6"
                                    alt="token"
                                  />
                                  <span>
                                    {getTokenSymbol(
                                      chainId,
                                      tokenContrib.tokenAddress
                                    ) || "Unknown"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                {tokenContrib.tokenType === "erc20" ? (
                                  formatNumber(tokenAmount)
                                ) : (
                                  <span className="text-brand-muted">
                                    {tokenContrib.count} NFT
                                    {tokenContrib.count !== 1 ? "s" : ""}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {tokenContrib.tokenType === "erc20" ? (
                                  `$${tokenContrib.usdValue.toFixed(2)}`
                                ) : (
                                  <span className="text-brand-muted">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right text-brand-muted">
                                {tokenContrib.count}
                              </TableCell>
                            </TableRow>
                          );
                        }
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
