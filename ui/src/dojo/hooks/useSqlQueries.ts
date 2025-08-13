import { useSqlExecute } from "@/lib/dojo/hooks/useSqlExecute";
import { useMemo } from "react";
import { addAddressPadding, BigNumberish } from "starknet";

export const useGetGameSettingsCount = ({
  namespace,
  active = false,
}: {
  namespace: string;
  active?: boolean;
}) => {
  const query = useMemo(
    () =>
      namespace && active
        ? `
    SELECT COUNT(*) as count
    FROM '${namespace}-GameSettingsMetadata' sm
  `
        : null,
    [namespace, active]
  );
  const { data, loading, error } = useSqlExecute(query);
  return { data: data?.[0]?.count, loading, error };
};

export const useGetGameSetting = ({
  namespace,
  settingsModel,
  settingsId,
  active = false,
}: {
  namespace: string;
  settingsModel: string;
  settingsId?: number;
  active?: boolean;
}) => {
  const query = useMemo(
    () =>
      namespace && settingsModel && active
        ? `
    SELECT s.*, sm.name, sm.description, sm.created_at, sm.created_by
    FROM '${namespace}-${settingsModel}' s
    LEFT JOIN '${namespace}-GameSettingsMetadata' sm ON s.settings_id = sm.settings_id
    WHERE s.settings_id = '${settingsId}'
  `
        : null,
    [namespace, settingsModel, active, settingsId]
  );
  const { data, loading, error } = useSqlExecute(query);
  return { data, loading, error };
};

export const useGetGameSettings = ({
  namespace,
  settingsModel,
  active = false,
  limit = 10,
  offset = 0,
}: {
  namespace: string;
  settingsModel: string;
  active?: boolean;
  limit?: number;
  offset?: number;
}) => {
  const query = useMemo(
    () =>
      namespace && settingsModel && active
        ? `
    SELECT s.*, sm.name, sm.description, sm.created_at, sm.created_by
    FROM '${namespace}-${settingsModel}' s
    LEFT JOIN '${namespace}-GameSettingsMetadata' sm ON s.settings_id = sm.settings_id
    LIMIT ${limit}
    OFFSET ${offset}
  `
        : null,
    [namespace, settingsModel, active, limit, offset]
  );
  const { data, loading, error } = useSqlExecute(query);
  return { data, loading, error };
};

export const useGetTournamentsCount = ({
  namespace,
  fromTournamentId,
}: {
  namespace: string;
  fromTournamentId?: string;
}) => {
  const query = useMemo(
    () =>
      namespace
        ? `
    SELECT COUNT(*) as count 
    FROM '${namespace}-Tournament' m
    ${fromTournamentId ? `WHERE m.id > '${fromTournamentId}'` : ""}
  `
        : null,
    [namespace, fromTournamentId]
  );
  const { data, loading, error } = useSqlExecute(query);
  return { data: data?.[0]?.count, loading, error };
};

export const useGetUpcomingTournamentsCount = ({
  namespace,
  currentTime,
  fromTournamentId,
}: {
  namespace: string;
  currentTime: string;
  fromTournamentId?: string;
}) => {
  const query = useMemo(
    () => `
    SELECT COUNT(*) as count 
    FROM '${namespace}-Tournament' m
    WHERE m.'schedule.game.start' > '${currentTime}'
    ${fromTournamentId ? `AND m.id > '${fromTournamentId}'` : ""}
  `,
    [namespace, currentTime, fromTournamentId]
  );
  const { data, loading, error, refetch } = useSqlExecute(query);
  return { data: data?.[0]?.count, loading, error, refetch };
};

export const useGetLiveTournamentsCount = ({
  namespace,
  currentTime,
  fromTournamentId,
}: {
  namespace: string;
  currentTime: string;
  fromTournamentId?: string;
}) => {
  const query = useMemo(
    () => `
    SELECT COUNT(*) as count 
    FROM '${namespace}-Tournament' m
    WHERE (m.'schedule.game.start' <= '${currentTime}' AND m.'schedule.game.end' > '${currentTime}')
    ${fromTournamentId ? `AND m.id > '${fromTournamentId}'` : ""}
  `,
    [namespace, currentTime, fromTournamentId]
  );
  const { data, loading, error, refetch } = useSqlExecute(query);
  return { data: data?.[0]?.count, loading, error, refetch };
};

export const useGetEndedTournamentsCount = ({
  namespace,
  currentTime,
  fromTournamentId,
}: {
  namespace: string;
  currentTime: string;
  fromTournamentId?: string;
}) => {
  const query = useMemo(
    () => `
    SELECT COUNT(*) as count 
    FROM '${namespace}-Tournament' m
    WHERE m.'schedule.game.end' <= '${currentTime}'
    ${fromTournamentId ? `AND m.id > '${fromTournamentId}'` : ""}
  `,
    [namespace, currentTime, fromTournamentId]
  );
  const { data, loading, error, refetch } = useSqlExecute(query);
  return { data: data?.[0]?.count, loading, error, refetch };
};

export const useGetMyTournamentsCount = ({
  namespace,
  address,
  gameAddresses,
  tokenIds,
  fromTournamentId,
}: {
  namespace: string;
  address: string;
  gameAddresses: string[];
  tokenIds: string[];
  fromTournamentId?: string;
}) => {
  const tokenIdsKey = useMemo(() => JSON.stringify(tokenIds), [tokenIds]);
  const query = useMemo(
    () => `
    WITH registered_tournaments AS (
      SELECT DISTINCT r.tournament_id
      FROM '${namespace}-Registration' r
      WHERE r.game_address IN (${gameAddresses
        .map((addr) => `"${addr}"`)
        .join(",")}) AND r.game_token_id IN (${tokenIds
      .map((id) => `"${id}"`)
      .join(",")})
    ),
    filtered_tournaments AS (
      SELECT rt.tournament_id
      FROM registered_tournaments rt
      JOIN '${namespace}-Tournament' t 
        ON rt.tournament_id = t.id
          ${fromTournamentId ? `AND t.id > '${fromTournamentId}'` : ""}
    )
    SELECT COUNT(DISTINCT tournament_id) as count
    FROM filtered_tournaments
  `,
    [namespace, address, gameAddresses, tokenIdsKey, fromTournamentId]
  );
  const { data, loading, error, refetch } = useSqlExecute(query);
  return { data: data?.[0]?.count, loading, error, refetch };
};

const getTournamentWhereClause = (
  status: string,
  currentTime: string,
  tournamentIds?: string[],
  fromTournamentId?: string
) => {
  let whereClause = "";

  switch (status) {
    case "upcoming":
      whereClause = `WHERE t.'schedule.game.start' > '${currentTime}'`;
      break;
    case "live":
      whereClause = `WHERE t.'schedule.game.start' <= '${currentTime}' AND t.'schedule.game.end' > '${currentTime}'`;
      break;
    case "ended":
      whereClause = `WHERE t.'schedule.game.end' <= '${currentTime}'`;
      break;
    case "all":
      whereClause = "WHERE 1=1"; // Use a true condition to make it easier to add more conditions
      break;
    case "tournaments":
      whereClause = `WHERE t.id IN (${tournamentIds
        ?.map((id) => `'${id}'`)
        .join(",")})`;
      break;
  }

  // Add fromTournamentId filter if provided
  if (fromTournamentId && status !== "tournaments") {
    // If we already have a WHERE clause, use AND
    whereClause += ` AND t.id > '${fromTournamentId}'`;
  }

  return whereClause;
};

const getSortClause = (sort: string) => {
  switch (sort) {
    case "start_time":
      return `ORDER BY t.'schedule.game.start' ASC`;
    case "end_time":
      return `ORDER BY t.'schedule.game.end' ASC`;
    case "pot_size":
      // You might need to adjust this based on your actual prize calculation
      return `ORDER BY entry_count DESC`;
    case "players":
      return `ORDER BY entry_count DESC`;
    case "winners":
      return `ORDER BY t.'winners_count' DESC`;
    default:
      return `ORDER BY t.'schedule.game.start' ASC`;
  }
};

export const useGetTournaments = ({
  namespace,
  currentTime,
  gameFilters,
  status,
  tournamentIds,
  fromTournamentId,
  sortBy = "start_time",
  offset = 0,
  limit = 5,
  active = false,
}: {
  namespace: string;
  gameFilters: string[];
  status: string;
  tournamentIds?: string[];
  fromTournamentId?: string;
  currentTime?: string;
  sortBy?: string;
  offset?: number;
  limit?: number;
  active?: boolean;
}) => {
  const tournamentIdsKey = useMemo(
    () => JSON.stringify(tournamentIds),
    [tournamentIds]
  );
  const gameFiltersKey = useMemo(
    () => JSON.stringify(gameFilters || []),
    [gameFilters]
  );
  const query = useMemo(
    () =>
      active
        ? `
    SELECT 
    t.*,
    CASE 
        WHEN COUNT(p.tournament_id) = 0 THEN NULL
        ELSE GROUP_CONCAT(
            json_object(
                'prizeId', p.id,
                'position', p.payout_position,
                'tokenType', p.token_type,
                'tokenAddress', p.token_address,
                'amount', CASE 
                    WHEN p.token_type = 'erc20' THEN p."token_type.erc20.amount"
                    WHEN p.token_type = 'erc721' THEN p."token_type.erc721.id"
                    ELSE NULL 
                END,
                'isValid', CASE 
                    WHEN p.token_type = 'erc20' AND p."token_type.erc20.amount" IS NOT NULL THEN 1
                    WHEN p.token_type = 'erc721' AND p."token_type.erc721.id" IS NOT NULL THEN 1
                    ELSE 0
                END
            ),
            '|'
        )
    END as prizes,
    COALESCE(e.count, 0) as entry_count
    FROM '${namespace}-Tournament' as t
    LEFT JOIN '${namespace}-Prize' p ON t.id = p.tournament_id
    LEFT JOIN '${namespace}-EntryCount' e ON t.id = e.tournament_id
    ${getTournamentWhereClause(
      status,
      currentTime ?? "",
      tournamentIds,
      fromTournamentId
    )}
        ${
          gameFilters.length > 0
            ? `AND t.'game_config.address' IN (${gameFilters
                .map((address) => `'${address}'`)
                .join(",")})`
            : ""
        }
    GROUP BY t.id
    ${getSortClause(sortBy)}
    LIMIT ${limit}
    OFFSET ${offset}
  `
        : null,
    [
      namespace,
      currentTime,
      gameFiltersKey,
      status,
      sortBy,
      offset,
      limit,
      active,
      tournamentIdsKey,
      fromTournamentId,
    ]
  );
  const { data, loading, error, refetch } = useSqlExecute(query);
  return { data, loading, error, refetch };
};

export const useGetMyTournaments = ({
  namespace,
  address,
  gameAddresses,
  tokenIds,
  gameFilters,
  fromTournamentId,
  active = false,
  sortBy = "start_time",
  offset = 0,
  limit = 5,
}: {
  namespace: string;
  address: string | null;
  gameAddresses: string[];
  tokenIds: string[];
  gameFilters: string[];
  fromTournamentId?: string;
  active?: boolean;
  sortBy?: string;
  offset?: number;
  limit?: number;
}) => {
  const gameAddressesKey = useMemo(
    () => JSON.stringify(gameAddresses),
    [gameAddresses]
  );
  const tokenIdsKey = useMemo(() => JSON.stringify(tokenIds), [tokenIds]);
  const gameFiltersKey = useMemo(
    () => JSON.stringify(gameFilters),
    [gameFilters]
  );
  const query = useMemo(
    () =>
      address && active
        ? `
    WITH registered_tournaments AS (
      SELECT DISTINCT r.tournament_id
      FROM '${namespace}-Registration' r
      WHERE r.game_address IN (${gameAddresses
        .map((addr) => `"${addr}"`)
        .join(",")}) AND r.game_token_id IN (${tokenIds
            .map((id) => `"${id}"`)
            .join(",")})
    )
    SELECT 
      t.*,
      CASE 
        WHEN COUNT(p.tournament_id) = 0 THEN NULL
        ELSE GROUP_CONCAT(
          json_object(
            'prizeId', p.id,
            'position', p.payout_position,
            'tokenType', p.token_type,
            'tokenAddress', p.token_address,
            'amount', CASE 
              WHEN p.token_type = 'erc20' THEN p."token_type.erc20.amount"
              WHEN p.token_type = 'erc721' THEN p."token_type.erc721.id"
              ELSE NULL 
            END,
            'isValid', CASE 
              WHEN p.token_type = 'erc20' AND p."token_type.erc20.amount" IS NOT NULL THEN 1
              WHEN p.token_type = 'erc721' AND p."token_type.erc721.id" IS NOT NULL THEN 1
              ELSE 0
            END
          ),
          '|'
        )
      END as prizes,
      COALESCE(e.count, 0) as entry_count
    FROM registered_tournaments rt
    JOIN '${namespace}-Tournament' t 
      ON rt.tournament_id = t.id
    LEFT JOIN '${namespace}-Prize' p ON t.id = p.tournament_id
    LEFT JOIN '${namespace}-EntryCount' e ON t.id = e.tournament_id
    WHERE 1=1
    ${fromTournamentId ? `AND t.id > '${fromTournamentId}'` : ""}
    ${
      gameFilters.length > 0
        ? `AND t.'game_config.address' IN (${gameFilters
            .map((address) => `'${address}'`)
            .join(",")})`
        : ""
    }
    GROUP BY t.id
    ${getSortClause(sortBy)}
    LIMIT ${limit}
    OFFSET ${offset}
    `
        : null,
    [
      namespace,
      address,
      gameAddressesKey,
      tokenIdsKey,
      gameFiltersKey,
      fromTournamentId,
      sortBy,
      offset,
      limit,
      active,
    ]
  );
  const { data, loading, error, refetch } = useSqlExecute(query);
  return { data, loading, error, refetch };
};

export const useGetAccountTokenIds = (
  address: string | null,
  tokenAddresses: string[],
  active = false
) => {
  const tokenAddressesKey = useMemo(
    () => JSON.stringify(tokenAddresses),
    [tokenAddresses]
  );
  const query = useMemo(
    () =>
      address && active
        ? `
    SELECT tb.*, t.metadata
    FROM token_balances tb
    LEFT JOIN tokens t ON tb.token_id = t.id
    WHERE (tb.account_address = "${address}" AND tb.balance != '0x0000000000000000000000000000000000000000000000000000000000000000' AND tb.contract_address IN (${tokenAddresses
            .map((address) => `"${address}"`)
            .join(",")}));
  `
        : null,
    [address, tokenAddressesKey, active]
  );
  const { data, loading, error, refetch } = useSqlExecute(query);
  return { data, loading, error, refetch };
};

export const useGetTournamentEntrants = ({
  namespace,
  tournamentId,
  gameNamespace,
  gameAddress,
  offset = 0,
  limit = 5,
}: {
  namespace: string;
  tournamentId: BigNumberish;
  gameNamespace: string;
  gameAddress: string;
  offset?: number;
  limit?: number;
}) => {
  const isValidInput = useMemo(() => {
    return Boolean(
      namespace &&
        tournamentId &&
        gameNamespace &&
        gameAddress &&
        typeof offset === "number" &&
        typeof limit === "number"
    );
  }, [namespace, tournamentId, gameNamespace, offset, limit]);

  const query = useMemo(
    () =>
      isValidInput
        ? `
    SELECT 
    r.tournament_id,
    r.entry_number,
    r.game_token_id,
    r.has_submitted,
    m.player_name,
    m."lifecycle.mint",
    t.account_address
    FROM '${namespace}-Registration' r
    LEFT JOIN '${gameNamespace}-TokenMetadata' m 
      ON r.game_token_id = m.token_id
    INNER JOIN token_balances t
      ON ('${gameAddress}' || ':' || r.game_token_id) = t.token_id
      AND t.contract_address = '${gameAddress}'
      AND t.balance != '0x0000000000000000000000000000000000000000000000000000000000000000'
    WHERE r.tournament_id = "${addAddressPadding(tournamentId)}"
    ORDER BY r.entry_number DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `
        : null,
    [
      isValidInput,
      namespace,
      tournamentId,
      offset,
      limit,
      gameNamespace,
      gameAddress,
    ]
  );
  const { data, loading, error, refetch } = useSqlExecute(query);
  return { data, loading, error, refetch };
};

export const useGetTournamentLeaderboards = ({
  namespace,
  tournamentIds,
  active = false,
  offset = 0,
  limit = 5,
}: {
  namespace: string;
  tournamentIds: BigNumberish[];
  active?: boolean;
  offset?: number;
  limit?: number;
}) => {
  const tournamentIdsKey = useMemo(
    () => JSON.stringify(tournamentIds),
    [tournamentIds]
  );
  const query = useMemo(
    () =>
      active
        ? `
    SELECT * FROM '${namespace}-Leaderboard'
    WHERE tournament_id IN (${tournamentIds
      .map((id) => `"${addAddressPadding(id)}"`)
      .join(",")})
    ORDER BY tournament_id ASC
    LIMIT ${limit}
    OFFSET ${offset}
  `
        : null,
    [namespace, tournamentIdsKey, offset, limit, active]
  );
  const { data, loading, error } = useSqlExecute(query);
  return { data, loading, error };
};

export const useGetTournamentRegistrants = ({
  namespace,
  gameIds,
  active = false,
  offset = 0,
  limit = 5,
}: {
  namespace: string;
  gameIds: BigNumberish[];
  active?: boolean;
  offset?: number;
  limit?: number;
}) => {
  const gameIdsKey = useMemo(() => JSON.stringify(gameIds), [gameIds]);
  const query = useMemo(
    () =>
      active
        ? `
    SELECT * FROM '${namespace}-Registration'
    WHERE game_token_id IN (${gameIds
      .map((id) => `"${addAddressPadding(id)}"`)
      .join(",")})
    ORDER BY game_token_id ASC
    LIMIT ${limit}
    OFFSET ${offset}
  `
        : null,
    [namespace, gameIdsKey, offset, limit, active]
  );
  const { data, loading, error } = useSqlExecute(query);
  return { data, loading, error };
};

const getTournamentQualificationWhereClause = (
  requirements: Array<{
    type: string;
    tokenId?: string;
    tournamentId?: string;
    gameId?: string;
    position?: number;
    address?: string;
  }>
) => {
  if (!requirements || requirements.length === 0) {
    return "";
  }

  const conditions = requirements
    .map((req) => {
      const { type, tokenId, tournamentId, gameId, position, address } = req;

      switch (type) {
        case "token":
          return `(qe.'qualification_proof.NFT.token_id' = '${tokenId}')`;
        case "tournament":
          return `(qe.'qualification_proof.Tournament.tournament_id' = '${tournamentId}' AND qe.'qualification_proof.Tournament.token_id' = '${gameId}' AND qe.'qualification_proof.Tournament.position' = ${position})`;
        case "allowlist":
          return `(qe.'qualification_proof.Address' = '${address}')`;
        default:
          return null;
      }
    })
    .filter(Boolean);

  if (conditions.length === 0) {
    return "";
  }

  return `AND (${conditions.join(" OR ")})`;
};

export const useGetTournamentQualificationEntries = ({
  namespace,
  tournamentId,
  qualifications,
  active = false,
}: {
  namespace: string;
  tournamentId: BigNumberish;
  qualifications: Array<{
    type: string;
    tokenId?: string;
    tournamentId?: string;
    gameId?: string;
    position?: number;
    address?: string;
  }>;
  active?: boolean;
}) => {
  const qualificationsKey = useMemo(
    () => JSON.stringify(qualifications),
    [qualifications]
  );

  const query = useMemo(
    () =>
      active && namespace && tournamentId
        ? `
    SELECT * FROM '${namespace}-QualificationEntries' qe
    WHERE qe.tournament_id = '${addAddressPadding(tournamentId)}'
    ${getTournamentQualificationWhereClause(qualifications)}
  `
        : null,
    [namespace, tournamentId, qualificationsKey, active]
  );
  const { data, loading, error } = useSqlExecute(query);
  return { data, loading, error };
};
