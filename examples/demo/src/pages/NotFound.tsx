import { Link, useLocation } from "browser-history-api";

export function NotFound() {
  const location = useLocation();

  return (
    <section>
      <h2>404</h2>
      <p>
        No route matched <code>{location.pathname}</code> — this is the app's own catch-all{" "}
        <code>{'{ path: "*" }'}</code> route, not something the router provides for free.
      </p>
      <Link to="/">← back home</Link>
    </section>
  );
}
