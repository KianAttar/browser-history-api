import { matchRoutes, type RouteMatch } from "./match";
import type { RouteObject } from "./types";

export interface RouterLocation {
  pathname: string;
  search: string;
  hash: string;
}

export interface RouterState {
  location: RouterLocation;
  matches: RouteMatch[] | null;
}

export interface NavigateOptions {
  state?: unknown;
  info?: unknown;
  replace?: boolean;
}

export interface Router {
  getState(): RouterState;
  subscribe(listener: () => void): () => void;
  navigate(to: string, opts?: NavigateOptions): NavigationResult;
  back(opts?: { info?: unknown }): NavigationResult;
  forward(opts?: { info?: unknown }): NavigationResult;
  dispose(): void;
}

function toLocation(url: string): RouterLocation {
  const { pathname, search, hash } = new URL(url);
  return { pathname, search, hash };
}

/** First line of defense per `03-navigate-event-and-interception.md`'s canonical guard. */
function shouldNotIntercept(event: NavigateEvent): boolean {
  return (
    !event.canIntercept ||
    event.hashChange ||
    event.downloadRequest !== null ||
    event.formData !== null
  );
}

export function createRouter(routes: RouteObject[]): Router {
  if (typeof window === "undefined" || !("navigation" in window)) {
    throw new Error(
      "createRouter() requires the Navigation API (window.navigation); this browser doesn't support it."
    );
  }
  const nav = window.navigation;

  // `navigate` never fires for the initial load, so the first match has to be
  // seeded synchronously from the current entry instead of from the event.
  const initialUrl = nav.currentEntry?.url ?? window.location.href;
  const initialLocation = toLocation(initialUrl);
  let state: RouterState = {
    location: initialLocation,
    matches: matchRoutes(routes, initialLocation.pathname),
  };

  const listeners = new Set<() => void>();
  function setState(next: RouterState) {
    state = next;
    listeners.forEach((listener) => listener());
  }

  function onNavigate(event: NavigateEvent) {
    if (shouldNotIntercept(event)) return;

    const location = toLocation(event.destination.url);
    const matches = matchRoutes(routes, location.pathname);
    // No route matches: let the navigation fall through as a real (uninter-
    // cepted) navigation rather than committing to a blank/unknown state.
    if (!matches) return;

    event.intercept({
      handler() {
        setState({ location, matches });
        return Promise.resolve();
      },
    });
  }

  nav.addEventListener("navigate", onNavigate);

  return {
    getState() {
      return state;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    navigate(to, opts = {}) {
      return nav.navigate(to, {
        state: opts.state,
        info: opts.info,
        history: opts.replace ? "replace" : "auto",
      });
    },
    back(opts = {}) {
      return nav.back(opts);
    },
    forward(opts = {}) {
      return nav.forward(opts);
    },
    dispose() {
      nav.removeEventListener("navigate", onNavigate);
      listeners.clear();
    },
  };
}
