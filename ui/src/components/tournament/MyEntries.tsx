import { Card } from "@/components/ui/card";
import { DOLLAR } from "@/components/Icons";
import {
  useGetGameMetadataInListQuery,
  useGetRegistrationsForTournamentInTokenListQuery,
} from "@/dojo/hooks/useSdkQueries";
import { indexAddress } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { useAccount } from "@starknet-react/core";
import { BigNumberish, addAddressPadding } from "starknet";
import { bigintToHex } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import EntryCard from "@/components/tournament/myEntries/EntryCard";
import { TokenMetadata } from "@/generated/models.gen";
import { useDojoStore } from "@/dojo/hooks/useDojoStore";
import { useDojo } from "@/context/dojo";

interface MyEntriesProps {
  tournamentId: BigNumberish;
  gameAddress: string;
  gameNamespace: string;
  gameScoreModel: string;
  gameScoreAttribute: string;
  ownedTokens: any[];
}

const MyEntries = ({
  tournamentId,
  gameAddress,
  gameNamespace,
  gameScoreModel,
  gameScoreAttribute,
  ownedTokens,
}: MyEntriesProps) => {
  const { address } = useAccount();
  const state = useDojoStore.getState();
  const { nameSpace } = useDojo();
  const [showMyEntries, setShowMyEntries] = useState(false);

  const ownedTokenIds = useMemo(() => {
    return ownedTokens
      ?.map((token) => {
        const parts = token.token_id?.split(":");
        return parts?.[1] ?? null;
      })
      .filter(Boolean);
  }, [ownedTokens]);

  useGetRegistrationsForTournamentInTokenListQuery({
    tournamentId: addAddressPadding(bigintToHex(tournamentId)),
    tokenIds: ownedTokenIds ?? [],
    limit: 1000,
    offset: 0,
  });

  const myRegistrations = state
    .getEntitiesByModel(nameSpace ?? "", "Registration")
    .filter(
      (entity) =>
        entity.models[nameSpace ?? ""].Registration?.tournament_id ===
        tournamentId
    );

  const myEntriesCount = useMemo(() => {
    return myRegistrations?.length ?? 0;
  }, [myRegistrations]);

  const tokenIds = useMemo(
    () =>
      myRegistrations?.map((registration) =>
        addAddressPadding(
          bigintToHex(
            registration?.models[nameSpace ?? ""].Registration?.game_token_id ??
              0n
          )
        )
      ),
    [myRegistrations]
  );

  const { entities: metadata } = useGetGameMetadataInListQuery({
    gameNamespace: gameNamespace ?? "",
    gameIds: tokenIds ?? [],
  });

  const entities = state.getEntities();

  const scoreEntities = entities.filter(
    (entity) => (entity.models as any)?.[gameNamespace]?.[gameScoreModel]
  );

  const mergedEntries = useMemo(() => {
    if (!myRegistrations || !metadata) return [];

    return myRegistrations.map((registration) => {
      const gameTokenId =
        registration?.models[nameSpace ?? ""].Registration?.game_token_id ?? 0n;

      // Find matching metadata for this token
      const gameMetadata = metadata.find(
        (m) => m?.TokenMetadata?.token_id === gameTokenId
      );

      // Find matching score for this token
      const score = scoreEntities.find(
        (s) =>
          (s?.models as any)?.[gameNamespace]?.[gameScoreModel]?.game_id ===
          gameTokenId
      );

      // Find token metadata for this token
      const tokenMetadata = ownedTokens?.find(
        (t) =>
          t.token_id ===
          `${indexAddress(gameAddress)}:${addAddressPadding(
            bigintToHex(gameTokenId)
          )}`
      )?.metadata;

      return {
        ...registration.models[nameSpace ?? ""].Registration,
        gameMetadata: gameMetadata?.TokenMetadata as TokenMetadata | null,
        tokenMetadata: tokenMetadata as string | null,
        score:
          (score?.models as any)?.[gameNamespace]?.[gameScoreModel]?.[
            gameScoreAttribute
          ] ?? 0,
      };
    });
  }, [myRegistrations, metadata, address]);

  useEffect(() => {
    if (address) {
      setShowMyEntries(myEntriesCount > 0);
    } else {
      setShowMyEntries(false);
    }
  }, [address, myEntriesCount]);

  return (
    <Card
      variant="outline"
      className={`sm:w-1/2 transition-all duration-300 ease-in-out ${
        showMyEntries ? "h-[210px] 3xl:h-[270px]" : "h-[60px] 3xl:h-[80px]"
      }`}
    >
      <div className="flex flex-col justify-between">
        <div className="flex flex-row items-center justify-between h-6 sm:h-8">
          <span className="font-brand text-lg xl:text-xl 2xl:text-2xl 3xl:text-3xl">
            My Entries
          </span>
          <div className="flex flex-row items-center gap-2">
            {address ? (
              myEntriesCount > 0 ? (
                <>
                  <span className="text-neutral 3xl:text-lg">
                    {showMyEntries ? "Hide" : "Show Entries"}
                  </span>
                  <Switch
                    checked={showMyEntries}
                    onCheckedChange={setShowMyEntries}
                  />
                </>
              ) : (
                <span className="text-neutral 3xl:text-lg">No Entries</span>
              )
            ) : (
              <span className="text-neutral 3xl:text-lg">
                No Account Connected
              </span>
            )}
            <div className="flex flex-row items-center font-brand text-lg xl:text-xl 2xl:text-2xl 3xl:text-3xl">
              <span className="w-8 3xl:w-10">
                <DOLLAR />
              </span>
              : {myEntriesCount}
            </div>
          </div>
        </div>
        <div
          className={`transition-all duration-300 delay-150 ease-in-out ${
            showMyEntries ? "h-auto opacity-100" : "h-0 opacity-0"
          } overflow-hidden`}
        >
          <div className="w-full h-0.5 bg-brand/25 mt-2" />
          <div className="p-2 h-auto">
            <div className="flex flex-row gap-5 overflow-x-auto pb-2">
              {mergedEntries?.map((mergedEntry, index) => (
                <EntryCard
                  key={index}
                  gameAddress={gameAddress}
                  mergedEntry={mergedEntry}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default MyEntries;
