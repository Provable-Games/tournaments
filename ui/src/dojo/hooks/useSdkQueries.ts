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
import { ModelsMapping } from "@/generated/models.gen";
import { addAddressPadding, BigNumberish } from "starknet";

export const useGetTokensQuery = (nameSpace: string) => {
  const query = useMemo(
    () =>
      new ToriiQueryBuilder()
        .withClause(KeysClause([ModelsMapping.Token], []).build())
        .withEntityModels([ModelsMapping.Token])
        .includeHashedKeys(),
    []
  );

  const { entities, isLoading, refetch } = useSdkGetEntities({
    query,
    nameSpace,
  });
  return { entities, isLoading, refetch };
};

export const useGetMetricsQuery = (key: string, nameSpace: string) => {
  const query = useMemo(
    () =>
      new ToriiQueryBuilder()
        .withClause(
          KeysClause(
            [ModelsMapping.PlatformMetrics, ModelsMapping.PrizeMetrics],
            []
          )
            .where(
              ModelsMapping.PlatformMetrics,
              "key",
              "Eq",
              addAddressPadding(key)
            )
            .build()
        )
        .withEntityModels([
          ModelsMapping.PlatformMetrics,
          ModelsMapping.PrizeMetrics,
        ])
        .includeHashedKeys(),
    [key]
  );
  const { entities, isLoading, refetch } = useSdkGetEntities({
    query,
    nameSpace,
  });
  const entity = useMemo(
    () => (Array.isArray(entities) ? entities[0] : entities),
    [entities]
  );
  return { entity, isLoading, refetch };
};

export const useGetTournamentQuery = (
  tournamentId: BigNumberish,
  nameSpace: string
) => {
  const query = useMemo(
    () =>
      new ToriiQueryBuilder()
        .withClause(
          AndComposeClause([
            KeysClause(
              [
                ModelsMapping.Tournament,
                ModelsMapping.EntryCount,
                ModelsMapping.Prize,
                ModelsMapping.PrizeClaim,
                ModelsMapping.Leaderboard,
              ],
              []
            ),
            MemberClause(
              ModelsMapping.Tournament,
              "id",
              "Eq",
              addAddressPadding(tournamentId)
            ),
            MemberClause(
              ModelsMapping.EntryCount,
              "tournament_id",
              "Eq",
              addAddressPadding(tournamentId)
            ),
            MemberClause(
              ModelsMapping.Prize,
              "tournament_id",
              "Eq",
              addAddressPadding(tournamentId)
            ),
            MemberClause(
              ModelsMapping.PrizeClaim,
              "tournament_id",
              "Eq",
              addAddressPadding(tournamentId)
            ),
            MemberClause(
              ModelsMapping.Leaderboard,
              "tournament_id",
              "Eq",
              addAddressPadding(tournamentId)
            ),
          ]).build()
        )
        .withEntityModels([
          ModelsMapping.Tournament,
          ModelsMapping.EntryCount,
          ModelsMapping.Prize,
          ModelsMapping.PrizeClaim,
          ModelsMapping.Leaderboard,
        ])
        .includeHashedKeys()
        .withLimit(10000),
    [tournamentId]
  );

  const { entities, isLoading, refetch } = useSdkGetEntities({
    query,
    nameSpace,
  });
  return { entities, isLoading, refetch };
};

export const useGetRegistrationsForTournamentInTokenListQuery = ({
  tournamentId,
  tokenIds,
  limit,
  offset,
  nameSpace,
}: {
  tournamentId: BigNumberish;
  tokenIds: BigNumberish[];
  limit: number;
  offset: number;
  nameSpace: string;
}) => {
  const tokenIdsKey = useMemo(() => {
    return tokenIds.join(",");
  }, [tokenIds]);

  const query = useMemo(
    () =>
      new ToriiQueryBuilder()
        .withClause(
          new ClauseBuilder()
            .compose()
            .and([
              new ClauseBuilder().where(
                ModelsMapping.Registration,
                "tournament_id",
                "Eq",
                addAddressPadding(tournamentId)
              ),
              new ClauseBuilder().where(
                ModelsMapping.Registration,
                "game_token_id",
                "In",
                tokenIds
              ),
              new ClauseBuilder().where(
                ModelsMapping.Registration,
                "entry_number",
                "Gt",
                0
              ),
            ])
            .build()
        )
        .withLimit(limit)
        .withOffset(offset)
        .addOrderBy(ModelsMapping.Registration, "entry_number", "Asc")
        .withEntityModels([ModelsMapping.Registration])
        .includeHashedKeys(),
    [tournamentId, tokenIdsKey, limit, offset]
  );

  const { entities, isLoading, refetch } = useSdkGetEntities({
    query,
    nameSpace,
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
    nameSpace: gameNamespace,
  });
  return { entities, isLoading, refetch };
};

export const useGetGameCounterQuery = ({
  key,
  nameSpace,
}: {
  key: string;
  nameSpace: string;
}) => {
  const query = useMemo(
    () =>
      new ToriiQueryBuilder()
        .withClause(
          KeysClause([`${nameSpace}-GameCounter`], [])
            .where(
              `${nameSpace}-GameCounter`,
              "key",
              "Eq",
              addAddressPadding(key)
            )
            .build()
        )
        .withEntityModels([`${nameSpace}-GameCounter`])
        .includeHashedKeys(),
    [nameSpace, key]
  );

  const { entities, isLoading, refetch } = useSdkGetEntities({
    query,
    nameSpace,
  });
  const entity = useMemo(
    () => (Array.isArray(entities) ? entities[0] : entities),
    [entities]
  );
  return { entity, isLoading, refetch };
};

export const useGetGameSettingsQuery = (
  namespace: string,
  settingsModel: string
) => {
  const query = useMemo(
    () =>
      new ToriiQueryBuilder()
        .withClause(
          KeysClause(
            [`${namespace}-SettingsDetails`, `${namespace}-${settingsModel}`],
            []
          ).build()
        )
        .withEntityModels([
          `${namespace}-SettingsDetails`,
          `${namespace}-${settingsModel}`,
        ])
        .includeHashedKeys(),
    [namespace, settingsModel]
  );

  const { entities, isLoading, refetch } = useSdkGetEntities({
    query,
    nameSpace: namespace,
  });
  return { entities, isLoading, refetch };
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
    nameSpace: namespace,
  });
  return { entities, isLoading, refetch };
};

export const useSubscribeTournamentQuery = (tournamentId: BigNumberish) => {
  const query = useMemo(
    () =>
      new ToriiQueryBuilder()
        .withClause(
          AndComposeClause([
            KeysClause(
              [
                ModelsMapping.Tournament,
                ModelsMapping.EntryCount,
                ModelsMapping.Registration,
              ],
              [undefined]
            ),
            MemberClause(
              ModelsMapping.Tournament,
              "id",
              "Eq",
              addAddressPadding(tournamentId)
            ),
            MemberClause(
              ModelsMapping.EntryCount,
              "tournament_id",
              "Eq",
              addAddressPadding(tournamentId)
            ),
            MemberClause(
              ModelsMapping.Registration,
              "tournament_id",
              "Eq",
              addAddressPadding(tournamentId)
            ),
            MemberClause(
              ModelsMapping.Prize,
              "tournament_id",
              "Eq",
              addAddressPadding(tournamentId)
            ),
          ]).build()
        )
        .withEntityModels([
          ModelsMapping.Tournament,
          ModelsMapping.EntryCount,
          ModelsMapping.Registration,
          ModelsMapping.Prize,
        ])
        .includeHashedKeys(),
    [tournamentId]
  );

  const { entities, isSubscribed } = useSdkSubscribeEntities({
    query,
  });
  return { entities, isSubscribed };
};

export const useSubscribePrizesQuery = () => {
  const query = useMemo(
    () =>
      new ToriiQueryBuilder()
        .withClause(KeysClause([ModelsMapping.Prize], []).build())
        .withEntityModels([ModelsMapping.Prize])
        .includeHashedKeys(),
    []
  );

  const { entities, isSubscribed } = useSdkSubscribeEntities({
    query,
  });
  return { entities, isSubscribed };
};

export const useSubscribeTournamentsQuery = () => {
  const query = useMemo(
    () =>
      new ToriiQueryBuilder()
        .withClause(KeysClause([ModelsMapping.Tournament], [undefined]).build())
        .withEntityModels([ModelsMapping.Tournament])
        .includeHashedKeys(),
    []
  );

  const { entities, isSubscribed } = useSdkSubscribeEntities({
    query,
  });
  return { entities, isSubscribed };
};

export const useSubscribeTokensQuery = () => {
  const query = useMemo(
    () =>
      new ToriiQueryBuilder()
        .withClause(KeysClause([ModelsMapping.Token], [undefined]).build())
        .withEntityModels([ModelsMapping.Token])
        .includeHashedKeys(),
    []
  );

  const { entities, isSubscribed } = useSdkSubscribeEntities({
    query,
  });
  return { entities, isSubscribed };
};

export const useSubscribeGamesMetadataQuery = ({
  gameNamespace,
}: {
  gameNamespace: string;
}) => {
  const query = useMemo(
    () =>
      new ToriiQueryBuilder()
        .withClause(KeysClause([`${gameNamespace}-TokenMetadata`], []).build())
        .withEntityModels([`${gameNamespace}-TokenMetadata`])
        .includeHashedKeys(),
    [gameNamespace]
  );
  const { entities, isSubscribed } = useSdkSubscribeEntities({
    query,
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
