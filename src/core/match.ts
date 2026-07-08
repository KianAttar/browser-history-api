import type { RouteObject } from "./types";

/** One route in a matched branch, with its cumulative URL params and pathname. */
export interface RouteMatch<TRoute extends RouteObject = RouteObject> {
  route: TRoute;
  /** All params captured anywhere in the branch, not just by this route. */
  params: Readonly<Record<string, string>>;
  /** The real (resolved) URL matched up to and including this route. */
  pathname: string;
}

/** A single root-to-leaf path through the route tree, flattened for matching. */
interface RouteBranch {
  routes: RouteObject[];
  patternSegments: string[];
  score: number;
}

const STATIC_SEGMENT_SCORE = 3;
const DYNAMIC_SEGMENT_SCORE = 2;
const SPLAT_SEGMENT_SCORE = 1;
const INDEX_ROUTE_BONUS = 1;

/** Splits a path into segments, discarding empty ones (normalizes slashes). */
function splitPath(path: string): string[] {
  return path.split("/").filter(Boolean);
}

/** Whether a pattern segment captures a named param, e.g. `:id`. */
function isDynamicSegment(segment: string): boolean {
  return segment.startsWith(":");
}

/** Whether a pattern segment is a trailing wildcard, e.g. `*`. */
function isSplatSegment(segment: string): boolean {
  return segment === "*";
}

/** Specificity score for a pattern: static > dynamic > splat, higher wins ties. */
function scoreSegments(segments: string[], isIndexRoute: boolean): number {
  const base = segments.reduce((total, segment) => {
    if (isSplatSegment(segment)) return total + SPLAT_SEGMENT_SCORE;
    if (isDynamicSegment(segment)) return total + DYNAMIC_SEGMENT_SCORE;
    return total + STATIC_SEGMENT_SCORE;
  }, 0);
  return isIndexRoute ? base + INDEX_ROUTE_BONUS : base;
}

/**
 * Recursively converts the route tree into a flat list of branches (one per
 * leaf). Only childless routes (plain leaves or index routes) can terminate
 * a branch — a parent with children only ever matches through one of them.
 * `parentRoutes`/`parentSegments` are threaded down and rebuilt with
 * `concat` (not mutated) so sibling branches never see each other's data.
 */
function flattenRoutes(
  routes: RouteObject[],
  parentRoutes: RouteObject[] = [],
  parentSegments: string[] = [],
  branches: RouteBranch[] = []
): RouteBranch[] {
  for (const route of routes) {
    const segments = parentSegments.concat(route.path ? splitPath(route.path) : []);
    const branchRoutes = parentRoutes.concat(route);

    if (route.children && route.children.length > 0) {
      flattenRoutes(route.children, branchRoutes, segments, branches);
      continue;
    }

    branches.push({
      routes: branchRoutes,
      patternSegments: segments,
      score: scoreSegments(segments, route.index === true),
    });
  }
  return branches;
}

/**
 * Tests one branch's pattern against the URL's segments, index by index.
 * Returns captured params on success, `null` if the branch doesn't match.
 */
function matchSegments(
  patternSegments: string[],
  pathSegments: string[]
): Record<string, string> | null {
  const params: Record<string, string> = {};

  for (let i = 0; i < patternSegments.length; i++) {
    const patternSegment = patternSegments[i]!;

    if (isSplatSegment(patternSegment)) {
      // A splat swallows everything remaining, so it always ends the match.
      params["*"] = pathSegments.slice(i).join("/");
      return params;
    }

    if (i >= pathSegments.length) return null;
    const pathSegment = pathSegments[i]!;

    if (isDynamicSegment(patternSegment)) {
      params[patternSegment.slice(1)] = decodeURIComponent(pathSegment);
    } else if (patternSegment !== pathSegment) {
      return null;
    }
  }

  // Reject a pattern that's only a prefix of the URL (no trailing splat).
  return pathSegments.length === patternSegments.length ? params : null;
}

/** Substitutes captured param values back into a route's own pattern segments. */
function resolveSegments(routeSegments: string[], params: Record<string, string>): string[] {
  const resolved: string[] = [];
  for (const segment of routeSegments) {
    if (isSplatSegment(segment)) {
      const rest = params["*"];
      if (rest) resolved.push(...rest.split("/"));
    } else if (isDynamicSegment(segment)) {
      resolved.push(params[segment.slice(1)] ?? segment);
    } else {
      resolved.push(segment);
    }
  }
  return resolved;
}

/**
 * Matches a pathname against a route tree, returning the winning branch as
 * an ordered root-to-leaf list of {@link RouteMatch}, or `null` if nothing
 * matches. When multiple branches match, the highest-scoring one wins (see
 * {@link scoreSegments}).
 */
export function matchRoutes(routes: RouteObject[], pathname: string): RouteMatch[] | null {
  const branches = flattenRoutes(routes);
  const pathSegments = splitPath(pathname);

  let best: { branch: RouteBranch; params: Record<string, string> } | null = null;

  for (const branch of branches) {
    const params = matchSegments(branch.patternSegments, pathSegments);
    if (params === null) continue;
    if (!best || branch.score > best.branch.score) {
      best = { branch, params };
    }
  }

  if (!best) return null;

  const { branch, params } = best;
  let consumed: string[] = [];

  return branch.routes.map((route) => {
    const routeSegments = route.path ? splitPath(route.path) : [];
    consumed = consumed.concat(resolveSegments(routeSegments, params));
    return {
      route,
      params,
      pathname: consumed.length ? "/" + consumed.join("/") : "/",
    };
  });
}
