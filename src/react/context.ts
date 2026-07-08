import { createContext, useContext } from "react";
import type { RouteMatch, Router } from "../core";

export const RouterContext = createContext<Router | null>(null);

export function useRouterContext(caller: string): Router {
  const router = useContext(RouterContext);
  if (!router) throw new Error(`${caller}() must be used within a <RouterProvider>.`);
  return router;
}

/** Tracks which match in the branch the next nested `<Outlet>` should render. */
export interface RouteContextValue {
  matches: RouteMatch[];
  index: number;
}

export const RouteContext = createContext<RouteContextValue | null>(null);
