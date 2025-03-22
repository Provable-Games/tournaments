import { TournamentFormData } from "@/containers/CreateTournament";
import { bigintToHex, stringToFelt } from "@/lib/utils";
import {
  addAddressPadding,
  CairoOption,
  CairoOptionVariant,
  CairoCustomEnum,
  BigNumberish,
} from "starknet";
import {
  Prize,
  Tournament,
  Token,
  EntryFee,
  PrizeClaim,
  Leaderboard,
  QualificationProofEnum,
} from "@/generated/models.gen";
import { PositionPrizes, TokenPrizes } from "@/lib/types";
import { TokenPrices } from "@/hooks/useEkuboPrices";

export const processTournamentData = (
  formData: TournamentFormData,
  address: string,
  tournamentCount: number
): Tournament => {
  const startTimestamp = Math.floor(
    Date.UTC(
      formData.startTime.getUTCFullYear(),
      formData.startTime.getUTCMonth(),
      formData.startTime.getUTCDate(),
      formData.startTime.getUTCHours(),
      formData.startTime.getUTCMinutes(),
      formData.startTime.getUTCSeconds()
    ) / 1000
  );

  const currentTime = Math.floor(Date.now() / 1000) + 60;

  // End time is start time + duration in seconds
  const endTimestamp = startTimestamp + formData.duration;

  // Process entry requirement based on type and requirement
  let entryRequirementType;
  if (formData.enableGating && formData.gatingOptions?.type) {
    switch (formData.gatingOptions.type) {
      case "token":
        entryRequirementType = new CairoCustomEnum({
          token: formData.gatingOptions.token,
          tournament: undefined,
          allowlist: undefined,
        });
        break;
      case "tournament":
        entryRequirementType = new CairoCustomEnum({
          token: undefined,
          tournament: new CairoCustomEnum({
            winners:
              formData.gatingOptions.tournament?.requirement === "won"
                ? formData.gatingOptions.tournament.tournaments.map((t) => t.id)
                : undefined,
            participants:
              formData.gatingOptions.tournament?.requirement === "participated"
                ? formData.gatingOptions.tournament.tournaments.map((t) => t.id)
                : undefined,
          }),
          allowlist: undefined,
        });
        break;
      case "addresses":
        entryRequirementType = new CairoCustomEnum({
          token: undefined,
          tournament: undefined,
          allowlist: formData.gatingOptions.addresses,
        });
        break;
    }
  }

  let entryRequirement;
  if (formData.enableGating && entryRequirementType) {
    entryRequirement = {
      entry_limit: formData.enableEntryLimit
        ? new CairoOption<BigNumberish>(
            CairoOptionVariant.Some,
            formData.gatingOptions?.entry_limit
          )
        : new CairoOption<BigNumberish>(CairoOptionVariant.None),
      entry_requirement_type: entryRequirementType,
    };
  }

  return {
    id: tournamentCount + 1,
    created_at: 0,
    created_by: addAddressPadding(address),
    creator_token_id: 0,
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
      submission_duration: Number(formData.submissionPeriod),
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
              id: addAddressPadding(bigintToHex(prize.tokenId!)),
            },
          }),
    payout_position: prize.position,
    claimed: false,
  }));
};

export const getSubmittableScores = (
  currentLeaderboard: any[],
  leaderboard: Leaderboard
) => {
  const submittedTokenIds = leaderboard?.token_ids ?? [];
  const leaderboardWithPositions = currentLeaderboard.map((score, index) => ({
    ...score,
    position: index + 1,
  }));
  // if no scores have been submitted then we can submit the whole leaderboard
  const newSubmissions = leaderboardWithPositions.map((score) => ({
    tokenId: score.game_token_id,
    position: score.position,
  }));
  if (submittedTokenIds.length === 0) {
    return newSubmissions;
  } else {
    // TODO: Handle the case where some scores have been submitted
    // const submittedScores = submittedTokenIds.map((tokenId, index) => ({
    //   tokenId: tokenId,
    //   position: index + 1,
    // }));
    // const correctlySubmittedScores = submittedScores.filter((score) =>
    //   leaderboardWithPositions.some(
    //     (position) => position.tokenId === score.tokenId
    //   )
    // );
    return [];
  }
};

export const extractEntryFeePrizes = (
  tournamentId: BigNumberish,
  entryFee: CairoOption<EntryFee>,
  entryCount: BigNumberish
): {
  tournamentCreatorShare: Prize[];
  gameCreatorShare: Prize[];
  distributionPrizes: Prize[];
} => {
  if (!entryFee?.isSome()) {
    return {
      tournamentCreatorShare: [],
      gameCreatorShare: [],
      distributionPrizes: [],
    };
  }
  const totalFeeAmount = BigInt(entryFee.Some?.amount!) * BigInt(entryCount);

  if (totalFeeAmount === 0n) {
    return {
      tournamentCreatorShare: [],
      gameCreatorShare: [],
      distributionPrizes: [],
    };
  }

  const gameCreatorShare = entryFee.Some?.game_creator_share?.isSome()
    ? [
        {
          id: 0,
          tournament_id: tournamentId,
          payout_position: 0,
          token_address: entryFee.Some?.token_address!,
          token_type: new CairoCustomEnum({
            erc20: {
              amount: addAddressPadding(
                bigintToHex(
                  (totalFeeAmount *
                    BigInt(entryFee?.Some.game_creator_share?.Some!)) /
                    100n
                )
              ),
            },
            erc721: undefined,
          }),
          type: "entry_fee_game_creator",
        } as Prize,
      ]
    : [];

  const tournamentCreatorShare =
    entryFee.Some?.tournament_creator_share?.isSome()
      ? [
          {
            id: 0,
            tournament_id: tournamentId,
            payout_position: 0,
            token_address: entryFee.Some?.token_address!,
            token_type: new CairoCustomEnum({
              erc20: {
                amount: addAddressPadding(
                  bigintToHex(
                    (totalFeeAmount *
                      BigInt(entryFee?.Some.tournament_creator_share?.Some!)) /
                      100n
                  )
                ),
              },
              erc721: undefined,
            }),
            type: "entry_fee_tournament_creator",
          } as Prize,
        ]
      : [];

  const distrbutionPrizes =
    entryFee.Some?.distribution
      ?.map((distribution, index) => {
        // Skip zero distributions
        if (distribution === 0) return null;

        const amount = (totalFeeAmount * BigInt(distribution)) / 100n;

        return {
          id: 0,
          tournament_id: tournamentId,
          payout_position: index + 1,
          token_address: entryFee.Some?.token_address!,
          token_type: new CairoCustomEnum({
            erc20: {
              amount: addAddressPadding(bigintToHex(amount)),
            },
            erc721: undefined,
          }),
          type: "entry_fee",
        } as Prize;
      })
      .filter((prize) => prize !== null) || []; // Filter out null entries

  return {
    tournamentCreatorShare,
    gameCreatorShare,
    distributionPrizes: distrbutionPrizes,
  };
};

export const getClaimablePrizes = (
  prizes: any[],
  claimedPrizes: PrizeClaim[],
  totalSubmissions: number
) => {
  const creatorPrizeTypes = new Set([
    "entry_fee_game_creator",
    "entry_fee_tournament_creator",
  ]);

  const creatorPrizes = prizes.filter((prize) =>
    creatorPrizeTypes.has(prize.type)
  );
  const prizesFromSubmissions = prizes.filter(
    (prize) =>
      !creatorPrizeTypes.has(prize.type) &&
      prize.payout_position <= totalSubmissions
  );
  const claimedEntryFeePositions = claimedPrizes.map((prize) =>
    prize.prize_type?.activeVariant() === "EntryFees"
      ? prize.prize_type.variant.EntryFees?.variant?.Position
      : null
  );
  const claimedSponsoredPrizeKeys = claimedPrizes.map((prize) =>
    prize.prize_type?.activeVariant() === "Sponsored"
      ? prize.prize_type.variant.Sponsored
      : null
  );
  const allPrizes = [...creatorPrizes, ...prizesFromSubmissions];
  const unclaimedPrizes = allPrizes.filter((prize) => {
    if (prize.type === "entry_fee_game_creator") {
      return !claimedPrizes.some(
        (claimedPrize) =>
          claimedPrize.prize_type?.variant.EntryFees === "GameCreator"
      );
    } else if (prize.type === "entry_fee_tournament_creator") {
      return !claimedPrizes.some(
        (claimedPrize) =>
          claimedPrize.prize_type?.variant.EntryFees === "TournamentCreator"
      );
    } else if (prize.type === "entry_fee") {
      return !claimedEntryFeePositions.includes(prize.payout_position);
    } else {
      return !claimedSponsoredPrizeKeys.includes(prize.id);
    }
  });
  const unclaimedPrizeTypes = unclaimedPrizes.map((prize) => {
    if (prize.type === "entry_fee_game_creator") {
      return new CairoCustomEnum({
        EntryFees: new CairoCustomEnum({
          TournamentCreator: undefined,
          GameCreator: {},
          Position: undefined,
        }),
        Sponsored: undefined,
      });
    } else if (prize.type === "entry_fee_tournament_creator") {
      return new CairoCustomEnum({
        EntryFees: new CairoCustomEnum({
          TournamentCreator: {},
          GameCreator: undefined,
          Position: undefined,
        }),
        Sponsored: undefined,
      });
    } else if (prize.type === "entry_fee") {
      return new CairoCustomEnum({
        EntryFees: new CairoCustomEnum({
          TournamentCreator: undefined,
          GameCreator: undefined,
          Position: prize.payout_position,
        }),
        Sponsored: undefined,
      });
    } else {
      return new CairoCustomEnum({
        EntryFees: undefined,
        Sponsored: prize.id,
      });
    }
  });
  return {
    claimablePrizes: unclaimedPrizes,
    claimablePrizeTypes: unclaimedPrizeTypes,
  };
};

export const groupPrizesByPositions = (prizes: Prize[], tokens: Token[]) => {
  return prizes
    .filter((prize) => prize.payout_position !== 0)
    .sort((a, b) => Number(a.payout_position) - Number(b.payout_position))
    .reduce((acc, prize) => {
      const position = prize.payout_position.toString();
      const tokenModel = tokens.find((t) => t.address === prize.token_address);

      if (!tokenModel?.address) {
        console.warn(`No token model found for address ${prize.token_address}`);
        return acc;
      }

      const tokenAddress = tokenModel.address;

      if (!acc[position]) {
        acc[position] = {};
      }

      if (!acc[position][tokenAddress]) {
        acc[position][tokenAddress] = {
          type: prize.token_type.activeVariant() as "erc20" | "erc721",
          payout_position: position,
          address: prize.token_address,
          value: prize.token_type.activeVariant() === "erc721" ? [] : 0n,
        };
      }

      if (prize.token_type.activeVariant() === "erc721") {
        (acc[position][tokenAddress].value as bigint[]).push(
          BigInt(prize.token_type.variant.erc721.id!)
        );
      } else if (prize.token_type.activeVariant() === "erc20") {
        const currentAmount = acc[position][tokenAddress].value as bigint;
        const newAmount = BigInt(prize.token_type.variant.erc20.amount);
        acc[position][tokenAddress].value = currentAmount + newAmount;
      }

      return acc;
    }, {} as PositionPrizes);
};

export const groupPrizesByTokens = (prizes: Prize[], tokens: Token[]) => {
  return prizes.reduce((acc, prize) => {
    const tokenModel = tokens.find((t) => t.address === prize.token_address);
    const tokenAddress = tokenModel?.address;

    if (!tokenAddress) {
      console.warn(`No token model found for address ${prize.token_address}`);
      return acc;
    }

    if (!acc[tokenAddress]) {
      acc[tokenAddress] = {
        type: prize.token_type.activeVariant() as "erc20" | "erc721",
        address: prize.token_address,
        value: prize.token_type.activeVariant() === "erc721" ? [] : 0n,
      };
    }

    if (prize.token_type.activeVariant() === "erc721") {
      // For ERC721, push the token ID to the array
      (acc[tokenAddress].value as bigint[]).push(
        BigInt(prize.token_type.variant.erc721.id!)
      );
    } else if (prize.token_type.activeVariant() === "erc20") {
      // For ERC20, sum up the values
      const currentAmount = acc[tokenAddress].value as bigint;
      const newAmount = BigInt(prize.token_type.variant.erc20.amount);
      acc[tokenAddress].value = currentAmount + newAmount;
    }

    return acc;
  }, {} as TokenPrizes);
};

export const getErc20TokenAddresses = (
  groupedPrizes: Record<
    string,
    { type: "erc20" | "erc721"; value: bigint | bigint[] }
  >
) => {
  return Object.entries(groupedPrizes)
    .filter(([_, prize]) => prize.type === "erc20")
    .map(([address, _]) => address);
};

export const calculatePrizeValue = (
  prize: {
    type: "erc20" | "erc721";
    value: bigint[] | bigint;
  },
  address: string,
  prices: Record<string, number | undefined>
): number => {
  if (prize.type !== "erc20") return 0;

  const price = prices[address];
  const amount = Number(prize.value) / 10 ** 18;

  // If no price is available, just return the token amount
  if (price === undefined) return amount;

  // Otherwise calculate the value using the price
  return price * amount;
};

export const calculateTotalValue = (
  groupedPrizes: TokenPrizes,
  prices: TokenPrices,
  allPricesFound: boolean
) => {
  if (!allPricesFound) {
    return 0;
  }

  return Object.entries(groupedPrizes)
    .filter(([_, prize]) => prize.type === "erc20")
    .reduce((total, [address, prize]) => {
      const price = prices[address];
      const amount = Number(prize.value) / 10 ** 18;

      if (price === undefined) return total;

      return total + price * amount;
    }, 0);
};

export const countTotalNFTs = (groupedPrizes: TokenPrizes) => {
  return Object.entries(groupedPrizes)
    .filter(([_, prize]) => prize.type === "erc721")
    .reduce((total, [_, prize]) => {
      return total + (prize.value as bigint[]).length;
    }, 0);
};

export const processTournamentFromSql = (tournament: any): Tournament => {
  let entryRequirement;
  if (tournament["entry_requirement"] === "Some") {
    let entryRequirementType: CairoCustomEnum;

    switch (tournament["entry_requirement.Some.entry_requirement_type"]) {
      case "token":
        entryRequirementType = new CairoCustomEnum({
          token:
            tournament["entry_requirement.Some.entry_requirement_type.token"],
          tournament: undefined,
          allowlist: undefined,
        });
        break;
      case "tournament":
        entryRequirementType = new CairoCustomEnum({
          token: undefined,
          tournament: new CairoCustomEnum({
            winners:
              tournament[
                "entry_requirement.Some.entry_requirement_type.tournament"
              ] === "winners"
                ? tournament[
                    "entry_requirement.Some.entry_requirement_type.tournament.winners"
                  ]
                : undefined,
            participants:
              tournament[
                "entry_requirement.Some.entry_requirement_type.tournament"
              ] === "participants"
                ? tournament[
                    "entry_requirement.Some.entry_requirement_type.tournament.participants"
                  ]
                : undefined,
          }),
          allowlist: undefined,
        });
        break;
      case "allowlist":
        entryRequirementType = new CairoCustomEnum({
          token: undefined,
          tournament: undefined,
          allowlist:
            tournament[
              "entry_requirement.Some.entry_requirement_type.allowlist"
            ],
        });
        break;
      default:
        entryRequirementType = new CairoCustomEnum({
          token: undefined,
          tournament: undefined,
          allowlist: [],
        });
    }

    entryRequirement = {
      entry_limit:
        tournament["entry_requirement.Some.entry_limit"] === "Some"
          ? new CairoOption(
              CairoOptionVariant.Some,
              tournament["entry_requirement.Some.entry_limit.Some"]
            )
          : new CairoOption(CairoOptionVariant.None),
      entry_requirement_type: entryRequirementType,
    };
  }

  return {
    id: tournament.id,
    created_at: tournament.created_at,
    created_by: tournament.created_by,
    creator_token_id: tournament.creator_token_id,
    metadata: {
      name: tournament["metadata.name"],
      description: tournament["metadata.description"],
    },
    schedule: {
      registration:
        tournament["schedule.registration"] === "Some"
          ? new CairoOption(CairoOptionVariant.Some, {
              start: tournament["schedule.registration.Some.start"],
              end: tournament["schedule.registration.Some.end"],
            })
          : new CairoOption(CairoOptionVariant.None),
      game: {
        start: tournament["schedule.game.start"],
        end: tournament["schedule.game.end"],
      },
      submission_duration: tournament["schedule.submission_duration"],
    },
    game_config: {
      address: tournament["game_config.address"],
      settings_id: tournament["game_config.settings_id"],
      prize_spots: tournament["game_config.prize_spots"],
    },
    entry_fee:
      tournament["entry_fee"] === "Some"
        ? new CairoOption(CairoOptionVariant.Some, {
            token_address: tournament["entry_fee.Some.token_address"],
            amount: tournament["entry_fee.Some.amount"],
            distribution: JSON.parse(tournament["entry_fee.Some.distribution"]),
            tournament_creator_share:
              tournament["entry_fee.Some.tournament_creator_share"] === "Some"
                ? new CairoOption(
                    CairoOptionVariant.Some,
                    tournament["entry_fee.Some.tournament_creator_share.Some"]
                  )
                : new CairoOption(CairoOptionVariant.None),
            game_creator_share:
              tournament["entry_fee.Some.game_creator_share"] === "Some"
                ? new CairoOption(
                    CairoOptionVariant.Some,
                    tournament["entry_fee.Some.game_creator_share.Some"]
                  )
                : new CairoOption(CairoOptionVariant.None),
          })
        : new CairoOption(CairoOptionVariant.None),
    entry_requirement:
      tournament["entry_requirement"] === "Some"
        ? new CairoOption(CairoOptionVariant.Some, entryRequirement)
        : new CairoOption(CairoOptionVariant.None),
  };
};

export const processPrizesFromSql = (
  prizes: any,
  tournamentId: BigNumberish
): Prize[] => {
  return prizes
    ? prizes
        .split("|")
        .map((prizeStr: string) => {
          const prize = JSON.parse(prizeStr);
          return {
            id: prize.prizeId,
            tournament_id: tournamentId,
            payout_position: prize.position,
            token_address: prize.tokenAddress,
            token_type:
              prize.tokenType === "erc20"
                ? new CairoCustomEnum({
                    erc20: {
                      amount: prize.amount,
                    },
                    erc721: undefined,
                  })
                : new CairoCustomEnum({
                    erc20: undefined,
                    erc721: {
                      id: prize.amount,
                    },
                  }),
          };
        })
        .sort(
          (a: Prize, b: Prize) =>
            Number(a.payout_position) - Number(b.payout_position)
        )
    : null;
};

export const processQualificationProof = (
  requirementVariant: string,
  proof: any
): CairoOption<QualificationProofEnum> => {
  if (requirementVariant === "tournament") {
    const qualificationProof = new CairoCustomEnum({
      Tournament: {
        tournament_id: proof.tournamentId,
        token_id: proof.tokenId,
        position: proof.position,
      },
      NFT: undefined,
    }) as QualificationProofEnum;
    return new CairoOption(CairoOptionVariant.Some, qualificationProof);
  }

  if (requirementVariant === "token") {
    return new CairoOption(
      CairoOptionVariant.Some,
      new CairoCustomEnum({
        Tournament: undefined,
        NFT: {
          token_id: {
            low: proof.tokenId,
            high: "0",
          },
        },
      })
    );
  }

  // Default return for all other cases
  return new CairoOption(CairoOptionVariant.None);
};
