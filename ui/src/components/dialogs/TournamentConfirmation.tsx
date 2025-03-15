import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TournamentFormData } from "@/containers/CreateTournament";
import { format } from "date-fns";
import TokenGameIcon from "@/components/icons/TokenGameIcon";
import { ALERT, EXTERNAL_LINK } from "@/components/Icons";
import { useAccount } from "@starknet-react/core";
import { useConnectToSelectedChain } from "@/dojo/hooks/useChain";
import useUIStore from "@/hooks/useUIStore";
import {
  feltToString,
  formatNumber,
  formatTime,
  getOrdinalSuffix,
  displayAddress,
} from "@/lib/utils";
import { getTokenLogoUrl, getTokenSymbol } from "@/lib/tokensMeta";
import { useEkuboPrices } from "@/hooks/useEkuboPrices";
import { Settings } from "@/generated/models.gen";
import { useGameEndpoints } from "@/dojo/hooks/useGameEndpoints";
import { useGetGameSettingsQuery } from "@/dojo/hooks/useSdkQueries";
import { useDojoStore } from "@/dojo/hooks/useDojoStore";
import { SettingsDetails } from "@/generated/models.gen";
import { useMemo } from "react";
import { useDojo } from "@/context/dojo";
// import { calculateTotalValue } from "@/lib/utils/formatting";

interface TournamentConfirmationProps {
  formData: TournamentFormData;
  onConfirm: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TournamentConfirmation = ({
  formData,
  onConfirm,
  open,
  onOpenChange,
}: TournamentConfirmationProps) => {
  const { address } = useAccount();
  const { connect } = useConnectToSelectedChain();
  const { selectedChainConfig } = useDojo();
  const { gameData } = useUIStore();
  const { gameNamespace, gameSettingsModel } = useGameEndpoints(formData.game);
  useGetGameSettingsQuery(gameNamespace ?? "", gameSettingsModel ?? "");
  const settingsDetails = useDojoStore((state) =>
    state.getEntitiesByModel(gameNamespace ?? "", "SettingsDetails")
  );
  const settings = useDojoStore((state) =>
    state.getEntitiesByModel(gameNamespace ?? "", "Settings")
  );

  const settingsEntities = [...settingsDetails, ...settings];

  const mergedGameSettings = useMemo(() => {
    if (!settingsEntities) return {};

    return settingsEntities.reduce(
      (acc, entity) => {
        const details = entity.models[gameNamespace ?? ""]
          .SettingsDetails as SettingsDetails;
        const settings = entity.models[gameNamespace ?? ""]
          .Settings as Settings;
        const detailsId = details.id.toString();

        // If this details ID doesn't exist yet, create it
        if (!acc[detailsId]) {
          acc[detailsId] = {
            ...details,
            hasSettings: false,
            settings: [],
          };
        }

        // If we have settings, add them to the array and set hasSettings to true
        if (settings) {
          acc[detailsId].settings.push(settings);
          acc[detailsId].hasSettings = true;
        }

        return acc;
      },
      {} as Record<
        string,
        SettingsDetails & {
          hasSettings: boolean;
          settings: Settings[];
        }
      >
    );
  }, [settingsEntities, formData.game]);

  const hasBonusPrizes =
    formData.bonusPrizes && formData.bonusPrizes.length > 0;

  const { prices, isLoading: _pricesLoading } = useEkuboPrices({
    tokens: [
      ...(formData.bonusPrizes?.map(
        (prize) => getTokenSymbol(prize.tokenAddress) ?? ""
      ) ?? []),
      ...(formData.entryFees?.tokenAddress
        ? [formData.entryFees.tokenAddress]
        : []),
    ],
  });

  const hasSettings = mergedGameSettings[formData.settings];

  const currentTime = BigInt(new Date().getTime()) / 1000n;
  const startTime = BigInt(formData.startTime.getTime()) / 1000n;

  const isStartTimeValid =
    formData.type === "fixed" ? startTime - currentTime >= 900n : true;
  const isDurationValid = formData.duration >= 900n;

  const convertedEntryFees = useMemo(() => {
    return formData.entryFees?.prizeDistribution?.map((prize) => {
      return {
        type: "ERC20",
        tokenAddress: formData.entryFees?.tokenAddress ?? "",
        position: prize.position,
        amount: (prize.percentage * (formData.entryFees?.amount ?? 0)) / 100,
      };
    });
  }, [formData.entryFees]);

  // const totalPrizesValueUSD = calculateTotalValue(
  //   groupedByTokensPrizes,
  //   prices,
  //   allPricesFound
  // );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            <div className="flex flex-row gap-2 items-center">
              <span className="w-8 h-8">
                <ALERT />
              </span>
              Confirm Tournament Details
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto sm:p-6 pt-2 max-h-[60vh]">
          <div className="space-y-6">
            {/* Details Section */}
            <div className="space-y-2">
              <h3 className="font-bold text-lg">Tournament Details</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Name:</span>
                <span>{formData.name}</span>
                <span className="text-muted-foreground">Description:</span>
                <span className="whitespace-pre-wrap">
                  {formData.description}
                </span>
                <span className="text-muted-foreground">Game:</span>
                <div className="flex flex-row items-center gap-2">
                  <TokenGameIcon game={formData.game} />
                  <span>
                    {feltToString(
                      gameData.find(
                        (game) => game.contract_address === formData.game
                      )?.name ?? ""
                    )}
                  </span>
                </div>
                <span className="text-muted-foreground">Settings:</span>
                <span>
                  {hasSettings ? feltToString(hasSettings.name) : "Default"}
                </span>
                <span className="text-muted-foreground">Leaderboard Size:</span>
                <span>{formData.leaderboardSize}</span>
              </div>
            </div>

            <div className="w-full h-0.5 bg-brand/25 mt-2" />

            {/* Schedule Section */}
            <div className="space-y-2">
              <div className="flex flex-row justify-between items-center">
                <h3 className="font-bold text-lg">Schedule</h3>
                {!isStartTimeValid && (
                  <div className="flex flex-row gap-2 items-center text-destructive">
                    <span className="w-6">
                      <ALERT />
                    </span>
                    Registration period is less than 15 minutes
                  </div>
                )}
                {!isDurationValid && (
                  <span className="flex flex-row gap-2 items-center text-destructive">
                    <span className="w-6">
                      <ALERT />
                    </span>
                    Tournament duration is less than 15 minutes
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">
                  Registration Type:
                </span>
                <span className="capitalize">{formData.type}</span>
                <span className="text-muted-foreground">Start Time:</span>
                <div className="flex flex-col">
                  <span className="font-semibold">
                    {format(formData.startTime, "PPP")}
                  </span>
                  <span>{format(formData.startTime, "p")}</span>
                </div>
                <span className="text-muted-foreground">Duration:</span>
                <span>{formatTime(formData.duration)}</span>
              </div>
            </div>

            {/* Entry Requirements */}
            {formData.enableGating && formData.gatingOptions && (
              <>
                <div className="w-full h-0.5 bg-brand/25 mt-2" />
                <div className="space-y-2">
                  <h3 className="font-bold text-lg">Entry Requirements</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="capitalize">
                      {formData.gatingOptions.type}
                    </span>
                    {formData.gatingOptions.type === "token" ? (
                      <></>
                    ) : formData.gatingOptions.type === "tournament" ? (
                      <>
                        <span className="text-muted-foreground">
                          Requirement:
                        </span>
                        <span className="capitalize">
                          {formData.gatingOptions.tournament?.requirement}
                        </span>
                        <span>Total Tournaments:</span>
                        <span>
                          {
                            formData.gatingOptions.tournament?.tournaments
                              ?.length
                          }
                        </span>
                        <span>Tournaments:</span>
                        <table className="table-auto col-span-2 w-full">
                          <thead>
                            <tr>
                              <th className="px-4 py-2 text-left">Name</th>
                              <th className="px-4 py-2 text-left">Game</th>
                              <th className="px-4 py-2 text-left">Winners</th>
                            </tr>
                          </thead>
                          <tbody>
                            {formData.gatingOptions.tournament?.tournaments?.map(
                              (tournament) => (
                                <tr key={tournament.metadata.name}>
                                  <td className="px-4 capitalize">
                                    {feltToString(tournament.metadata.name)}
                                  </td>
                                  <td className="px-4 capitalize">
                                    <div className="flex flex-row items-center gap-2">
                                      <TokenGameIcon
                                        game={tournament.game_config.address}
                                      />
                                      {feltToString(
                                        gameData.find(
                                          (game) =>
                                            game.contract_address ===
                                            tournament.game_config.address
                                        )?.name ?? ""
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 capitalize">
                                    {Number(tournament.game_config.prize_spots)}
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </>
                    ) : (
                      <>
                        <span>Addresses:</span>
                        <div className="flex flex-col gap-1">
                          {formData.gatingOptions.addresses?.map(
                            (address, index) => (
                              <div
                                key={index}
                                className="flex flex-row items-center gap-2"
                              >
                                <span>{index + 1}.</span>
                                <span>{displayAddress(address)}</span>
                                <a
                                  href={`${selectedChainConfig.blockExplorerUrl}/${address}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-6"
                                >
                                  <EXTERNAL_LINK />
                                </a>
                              </div>
                            )
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Entry Fees */}
            {formData.enableEntryFees && formData.entryFees && (
              <>
                <div className="w-full h-0.5 bg-brand/25 mt-2" />
                <div className="space-y-2">
                  <div className="flex flex-row justify-between items-center">
                    <h3 className="font-bold text-lg">Entry Fees</h3>
                    <div className="flex flex-row items-center gap-2">
                      <span className="font-bold text-lg">Total:</span>
                      <div className="flex flex-row items-center gap-2">
                        <span>
                          {formatNumber(formData.entryFees.amount ?? 0)}
                        </span>
                        <span className="text-neutral">
                          ~${formData.entryFees.value?.toFixed(2) ?? "0.00"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Creator Fee:</span>
                    <div className="flex flex-row items-center gap-2">
                      <span>{formData.entryFees.creatorFeePercentage}%</span>
                      <span className="text-neutral">
                        ~$
                        {(
                          ((formData.entryFees.creatorFeePercentage ?? 0) *
                            (formData.entryFees.value ?? 0)) /
                          100
                        )?.toFixed(2) ?? "0.00"}
                      </span>
                    </div>
                    <span className="text-muted-foreground">Game Fee:</span>
                    <div className="flex flex-row items-center gap-2">
                      <span>{formData.entryFees.gameFeePercentage}%</span>
                      <span className="text-neutral">
                        ~$
                        {(
                          ((formData.entryFees.gameFeePercentage ?? 0) *
                            (formData.entryFees.value ?? 0)) /
                          100
                        )?.toFixed(2) ?? "0.00"}
                      </span>
                    </div>
                    <span>Payouts:</span>
                    <div className="flex flex-col col-span-2 gap-2">
                      {convertedEntryFees?.map((prize, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border border-brand-muted rounded-md"
                        >
                          <span className="font-brand w-10">
                            {`${prize.position}${getOrdinalSuffix(
                              prize.position
                            )}`}
                            :
                          </span>
                          <div className="flex flex-row gap-2 items-center">
                            <span>{formatNumber(prize.amount)}</span>
                            <img
                              src={getTokenLogoUrl(prize.tokenAddress)}
                              alt={prize.tokenAddress}
                              className="w-4 h-4"
                            />
                            <span className="text-neutral">
                              {prices?.[
                                getTokenSymbol(prize.tokenAddress) ?? ""
                              ] &&
                                `~$${(
                                  prize.amount *
                                  (prices?.[
                                    getTokenSymbol(prize.tokenAddress) ?? ""
                                  ] ?? 0)
                                ).toFixed(2)}`}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Bonus Prizes */}
            {formData.enableBonusPrizes && hasBonusPrizes && (
              <>
                <div className="w-full h-0.5 bg-brand/25 mt-2" />
                <div className="space-y-2">
                  <div className="flex flex-row justify-between items-center">
                    <h3 className="font-bold text-lg">Bonus Prizes</h3>
                    <span className="text-muted-foreground">
                      {formData.bonusPrizes?.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {formData.bonusPrizes?.map((prize, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border border-brand-muted rounded-md"
                      >
                        <span className="font-brand w-10">
                          {`${prize.position}${getOrdinalSuffix(
                            prize.position
                          )}`}
                          :
                        </span>
                        {prize.type === "ERC20" ? (
                          <div className="flex flex-row gap-2 items-center">
                            <span>{formatNumber(prize.amount)}</span>
                            <img
                              src={getTokenLogoUrl(prize.tokenAddress)}
                              alt={prize.tokenAddress}
                              className="w-4 h-4"
                            />
                            <span className="text-neutral">
                              {prices?.[
                                getTokenSymbol(prize.tokenAddress) ?? ""
                              ] &&
                                `~$${(
                                  prize.amount *
                                  (prices?.[
                                    getTokenSymbol(prize.tokenAddress) ?? ""
                                  ] ?? 0)
                                ).toFixed(2)}`}
                            </span>
                          </div>
                        ) : (
                          <span>NFT ID: {prize.tokenId}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 sm:mt-4 2xl:mt-6">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          {address ? (
            <DialogClose asChild>
              <Button
                onClick={onConfirm}
                disabled={!isStartTimeValid || !isDurationValid}
              >
                Confirm & Create
              </Button>
            </DialogClose>
          ) : (
            <Button onClick={() => connect()}>Connect Wallet</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TournamentConfirmation;
