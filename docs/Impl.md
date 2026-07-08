# Implementation plan

Ordered build steps for the router library. Read `.agents/navigation-api/` (all files)
before starting Phase 2 — everything past path matching is built directly on the
Navigation API primitives documented there, and `07-router-library-design-notes.md`
specifically maps each step below back to the underlying platform mechanism.

Each phase should be independently testable before moving to the next; later phases
depend on earlier ones.

## Phase 0 — package scaffolding

- Single package, ESM only.
- Internal folder split: `src/core/` (framework-agnostic) and `src/react/` (bindings).
  No cross-imports from `core/` into `react/`.
- `peerDependencies`: `react` (and `react-dom` only where a DOM-specific component
  needs it, e.g. `<Link>`). No other runtime dependencies.
- Test runner + basic CI-less local test script. No bundler config beyond what's needed
  to run tests against TS/ESM source (defer real build tooling until the API is stable).

## Phase 1 — path matcher (`src/core/match.ts`)

No Navigation API involvement yet — pure string/URL logic.

- `RouteObject` type: `path`, `index`, `children`, plus placeholders for `loader`,
  `action`, `Component`/`element`, `ErrorBoundary`/`errorElement`, `handle`,
  `shouldRevalidate`, `lazy` (unused until later phases, but typed now so the shape is
  stable).
- Segment parser: static segments, `:param` dynamic segments, `*` trailing splat.
- `matchRoutes(routes, pathname): RouteMatch[] | null` — returns the ordered branch
  from root to leaf, each entry with its resolved `params` and matched `pathname`.
- Ranking: more static segments beats dynamic beats splat, consistent with
  react-router's specificity rules — needed once sibling routes can both match.
- Unit tests: static paths, nested paths, dynamic params, splat, index routes,
  no-match, ambiguous-sibling ranking.

## Phase 2 — Navigation API adapter core (`src/core/router.ts`)

This is where `.agents/navigation-api/` becomes load-bearing. Reference docs 02–05 for
every method/event used here.

- `createRouter(routes: RouteObject[]): Router` — the framework-agnostic router object.
- Feature-detect `'navigation' in window`; throw a clear error if absent (no fallback
  in v1, per `06-browser-support-and-caveats.md`).
- Initial match: since `navigate` doesn't fire on first load, synchronously call
  `matchRoutes(routes, navigation.currentEntry.url)` at `createRouter` time to seed
  initial state.
- Register one `navigate` listener. Implement the `shouldNotIntercept` guard from
  `03-navigate-event-and-interception.md` (cross-origin, hash-only, download, and —
  until Phase 4 — form submissions).
- On an interceptable navigation: `matchRoutes` the destination pathname; if no match,
  return (let it fall through as a real navigation — e.g. true 404 at the network
  layer); if matched, call `event.intercept({ handler })`.
- `handler` for this phase: update the router's internal state (current matches +
  params) synchronously — no data loading yet, that's Phase 3.
- Store: minimal external-store shape (`getState`, `subscribe`) so Phase 5's
  `useSyncExternalStore` binding has something to attach to. No dependency — hand-roll
  this, it's ~20 lines.
- Expose `router.navigate(to, opts)`, `router.back()`, `router.forward()` as thin
  wrappers over `navigation.navigate()` / `back()` / `forward()`, per
  `02-interfaces-reference.md`.

## Phase 3 — data loading

- Add `loader(args)` execution: on a matched navigation, run every matched route's
  `loader` in parallel, passing `{ params, request, signal: event.signal }` (the
  `signal` threading is required — see `05-scroll-focus-error-handling.md`, "always
  thread `event.signal`").
- Store loader results keyed per route id in the router state; expose via context in
  Phase 5's `useLoaderData`.
- Redirects: define a `redirect(url, init?)` helper a loader can return; adapter
  detects it and calls `navigation.navigate(url, { history: 'replace' })` instead of
  committing the original match — do this *before* calling `event.intercept()` where
  possible so the redirect target is what actually commits (mirrors the
  `precommitHandler`/`NavigationPrecommitController.redirect()` pattern from
  `03-navigate-event-and-interception.md`, but implemented manually since Safari
  doesn't support `precommitHandler` yet per `06-browser-support-and-caveats.md`).
- Route-level cache: key cached loader data by `NavigationHistoryEntry.key`, invalidate
  on `id` change or the entry's `dispose` event, per `04-state-info-and-entries.md`. On
  a `traverse` navigation, check this cache before re-running loaders.

## Phase 4 — actions & forms

- Extend the `navigate` listener to handle `event.formData !== null`: intercept, run
  the matched route's `action(args)` with `{ params, request, signal }`.
- After a successful action: revalidate — re-run loaders for the matched branch
  (default), respecting a route's `shouldRevalidate` if defined.
- `useActionData`-equivalent state slot in the store, keyed like loader data.

## Phase 5 — React bindings (`src/react/`)

- `RouterProvider({ router })` — subscribes to `router` via `useSyncExternalStore`,
  provides `DataRouterContext` (full state: matches, loaderData, actionData, errors,
  navigation status) at the root.
- `RouteContext` per nesting level — carries this segment's match/params and "what's
  my child match" so `Outlet` knows what to render.
- `Outlet()` — reads the next match from `RouteContext`, renders it wrapped in its own
  `RouteContext` provider, recursing down the branch.
- Hooks: `useLoaderData()`, `useActionData()`, `useRouteLoaderData(id)`, `useParams()`,
  `useSearchParams()`, `useLocation()`, `useMatches()`, `useNavigate()`,
  `useRevalidator()`.
- `useNavigation()` — idle/loading/submitting, derived from `navigation.transition`
  plus in-flight handler tracking (see `03-navigate-event-and-interception.md`).
- `<Link>` / `<NavLink>` — render plain `<a href>`; no click handling needed, the
  adapter's global `navigate` listener already intercepts it. `NavLink` adds
  active-match styling by comparing `useLocation()` against its `to`.
- `<Form>` — plain `<form>`; submission handled entirely by the adapter's `formData`
  branch (Phase 4). No submit handler needed on the component itself.

## Phase 6 — error boundaries

- `ErrorBoundary` per route: implement as an actual React class component
  (`componentDidCatch`) wrapping each route's rendered element in `Outlet`, since only
  class components catch render errors.
- Route-level errors from loaders/actions (not render errors) are pushed into router
  state and surfaced to the nearest ancestor route that defines an `ErrorBoundary`,
  same bubbling rule as render errors — unify both paths so `useRouteError()` works
  regardless of whether the error came from a loader/action or a render throw.
- Bubbling: if the deepest matched route has no `ErrorBoundary`, walk up `RouteContext`
  ancestors until one is found; if none in the whole branch, surface to console /
  rethrow (matches react-router's top-level unhandled behavior).

## Phase 7 — JSX route authoring

- `<Routes>` / `<Route>` components + `createRoutesFromChildren` — walk `children` at
  render time, build the same `RouteObject[]` shape Phase 1–6 already operate on.
- `useRoutes(routeObjects)` — the object-config entry point, effectively the inverse:
  takes `RouteObject[]` directly, needs no JSX walk.
- Verify both paths produce identical matching/rendering behavior against the same
  route tree (shared test suite, two route-definition styles, same assertions).

## Phase 8 — polish / deferred items

Not required for a working v1; pick up only once Phases 0–7 are solid and per explicit
ask:

- `route.lazy()` code-splitting.
- `<ScrollRestoration>` — mostly free from the platform default
  (`05-scroll-focus-error-handling.md`); only needed if a route wants to override.
- View Transitions integration (`document.startViewTransition` hook around
  `intercept()`'s `handler`).
- Link-hover prefetching.
- History-API fallback adapter for browsers without `window.navigation` (see
  `06-browser-support-and-caveats.md` — explicitly deferred, two-implementation cost).
