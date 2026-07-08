import { Link } from "browser-history-api";

export function Home() {
  return (
    <section>
      <h2>Home</h2>
      <p>This is the index route for the root layout — matched at exactly "/".</p>
      <p>
        Try <Link to="/users/42">a dynamic param route</Link> or{" "}
        <Link to="/files/docs/2026/report.pdf">a splat route</Link>.
      </p>
    </section>
  );
}
