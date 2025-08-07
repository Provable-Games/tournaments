import { useEffect, useMemo, useState } from "react";
import { BigNumberish } from "starknet";
import { ParsedEntity } from "@dojoengine/sdk";
import { useDojo } from "@/context/dojo";
import { SchemaType } from "@/generated/models.gen";
import { useDojoStore } from "@/dojo/hooks/useDojoStore";

export type EntityResult = {
  entityId: BigNumberish;
} & Partial<SchemaType>;

export type UseSdkSubEntitiesResult = {
  entities: EntityResult[] | null;
  isSubscribed: boolean;
  error?: Error | null;
};

export type UseSdkSubEntitiesProps = {
  query: any;
  logging?: boolean;
  enabled?: boolean;
};

export const useSdkSubscribeEntities = ({
  query,
  enabled = true,
}: UseSdkSubEntitiesProps): UseSdkSubEntitiesResult => {
  const { sdk } = useDojo();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [entities, setEntities] = useState<EntityResult[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const state = useDojoStore((state) => state);

  const memoizedQuery = useMemo(() => {
    return query;
  }, [query]);

  useEffect(() => {
    let _unsubscribe: (() => void) | undefined;

    const _subscribe = async () => {
      if (!memoizedQuery) {
        setIsSubscribed(false);
        setEntities(null);
        return;
      }

      try {
        const [_initialEntities, subscription] = await sdk.subscribeEntityQuery(
          {
            query: memoizedQuery,
            callback: (response) => {
              if (response.error) {
                console.error(
                  "useSdkSubscribeEntities() error:",
                  response.error.message
                );
                setError(new Error(response.error.message));
              } else if (
                response.data &&
                (response.data[0] as Partial<ParsedEntity<SchemaType>>)
                  .entityId !== "0x0"
              ) {
                console.log(
                  "useSdkSubscribeEntities() response.data:",
                  response.data
                );
                response.data.forEach((entity) => {
                  state.updateEntity(
                    entity as Partial<ParsedEntity<SchemaType>>
                  );
                });
                console.log("entities", state.getEntities());
              }
            },
          }
        );

        setIsSubscribed(true);
        setError(null);
        _unsubscribe = () => subscription.cancel();
      } catch (err) {
        console.error("Failed to subscribe to entity query:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsSubscribed(false);
        setEntities(null);
      }
    };

    setIsSubscribed(false);
    if (enabled && memoizedQuery) {
      _subscribe();
    } else {
      setEntities(null);
    }

    return () => {
      setIsSubscribed(false);
      if (_unsubscribe) {
        try {
          _unsubscribe();
        } catch (err) {
          console.error("Error during unsubscribe:", err);
        }
      }
      _unsubscribe = undefined;
    };
  }, [sdk, memoizedQuery, enabled]);

  return {
    entities,
    isSubscribed,
    error,
  };
};
