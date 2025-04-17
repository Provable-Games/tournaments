import { useMemo } from "react";
import { useSdkGetEntities } from "@/lib/dojo/hooks/useSdkGet";
import { useSdkSubscribeEntities } from "@/lib/dojo/hooks/useSdkSub";
import {
  ToriiQueryBuilder,
  KeysClause,
  ClauseBuilder,
  MemberClause,
  AndComposeClause,
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
          AndComposeClause([
            KeysClause(
              [
                getModelsMapping(namespace).Tournament,
                getModelsMapping(namespace).EntryCount,
                getModelsMapping(namespace).Prize,
                getModelsMapping(namespace).PrizeClaim,
                getModelsMapping(namespace).Leaderboard,
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
          ]).build()
        )
        .withEntityModels([
          getModelsMapping(namespace).Tournament,
          getModelsMapping(namespace).EntryCount,
          getModelsMapping(namespace).Prize,
          getModelsMapping(namespace).PrizeClaim,
          getModelsMapping(namespace).Leaderboard,
        ])
        .includeHashedKeys()
        .withLimit(10000),
    [tournamentId, namespace]
  );

  const { entities, isLoading, refetch } = useSdkGetEntities({
    query,
    namespace,
  });
  return { entities, isLoading, refetch };
};

export const useGetRegistrationsForTournamentInTokenListQuery = ({
  tournamentId,
  tokenIds,
  limit,
  offset,
  namespace,
}: {
  tournamentId: BigNumberish;
  tokenIds: BigNumberish[];
  limit: number;
  offset: number;
  namespace: string;
}) => {
  const query = useMemo(
    () =>
      new ToriiQueryBuilder()
        .withClause(
          new ClauseBuilder()
            .compose()
            .and([
              new ClauseBuilder().where(
                getModelsMapping(namespace).Registration,
                "tournament_id",
                "Eq",
                addAddressPadding(tournamentId)
              ),
              new ClauseBuilder().where(
                getModelsMapping(namespace).Registration,
                "game_token_id",
                "In",
                tokenIds
              ),
              new ClauseBuilder().where(
                getModelsMapping(namespace).Registration,
                "entry_number",
                "Gt",
                0
              ),
            ])
            .build()
        )
        .withLimit(limit)
        .withOffset(offset)
        .addOrderBy(
          getModelsMapping(namespace).Registration,
          "entry_number",
          "Asc"
        )
        .withEntityModels([getModelsMapping(namespace).Registration])
        .includeHashedKeys(),
    [tournamentId, tokenIds, limit, offset, namespace]
  );

  const { entities, isLoading, refetch } = useSdkGetEntities({
    query,
    namespace,
  });
  return { entities, isLoading, refetch };
};

export const useGetGameMetadataInListQuery = ({
  gameNamespace,
  gameIds,
}: {
  gameNamespace: string;
  gameIds: BigNumberish[];
}) => {
  const query = useMemo(
    () =>
      new ToriiQueryBuilder()
        .withClause(
          KeysClause([`${gameNamespace}-TokenMetadata`], [])
            .where(`${gameNamespace}-TokenMetadata`, "token_id", "In", gameIds)
            .build()
        )
        .withEntityModels([`${gameNamespace}-TokenMetadata`])
        .includeHashedKeys(),
    [gameNamespace, gameIds]
  );
  const { entities, isLoading, refetch } = useSdkGetEntities({
    query,
    namespace: gameNamespace,
  });
  return { entities, isLoading, refetch };
};

export const useGetGameCounterQuery = ({
  key,
  namespace,
}: {
  key: string;
  namespace: string;
}) => {
  const query = useMemo(
    () =>
      new ToriiQueryBuilder()
        .withClause(
          KeysClause([`${namespace}-GameCounter`], [])
            .where(
              `${namespace}-GameCounter`,
              "key",
              "Eq",
              addAddressPadding(key)
            )
            .build()
        )
        .withEntityModels([`${namespace}-GameCounter`])
        .includeHashedKeys(),
    [namespace, key]
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

export const useGetScoresQuery = (namespace: string, model: string) => {
  const isValidInput = useMemo(() => {
    return Boolean(namespace && model);
  }, [namespace, model]);
  const query = useMemo(
    () =>
      isValidInput
        ? new ToriiQueryBuilder()
            .withClause(KeysClause([`${namespace}-${model}`], []).build())
            .withEntityModels([`${namespace}-${model}`])
            .includeHashedKeys()
        : null,
    [namespace, model, isValidInput]
  );
  const { entities, isLoading, refetch } = useSdkGetEntities({
    query,
    enabled: isValidInput,
    namespace: namespace,
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
          AndComposeClause([
            KeysClause(
              [
                getModelsMapping(namespace).Tournament,
                getModelsMapping(namespace).EntryCount,
                getModelsMapping(namespace).Registration,
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
            [getModelsMapping(namespace).Tournament],
            [undefined]
          ).build()
        )
        .withEntityModels([getModelsMapping(namespace).Tournament])
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

export const useSubscribeGamesQuery = ({
  gameNamespace,
}: {
  gameNamespace: string;
}) => {
  const isValidInput = useMemo(() => {
    return Boolean(gameNamespace);
  }, [gameNamespace]);
  const query = useMemo(
    () =>
      isValidInput
        ? new ToriiQueryBuilder()
            .withClause(
              KeysClause(
                [`${gameNamespace}-Game`, `${gameNamespace}-TokenMetadata`],
                []
              ).build()
            )
            .withEntityModels([
              `${gameNamespace}-Game`,
              `${gameNamespace}-TokenMetadata`,
            ])
            .includeHashedKeys()
        : null,
    [gameNamespace, isValidInput]
  );
  const { entities, isSubscribed } = useSdkSubscribeEntities({
    query,
    enabled: isValidInput,
  });
  return { entities, isSubscribed };
};

export const useSubscribeScoresQuery = (namespace?: string, model?: string) => {
  const isValidInput = useMemo(() => {
    return Boolean(namespace && model);
  }, [namespace, model]);

  const query = useMemo(
    () =>
      isValidInput
        ? new ToriiQueryBuilder()
            .withClause(KeysClause([`${namespace}-${model}`], []).build())
            .withEntityModels([`${namespace}-${model}`])
            .includeHashedKeys()
        : null,
    [namespace, model, isValidInput]
  );

  const { entities, isSubscribed } = useSdkSubscribeEntities({
    query,
    enabled: isValidInput,
  });

  return { entities, isSubscribed };
};
