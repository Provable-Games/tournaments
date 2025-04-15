import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import TokenDialog from "@/components/dialogs/Token";
import AmountInput from "@/components/createTournament/inputs/Amount";
import {
  bigintToHex,
  calculateDistribution,
  formatNumber,
  getOrdinalSuffix,
} from "@/lib/utils";
import { NewPrize, FormToken } from "@/lib/types";
import { Prize } from "@/generated/models.gen";
import { useSystemCalls } from "@/dojo/hooks/useSystemCalls";
import { addAddressPadding, BigNumberish } from "starknet";
import { TOURNAMENT_VERSION_KEY } from "@/lib/constants";
import { CairoCustomEnum } from "starknet";
import { useGetMetricsQuery } from "@/dojo/hooks/useSdkQueries";
import { getTokenLogoUrl, getTokenSymbol } from "@/lib/tokensMeta";
import { ALERT, CHECK, QUESTION, X } from "@/components/Icons";
import { useAccount } from "@starknet-react/core";
import { useConnectToSelectedChain } from "@/dojo/hooks/useChain";
import { useEkuboPrices } from "@/hooks/useEkuboPrices";
import { useDojo } from "@/context/dojo";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function AddPrizesDialog({
  open,
  onOpenChange,
  tournamentId,
  tournamentName,
  leaderboardSize,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentId: BigNumberish;
  tournamentName: string;
  leaderboardSize: number;
}) {
  const { address } = useAccount();
  const { namespace, selectedChainConfig } = useDojo();
  const { connect } = useConnectToSelectedChain();
  const { approveAndAddPrizes, getBalanceGeneral } = useSystemCalls();
  const [selectedToken, setSelectedToken] = useState<FormToken | undefined>(
    undefined
  );
  const [newPrize, setNewPrize] = useState<NewPrize>({
    tokenAddress: "",
    tokenType: "",
    hasPrice: false,
  });
  const [currentPrizes, setCurrentPrizes] = useState<NewPrize[]>([]);
  const [distributionWeight, setDistributionWeight] = useState(1);
  const [prizeDistributions, setPrizeDistributions] = useState<
    { position: number; percentage: number }[]
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [onConfirmation, setOnConfirmation] = useState(false);
  const [_tokenBalances, setTokenBalances] = useState<Record<string, bigint>>(
    {}
  );
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [hasInsufficientBalance, setHasInsufficientBalance] = useState(false);

  const chainId = selectedChainConfig?.chainId ?? "";

  const { entity: metricsEntity } = useGetMetricsQuery(
    addAddressPadding(TOURNAMENT_VERSION_KEY),
    namespace
  );

  const totalDistributionPercentage = useMemo(() => {
    return (
      prizeDistributions.reduce((sum, pos) => sum + (pos.percentage || 0), 0) ||
      0
    );
  }, [prizeDistributions]);

  const isValidPrize = () => {
    if (!newPrize.tokenAddress) return false;

    if (newPrize.tokenType === "ERC20") {
      return !!newPrize.amount && totalDistributionPercentage === 100;
    }

    if (newPrize.tokenType === "ERC721") {
      return !!newPrize.tokenId && !!newPrize.position;
    }

    return false;
  };

  const isERC20 = newPrize.tokenType === "ERC20";

  useEffect(() => {
    if (open && leaderboardSize) {
      // Initialize distributions when dialog opens
      const distributions = calculateDistribution(
        leaderboardSize,
        distributionWeight
      );
      setPrizeDistributions(
        distributions.map((percentage, index) => ({
          position: index + 1,
          percentage,
        }))
      );
    }
  }, [open, leaderboardSize]);

  useEffect(() => {
    if (!open) {
      setOnConfirmation(false);
    }
  }, [open]);

  const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
      setOnConfirmation(false);
      onOpenChange(false);
    } else {
      onOpenChange(true);
    }
  };

  const prizeCount = metricsEntity?.PrizeMetrics?.total_prizes ?? 0;

  const handleAddPrizes = async () => {
    if (
      newPrize.tokenType === "ERC20" &&
      newPrize.amount &&
      totalDistributionPercentage === 100
    ) {
      setCurrentPrizes([
        ...currentPrizes,
        ...prizeDistributions.map((prize) => ({
          tokenType: "ERC20" as const,
          tokenAddress: newPrize.tokenAddress,
          amount: ((newPrize.amount ?? 0) * prize.percentage) / 100,
          position: prize.position,
          value: ((newPrize.value ?? 0) * prize.percentage) / 100,
          hasPrice: newPrize.hasPrice,
        })),
      ]);
    } else if (
      newPrize.tokenType === "ERC721" &&
      newPrize.tokenId &&
      newPrize.position
    ) {
      setCurrentPrizes([
        ...currentPrizes,
        {
          tokenType: "ERC721",
          tokenAddress: newPrize.tokenAddress,
          tokenId: newPrize.tokenId,
          position: newPrize.position,
        },
      ]);
    }
    setNewPrize({ tokenAddress: "", tokenType: "" });
    setSelectedToken(undefined);
  };

  const submitPrizes = async () => {
    setIsSubmitting(true);
    try {
      let prizesToAdd: Prize[] = [];

      prizesToAdd = currentPrizes.map((prize, index) => ({
        id: Number(prizeCount) + index + 1,
        tournament_id: tournamentId,
        token_address: prize.tokenAddress,
        token_type:
          prize.tokenType === "ERC20"
            ? new CairoCustomEnum({
                erc20: {
                  amount: addAddressPadding(
                    bigintToHex(prize.amount! * 10 ** 18)
                  ),
                },
                erc721: undefined,
              })
            : new CairoCustomEnum({
                erc20: undefined,
                erc721: {
                  id: addAddressPadding(bigintToHex(prize.tokenId!)),
                },
              }),
        payout_position: prize.position ?? 0n,
        claimed: false,
      }));

      await approveAndAddPrizes(
        tournamentId,
        tournamentName,
        prizesToAdd,
        true,
        totalValue
      );

      setCurrentPrizes([]);
      setSelectedToken(undefined);
      setOnConfirmation(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to add prizes:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const aggregatedPrizes = currentPrizes.reduce((acc, prize) => {
    const key = `${prize.position}-${prize.tokenAddress}-${prize.tokenType}`;

    if (!acc[key]) {
      acc[key] = {
        ...prize,
        amount: prize.tokenType === "ERC20" ? prize.amount : undefined,
        tokenIds: prize.tokenType === "ERC721" ? [prize.tokenId] : [],
        count: 1,
      };
    } else {
      if (prize.tokenType === "ERC20") {
        acc[key].amount = (acc[key].amount || 0) + (prize.amount || 0);
      } else if (prize.tokenType === "ERC721") {
        acc[key].tokenIds = [...(acc[key].tokenIds || []), prize.tokenId];
      }
      acc[key].count += 1;
    }

    return acc;
  }, {} as Record<string, any>);

  // Convert to array for rendering
  const aggregatedPrizesArray = Object.values(aggregatedPrizes);

  // Calculate total value in USD for ERC20 tokens
  const totalValue = aggregatedPrizesArray.reduce((sum, prize: any) => {
    if (prize.tokenType === "ERC20" && prize.value) {
      if (!prize.hasPrice) return sum;
      return sum + prize.value;
    }
    return sum;
  }, 0);

  // Count total NFTs
  const totalNFTs = aggregatedPrizesArray.reduce((sum, prize: any) => {
    if (prize.tokenType === "ERC721" && prize.tokenIds) {
      return sum + prize.tokenIds.length;
    }
    return sum;
  }, 0);

  const uniqueTokenSymbols = useMemo(() => {
    // First map to get symbols, then filter out undefined values, then create a Set
    const symbols = currentPrizes
      .map((prize) => getTokenSymbol(chainId, prize.tokenAddress))
      .filter(
        (symbol): symbol is string =>
          typeof symbol === "string" && symbol !== ""
      );

    // Create a Set from the filtered array to get unique values
    return [...new Set(symbols)];
  }, [currentPrizes]);

  const { prices, isLoading: pricesLoading } = useEkuboPrices({
    tokens: [
      ...uniqueTokenSymbols,
      ...(newPrize.tokenAddress
        ? [getTokenSymbol(chainId, newPrize.tokenAddress) ?? ""]
        : []),
    ],
  });

  useEffect(() => {
    setNewPrize((prev) => ({
      ...prev,
      amount:
        (prev.value ?? 0) /
        (prices?.[getTokenSymbol(chainId, prev.tokenAddress) ?? ""] ?? 1),
      hasPrice: !!prices?.[getTokenSymbol(chainId, prev.tokenAddress) ?? ""],
    }));
  }, [prices, newPrize.value]);

  const checkAllBalances = useCallback(async () => {
    if (!address) return;

    setIsLoadingBalances(true);

    try {
      // Get unique token addresses
      const uniqueTokens = Array.from(
        new Set(currentPrizes.map((prize) => prize.tokenAddress))
      );

      // Fetch balances for each token
      const balances: Record<string, bigint> = {};

      for (const tokenAddress of uniqueTokens) {
        const balance = await getBalanceGeneral(tokenAddress);
        balances[tokenAddress] = balance;
      }

      setTokenBalances(balances);

      // Check if any token has insufficient balance
      let insufficient = false;

      for (const prize of aggregatedPrizesArray) {
        if (prize.tokenType === "ERC20") {
          // For ERC20, check if balance >= amount
          const tokenBalance = BigInt(balances[prize.tokenAddress] || "0");
          const requiredAmount = BigInt(Math.floor(prize.amount * 10 ** 18)); // Convert to wei

          if (tokenBalance < requiredAmount) {
            insufficient = true;
            break;
          }
        } else if (prize.tokenType === "ERC721") {
          // For ERC721, we would need to check ownership of each token ID
          // This would require additional API calls to check NFT ownership
          // For simplicity, we'll assume the check is done elsewhere or skip it
          break;
        }
      }

      setHasInsufficientBalance(insufficient);
    } catch (error) {
      console.error("Error checking balances:", error);
      setHasInsufficientBalance(true);
    } finally {
      setIsLoadingBalances(false);
    }
  }, [address, currentPrizes, aggregatedPrizesArray]);

  useEffect(() => {
    if (onConfirmation && address) {
      checkAllBalances();
    }
  }, [onConfirmation, address]);

  if (onConfirmation) {
    return (
      <Dialog open={open} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Confirm Prizes</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4 overflow-y-auto">
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Prize Summary</h3>
                <div className="flex flex-col items-end">
                  {totalValue > 0 && (
                    <span className="font-bold text-lg font-brand">
                      Total: ${totalValue.toFixed(2)}
                    </span>
                  )}
                  {totalNFTs > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {totalNFTs} NFT{totalNFTs !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
              {/* Balance status */}
              {isLoadingBalances ? (
                <div className="mt-2 text-sm">Checking balances...</div>
              ) : hasInsufficientBalance ? (
                <div className="mt-2 font-medium flex flex-row items-center gap-2 text-destructive">
                  <span className="w-6">
                    <ALERT />
                  </span>
                  <span>Insufficient balance for some tokens</span>
                </div>
              ) : (
                <div className="mt-2 font-medium flex flex-row items-center gap-2">
                  <span className="w-6">
                    <CHECK />
                  </span>
                  <span>Sufficient balance for all tokens</span>
                </div>
              )}
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {aggregatedPrizesArray.map((prize: any, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border border-brand-muted rounded-md"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-brand w-10">
                      {`${prize.position}${getOrdinalSuffix(prize.position)}`}
                    </span>
                    <span className="font-medium">{selectedToken?.symbol}</span>
                    {prize.count > 1 && (
                      <span className="text-sm text-muted-foreground">
                        ({prize.count} prizes)
                      </span>
                    )}
                  </div>
                  <div>
                    {prize.tokenType === "ERC20" ? (
                      <div className="flex flex-row items-center gap-2">
                        <span className="font-semibold">
                          {formatNumber(prize.amount)}
                        </span>
                        <img
                          src={getTokenLogoUrl(chainId, prize.tokenAddress)}
                          className="w-6 h-6 rounded-full"
                          alt="Token logo"
                        />
                        {prize.hasPrice ? (
                          <span className="text-sm text-neutral">
                            ~${prize.value.toFixed(2)}
                          </span>
                        ) : (
                          <Tooltip delayDuration={50}>
                            <TooltipTrigger asChild>
                              <span className="w-6 h-6 text-neutral cursor-pointer">
                                <QUESTION />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="bg-black text-brand text-neutral">
                              <span>No price data available</span>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-end">
                        {prize.tokenIds.map((id: number, idx: number) => (
                          <span key={idx} className="font-semibold">
                            #{id}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <div className="flex justify-between w-full">
              <Button
                variant="outline"
                onClick={() => setOnConfirmation(false)}
              >
                Back to Edit
              </Button>
              <Button
                onClick={submitPrizes}
                disabled={isSubmitting || hasInsufficientBalance}
              >
                {isSubmitting ? "Processing..." : "Confirm & Submit"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Add Prizes to Tournament</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6 overflow-y-auto pr-2">
          {/* Token Selection */}
          <div className="flex flex-row items-center gap-4">
            <div className="pt-6">
              <TokenDialog
                selectedToken={selectedToken}
                onSelect={(token) => {
                  setSelectedToken(token);
                  setNewPrize((prev) => ({
                    ...prev,
                    tokenAddress: token.address,
                    tokenType:
                      token.token_type.activeVariant() === "erc20"
                        ? "ERC20"
                        : "ERC721",
                    // Reset other values when token changes
                    amount: undefined,
                    tokenId: undefined,
                    position: undefined,
                  }));
                }}
              />
            </div>
            {/* Amount/Token ID Input */}
            {newPrize.tokenAddress && (
              <div className="flex flex-col gap-1">
                <div className="flex flex-row justify-between">
                  <span className="min-w-[100px] font-brand">
                    {isERC20 ? "Amount ($)" : "Token ID"}
                  </span>
                  {!pricesLoading ? (
                    <div className="flex flex-row items-center gap-2">
                      <p>~{formatNumber(newPrize.amount ?? 0)}</p>
                      <img
                        src={getTokenLogoUrl(chainId, newPrize.tokenAddress)}
                        className="w-6 h-6 rounded-full"
                      />
                    </div>
                  ) : (
                    <p>Loading...</p>
                  )}
                </div>
                {isERC20 ? (
                  <AmountInput
                    value={newPrize.value || 0}
                    onChange={(value) =>
                      setNewPrize((prev) => ({
                        ...prev,
                        value: value,
                      }))
                    }
                  />
                ) : (
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      placeholder="Token ID"
                      value={newPrize.tokenId || ""}
                      onChange={(e) =>
                        setNewPrize((prev) => ({
                          ...prev,
                          tokenId: Number(e.target.value),
                        }))
                      }
                      className="w-[150px]"
                    />
                    <Input
                      type="number"
                      placeholder="Position"
                      min={1}
                      max={leaderboardSize}
                      value={newPrize.position || ""}
                      onChange={(e) =>
                        setNewPrize((prev) => ({
                          ...prev,
                          position: Number(e.target.value),
                        }))
                      }
                      className="w-[100px]"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {newPrize.tokenAddress && (
            <>
              {/* Distribution Settings (for ERC20 only) */}
              {isERC20 && (
                <>
                  <div className="space-y-2">
                    <div className="flex flex-row items-center gap-2">
                      <span className="min-w-[100px]">Distribution</span>
                      <span className="text-sm text-neutral">
                        Adjust the spread of the distribution
                      </span>
                    </div>
                    <div className="flex flex-row items-center gap-4">
                      <Slider
                        min={0}
                        max={5}
                        step={0.1}
                        value={[distributionWeight]}
                        onValueChange={([value]) => {
                          setDistributionWeight(value);
                          const distributions = calculateDistribution(
                            leaderboardSize,
                            value
                          );
                          setPrizeDistributions(
                            distributions.map((percentage, index) => ({
                              position: index + 1,
                              percentage,
                            }))
                          );
                        }}
                        className="w-[200px] h-10"
                      />
                      <span className="w-12 text-center">
                        {distributionWeight.toFixed(1)}
                      </span>
                      <div className="flex flex-row gap-2 items-center justify-between text-sm text-muted-foreground">
                        <span>Total: {totalDistributionPercentage}%</span>
                        {totalDistributionPercentage !== 100 && (
                          <span className="text-destructive">
                            Total must equal 100%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="w-full overflow-hidden">
                    <div className="flex flex-row gap-4 overflow-x-auto pb-2">
                      {Array.from({
                        length: leaderboardSize,
                      }).map((_, index) => (
                        <div
                          key={index}
                          className="w-[175px] min-w-[175px] flex flex-row items-center justify-between flex-shrink-0 border border-neutral rounded-md p-2"
                        >
                          <span className="font-brand text-lg">
                            {index + 1}
                            {getOrdinalSuffix(index + 1)}
                          </span>

                          <div className="relative w-[50px]">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              className="pr-4 px-1"
                              onChange={(e) => {
                                const value = Number(e.target.value);
                                setPrizeDistributions((prev) =>
                                  prev.map((item) =>
                                    item.position === index + 1
                                      ? { ...item, percentage: value }
                                      : item
                                  )
                                );
                              }}
                              value={
                                prizeDistributions[index]?.percentage || ""
                              }
                            />
                            <span className="absolute right-1 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                              %
                            </span>
                          </div>

                          <div className="flex flex-col">
                            <div className="flex flex-row items-center gap-1">
                              <span className="text-xs">
                                {formatNumber(
                                  ((prizeDistributions[index]?.percentage ??
                                    0) *
                                    (newPrize.amount ?? 0)) /
                                    100
                                )}
                              </span>
                              <img
                                src={getTokenLogoUrl(
                                  chainId,
                                  newPrize.tokenAddress
                                )}
                                className="w-4 h-4 rounded-full"
                              />
                            </div>
                            {prices?.[
                              getTokenSymbol(chainId, newPrize.tokenAddress) ??
                                ""
                            ] && (
                              <span className="text-xs text-neutral">
                                ~$
                                {(
                                  ((prizeDistributions[index]?.percentage ??
                                    0) *
                                    (newPrize.value ?? 0)) /
                                  100
                                ).toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <DialogFooter className="flex flex-row justify-between w-full overflow-hidden">
          <div className="w-1/2 overflow-hidden">
            <div className="flex flex-row gap-2 overflow-x-auto pb-2">
              {currentPrizes.map((prize, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-background/50 border border-brand-muted/50 rounded flex-shrink-0"
                >
                  <span className="font-brand">
                    {prize.position}
                    {getOrdinalSuffix(prize.position ?? 0)}
                  </span>

                  <div className="flex flex-row items-center gap-2">
                    {prize.tokenType === "ERC20" ? (
                      <div className="flex flex-row items-center gap-1">
                        <div className="flex flex-row gap-1 items-center">
                          <span>{formatNumber(prize.amount ?? 0)}</span>
                          <img
                            src={getTokenLogoUrl(chainId, prize.tokenAddress)}
                            className="w-6 h-6 rounded-full flex-shrink-0"
                            alt="Token logo"
                          />
                        </div>

                        <span className="text-sm text-neutral">
                          {pricesLoading
                            ? "Loading..."
                            : prices?.[
                                getTokenSymbol(chainId, prize.tokenAddress) ??
                                  ""
                              ] &&
                              `~$${(
                                (prize.amount ?? 0) *
                                (prices?.[
                                  getTokenSymbol(chainId, prize.tokenAddress) ??
                                    ""
                                ] ?? 0)
                              ).toFixed(2)}`}
                        </span>
                      </div>
                    ) : (
                      <span className="whitespace-nowrap">
                        #{prize.tokenId}
                      </span>
                    )}

                    {/* Delete button */}
                    <span
                      className="w-6 h-6 text-brand-muted cursor-pointer flex-shrink-0"
                      onClick={() => {
                        const newPrizes = [...currentPrizes];
                        newPrizes.splice(index, 1);
                        setCurrentPrizes(newPrizes);
                      }}
                    >
                      <X />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="w-1/2 flex justify-end items-center gap-2">
            <Button
              type="button"
              disabled={!isValidPrize() || isSubmitting}
              onClick={handleAddPrizes}
            >
              {isSubmitting ? "Adding..." : "Add Prize"}
            </Button>
            {currentPrizes.length > 0 &&
              (address ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOnConfirmation(true)}
                >
                  Review & Submit
                </Button>
              ) : (
                <Button onClick={() => connect()}>Connect Wallet</Button>
              ))}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
