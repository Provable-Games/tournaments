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
import EntryCard from "@/components/tournament/myEntries/EntryCard";
import { TokenMetadata, Tournament } from "@/generated/models.gen";
import { useDojoStore } from "@/dojo/hooks/useDojoStore";
import { useDojo } from "@/context/dojo";
import {
  TournamentCard,
  TournamentCardTitle,
  TournamentCardHeader,
  TournamentCardContent,
  TournamentCardMetric,
  TournamentCardSwitch,
} from "./containers/TournamentCard";

interface MyEntriesProps {
  tournamentId: BigNumberish;
  gameAddress: string;
  gameNamespace: string;
  gameScoreModel: string;
  gameScoreAttribute: string;
  ownedTokens: any[];
  tournamentModel: Tournament;
}

const MyEntries = ({
  tournamentId,
  gameAddress,
  gameNamespace,
  gameScoreModel,
  gameScoreAttribute,
  ownedTokens,
  tournamentModel,
}: MyEntriesProps) => {
  const { address } = useAccount();
  const state = useDojoStore((state) => state);
  const { namespace } = useDojo();
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
    namespace,
  });

  const myRegistrations = state
    .getEntitiesByModel(namespace ?? "", "Registration")
    .filter(
      (entity) =>
        entity.models[namespace ?? ""].Registration?.tournament_id ===
        tournamentId
    )
    .filter((entity) =>
      ownedTokenIds?.includes(
        addAddressPadding(
          bigintToHex(
            entity.models[namespace ?? ""].Registration?.game_token_id ?? 0n
          )
        )
      )
    );

  const myEntriesCount = useMemo(() => {
    return myRegistrations?.length ?? 0;
  }, [myRegistrations]);

  const tokenIds = useMemo(
    () =>
      myRegistrations?.map((registration) =>
        addAddressPadding(
          bigintToHex(
            registration?.models[namespace ?? ""].Registration?.game_token_id ??
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
        registration?.models[namespace ?? ""].Registration?.game_token_id ?? 0n;

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
        ...registration.models[namespace ?? ""].Registration,
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
    <TournamentCard showCard={showMyEntries}>
      <TournamentCardHeader>
        <TournamentCardTitle>My Entries</TournamentCardTitle>
        <div className="flex flex-row items-center gap-2">
          <TournamentCardSwitch
            checked={showMyEntries}
            onCheckedChange={setShowMyEntries}
            showSwitch={address ? myEntriesCount > 0 : false}
            notShowingSwitchLabel={
              address ? "No Entries" : "No Account Connected"
            }
            checkedLabel="Hide"
            uncheckedLabel="Show Entries"
          />
          <TournamentCardMetric icon={<DOLLAR />} metric={myEntriesCount} />
        </div>
      </TournamentCardHeader>
      <TournamentCardContent showContent={showMyEntries}>
        <div className="p-2 h-full">
          <div className="flex flex-row gap-5 overflow-x-auto pb-2 h-full">
            {mergedEntries?.map((mergedEntry, index) => (
              <EntryCard
                key={index}
                gameAddress={gameAddress}
                mergedEntry={mergedEntry}
                tournamentModel={tournamentModel}
              />
            ))}
          </div>
        </div>
      </TournamentCardContent>
    </TournamentCard>
  );
};

export default MyEntries;
