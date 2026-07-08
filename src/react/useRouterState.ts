import { useSyncExternalStore } from "react";
import type { RouterState } from "../core";
import { useRouterContext } from "./context";

export function useRouterState(caller: string): RouterState {
  const router = useRouterContext(caller);
  return useSyncExternalStore(router.subscribe, router.getState, router.getState);
}
