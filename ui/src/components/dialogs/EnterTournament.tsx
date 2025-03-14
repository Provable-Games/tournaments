import { useState, useEffect, useMemo } from "react";
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
import { Tournament, EntryCount, Token } from "@/generated/models.gen";
import {
  stringToFelt,
  feltToString,
  indexAddress,
  bigintToHex,
} from "@/lib/utils";
import { addAddressPadding, BigNumberish } from "starknet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useConnectToSelectedChain } from "@/dojo/hooks/useChain";
import { useGetUsernames } from "@/hooks/useController";
import { CHECK, X, COIN } from "@/components/Icons";
import {
  useGetAccountTokenIds,
  useGetTournamentRegistrants,
  useGetTournamentLeaderboards,
} from "@/dojo/hooks/useSqlQueries";
import { useDojo } from "@/context/dojo";
import { processQualificationProof } from "@/lib/utils/formatting";

interface EnterTournamentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasEntryFee?: boolean;
  entryFee?: string;
  tournamentModel: Tournament;
  entryCountModel: EntryCount;
  gameCount: BigNumberish;
  tokens: Token[];
  tournamentsData: Tournament[];
}

export function EnterTournamentDialog({
  open,
  onOpenChange,
  hasEntryFee,
  entryFee,
  tournamentModel,
  entryCountModel,
  gameCount,
  tokens,
  tournamentsData,
}: EnterTournamentDialogProps) {
  const { nameSpace } = useDojo();
  const { address } = useAccount();
  const { connect } = useConnectToSelectedChain();
  const { approveAndEnterTournament, getBalanceGeneral } = useSystemCalls();
  const [playerName, setPlayerName] = useState("");
  const [balance, setBalance] = useState<BigNumberish>(0);

  const handleEnterTournament = () => {
    if (!playerName.trim()) return;

    const qualificationProof = processQualificationProof(
      requirementVariant ?? "",
      ownedTokenIds,
      tournamentRequirementVariant,
      hasWonTournamentMap,
      hasParticipatedInTournamentMap
    );

    approveAndEnterTournament(
      tournamentModel?.entry_fee,
      tournamentModel?.id,
      feltToString(tournamentModel?.metadata.name),
      entryCountModel?.count,
      stringToFelt(playerName.trim()),
      addAddressPadding(address!),
      qualificationProof,
      gameCount
    );

    setPlayerName("");
  };

  const ownerAddresses = useMemo(() => {
    return [address ?? "0x0"];
  }, [address]);

  const { usernames } = useGetUsernames(ownerAddresses);

  const accountUsername = usernames?.get(indexAddress(address ?? ""));

  useEffect(() => {
    if (!open) {
      setPlayerName("");
    } else if (accountUsername) {
      setPlayerName(accountUsername);
    }
  }, [open]);

  const entryToken = tournamentModel?.entry_fee?.Some?.token_address;
  const entryAmount = tournamentModel?.entry_fee?.Some?.amount;

  const getBalance = async () => {
    const balance = await getBalanceGeneral(entryToken ?? "");
    setBalance(balance);
  };

  useEffect(() => {
    if (entryToken && address) {
      getBalance();
    }
  }, [entryToken, address, getBalance]);

  const hasBalance = BigInt(balance) >= BigInt(entryAmount ?? 0n);

  const hasEntryRequirement = tournamentModel?.entry_requirement.isSome();

  const requirementVariant =
    tournamentModel?.entry_requirement.Some?.activeVariant();

  const requiredTokenAddress =
    tournamentModel?.entry_requirement.Some?.variant?.token;

  const token = tokens.find((token) => token.address === requiredTokenAddress);

  const tournamentRequirementVariant =
    tournamentModel?.entry_requirement.Some?.variant?.tournament?.activeVariant();

  const requiredTokenAddresses = requiredTokenAddress
    ? [indexAddress(requiredTokenAddress ?? "")]
    : [];

  const { data: ownedTokens } = useGetAccountTokenIds(
    indexAddress(address ?? ""),
    requiredTokenAddresses,
    requiredTokenAddresses.length > 0
  );

  const ownedTokenIds = useMemo(() => {
    return ownedTokens
      ?.map((token) => {
        const parts = token.token_id?.split(":");
        return parts?.[1] ?? null;
      })
      .filter(Boolean);
  }, [ownedTokens]);

  const requiredTournamentGameAddresses = tournamentsData.map((tournament) =>
    indexAddress(tournament.game_config?.address ?? "")
  );

  const { data: ownedGames } = useGetAccountTokenIds(
    indexAddress(address ?? ""),
    requiredTournamentGameAddresses,
    requiredTournamentGameAddresses.length > 0
  );

  const ownedGameIds = useMemo(() => {
    return ownedGames
      ?.map((game) => {
        const parts = game.token_id?.split(":");
        return parts?.[1] ?? null;
      })
      .filter(Boolean);
  }, [ownedGames]);

  const { data: registrations } = useGetTournamentRegistrants({
    namespace: nameSpace ?? "",
    gameIds: ownedGameIds ?? [],
    active: true,
  });

  const { data: leaderboards } = useGetTournamentLeaderboards({
    namespace: nameSpace ?? "",
    tournamentIds: tournamentsData.map((tournament) => tournament.id),
    active: true,
  });

  const currentTime = BigInt(new Date().getTime()) / 1000n;

  const requiredTournamentRegistrations = useMemo(() => {
    if (!registrations || !tournamentsData) {
      return [];
    }

    // Create a Set of tournament IDs from tournamentsData for faster lookups
    const tournamentIdSet = new Set(
      tournamentsData.map((tournament) => tournament.id)
    );

    // Filter registrations that have a tournament ID in the set
    return registrations.filter((registration) =>
      tournamentIdSet.has(registration.tournament_id.toString())
    );
  }, [registrations, tournamentsData]);

  const hasParticipatedInTournamentMap = useMemo(() => {
    if (!requiredTournamentRegistrations) return {};

    return requiredTournamentRegistrations.reduce((acc, registration) => {
      const registrationTournamentId = registration.tournament_id;
      const registeredTournament = tournamentsData.find(
        (tournament) => tournament.id === registrationTournamentId
      );
      const registeredTournamentFinalizedTime =
        BigInt(registeredTournament?.schedule.game.end ?? 0n) +
        BigInt(registeredTournament?.schedule.submission_duration ?? 0n);
      const hasRegisteredTournamentFinalized =
        registeredTournamentFinalizedTime < currentTime;
      // Only set token ID if has_submitted is true
      if (hasRegisteredTournamentFinalized) {
        // If we haven't stored a token ID for this tournament yet, store this one
        if (!acc[registration.tournament_id]) {
          acc[registration.tournament_id] = registration.game_token_id;
        }
      }
      return acc;
    }, {} as Record<string, string | undefined>);
  }, [requiredTournamentRegistrations, tournamentsData]);

  const parseTokenIds = (tokenIdsString: string): string[] => {
    try {
      // Parse the JSON string into a JavaScript array
      const parsedArray = JSON.parse(tokenIdsString);

      // Ensure the result is an array
      if (Array.isArray(parsedArray)) {
        return parsedArray.map((tokenId) =>
          addAddressPadding(bigintToHex(BigInt(tokenId)))
        );
      } else {
        console.warn("Token IDs not in expected array format:", tokenIdsString);
        return [];
      }
    } catch (error) {
      console.error("Error parsing token IDs:", error);
      return [];
    }
  };

  const hasWonTournamentMap = useMemo(() => {
    if (!leaderboards || !ownedGameIds) return {};

    return leaderboards.reduce((acc, leaderboard) => {
      const leaderboardTournamentId = leaderboard.tournament_id;
      const leaderboardTournament = tournamentsData.find(
        (tournament) => tournament.id === leaderboardTournamentId
      );
      const leaderboardTournamentFinalizedTime =
        BigInt(leaderboardTournament?.schedule.game.end ?? 0n) +
        BigInt(leaderboardTournament?.schedule.submission_duration ?? 0n);
      const hasLeaderboardTournamentFinalized =
        leaderboardTournamentFinalizedTime < currentTime;
      if (hasLeaderboardTournamentFinalized) {
        // Parse the token_ids string into an array
        const leaderboardTokenIds = parseTokenIds(leaderboard.token_ids);

        // Find the first owned token ID that appears in the leaderboard and its position
        let matchingTokenId: string | undefined;
        let position: number = 0;

        for (let i = 0; i < leaderboardTokenIds.length; i++) {
          const leaderboardTokenId = leaderboardTokenIds[i];
          if (ownedGameIds.includes(leaderboardTokenId)) {
            matchingTokenId = leaderboardTokenId;
            position = i; // This is the position (0-based index)
            break;
          }
        }

        // If we found a matching token ID, store it along with its position
        if (matchingTokenId) {
          acc[leaderboard.tournament_id] = {
            tokenId: matchingTokenId,
            position: position + 1, // Convert to 1-based position for display
          };
        }
      }

      return acc;
    }, {} as Record<string, { tokenId: string; position: number } | undefined>);
  }, [leaderboards, ownedGameIds]);

  const meetsEntryRequirements = useMemo(() => {
    if (!hasEntryRequirement) {
      return true;
    }

    if (requirementVariant === "token") {
      return ownedTokenIds?.length > 0;
    }
    if (requirementVariant === "tournament") {
      if (!tournamentsData || tournamentsData.length === 0) {
        return false;
      }

      // Check if the user meets at least one tournament requirement
      return tournamentsData.some((tournament) => {
        const tournamentId = tournament.id.toString();

        // If requirement is for winners, check hasWonTournamentMap
        if (tournamentRequirementVariant === "winners") {
          return hasWonTournamentMap[tournamentId] !== undefined;
        }
        // If requirement is for participants, check hasParticipatedInTournamentMap
        else if (tournamentRequirementVariant === "participants") {
          return hasParticipatedInTournamentMap[tournamentId] !== undefined;
        }

        // Default case if requirementType is something else
        return false;
      });
    }
    return true;
  }, [
    tournamentsData,
    tournamentRequirementVariant,
    hasWonTournamentMap,
    hasParticipatedInTournamentMap,
    hasEntryRequirement,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enter Tournament</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {hasEntryFee && (
            <div className="flex flex-col gap-2">
              <span className="text-lg">Entry Fee</span>
              <div className="flex flex-row items-center justify-center gap-2">
                <div className="flex flex-row items-center gap-1">
                  <span>{Number(entryAmount) / 10 ** 18}</span>
                  <span>
                    {
                      tokens.find((token) => token.address === entryToken)
                        ?.symbol
                    }
                  </span>
                </div>
                <span className="text-neutral">~${entryFee}</span>
                {address &&
                  (hasBalance ? (
                    <span className="w-8 h-8">
                      <CHECK />
                    </span>
                  ) : (
                    <span className="w-8 h-8">
                      <X />
                    </span>
                  ))}
              </div>
            </div>
          )}

          {hasEntryRequirement && (
            <div className="flex flex-col gap-2">
              <span className="text-lg">Entry Requirements</span>
              <span className="px-2">
                {requirementVariant === "token" ? (
                  "You must hold the NFT"
                ) : requirementVariant === "tournament" ? (
                  <div className="flex flex-row items-center gap-2">
                    {`You must have ${
                      tournamentRequirementVariant === "winners"
                        ? "won"
                        : "participated in"
                    }:`}
                  </div>
                ) : (
                  "Must hold ERC721"
                )}
              </span>
              {requirementVariant === "token" ? (
                <div className="flex flex-row items-center gap-2 px-4">
                  <span className="w-8">
                    <COIN />
                  </span>
                  <span>{token?.name}</span>
                  <span className="text-neutral">{token?.symbol}</span>
                  {address ? (
                    ownedTokenIds?.length > 0 ? (
                      <div className="flex flex-row items-center gap-2">
                        <span className="w-5">
                          <CHECK />
                        </span>
                        <span>You own {ownedTokenIds.length} tokens</span>
                      </div>
                    ) : (
                      <span className="w-5">
                        <X />
                      </span>
                    )
                  ) : (
                    <span className="text-warning">Connect Account</span>
                  )}
                </div>
              ) : (
                requirementVariant === "tournament" && (
                  <div className="flex flex-col gap-2 px-4">
                    {tournamentsData.map((tournament) => (
                      <div
                        key={tournament.id}
                        className="flex flex-row items-center justify-between border border-brand-muted rounded-md p-2"
                      >
                        <span>{feltToString(tournament.metadata.name)}</span>
                        {address ? (
                          tournamentRequirementVariant === "winners" ? (
                            !!hasWonTournamentMap[tournament.id.toString()]
                              ?.tokenId
                          ) : !!hasParticipatedInTournamentMap[
                              tournament.id.toString()
                            ] ? (
                            <span className="w-5">
                              <CHECK />
                            </span>
                          ) : (
                            <span className="w-5">
                              <X />
                            </span>
                          )
                        ) : (
                          <span className="text-neutral">Connect Account</span>
                        )}
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="playerName" className="text-lg">
              Player Name
            </Label>
            <div className="flex flex-col gap-4">
              {accountUsername && (
                <div className="flex flex-row justify-center gap-2">
                  <span className="text-brand-muted">Default:</span>
                  <span className="text-brand">{accountUsername}</span>
                </div>
              )}
              <Input
                id="playerName"
                placeholder="Enter your player name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          {address ? (
            <DialogClose asChild>
              <Button
                disabled={!hasBalance || !meetsEntryRequirements}
                onClick={handleEnterTournament}
              >
                Enter Tournament
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
