import { useCallback, useMemo } from "react";
import type { NavigateOptions, RouteMatch, RouterLocation } from "../core";
import { useRouterContext } from "./context";
import { useRouterState } from "./useRouterState";

export function useLocation(): RouterLocation {
  return useRouterState("useLocation").location;
}

export function useMatches(): RouteMatch[] {
  return useRouterState("useMatches").matches ?? [];
}

/** Every match's `params` already covers the whole branch (see match.ts), so any one will do. */
export function useParams<T extends Record<string, string> = Record<string, string>>(): Readonly<T> {
  const matches = useMatches();
  return (matches[matches.length - 1]?.params ?? {}) as Readonly<T>;
}

export function useNavigate(): (to: string, opts?: NavigateOptions) => void {
  const router = useRouterContext("useNavigate");
  return useCallback((to: string, opts?: NavigateOptions) => void router.navigate(to, opts), [router]);
}

export type SetSearchParams = (next: URLSearchParams | string, opts?: NavigateOptions) => void;

export function useSearchParams(): [URLSearchParams, SetSearchParams] {
  const router = useRouterContext("useSearchParams");
  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const setSearchParams = useCallback<SetSearchParams>(
    (next, opts) => {
      const search = typeof next === "string" ? next : next.toString();
      const query = search ? `?${search}` : "";
      // Replacing by default avoids piling up a history entry per keystroke
      // on the common "filters in the query string" pattern; callers can opt out.
      void router.navigate(`${location.pathname}${query}${location.hash}`, { replace: true, ...opts });
    },
    [router, location.pathname, location.hash]
  );

  return [searchParams, setSearchParams];
}
