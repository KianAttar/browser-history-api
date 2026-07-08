# browser-history-api

A react-router-compatible routing library built on the browser's **Navigation API**
(`window.navigation`), not the legacy History API.

## Before implementing any feature

Read the knowledge base in `.agents/navigation-api/` first. It documents the Navigation
API in full (interfaces, the `navigate` event/interception model, state vs info,
scroll/focus/error handling, browser support caveats) gathered from MDN, the WHATWG
spec, and the WICG explainer. Every feature in this library is built directly on top of
those primitives, so implementing against assumptions instead of the actual API
semantics will produce subtly wrong behavior (e.g. around `key`/`id` identity,
`intercept()` commit timing, or cancelability rules).

Read order: `.agents/README.md` → `.agents/navigation-api/01-overview.md` through `07-router-library-design-notes.md`.

`07-router-library-design-notes.md` in particular maps the raw Navigation API
primitives onto this library's actual feature set (loaders, error boundaries, outlets,
route matching) — read it before writing router-core or React-bindings code.

## Project shape

- Two-layer internal split, one published package: framework-agnostic router core
  (path matching, the Navigation API adapter, data loading/revalidation, the store)
  plus thin React bindings on top (hooks, `<Outlet>`, `<Link>`, `<RouterProvider>`).
- Route config supports both JSX authoring (`<Routes>`/`<Route>`) and object config
  (`useRoutes(routeObjects)`) — both compile down to the same internal `RouteObject[]`.
- Minimal dependencies: peer dep on `react` only. No `history`, no `path-to-regexp`, no
  external state-management library — use `useSyncExternalStore` for store
  subscription and a hand-rolled path matcher.

## Conventions

- No comments explaining *what* code does — only for non-obvious *why* (e.g. a
  Navigation API quirk or spec constraint that isn't obvious from the code itself).
- Don't build a History-API fallback path unless explicitly asked — v1 targets
  browsers with `window.navigation` and feature-detects/no-ops otherwise.
- Use **pnpm** for all package management in this project (install, add, run scripts)
  — not `npm` or `yarn`.
