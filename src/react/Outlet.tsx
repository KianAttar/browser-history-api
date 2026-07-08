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
  const rendered = Component ? createElement(Component) : (element ?? null);

  return createElement(RouteContext.Provider, { value: { matches, index: index + 1 } }, rendered);
}
