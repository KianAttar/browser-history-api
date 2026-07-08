import { createElement, type ReactNode } from "react";
import type { Router } from "../core";
import { RouteContext, RouterContext } from "./context";
import { Outlet } from "./Outlet";
import { useRouterState } from "./useRouterState";

export interface RouterProviderProps {
  router: Router;
}

export function RouterProvider({ router }: RouterProviderProps): ReactNode {
  return createElement(RouterContext.Provider, { value: router }, createElement(RouterProviderInner));
}

function RouterProviderInner(): ReactNode {
  const state = useRouterState("RouterProvider");
  if (!state.matches) return null;

  return createElement(
    RouteContext.Provider,
    { value: { matches: state.matches, index: 0 } },
    createElement(Outlet)
  );
}
