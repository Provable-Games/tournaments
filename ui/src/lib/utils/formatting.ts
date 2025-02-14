import { TournamentFormData } from "@/containers/CreateTournament";
import { bigintToHex, stringToFelt } from "@/lib/utils";
import {
  addAddressPadding,
  CairoOption,
  CairoOptionVariant,
  CairoCustomEnum,
} from "starknet";
import { Prize, Tournament, Token } from "@/generated/models.gen";

const SECONDS_IN_DAY = 86400;
const SECONDS_IN_HOUR = 3600;

export const processTournamentData = (
  formData: TournamentFormData,
  address: string,
  tournamentCount: number
): Tournament => {
  const startTimestamp = Math.floor(
    formData.startTime.getTime() / 1000 -
      formData.startTime.getTimezoneOffset() * 60
  );

  const currentTime = Number(BigInt(new Date().getTime()) / 1000n + 60n);

  // End time is start time + duration in days
  const endTimestamp = startTimestamp + formData.duration * SECONDS_IN_DAY;

  // Process entry requirement based on type and requirement
  let entryRequirement;
  if (formData.enableGating && formData.gatingOptions?.type) {
    switch (formData.gatingOptions.type) {
      case "token":
        entryRequirement = new CairoCustomEnum({
          token: formData.gatingOptions.token,
          tournament: undefined,
          allowlist: undefined,
        });
        break;
      case "tournament":
        entryRequirement = new CairoCustomEnum({
          token: undefined,
          tournament: {
            winners:
              formData.gatingOptions.tournament?.requirement === "won"
                ? formData.gatingOptions.tournament.ids
                : [],
            participants:
              formData.gatingOptions.tournament?.requirement === "participated"
                ? formData.gatingOptions.tournament.ids
                : [],
          },
          allowlist: undefined,
        });
        break;
      case "addresses":
        entryRequirement = new CairoCustomEnum({
          token: undefined,
          tournament: undefined,
          allowlist: formData.gatingOptions.addresses,
        });
        break;
    }
  }

  return {
    id: tournamentCount + 1,
    creator: addAddressPadding(address),
    metadata: {
      name: addAddressPadding(bigintToHex(stringToFelt(formData.name))),
      description: formData.description,
    },
    schedule: {
      registration:
        formData.type === "fixed"
          ? new CairoOption(CairoOptionVariant.Some, {
              start: currentTime,
              end: startTimestamp,
            })
          : new CairoOption(CairoOptionVariant.None),
      game: {
        start: startTimestamp,
        end: endTimestamp,
      },
      submission_duration: Number(formData.submissionPeriod) * SECONDS_IN_HOUR,
    },
    game_config: {
      address: addAddressPadding(formData.game),
      settings_id: 0,
      prize_spots: formData.leaderboardSize,
    },
    entry_fee: formData.enableEntryFees
      ? new CairoOption(CairoOptionVariant.Some, {
          token_address: formData.entryFees?.tokenAddress!,
          amount: addAddressPadding(
            bigintToHex(formData.entryFees?.amount! * 10 ** 18)
          ),
          distribution: formData.entryFees?.prizeDistribution?.map(
            (prize) => prize.percentage
          )!,
          tournament_creator_share: new CairoOption(
            CairoOptionVariant.Some,
            formData.entryFees?.creatorFeePercentage
          ),
          game_creator_share: new CairoOption(
            CairoOptionVariant.Some,
            formData.entryFees?.gameFeePercentage
          ),
        })
      : new CairoOption(CairoOptionVariant.None),
    entry_requirement: formData.enableGating
      ? new CairoOption(CairoOptionVariant.Some, entryRequirement)
      : new CairoOption(CairoOptionVariant.None),
  };
};

export const processPrizes = (
  formData: TournamentFormData,
  tournamentCount: number,
  prizeCount: number
): Prize[] => {
  if (!formData.enableBonusPrizes || !formData.bonusPrizes?.length) {
    return [];
  }

  return formData.bonusPrizes.map((prize, _) => ({
    id: prizeCount + 1,
    tournament_id: tournamentCount + 1,
    token_address: prize.tokenAddress,
    token_type:
      prize.type === "ERC20"
        ? new CairoCustomEnum({
            erc20: {
              amount: addAddressPadding(bigintToHex(prize.amount! * 10 ** 18)),
            },
            erc721: undefined,
          })
        : new CairoCustomEnum({
            erc20: undefined,
            erc721: {
              token_id: addAddressPadding(bigintToHex(prize.tokenId!)),
            },
          }),
    payout_position: prize.position,
    claimed: false,
  }));
};

export const groupPrizesByPositions = (prizes: Prize[], tokens: Token[]) =>
  [...prizes]
    .sort((a, b) => Number(a.payout_position) - Number(b.payout_position))
    .reduce(
      (acc, prize) => {
        const position = prize.payout_position.toString();
        const tokenModel = tokens.find(
          (t) => t.address === prize.token_address
        );

        // Skip if we can't find the token model
        if (!tokenModel?.symbol) {
          console.warn(
            `No token model found for address ${prize.token_address}`
          );
          return acc;
        }

        const tokenSymbol = tokenModel.symbol;

        if (!acc[position]) {
          acc[position] = {};
        }

        if (!acc[position][tokenSymbol]) {
          acc[position][tokenSymbol] = {
            type: prize.token_type.variant.erc721 ? "erc721" : "erc20",
            payout_position: position,
            address: prize.token_address,
            value: prize.token_type.variant.erc721 ? [] : 0n,
          };
        }

        if (prize.token_type.activeVariant() === "erc721") {
          (acc[position][tokenSymbol].value as bigint[]).push(
            BigInt(prize.token_type.variant.erc721.id)
          );
        } else if (prize.token_type.activeVariant() === "erc20") {
          const currentAmount = acc[position][tokenSymbol].value as bigint;
          const newAmount = BigInt(prize.token_type.variant.erc20.amount);
          console.log(tokenSymbol, currentAmount, newAmount);
          acc[position][tokenSymbol].value =
            (currentAmount + newAmount) / 10n ** 18n;
        }

        return acc;
      },
      {} as Record<
        string,
        Record<
          string,
          {
            type: "erc20" | "erc721";
            payout_position: string;
            address: string;
            value: bigint[] | bigint;
          }
        >
      >
    );

export const groupPrizesByTokens = (prizes: Prize[], tokens: Token[]) =>
  prizes.reduce(
    (acc, prize) => {
      const tokenModel = tokens.find((t) => t.address === prize.token_address);
      const tokenSymbol = tokenModel?.symbol!;

      if (!acc[tokenSymbol]) {
        acc[tokenSymbol] = {
          type: prize.token_type.variant.erc721 ? "erc721" : "erc20",
          payout_position: prize.payout_position.toString(),
          address: prize.token_address,
          value: prize.token_type.variant.erc721 ? [] : 0n,
        };
      }

      if (prize.token_type.activeVariant() === "erc721") {
        // For ERC721, push the token ID to the array
        (acc[tokenSymbol].value as bigint[]).push(
          BigInt(prize.token_type.variant.erc721.id!)
        );
      } else if (prize.token_type.activeVariant() === "erc20") {
        // For ERC20, sum up the values
        const currentAmount = acc[tokenSymbol].value as bigint;
        const newAmount = BigInt(prize.token_type.variant.erc20.amount);
        acc[tokenSymbol].value = (currentAmount + newAmount) / 10n ** 18n;
      }

      return acc;
    },
    {} as Record<
      string,
      {
        type: "erc20" | "erc721";
        payout_position: string;
        address: string;
        value: bigint[] | bigint;
      }
    >
  );

export const getErc20TokenSymbols = (
  groupedPrizes: Record<
    string,
    {
      type: "erc20" | "erc721";
      payout_position: string;
      address: string;
      value: bigint[] | bigint;
    }
  >
) => {
  return Object.entries(groupedPrizes)
    .filter(([_, prize]) => prize.type === "erc20")
    .map(([symbol, _]) => symbol);
};

export const calculateTotalValue = (
  groupedPrizes: Record<
    string,
    {
      type: "erc20" | "erc721";
      payout_position: string;
      address: string;
      value: bigint[] | bigint;
    }
  >,
  prices: Record<string, bigint | undefined>
) => {
  return Object.entries(groupedPrizes)
    .filter(([_, prize]) => prize.type === "erc20")
    .reduce((total, [symbol, prize]) => {
      const price = prices[symbol] || 1n;
      const amount = prize.value as bigint;
      return total + Number(price * amount);
    }, 0);
};

export const countTotalNFTs = (
  groupedPrizes: ReturnType<typeof groupPrizesByTokens>
) => {
  return Object.entries(groupedPrizes)
    .filter(([_, prize]) => prize.type === "erc721")
    .reduce((total, [_, prize]) => {
      return total + (prize.value as bigint[]).length;
    }, 0);
};
