import { useAccount } from "@starknet-react/core";
import { useProvider } from "@starknet-react/core";
import { useDojo } from "@/context/dojo";
import {
  Tournament,
  Prize,
  EntryFee,
  QualificationProofEnum,
  PrizeTypeEnum,
  TokenTypeDataEnum,
  ERC20Data,
  ERC721Data,
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
  CairoCustomEnum,
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
  const { provider } = useProvider();
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
    player_name: BigNumberish,
    player_address: BigNumberish,
    qualification: CairoOption<QualificationProofEnum>,
    duration: number,
    entryFeeUsdCost: number,
    entryCount: number,
    prizeTotalUsd: number
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
          prizeTotalUsd,
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

  const submitScoresBatched = async (
    tournamentId: BigNumberish,
    tournamentName: string,
    submissions: Array<{
      tokenId: BigNumberish;
      position: BigNumberish;
    }>,
    batchSize: number = 30,
    onProgress?: (current: number, total: number) => void
  ) => {
    try {
      // Split submissions into batches
      const batches = [];
      for (let i = 0; i < submissions.length; i += batchSize) {
        batches.push(submissions.slice(i, i + batchSize));
      }

      let tx;
      for (const [index, batch] of batches.entries()) {
        const calls = batch.map((submission) => ({
          contractAddress: tournamentAddress,
          entrypoint: "submit_score",
          calldata: CallData.compile([
            tournamentId,
            submission.tokenId,
            submission.position,
          ]),
        }));

        console.log(
          `Processing score submission batch ${index + 1}/${
            batches.length
          } with ${calls.length} scores`
        );

        // Call progress callback
        if (onProgress) {
          onProgress(index + 1, batches.length);
        }

        tx = await account?.execute(calls);

        if (tx?.transaction_hash) {
          console.log(
            `Waiting for transaction ${tx.transaction_hash} to be confirmed...`
          );
          // Wait for the transaction to be accepted on L2
          await account?.waitForTransaction(tx.transaction_hash);
          console.log(`Transaction ${tx.transaction_hash} confirmed`);
        }
      }

      await waitForSubmitScores(tournamentId);

      if (tx) {
        showScoreSubmission(tournamentName);
      }
    } catch (error) {
      console.error("Error executing batched submit scores:", error);
      throw error;
    }
  };

  const approveAndAddPrizes = async (
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
          prizeTotalUsd,
        });
      }
    } catch (error) {
      console.error("Error executing add prize:", error);
      throw error;
    }
  };

  const approveAndAddPrizesBatched = async (
    tournamentName: string,
    prizes: Prize[],
    showToast: boolean,
    prizeTotalUsd: number,
    totalCurrentPrizes: number,
    batchSize: number = 30,
    onProgress?: (current: number, total: number) => void
  ) => {
    try {
      // Calculate all approvals needed
      const approvalCalls = Object.values(
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

      // Split prizes into batches
      const batches = [];
      for (let i = 0; i < prizes.length; i += batchSize) {
        batches.push(prizes.slice(i, i + batchSize));
      }

      let addedPrizesCount = 0;
      for (const [index, batch] of batches.entries()) {
        let calls = [];

        // Add approvals to the first batch
        if (index === 0 && approvalCalls.length > 0) {
          calls.push(...approvalCalls);
        }

        // Add prize calls
        const prizeCalls = batch.map((prize) => ({
          contractAddress: tournamentAddress,
          entrypoint: "add_prize",
          calldata: CallData.compile([
            prize.tournament_id,
            prize.token_address,
            prize.token_type,
            prize.payout_position,
          ]),
        }));
        calls.push(...prizeCalls);

        console.log(
          `Processing batch ${index + 1}/${batches.length} with ${
            prizeCalls.length
          } prizes${
            index === 0 && approvalCalls.length > 0
              ? ` and ${approvalCalls.length} approvals`
              : ""
          }`
        );

        // Call progress callback
        if (onProgress) {
          onProgress(index + 1, batches.length);
        }

        const tx = await account?.execute(calls);

        if (tx?.transaction_hash) {
          console.log(
            `Waiting for transaction ${tx.transaction_hash} to be confirmed...`
          );
          // Wait for the transaction to be accepted on L2
          await account?.waitForTransaction(tx.transaction_hash);
          console.log(`Transaction ${tx.transaction_hash} confirmed`);
        }

        // Wait for this batch to be processed
        addedPrizesCount += batch.length;
        await waitForAddPrizes(totalCurrentPrizes + addedPrizesCount);

        // Show toast only on the last batch if requested
        if (showToast && tx && index === batches.length - 1) {
          showPrizeAddition({
            tournamentName,
            prizeTotalUsd,
          });
        }
      }
    } catch (error) {
      console.error("Error executing batched add prizes:", error);
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

      console.log(calls);

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

  const createTournamentAndApproveAndAddPrizesBatched = async (
    tournament: Tournament,
    prizes: Prize[],
    entryFeeUsdCost: number,
    duration: number,
    batchSize: number = 50
  ) => {
    const executableTournament = prepareForExecution(tournament);
    const game = getGameName(tournament.game_config.address);
    try {
      // Create tournament call
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

      // Calculate all approvals
      const approvalCalls = Object.values(
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

      // Split prizes into batches
      const batches = [];
      for (let i = 0; i < prizes.length; i += batchSize) {
        batches.push(prizes.slice(i, i + batchSize));
      }

      let tx;
      for (const [index, batch] of batches.entries()) {
        let calls = [];

        // First batch includes tournament creation and approvals
        if (index === 0) {
          calls.push(createCall);
          if (approvalCalls.length > 0) {
            calls.push(...approvalCalls);
          }
        }

        // Add prize calls
        const prizeCalls = batch.map((prize) => ({
          contractAddress: tournamentAddress,
          entrypoint: "add_prize",
          calldata: CallData.compile([
            prize.tournament_id,
            prize.token_address,
            prize.token_type,
            prize.payout_position,
          ]),
        }));
        calls.push(...prizeCalls);

        console.log(
          `Processing batch ${index + 1}/${batches.length} with ${
            prizeCalls.length
          } prizes${
            index === 0
              ? `, tournament creation, and ${approvalCalls.length} approvals`
              : ""
          }`
        );

        tx = await account?.execute(calls);

        if (tx?.transaction_hash) {
          console.log(
            `Waiting for transaction ${tx.transaction_hash} to be confirmed...`
          );
          // Wait for the transaction to be accepted on L2
          await account?.waitForTransaction(tx.transaction_hash);
          console.log(`Transaction ${tx.transaction_hash} confirmed`);
        }

        // Wait for tournament creation after first batch
        if (index === 0) {
          await waitForTournamentCreation(Number(tournament.id));
        }
      }

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
      console.error(
        "Error executing create tournament with batched prizes:",
        error
      );
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

  const claimPrizesBatched = async (
    tournamentId: BigNumberish,
    tournamentName: string,
    prizes: Array<PrizeTypeEnum>,
    batchSize: number = 30,
    onProgress?: (current: number, total: number) => void
  ) => {
    try {
      // Split prizes into batches
      const batches = [];
      for (let i = 0; i < prizes.length; i += batchSize) {
        batches.push(prizes.slice(i, i + batchSize));
      }

      let tx;
      for (const [index, batch] of batches.entries()) {
        const calls = batch.map((prize) => ({
          contractAddress: tournamentAddress,
          entrypoint: "claim_prize",
          calldata: CallData.compile([tournamentId, prize]),
        }));

        console.log(
          `Processing claim batch ${index + 1}/${batches.length} with ${
            calls.length
          } prizes`
        );

        // Call progress callback
        if (onProgress) {
          onProgress(index + 1, batches.length);
        }

        tx = await account?.execute(calls);

        if (tx?.transaction_hash) {
          console.log(
            `Waiting for transaction ${tx.transaction_hash} to be confirmed...`
          );
          // Wait for the transaction to be accepted on L2
          await account?.waitForTransaction(tx.transaction_hash);
          console.log(`Transaction ${tx.transaction_hash} confirmed`);
        }
      }

      if (tx) {
        showPrizeDistribution(tournamentName);
      }
    } catch (error) {
      console.error("Error executing batched prize claims:", error);
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
    const decimalsResult = await account?.callContract({
      contractAddress: tokenAddress,
      entrypoint: "decimals",
      calldata: [],
    });
    const decimals = Number(decimalsResult?.[0]!);
    const balance =
      (BigInt(result?.[0]!) / 10n ** BigInt(decimals)) * 10n ** 18n;
    return balance;
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

  const getTokenDecimals = async (tokenAddress: string) => {
    try {
      if (!provider) return 18;
      const decimalsResult = await provider.callContract({
        contractAddress: tokenAddress,
        entrypoint: "decimals",
        calldata: [],
      });
      return Number(decimalsResult?.[0] || 18);
    } catch (error) {
      console.error("Error fetching token decimals:", error);
      return 18; // Default to 18 on error
    }
  };

  const getTokenInfo = async (tokenAddress: string) => {
    try {
      if (!account) return null;
      const nameResult = await account.callContract({
        contractAddress: tokenAddress,
        entrypoint: "name",
        calldata: [],
      });

      const nameByteArray: ByteArray = {
        data: nameResult.slice(0, -2),
        pending_word: nameResult[nameResult.length - 2],
        pending_word_len: nameResult[nameResult.length - 1],
      };

      const symbolResult = await account.callContract({
        contractAddress: tokenAddress,
        entrypoint: "symbol",
        calldata: [],
      });

      const symbolByteArray: ByteArray = {
        data: symbolResult.slice(0, -2),
        pending_word: symbolResult[symbolResult.length - 2],
        pending_word_len: symbolResult[symbolResult.length - 1],
      };

      // Convert ByteArray to string for name and symbol
      const name = nameResult
        ? byteArray.stringFromByteArray(nameByteArray)
        : "";
      const symbol = symbolResult
        ? byteArray.stringFromByteArray(symbolByteArray)
        : "";

      return { name, symbol };
    } catch (error) {
      console.error("Error fetching token info:", error);
      return null;
    }
  };

  const registerToken = async (
    tokenAddress: string,
    tokenType: "erc20" | "erc721",
    tokenId?: string
  ) => {
    try {
      let tokenTypeData: TokenTypeDataEnum;
      let calls = [];

      if (tokenType === "erc20") {
        tokenTypeData = new CairoCustomEnum({
          erc20: { amount: 1 } as ERC20Data,
          erc721: undefined,
        });

        // Add ERC20 approval call for 1 unit
        calls.push({
          contractAddress: tokenAddress,
          entrypoint: "approve",
          calldata: CallData.compile([
            tournamentAddress,
            { low: "1", high: "0" }, // Approve 1 unit
          ]),
        });
      } else {
        tokenTypeData = new CairoCustomEnum({
          erc20: undefined,
          erc721: { id: tokenId || "1" } as ERC721Data,
        });

        // Add ERC721 approval call
        calls.push({
          contractAddress: tokenAddress,
          entrypoint: "approve",
          calldata: CallData.compile([
            tournamentAddress,
            { low: tokenId || "1", high: "0" }, // Token ID as u256
          ]),
        });
      }

      // Add register token call
      calls.push({
        contractAddress: tournamentAddress,
        entrypoint: "register_token",
        calldata: CallData.compile([tokenAddress, tokenTypeData]),
      });

      const tx = await account?.execute(calls);

      return tx;
    } catch (error) {
      console.error("Error executing register token:", error);
      throw error;
    }
  };

  return {
    approveAndEnterTournament,
    submitScores,
    submitScoresBatched,
    approveAndAddPrizes,
    approveAndAddPrizesBatched,
    createTournamentAndApproveAndAddPrizes,
    createTournamentAndApproveAndAddPrizesBatched,
    claimPrizes,
    claimPrizesBatched,
    endGame,
    getBalanceGeneral,
    mintErc721,
    mintErc20,
    getErc20Balance,
    getErc721Balance,
    getTokenDecimals,
    getTokenInfo,
    registerToken,
  };
};
