import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { useSystemCalls } from "@/dojo/hooks/useSystemCalls";
import { useAccount } from "@starknet-react/core";
import { Tournament, PrizeTypeEnum } from "@/generated/models.gen";
import { feltToString, formatNumber, getOrdinalSuffix } from "@/lib/utils";
import { useConnectToSelectedChain } from "@/dojo/hooks/useChain";
import { TokenPrices } from "@/hooks/useEkuboPrices";
import { getTokenLogoUrl, getTokenSymbol } from "@/lib/tokensMeta";
import { useDojo } from "@/context/dojo";

interface ClaimPrizesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentModel: Tournament;
  claimablePrizes: any[];
  claimablePrizeTypes: PrizeTypeEnum[];
  prices: TokenPrices;
}

export function ClaimPrizesDialog({
  open,
  onOpenChange,
  tournamentModel,
  claimablePrizes,
  claimablePrizeTypes,
  prices,
}: ClaimPrizesDialogProps) {
  const { address } = useAccount();
  const { connect } = useConnectToSelectedChain();
  const { claimPrizes } = useSystemCalls();
  const { selectedChainConfig } = useDojo();

  const chainId = selectedChainConfig?.chainId ?? "";

  const handleClaimPrizes = () => {
    claimPrizes(
      tournamentModel?.id,
      feltToString(tournamentModel?.metadata.name),
      claimablePrizeTypes
    );
  };

  const sortedClaimablePrizes = claimablePrizes.sort((a, b) => {
    return Number(a.payout_position) - Number(b.payout_position);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Distribute Prizes</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 px-5 py-2 max-h-[300px] overflow-y-auto">
          {sortedClaimablePrizes.map((prize, index) => {
            const prizeAmount =
              Number(prize.token_type.variant.erc20.amount) / 10 ** 18;
            const tokenPrice =
              prices[getTokenSymbol(chainId, prize.token_address) ?? ""] ?? 0;
            return (
              <div
                className="flex flex-row items-center justify-between"
                key={index}
              >
                <span className="text-brand-muted">
                  {prize.type === "entry_fee_game_creator"
                    ? "Game Creator Share"
                    : prize.type === "entry_fee_tournament_creator"
                    ? "Tournament Creator Share"
                    : `${prize.payout_position}${getOrdinalSuffix(
                        prize.payout_position
                      )} Place`}
                </span>
                <div className="flex flex-row items-center gap-2">
                  <span>{formatNumber(prizeAmount)}</span>
                  <img
                    src={getTokenLogoUrl(chainId, prize.token_address)}
                    className="w-6 h-6"
                  />
                  <span className="text-neutral">
                    ~${(prizeAmount * tokenPrice).toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          {address ? (
            <DialogClose asChild>
              <Button disabled={!address} onClick={handleClaimPrizes}>
                Distribute
              </Button>
            </DialogClose>
          ) : (
            <Button onClick={() => connect()}>Connect Wallet</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
