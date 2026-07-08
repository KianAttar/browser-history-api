# Mapping onto a react-router-style library — design notes

Not a spec, not a commitment — working notes on how the primitives in docs 01–06 map
onto the kind of API surface `react-router` users expect. Revisit/replace once actual
implementation decisions are made.

## What the Navigation API gives us for free vs. what a router must still build

Given by the platform:
- Centralized navigation interception (`navigate` event) — no manual `<a>`/`<form>`
  click hijacking.
- History entry list, stable entry identity (`key`/`id`), per-entry state storage.
- Cancellation plumbing (`AbortSignal`) for in-flight data loading.
- Scroll restoration and focus management contracts.
- Promise-based completion signal (`committed`/`finished`) for suspense-like UX.

Still the router library's job:
- **Path-to-route matching** (pattern syntax, params, nested routes, wildcards) —
  the Navigation API only hands you a URL string; matching logic is 100% userland,
  same as today.
- **Render tree reconciliation** — deciding which nested route segments actually need
  to re-render vs. stay mounted across a navigation (react-router's core value prop).
  The Navigation API's `handler` is just "do async work then resolve" — it has no
  concept of component trees.
- **Data loading / caching layer** (loaders, actions, revalidation) — can be built on
  top of `entry.key`/`entry.id` for cache keys (see doc 04) but the loading semantics
  themselves (parallel loader execution, error boundaries per route) are userland.
- **Link/Form components** — `<Link>`/`<Form>`-equivalents are just normal `<a>`/`<form>`
  elements; the Navigation API intercepts them automatically once a `navigate` listener
  is registered, so these components mostly just need to render correct `href`/`action`
  and can drop the `onClick: preventDefault + pushState` dance entirely. Simplification
  vs. current react-router internals.
- **Programmatic navigation hook** (`useNavigate()`-equivalent) — thin wrapper around
  `navigation.navigate()`, passing `info` for transition-intent metadata.

## Sketch of the core adapter layer

```
createNavigationAdapter():
  on navigation.navigate event:
    if shouldNotIntercept(event): return
    match = matchRoutes(routeTable, new URL(event.destination.url).pathname)
    if !match: return  // let it fall through to real navigation (e.g. 404 -> server)
    event.intercept({
      handler: () => runRouteTransition(match, event),
    })

runRouteTransition(match, event):
  - run loaders for match (parallel), pass event.signal to each
  - on success: commit new route tree to the rendering layer (React state update)
  - on failure: surface to nearest error boundary; still let intercept's promise reject
    so navigatesuccess/navigateerror + committed/finished stay accurate
```

Key point: the `handler` given to `intercept()` should be a thin bridge into whatever
state-management/render-scheduling the library uses (e.g. flush a React
`useSyncExternalStore`-driven route state) — keep it decoupled from React internals so
the *adapter* (this Navigation-API layer) could in principle be framework-agnostic,
with thin React/Vue/Svelte bindings on top. This mirrors react-router's own
`@remix-run/router` (framework-agnostic core) + `react-router-dom` (bindings) split,
which is worth deliberately mirroring here.

## Route-level cache using entry identity

- Cache rendered route output (or loader data) keyed by `NavigationHistoryEntry.key`.
- Invalidate an individual cache slot when that entry's `id` changes (a `replaceState`-
  equivalent happened for that slot) or on its `dispose` event (pruned from history).
- On a `traverse` navigation, check the cache for `event.destination.key` before
  re-running loaders — this is how you get "instant" back/forward, which is one of
  react-router's harder-won features today (built manually via in-memory maps) and
  here falls naturally out of the platform's entry identity model.

## Transition intent via `info`

- Expose a way for `navigate()` calls to pass `info` (e.g. `router.navigate(to, { info: { transition: 'slide-left' } })`),
  and read it back in the adapter's `navigate` listener as `event.info` to pick a
  view-transition / animation strategy. Distinct from `state`, which should hold
  data the route needs to render (loader snapshots, scroll anchors) and persists.

## Fallback strategy question (needs a decision before implementation starts)

Two options, worth a deliberate choice rather than defaulting silently:
1. Navigation-API-only, feature-detect and no-op (or throw) on unsupported browsers —
   simplest, smallest bundle, but excludes users on Safari < 26.2 / older WebViews.
2. Dual adapter (Navigation API + History-API fallback implementing the same internal
   event contract) — matches react-router's stated hesitation/reasoning; more bundle
   weight and two code paths to keep behaviorally identical.

Recommend starting with (1) for a "concept" library (matches this project's framing as
an exploration built on the new API), and treating (2) as a possible v2 concern.

## Open questions to resolve before/while implementing

- Nested routes: does the adapter run one `intercept()` per navigation and re-render
  the whole matched branch, or does it need finer-grained control per route segment?
  (The Navigation API only gives you one `handler` per navigation — nested-route
  partial re-rendering is entirely a userland concern layered on top.)
- How to expose `precommitHandler`-based redirect-before-commit (e.g. for route guards)
  given Safari doesn't support it yet — likely: implement guard logic *before* calling
  `intercept()` at all (synchronously check a cheap guard, or `preventDefault()` +
  manually call `navigation.navigate('/login', { history: 'replace' })`) rather than
  depending on `precommitHandler`.
