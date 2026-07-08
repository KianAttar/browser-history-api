interface RouteObjectBase {
  path?: string;
  id?: string;
  caseSensitive?: boolean;

  loader?: unknown;
  action?: unknown;
  Component?: unknown;
  element?: unknown;
  ErrorBoundary?: unknown;
  errorElement?: unknown;
  handle?: unknown;
  shouldRevalidate?: unknown;
  lazy?: unknown;
}

/** A leaf route rendered when the URL exactly matches its parent's path. */
export interface IndexRouteObject extends RouteObjectBase {
  index: true;
  children?: undefined;
}

/** A route that may nest further routes under it via `children`. */
export interface NonIndexRouteObject extends RouteObjectBase {
  index?: false;
  children?: RouteObject[];
}

/**
 * One node in the route tree. `index` and `children` are mutually exclusive
 * by construction — an index route is always a leaf.
 */
export type RouteObject = IndexRouteObject | NonIndexRouteObject;
