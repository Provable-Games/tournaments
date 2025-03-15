import { useCallback, useEffect, useState, useMemo } from "react";
import { BigNumberish } from "starknet";
import { QueryType, ParsedEntity } from "@dojoengine/sdk";
import { useDojo } from "@/context/dojo";
import { SchemaType } from "@/generated/models.gen";
import { useDojoStore } from "@/dojo/hooks/useDojoStore";
import { NAMESPACE } from "@/lib/constants";

export type TournamentGetQuery = QueryType<SchemaType>;

export type EntityResult = {
  entityId: BigNumberish;
} & Partial<SchemaType[typeof NAMESPACE]>;

export type UseSdkGetEntitiesResult = {
  entities: EntityResult[] | null;
  isLoading: boolean;
  refetch: () => void;
};
export type UseSdkGetEntityResult = {
  isLoading: boolean;
  refetch: () => void;
};

export type UseSdkGetEntitiesProps = {
  query: any;
  enabled?: boolean;
};

export const useSdkGetEntities = ({
  query,
  enabled = true,
}: UseSdkGetEntitiesProps): UseSdkGetEntitiesResult => {
  const { sdk, nameSpace } = useDojo();

  const [isLoading, setIsLoading] = useState(false);
  const [entities, setEntities] = useState<EntityResult[] | null>(null);
  const state = useDojoStore((state) => state);

  const memoizedQuery = useMemo(() => query, [JSON.stringify(query)]);

  const fetchEntities = useCallback(async () => {
    setIsLoading(true);
    try {
      setIsLoading(true);
      const entities = await sdk.getEntities({
        query: memoizedQuery,
      });
      entities.forEach((entity) => {
        state.updateEntity(entity as Partial<ParsedEntity<SchemaType>>);
      });
      setEntities(
        entities.map(
          (e: any) =>
            ({
              entityId: e.entityId,
              ...e.models[nameSpace],
            } as any)
        )
      );
    } catch (error) {
      console.error("useSdkGetEntities() exception:", error);
    } finally {
      setIsLoading(false);
    }
  }, [sdk, memoizedQuery]);

  useEffect(() => {
    if (enabled) {
      fetchEntities();
    }
  }, [fetchEntities, enabled]);

  return {
    entities,
    isLoading,
    refetch: fetchEntities,
  };
};
