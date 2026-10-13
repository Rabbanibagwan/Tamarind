import { useCallback, useEffect, useState } from "react";
import { liveQuery } from "dexie";

export function useLiveQuery<T>(
  querier: () => Promise<T>,
  deps: unknown[] = [],
  initial: T,
): T {
  const [value, setValue] = useState<T>(initial);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stable = useCallback(querier, deps);

  useEffect(() => {
    const observable = liveQuery(stable);
    const sub = observable.subscribe({
      next: (v) => setValue(v),
      error: (err) => console.error(err),
    });
    return () => sub.unsubscribe();
  }, [stable]);

  return value;
}
