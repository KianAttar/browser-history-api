import { Link, useParams } from "browser-history-api";

export function UserDetail() {
  const { id } = useParams<{ id: string }>();

  return (
    <section>
      <h2>User #{id}</h2>
      <p>The ":id" param was captured by the matcher and handed to this component via useParams().</p>
      <Link to="/users">← back to users</Link>
    </section>
  );
}
