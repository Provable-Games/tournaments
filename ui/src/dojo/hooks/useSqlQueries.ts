import { useSqlExecute } from "@/lib/dojo/hooks/useSqlExecute";
import { useMemo } from "react";
import { addAddressPadding, BigNumberish } from "starknet";
import { padU64 } from "@/lib/utils";

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

export const useGetTokens = ({
  namespace,
  active = false,
  limit = 20,
  offset = 0,
  search = "",
  tokenType,
}: {
  namespace: string;
  active?: boolean;
  limit?: number;
  offset?: number;
  search?: string;
  tokenType?: "erc20" | "erc721";
}) => {
  const query = useMemo(
    () =>
      namespace && active
        ? `
    SELECT *
    FROM '${namespace}-Token'
    WHERE is_registered = 1
    ${
      search
        ? `AND (LOWER(name) LIKE '%${search.toLowerCase()}%' OR LOWER(symbol) LIKE '%${search.toLowerCase()}%')`
        : ""
    }
    ${tokenType ? `AND token_type = '${tokenType}'` : ""}
    ORDER BY name ASC
    LIMIT ${limit}
    OFFSET ${offset}
  `
        : null,
    [namespace, active, limit, offset, search, tokenType]
  );
  const { data, loading, error } = useSqlExecute(query);
  return { data, loading, error };
};

export const useGetTokensCount = ({
  namespace,
  active = false,
  search = "",
  tokenType,
}: {
  namespace: string;
  active?: boolean;
  search?: string;
  tokenType?: "erc20" | "erc721";
}) => {
  const query = useMemo(
    () =>
      namespace && active
        ? `
    SELECT COUNT(*) as count
    FROM '${namespace}-Token'
    WHERE is_registered = 1
    ${
      search
        ? `AND (LOWER(name) LIKE '%${search.toLowerCase()}%' OR LOWER(symbol) LIKE '%${search.toLowerCase()}%')`
        : ""
    }
    ${tokenType ? `AND token_type = '${tokenType}'` : ""}
  `
        : null,
    [namespace, active, search, tokenType]
  );
  const { data, loading, error } = useSqlExecute(query);
  return { data: data?.[0]?.count, loading, error };
};

export const useGetTokenByAddress = ({
  namespace,
  address,
  active = false,
}: {
  namespace: string;
  address: string;
  active?: boolean;
}) => {
  const query = useMemo(
    () =>
      namespace && address && active
        ? `
    SELECT *
    FROM '${namespace}-Token'
    WHERE address = '${address}'
    AND is_registered = 1
    LIMIT 1
  `
        : null,
    [namespace, address, active]
  );
  const { data, loading, error } = useSqlExecute(query);
  return { data: data?.[0], loading, error };
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
  currentTime: bigint;
  fromTournamentId?: string;
}) => {
  const query = useMemo(
    () => `
    SELECT COUNT(*) as count 
    FROM '${namespace}-Tournament' m
    WHERE m.'schedule.game.start' > '${padU64(currentTime)}'
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
  currentTime: bigint;
  fromTournamentId?: string;
}) => {
  const query = useMemo(
    () => `
    SELECT COUNT(*) as count 
    FROM '${namespace}-Tournament' m
    WHERE (m.'schedule.game.start' <= '${padU64(
      currentTime
    )}' AND m.'schedule.game.end' > '${padU64(currentTime)}')
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
  currentTime: bigint;
  fromTournamentId?: string;
}) => {
  const query = useMemo(
    () => `
    SELECT COUNT(*) as count 
    FROM '${namespace}-Tournament' m
    WHERE m.'schedule.game.end' <= '${padU64(currentTime)}'
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
  address: string | null;
  gameAddresses: string[];
  tokenIds: string[];
  fromTournamentId?: string;
}) => {
  const tokenIdsKey = useMemo(() => JSON.stringify(tokenIds), [tokenIds]);
  const query = useMemo(
    () =>
      address
        ? `
    WITH registered_tournaments AS (
      SELECT DISTINCT r.tournament_id
      FROM '${namespace}-Registration' r
      WHERE r.game_address IN (${gameAddresses
        .map((addr) => `"${addr}"`)
        .join(",")}) AND r.game_token_id IN (${tokenIds
            ?.map((id) => `"${id}"`)
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
  `
        : null,
    [namespace, address, gameAddresses, tokenIdsKey, fromTournamentId]
  );
  const { data, loading, error, refetch } = useSqlExecute(query);
  return { data: data?.[0]?.count, loading, error, refetch };
};

const getTournamentWhereClause = (
  status: string,
  currentTime: bigint,
  tournamentIds?: string[],
  fromTournamentId?: string
) => {
  let whereClause = "";

  switch (status) {
    case "upcoming":
      whereClause = `WHERE t.'schedule.game.start' > '${padU64(currentTime)}'`;
      break;
    case "live":
      whereClause = `WHERE t.'schedule.game.start' <= '${padU64(
        currentTime
      )}' AND t.'schedule.game.end' > '${padU64(currentTime)}'`;
      break;
    case "ended":
      whereClause = `WHERE t.'schedule.game.end' <= '${padU64(currentTime)}'`;
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
  currentTime?: bigint;
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
    WITH tournament_data AS (
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
        currentTime ?? 0n,
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
    ),
    unique_tokens AS (
      SELECT DISTINCT 
        p.token_address,
        p.token_type,
        tk.symbol,
        tk.name
      FROM tournament_data td
      JOIN '${namespace}-Prize' p ON td.id = p.tournament_id
      LEFT JOIN '${namespace}-Token' tk ON p.token_address = tk.address
      WHERE p.token_type = 'erc20' AND tk.is_registered = 1
      
      UNION
      
      SELECT DISTINCT
        td.'entry_fee.Some.token_address' as token_address,
        'erc20' as token_type,
        tk.symbol,
        tk.name
      FROM tournament_data td
      LEFT JOIN '${namespace}-Token' tk ON td.'entry_fee.Some.token_address' = tk.address
      WHERE td.'entry_fee.Some.token_address' IS NOT NULL 
        AND td.'entry_fee.Some.token_address' != 'NULL'
        AND tk.is_registered = 1
    )
    SELECT 
      td.*,
      (SELECT GROUP_CONCAT(
        json_object(
          'address', token_address,
          'type', token_type,
          'symbol', symbol,
          'name', name
        ),
        '|'
      ) FROM unique_tokens) as unique_prize_tokens
    FROM tournament_data td
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

  // Parse the unique tokens from the first result
  const uniqueTokens = data?.[0]?.unique_prize_tokens
    ? data[0].unique_prize_tokens
        .split("|")
        .map((item: string) => {
          try {
            return JSON.parse(item);
          } catch {
            return null;
          }
        })
        .filter(Boolean)
    : [];

  return { data, loading, error, refetch, uniqueTokens };
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
    ),
    tournament_data AS (
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
    ),
    unique_tokens AS (
      SELECT DISTINCT 
        p.token_address,
        p.token_type,
        tk.symbol,
        tk.name
      FROM tournament_data td
      JOIN '${namespace}-Prize' p ON td.id = p.tournament_id
      LEFT JOIN '${namespace}-Token' tk ON p.token_address = tk.address
      WHERE p.token_type = 'erc20' AND tk.is_registered = 1
      
      UNION
      
      SELECT DISTINCT
        td.'entry_fee.Some.token_address' as token_address,
        'erc20' as token_type,
        tk.symbol,
        tk.name
      FROM tournament_data td
      LEFT JOIN '${namespace}-Token' tk ON td.'entry_fee.Some.token_address' = tk.address
      WHERE td.'entry_fee.Some.token_address' IS NOT NULL 
        AND td.'entry_fee.Some.token_address' != 'NULL'
        AND tk.is_registered = 1
    )
    SELECT 
      td.*,
      (SELECT GROUP_CONCAT(
        json_object(
          'address', token_address,
          'type', token_type,
          'symbol', symbol,
          'name', name
        ),
        '|'
      ) FROM unique_tokens) as unique_prize_tokens
    FROM tournament_data td
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

  // Parse the unique tokens from the first result
  const uniqueTokens = data?.[0]?.unique_prize_tokens
    ? data[0].unique_prize_tokens
        .split("|")
        .map((item: string) => {
          try {
            return JSON.parse(item);
          } catch {
            return null;
          }
        })
        .filter(Boolean)
    : [];

  return { data, loading, error, refetch, uniqueTokens };
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

export const useGetMyTournamentEntries = ({
  namespace,
  tournamentId,
  tokenIds,
  active = false,
  offset = 0,
  limit = 1000,
}: {
  namespace: string;
  tournamentId: BigNumberish;
  tokenIds: number[];
  active?: boolean;
  offset?: number;
  limit?: number;
}) => {
  const tokenIdsKey = useMemo(() => JSON.stringify(tokenIds), [tokenIds]);
  const query = useMemo(
    () =>
      active
        ? `
    SELECT *
    FROM '${namespace}-Registration'
    WHERE tournament_id = '${padU64(
      BigInt(tournamentId)
    )}' AND game_token_id IN (${tokenIds
            .map((id) => `"${padU64(BigInt(id))}"`)
            .join(",")})
    ORDER BY game_token_id DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `
        : null,
    [namespace, tournamentId, tokenIdsKey, offset, limit, active]
  );
  const { data, loading, error, refetch } = useSqlExecute(query);
  return { data, loading, error, refetch };
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
      .map((id) => `"${padU64(BigInt(id))}"`)
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
    WHERE qe.tournament_id = '${padU64(BigInt(tournamentId))}'
    ${getTournamentQualificationWhereClause(qualifications)}
  `
        : null,
    [namespace, tournamentId, qualificationsKey, active]
  );
  const { data, loading, error } = useSqlExecute(query);
  return { data, loading, error };
};

export const useGetTournamentExtensionEntries = ({
  namespace,
  tournamentId,
  extensionAddress,
  active = false,
}: {
  namespace: string;
  tournamentId: BigNumberish;
  extensionAddress: string;
  active?: boolean;
}) => {
  const query = useMemo(
    () =>
      active && namespace && tournamentId && extensionAddress
        ? `
    SELECT * FROM '${namespace}-ExtensionEntries' ee
    WHERE ee.tournament_id = '${padU64(BigInt(tournamentId))}'
    AND ee.extension_address = '${addAddressPadding(extensionAddress)}'
  `
        : null,
    [namespace, tournamentId, extensionAddress, active]
  );
  const { data, loading, error } = useSqlExecute(query);
  return { data, loading, error };
};

export const useGetTournamentPrizes = ({
  namespace,
  tournamentId,
  active = false,
  startPosition = 1,
  endPosition = 3,
}: {
  namespace: string;
  tournamentId: BigNumberish;
  active?: boolean;
  startPosition?: number;
  endPosition?: number;
}) => {
  const query = useMemo(
    () =>
      active && namespace && tournamentId
        ? `
    SELECT * FROM '${namespace}-Prize'
    WHERE tournament_id = '${padU64(BigInt(tournamentId))}'
      AND payout_position >= ${startPosition}
      AND payout_position <= ${endPosition}
    ORDER BY payout_position ASC
  `
        : null,
    [namespace, tournamentId, active, startPosition, endPosition]
  );
  const { data, loading, error, refetch } = useSqlExecute(query);
  return { data, loading, error, refetch };
};

export const useGetAllTournamentPrizes = ({
  namespace,
  tournamentId,
  active = false,
}: {
  namespace: string;
  tournamentId: BigNumberish;
  active?: boolean;
}) => {
  const query = useMemo(
    () =>
      active && namespace && tournamentId
        ? `
    SELECT * FROM '${namespace}-Prize'
    WHERE tournament_id = '${padU64(BigInt(tournamentId))}'
    ORDER BY payout_position ASC
  `
        : null,
    [namespace, tournamentId, active]
  );
  const { data, loading, error, refetch } = useSqlExecute(query);
  return { data, loading, error, refetch };
};

export const useGetTournamentPrizesAggregations = ({
  namespace,
  tournamentId,
  active = false,
}: {
  namespace: string;
  tournamentId: BigNumberish;
  active?: boolean;
}) => {
  const query = useMemo(
    () =>
      active && namespace && tournamentId
        ? `
    WITH prize_data AS (
      SELECT 
        p.*,
        p."token_type.erc20.amount" as erc20_amount,
        p."token_type.erc721.id" as erc721_id,
        CASE 
          WHEN p.token_type = 'erc721' THEN 1
          ELSE 0
        END as is_nft
      FROM '${namespace}-Prize' p
      WHERE p.tournament_id = '${padU64(BigInt(tournamentId))}'
    ),
    token_aggregates AS (
      SELECT 
        pd.token_address,
        pd.token_type,
        t.symbol,
        t.name,
        CASE 
          WHEN pd.token_type = 'erc20' THEN 
            GROUP_CONCAT(
              CASE 
                WHEN pd.erc20_amount IS NOT NULL AND pd.erc20_amount != 'NULL' 
                THEN pd.erc20_amount
                ELSE NULL 
              END,
              ','
            )
          ELSE NULL
        END as total_amount,
        COUNT(CASE WHEN pd.token_type = 'erc721' THEN 1 END) as nft_count
      FROM prize_data pd
      LEFT JOIN '${namespace}-Token' t ON pd.token_address = t.address
      GROUP BY pd.token_address, pd.token_type, t.symbol, t.name
    ),
    position_count AS (
      SELECT COUNT(DISTINCT payout_position) as distinct_positions
      FROM prize_data
    ),
    final_aggregates AS (
      SELECT 
        COUNT(*) as total_prizes,
        MAX(payout_position) as lowest_prize_position,
        SUM(is_nft) as total_nfts,
        COUNT(DISTINCT token_address) as unique_tokens
      FROM prize_data
    )
    SELECT 
      fa.total_prizes,
      fa.lowest_prize_position,
      fa.total_nfts,
      fa.unique_tokens,
      pc.distinct_positions,
      (
        SELECT GROUP_CONCAT(
          json_object(
            'tokenAddress', token_address,
            'tokenType', token_type,
            'tokenSymbol', symbol,
            'tokenName', name,
            'totalAmount', total_amount,
            'nftCount', nft_count
          ),
          '|'
        )
        FROM token_aggregates
        WHERE token_address IS NOT NULL
      ) as token_totals
    FROM final_aggregates fa
    CROSS JOIN position_count pc
  `
        : null,
    [namespace, tournamentId, active]
  );
  const { data, loading, error } = useSqlExecute(query);

  // Parse the token_totals string into an array and sum hex amounts
  const parsedData = data?.[0]
    ? {
        ...data[0],
        token_totals: data[0].token_totals
          ? data[0].token_totals
              .split("|")
              .map((item: string) => {
                try {
                  const parsed = JSON.parse(item);
                  if (parsed.totalAmount && parsed.tokenType === "erc20") {
                    // Sum all hex amounts from the comma-separated list
                    const amounts = parsed.totalAmount
                      .split(",")
                      .filter((a: string) => a && a !== "NULL");
                    const totalAmount = amounts.reduce(
                      (sum: bigint, hexAmount: string) => {
                        try {
                          return sum + BigInt(hexAmount);
                        } catch (e) {
                          console.warn(
                            "Failed to parse hex amount:",
                            hexAmount,
                            e
                          );
                          return sum;
                        }
                      },
                      0n
                    );
                    return { ...parsed, totalAmount: totalAmount.toString() };
                  }
                  return parsed;
                } catch {
                  return null;
                }
              })
              .filter(Boolean)
          : [],
      }
    : null;

  return { data: parsedData, loading, error };
};

export const useGetTournamentPrizePositions = ({
  namespace,
  tournamentId,
  active = false,
}: {
  namespace: string;
  tournamentId: BigNumberish;
  active?: boolean;
}) => {
  const query = useMemo(
    () =>
      active && namespace && tournamentId
        ? `
    SELECT DISTINCT payout_position
    FROM '${namespace}-Prize'
    WHERE tournament_id = '${padU64(BigInt(tournamentId))}'
    ORDER BY payout_position ASC
  `
        : null,
    [namespace, tournamentId, active]
  );
  const { data, loading, error } = useSqlExecute(query);
  return {
    data: data?.map((row) => row.payout_position) || [],
    loading,
    error,
  };
};

export const useGetTournamentPrizeClaims = ({
  namespace,
  tournamentId,
  active = false,
}: {
  namespace: string;
  tournamentId: BigNumberish;
  active?: boolean;
}) => {
  const query = useMemo(
    () =>
      active && namespace && tournamentId
        ? `
    SELECT *
    FROM '${namespace}-PrizeClaim'
    WHERE tournament_id = '${padU64(BigInt(tournamentId))}'
  `
        : null,
    [namespace, tournamentId, active]
  );
  const { data, loading, error } = useSqlExecute(query);
  return { data, loading, error };
};

export const useGetTournamentPrizeClaimsAggregations = ({
  namespace,
  tournamentId,
  active = false,
}: {
  namespace: string;
  tournamentId: BigNumberish;
  active?: boolean;
}) => {
  const query = useMemo(
    () =>
      active && namespace && tournamentId
        ? `
    WITH prize_counts AS (
      SELECT
        -- Count sponsored prizes
        (SELECT COUNT(*) FROM '${namespace}-Prize' WHERE tournament_id = '${padU64(BigInt(tournamentId))}') as sponsored_count,

        -- Count entry fee prizes
        (SELECT
          CASE
            WHEN '${namespace}-Tournament'.id = '${padU64(BigInt(tournamentId))}'
              AND '${namespace}-Tournament'.'entry_fee.Some.amount' IS NOT NULL
              AND '${namespace}-Tournament'.'entry_fee.Some.amount' != '0'
            THEN
              -- Game creator share (0 or 1)
              CASE
                WHEN '${namespace}-Tournament'.'entry_fee.Some.game_creator_share.Some' IS NOT NULL
                  AND '${namespace}-Tournament'.'entry_fee.Some.game_creator_share.Some' != '0'
                THEN 1 ELSE 0
              END
              +
              -- Tournament creator share (0 or 1)
              CASE
                WHEN '${namespace}-Tournament'.'entry_fee.Some.tournament_creator_share.Some' IS NOT NULL
                  AND '${namespace}-Tournament'.'entry_fee.Some.tournament_creator_share.Some' != '0'
                THEN 1 ELSE 0
              END
              +
              -- Count non-zero distribution positions
              (SELECT COUNT(*)
               FROM json_each('${namespace}-Tournament'.'entry_fee.Some.distribution')
               WHERE CAST(value AS INTEGER) > 0)
            ELSE 0
          END
         FROM '${namespace}-Tournament'
         WHERE id = '${padU64(BigInt(tournamentId))}'
        ) as entry_fee_count,

        -- Count claimed prizes
        (SELECT COUNT(*)
         FROM '${namespace}-PrizeClaim'
         WHERE tournament_id = '${padU64(BigInt(tournamentId))}'
           AND claimed = 1
        ) as claimed_count,

        -- Get claimed prizes details
        (SELECT GROUP_CONCAT(
          json_object('prizeType', prize_type, 'claimed', claimed),
          '|'
         )
         FROM '${namespace}-PrizeClaim'
         WHERE tournament_id = '${padU64(BigInt(tournamentId))}'
           AND claimed = 1
        ) as claimed_prizes
    )
    SELECT
      sponsored_count + COALESCE(entry_fee_count, 0) as total_prizes,
      claimed_count as total_claimed,
      sponsored_count + COALESCE(entry_fee_count, 0) - claimed_count as total_unclaimed,
      claimed_prizes
    FROM prize_counts
  `
        : null,
    [namespace, tournamentId, active]
  );

  const { data, loading, error } = useSqlExecute(query);

  const parsedData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const row = data[0];

    let claimedPrizes = [];
    if (row.claimed_prizes) {
      try {
        claimedPrizes = row.claimed_prizes
          .split("|")
          .filter((p: string) => p)
          .map((p: string) => JSON.parse(p));
      } catch (e) {
        console.error("Error parsing claimed prizes:", e);
      }
    }

    return {
      total_prizes: Number(row.total_prizes) || 0,
      total_claimed: Number(row.total_claimed) || 0,
      total_unclaimed: Number(row.total_unclaimed) || 0,
      claimed_prizes: claimedPrizes,
    };
  }, [data]);

  return { data: parsedData, loading, error };
};
