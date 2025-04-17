import { useCallback, useEffect, useState, useMemo } from "react";
import { BigNumberish } from "starknet";
import { QueryType, ParsedEntity } from "@dojoengine/sdk";
import { useDojo } from "@/context/dojo";
import { SchemaType } from "@/generated/models.gen";
import { useDojoStore } from "@/dojo/hooks/useDojoStore";
import { useNetwork } from "@starknet-react/core";

export type TournamentGetQuery = QueryType<SchemaType>;

export type EntityResult<N extends string = string> = {
  entityId: BigNumberish;
} & Partial<SchemaType[N]>;

export type UseSdkGetEntitiesResult<N extends string = string> = {
  entities: EntityResult<N>[] | null;
  isLoading: boolean;
  refetch: () => void;
};
export type UseSdkGetEntityResult = {
  isLoading: boolean;
  refetch: () => void;
};

export type UseSdkGetEntitiesProps = {
  query: any;
  namespace: string;
  enabled?: boolean;
};

export const useSdkGetEntities = ({
  query,
  namespace,
  enabled = true,
}: UseSdkGetEntitiesProps): UseSdkGetEntitiesResult => {
  const { sdk } = useDojo();
  const { chain } = useNetwork();
  const [isLoading, setIsLoading] = useState(false);
  const [entities, setEntities] = useState<
    EntityResult<typeof namespace>[] | null
  >(null);
  const state = useDojoStore((state) => state);

  const memoizedQuery = useMemo(() => query, [JSON.stringify(query)]);

  const fetchEntities = useCallback(async () => {
    setIsLoading(true);
    try {
      setIsLoading(true);
      // TODO: investigate emppty results when changing network (seems state related)
      const entities = await sdk.getEntities({
        query: memoizedQuery,
      });
      // console.log("entities", entities);
      // console.log("query", memoizedQuery);
      // console.log("running for chain", chain);
      // console.log("running for namespace", namespace);
      entities.forEach((entity) => {
        state.updateEntity(entity as Partial<ParsedEntity<SchemaType>>);
      });
      setEntities(
        entities.map(
          (e: any) =>
            ({
              entityId: e.entityId,
              ...e.models[namespace],
            } as EntityResult<typeof namespace>)
        )
      );
    } catch (error) {
      console.error("useSdkGetEntities() exception:", error);
    } finally {
      setIsLoading(false);
    }
  }, [sdk, memoizedQuery, namespace, chain]);

  useEffect(() => {
    if (enabled) {
      fetchEntities();
    }
  }, [fetchEntities, enabled, namespace, chain]);

  return {
    entities,
    isLoading,
    refetch: fetchEntities,
  };
};
