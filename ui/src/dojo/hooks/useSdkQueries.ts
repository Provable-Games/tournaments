import { useMemo } from "react";
import { useSdkGetEntities } from "@/lib/dojo/hooks/useSdkGet";
import { useSdkSubscribeEntities } from "@/lib/dojo/hooks/useSdkSub";
import {
  ToriiQueryBuilder,
  KeysClause,
  MemberClause,
  OrComposeClause,
} from "@dojoengine/sdk";
import { getModelsMapping } from "@/generated/models.gen";
import { addAddressPadding, BigNumberish } from "starknet";

export const useGetTokensQuery = (namespace: string) => {
  const query = useMemo(
    () =>
      new ToriiQueryBuilder()
        .withClause(KeysClause([getModelsMapping(namespace).Token], []).build())
        .withEntityModels([getModelsMapping(namespace).Token])
        .includeHashedKeys(),
    [namespace]
  );

  const { entities, isLoading, refetch } = useSdkGetEntities({
    query,
    namespace: namespace,
  });
  return { entities, isLoading, refetch };
};

export const useGetMetricsQuery = (namespace: string) => {
  const query = useMemo(
    () =>
      new ToriiQueryBuilder()
        .withClause(
          KeysClause(
            [
              getModelsMapping(namespace).PlatformMetrics,
              getModelsMapping(namespace).PrizeMetrics,
            ],
            [undefined]
          ).build()
        )
        .withEntityModels([
          getModelsMapping(namespace).PlatformMetrics,
          getModelsMapping(namespace).PrizeMetrics,
        ])
        .includeHashedKeys(),
    [namespace]
  );
  const { entities, isLoading, refetch } = useSdkGetEntities({
    query,
    namespace,
  });
  const entity = useMemo(
    () => (Array.isArray(entities) ? entities[0] : entities),
    [entities]
  );
  return { entity, isLoading, refetch };
};

export const useGetTournamentQuery = (
  tournamentId: BigNumberish,
  namespace: string
) => {
  const query = useMemo(
    () =>
      new ToriiQueryBuilder()
        .withClause(
          OrComposeClause([
            MemberClause(
              getModelsMapping(namespace).Tournament,
              "id",
              "Eq",
              addAddressPadding(tournamentId)
            ),
            MemberClause(
              getModelsMapping(namespace).EntryCount,
              "tournament_id",
              "Eq",
              addAddressPadding(tournamentId)
            ),
            MemberClause(
              getModelsMapping(namespace).Prize,
              "tournament_id",
              "Eq",
              addAddressPadding(tournamentId)
            ),
            MemberClause(
              getModelsMapping(namespace).PrizeClaim,
              "tournament_id",
              "Eq",
              addAddressPadding(tournamentId)
            ),
            MemberClause(
              getModelsMapping(namespace).Leaderboard,
              "tournament_id",
              "Eq",
              addAddressPadding(tournamentId)
            ),
            MemberClause(
              getModelsMapping(namespace).Registration,
              "tournament_id",
              "Eq",
              addAddressPadding(tournamentId)
            ),
          ]).build()
        )
        .withEntityModels([
          getModelsMapping(namespace).Tournament,
          getModelsMapping(namespace).EntryCount,
          getModelsMapping(namespace).Prize,
          getModelsMapping(namespace).PrizeClaim,
          getModelsMapping(namespace).Leaderboard,
          getModelsMapping(namespace).Registration,
        ])
        .includeHashedKeys(),
    [tournamentId, namespace]
  );

  const { entities, isLoading, refetch } = useSdkGetEntities({
    query,
    namespace,
  });
  return { entities, isLoading, refetch };
};

export const useSubscribeTournamentQuery = (
  tournamentId: BigNumberish,
  namespace: string
) => {
  const query = useMemo(
    () =>
      new ToriiQueryBuilder()
        .withClause(
          OrComposeClause([
            KeysClause(
              [
                getModelsMapping(namespace).Tournament,
                getModelsMapping(namespace).EntryCount,
                getModelsMapping(namespace).Registration,
                getModelsMapping(namespace).Prize,
              ],
              []
            ),
            MemberClause(
              getModelsMapping(namespace).Tournament,
              "id",
              "Eq",
              addAddressPadding(tournamentId)
            ),
            MemberClause(
              getModelsMapping(namespace).EntryCount,
              "tournament_id",
              "Eq",
              addAddressPadding(tournamentId)
            ),
            MemberClause(
              getModelsMapping(namespace).Registration,
              "tournament_id",
              "Eq",
              addAddressPadding(tournamentId)
            ),
            MemberClause(
              getModelsMapping(namespace).Prize,
              "tournament_id",
              "Eq",
              addAddressPadding(tournamentId)
            ),
          ]).build()
        )
        .withEntityModels([
          getModelsMapping(namespace).Tournament,
          getModelsMapping(namespace).EntryCount,
          getModelsMapping(namespace).Registration,
          getModelsMapping(namespace).Prize,
        ])
        .includeHashedKeys(),
    [tournamentId, namespace]
  );

  const { entities, isSubscribed } = useSdkSubscribeEntities({
    query,
  });
  return { entities, isSubscribed };
};

export const useSubscribePrizesQuery = (namespace: string) => {
  const query = useMemo(
    () =>
      new ToriiQueryBuilder()
        .withClause(KeysClause([getModelsMapping(namespace).Prize], []).build())
        .withEntityModels([getModelsMapping(namespace).Prize])
        .includeHashedKeys(),
    [namespace]
  );

  const { entities, isSubscribed } = useSdkSubscribeEntities({
    query,
  });
  return { entities, isSubscribed };
};

export const useSubscribeTournamentsQuery = (namespace: string) => {
  const query = useMemo(
    () =>
      new ToriiQueryBuilder()
        .withClause(
          KeysClause(
            [
              getModelsMapping(namespace).Tournament,
              getModelsMapping(namespace).EntryCount,
              getModelsMapping(namespace).Registration,
              getModelsMapping(namespace).Prize,
            ],
            []
          ).build()
        )
        .withEntityModels([
          getModelsMapping(namespace).Tournament,
          getModelsMapping(namespace).EntryCount,
          getModelsMapping(namespace).Registration,
          getModelsMapping(namespace).Prize,
        ])
        .includeHashedKeys(),
    [namespace]
  );

  const { entities, isSubscribed } = useSdkSubscribeEntities({
    query,
  });
  return { entities, isSubscribed };
};

export const useSubscribeTokensQuery = (namespace: string) => {
  const query = useMemo(
    () =>
      new ToriiQueryBuilder()
        .withClause(
          KeysClause([getModelsMapping(namespace).Token], [undefined]).build()
        )
        .withEntityModels([getModelsMapping(namespace).Token])
        .includeHashedKeys(),
    [namespace]
  );

  const { entities, isSubscribed } = useSdkSubscribeEntities({
    query,
  });
  return { entities, isSubscribed };
};

export const useSubscribeMetricsQuery = (namespace: string) => {
  const query = useMemo(
    () =>
      new ToriiQueryBuilder()
        .withClause(
          KeysClause(
            [
              getModelsMapping(namespace).PlatformMetrics,
              getModelsMapping(namespace).PrizeMetrics,
            ],
            [undefined]
          ).build()
        )
        .withEntityModels([
          getModelsMapping(namespace).PlatformMetrics,
          getModelsMapping(namespace).PrizeMetrics,
        ])
        .includeHashedKeys(),
    [namespace]
  );

  const { entities, isSubscribed } = useSdkSubscribeEntities({
    query,
  });
  return { entities, isSubscribed };
};
