import { createElement, useContext, type ComponentType, type ReactNode } from "react";
import { RouteContext } from "./context";

export function Outlet(): ReactNode {
  const ctx = useContext(RouteContext);
  if (!ctx) throw new Error("<Outlet> must be used within a <RouterProvider>.");

  const { matches, index } = ctx;
  const match = matches[index];
  if (!match) return null;

  // `Component`/`element` are typed `unknown` in core to keep it framework-
  // agnostic; the React bindings are the one place that knows their real shape.
  const { Component, element } = match.route as { Component?: ComponentType; element?: ReactNode };
  const nextContext = { matches, index: index + 1 };

  // A route with no Component/element (e.g. a `path`-only grouping route used
  // purely to nest children under a shared prefix) renders nothing of its own,
  // so there's no JSX of its own to contain the next <Outlet/> — render it here
  // instead of stopping, or the branch's remaining matches would never appear.
  if (!Component && !element) {
    return createElement(RouteContext.Provider, { value: nextContext }, createElement(Outlet));
  }

  const rendered = Component ? createElement(Component) : element;
  return createElement(RouteContext.Provider, { value: nextContext }, rendered);
}
