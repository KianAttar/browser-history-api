import { useParams } from "browser-history-api";

export function Files() {
  const { "*": path } = useParams<{ "*": string }>();

  return (
    <section>
      <h2>Files (splat route)</h2>
      <p>
        Route pattern is <code>files/*</code>. Everything after "files/" was captured as one param under
        the key <code>"*"</code>:
      </p>
      <pre>{path}</pre>
    </section>
  );
}
