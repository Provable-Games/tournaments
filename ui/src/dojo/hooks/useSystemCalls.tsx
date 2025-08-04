import { useAccount } from "@starknet-react/core";
import { useDojo } from "@/context/dojo";
import {
  Tournament,
  Prize,
  Token,
  EntryFee,
  QualificationProofEnum,
  PrizeTypeEnum,
} from "@/generated/models.gen";
import {
  Account,
  BigNumberish,
  CairoOption,
  CallData,
  ByteArray,
  byteArray,
  Uint256,
  AccountInterface,
} from "starknet";
import { feltToString } from "@/lib/utils";
import { useTournamentContracts } from "@/dojo/hooks/useTournamentContracts";
import useUIStore from "@/hooks/useUIStore";
import { useToastMessages } from "@/components/toast";
import { useEntityUpdates } from "@/dojo/hooks/useEntityUpdates";

// Type for the transformed tournament
type ExecutableTournament = Omit<Tournament, "metadata"> & {
  metadata: Omit<Tournament["metadata"], "description"> & {
    description: ByteArray;
  };
};

// Helper function to transform Tournament to ExecutableTournament
const prepareForExecution = (tournament: Tournament): ExecutableTournament => {
  return {
    ...tournament,
    metadata: {
      ...tournament.metadata,
      description: byteArray.byteArrayFromString(
        tournament.metadata.description
      ),
    },
  };
};

export const useSystemCalls = () => {
  const { client } = useDojo();
  const { account, address } = useAccount();
  const { tournamentAddress } = useTournamentContracts();
  const { getGameName } = useUIStore();
  const {
    waitForTournamentCreation,
    waitForTournamentEntry,
    waitForAddPrizes,
    waitForSubmitScores,
  } = useEntityUpdates();
  const {
    showTournamentEntry,
    showScoreSubmission,
    showPrizeAddition,
    showPrizeDistribution,
    showTournamentCreation,
  } = useToastMessages();

  // Tournament

  const approveAndEnterTournament = async (
    entryFeeToken: CairoOption<EntryFee>,
    tournamentId: BigNumberish,
    tournamentName: string,
    tournamentModel: Tournament,
    player_name: ByteArray,
    player_address: BigNumberish,
    qualification: CairoOption<QualificationProofEnum>,
    duration: number,
    entryFeeUsdCost: number,
    entryCount: number
  ) => {
    const startsIn =
      Number(tournamentModel.schedule.game.start) - Date.now() / 1000;
    const game = getGameName(tournamentModel.game_config.address);
    try {
      let calls = [];
      if (entryFeeToken.isSome()) {
        calls.push({
          contractAddress: entryFeeToken.Some?.token_address!,
          entrypoint: "approve",
          calldata: CallData.compile([
            tournamentAddress,
            entryFeeToken.Some?.amount!,
            "0",
          ]),
        });
      }
      calls.push({
        contractAddress: tournamentAddress,
        entrypoint: "enter_tournament",
        calldata: CallData.compile([
          tournamentId,
          player_name,
          player_address,
          qualification,
        ]),
      });

      const tx = await account?.execute(calls);

      await waitForTournamentEntry(tournamentId, entryCount);

      if (tx) {
        showTournamentEntry({
          tournamentName,
          tournamentId: Number(tournamentId).toString(),
          game,
          entryFeeUsdCost,
          hasEntryFee: entryFeeToken.isSome(),
          startsIn,
          duration,
        });
      }
    } catch (error) {
      console.error("Error executing enter tournament:", error);
      throw error;
    }
  };

  const submitScores = async (
    tournamentId: BigNumberish,
    tournamentName: string,
    submissions: Array<{
      tokenId: BigNumberish;
      position: BigNumberish;
    }>
  ) => {
    try {
      let calls = [];
      for (const submission of submissions) {
        calls.push({
          contractAddress: tournamentAddress,
          entrypoint: "submit_score",
          calldata: CallData.compile([
            tournamentId,
            submission.tokenId,
            submission.position,
          ]),
        });
      }

      const tx = await account?.execute(calls);

      await waitForSubmitScores(tournamentId);

      if (tx) {
        showScoreSubmission(tournamentName);
      }
    } catch (error) {
      console.error("Error executing submit scores:", error);
      throw error;
    }
  };

  const approveAndAddPrizes = async (
    tournamentId: BigNumberish,
    tournamentName: string,
    prizes: Prize[],
    showToast: boolean,
    prizeTotalUsd: number,
    totalCurrentPrizes: number
  ) => {
    try {
      let calls = [];
      const summedCalls = Object.values(
        prizes.reduce((acc: { [key: string]: any }, prize) => {
          const tokenAddress = prize.token_address;
          if (!acc[tokenAddress]) {
            acc[tokenAddress] = {
              contractAddress: tokenAddress,
              entrypoint: "approve",
              calldata: CallData.compile([
                tournamentAddress,
                prize.token_type.variant.erc20?.amount!,
                "0",
              ]),
              totalAmount: BigInt(prize.token_type.variant.erc20?.amount! || 0),
            };
          } else {
            // Sum the amounts for the same token
            acc[tokenAddress].totalAmount += BigInt(
              prize.token_type.variant.erc20?.amount! || 0
            );
            // Update calldata with new total
            acc[tokenAddress].calldata = CallData.compile([
              tournamentAddress,
              acc[tokenAddress].totalAmount.toString(),
              "0",
            ]);
          }
          return acc;
        }, {})
      ).map(({ contractAddress, entrypoint, calldata }) => ({
        contractAddress,
        entrypoint,
        calldata,
      }));
      calls.push(...summedCalls);
      for (const prize of prizes) {
        const addPrizesCall = {
          contractAddress: tournamentAddress,
          entrypoint: "add_prize",
          calldata: CallData.compile([
            prize.tournament_id,
            prize.token_address,
            prize.token_type,
            prize.payout_position,
          ]),
        };
        calls.push(addPrizesCall);
      }

      const tx = await account?.execute(calls);

      await waitForAddPrizes(totalCurrentPrizes + prizes.length);

      if (showToast && tx) {
        showPrizeAddition({
          tournamentName,
          tournamentId: Number(tournamentId).toString(),
          prizeTotalUsd,
        });
      }
    } catch (error) {
      console.error("Error executing add prize:", error);
      throw error;
    }
  };

  const createTournamentAndApproveAndAddPrizes = async (
    tournament: Tournament,
    prizes: Prize[],
    entryFeeUsdCost: number,
    duration: number
  ) => {
    const executableTournament = prepareForExecution(tournament);
    const game = getGameName(tournament.game_config.address);
    try {
      let calls = [];
      const createCall = {
        contractAddress: tournamentAddress,
        entrypoint: "create_tournament",
        calldata: CallData.compile([
          address!,
          executableTournament.metadata,
          executableTournament.schedule,
          executableTournament.game_config,
          executableTournament.entry_fee,
          executableTournament.entry_requirement,
        ]),
      };
      calls.push(createCall);
      const summedCalls = Object.values(
        prizes.reduce((acc: { [key: string]: any }, prize) => {
          const tokenAddress = prize.token_address;
          if (!acc[tokenAddress]) {
            acc[tokenAddress] = {
              contractAddress: tokenAddress,
              entrypoint: "approve",
              calldata: CallData.compile([
                tournamentAddress,
                prize.token_type.variant.erc20?.amount!,
                "0",
              ]),
              totalAmount: BigInt(prize.token_type.variant.erc20?.amount! || 0),
            };
          } else {
            // Sum the amounts for the same token
            acc[tokenAddress].totalAmount += BigInt(
              prize.token_type.variant.erc20?.amount! || 0
            );
            // Update calldata with new total
            acc[tokenAddress].calldata = CallData.compile([
              tournamentAddress,
              acc[tokenAddress].totalAmount.toString(),
              "0",
            ]);
          }
          return acc;
        }, {})
      ).map(({ contractAddress, entrypoint, calldata }) => ({
        contractAddress,
        entrypoint,
        calldata,
      }));
      calls.push(...summedCalls);
      for (const prize of prizes) {
        const addPrizesCall = {
          contractAddress: tournamentAddress,
          entrypoint: "add_prize",
          calldata: CallData.compile([
            prize.tournament_id,
            prize.token_address,
            prize.token_type,
            prize.payout_position,
          ]),
        };
        calls.push(addPrizesCall);
      }

      const tx = await account?.execute(calls);

      await waitForTournamentCreation(Number(tournament.id));

      if (tx) {
        showTournamentCreation({
          tournamentName: feltToString(tournament.metadata.name),
          tournamentId: Number(tournament.id).toString(),
          game,
          hasEntryFee: tournament.entry_fee.isSome(),
          entryFeeUsdCost: entryFeeUsdCost,
          startsIn: Number(tournament.schedule.game.start) - Date.now() / 1000,
          duration,
        });
      }
    } catch (error) {
      console.error("Error executing create tournament:", error);
      throw error;
    }
  };

  const claimPrizes = async (
    tournamentId: BigNumberish,
    tournamentName: string,
    prizes: Array<PrizeTypeEnum>
  ) => {
    try {
      let calls = [];
      for (const prize of prizes) {
        calls.push({
          contractAddress: tournamentAddress,
          entrypoint: "claim_prize",
          calldata: CallData.compile([tournamentId, prize]),
        });
      }

      const tx = await account?.execute(calls);

      if (tx) {
        showPrizeDistribution(tournamentName);
      }
    } catch (error) {
      console.error("Error executing distribute prizes:", error);
      throw error;
    }
  };

  // Game

  const endGame = async (gameId: BigNumberish, score: BigNumberish) => {
    try {
      const resolvedClient = await client;
      await resolvedClient.game_mock.endGame(
        account as unknown as Account | AccountInterface,
        gameId,
        score
      );
    } catch (error) {
      console.error("Error executing end game:", error);
      throw error;
    }
  };

  const getBalanceGeneral = async (tokenAddress: string) => {
    const result = await account?.callContract({
      contractAddress: tokenAddress,
      entrypoint: "balance_of",
      calldata: [address!],
    });
    return BigInt(result?.[0]!);
  };

  const approveERC20Multiple = async (tokens: Token[]) => {
    const summedCalls = Object.values(
      tokens.reduce((acc: { [key: string]: any }, token) => {
        const tokenAddress = token.address;
        if (!acc[tokenAddress]) {
          acc[tokenAddress] = {
            contractAddress: tokenAddress,
            entrypoint: "approve",
            calldata: CallData.compile([
              tournamentAddress,
              token.token_type.variant.erc20?.amount!,
              "0",
            ]),
            totalAmount: BigInt(token.token_type.variant.erc20?.amount! || 0),
          };
        } else {
          // Sum the amounts for the same token
          acc[tokenAddress].totalAmount += BigInt(
            token.token_type.variant.erc20?.amount! || 0
          );
          // Update calldata with new total
          acc[tokenAddress].calldata = CallData.compile([
            tournamentAddress,
            acc[tokenAddress].totalAmount.toString(),
            "0",
          ]);
        }
        return acc;
      }, {})
    ).map(({ contractAddress, entrypoint, calldata }) => ({
      contractAddress,
      entrypoint,
      calldata,
    }));
    await account?.execute(summedCalls);
  };

  const approveERC721Multiple = async (tokens: Token[]) => {
    let calls = [];
    for (const token of tokens) {
      calls.push({
        contractAddress: token.address,
        entrypoint: "approve",
        calldata: CallData.compile([
          tournamentAddress,
          token.token_type.variant.erc721?.token_id!,
          "0",
        ]),
      });
    }
    await account?.execute(calls);
  };

  const mintErc20 = async (
    tokenAddress: string,
    recipient: string,
    amount: Uint256
  ) => {
    await account?.execute({
      contractAddress: tokenAddress,
      entrypoint: "mint",
      calldata: [recipient, amount],
    });
  };

  const mintErc721 = async (
    tokenAddress: string,
    recipient: string,
    tokenId: Uint256
  ) => {
    await account?.execute({
      contractAddress: tokenAddress,
      entrypoint: "mint",
      calldata: [recipient, tokenId],
    });
  };

  const getErc20Balance = async (address: string) => {
    const resolvedClient = await client;
    return await resolvedClient.erc20_mock.balanceOf(address);
  };

  const getErc721Balance = async (address: string) => {
    const resolvedClient = await client;
    return await resolvedClient.erc721_mock.balanceOf(address);
  };

  return {
    approveAndEnterTournament,
    submitScores,
    approveAndAddPrizes,
    createTournamentAndApproveAndAddPrizes,
    claimPrizes,
    endGame,
    getBalanceGeneral,
    approveERC20Multiple,
    approveERC721Multiple,
    mintErc721,
    mintErc20,
    getErc20Balance,
    getErc721Balance,
  };
};
