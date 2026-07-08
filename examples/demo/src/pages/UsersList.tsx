import { Link, useSearchParams } from "browser-history-api";

const ALL_USERS = ["Ada Lovelace", "Grace Hopper", "Alan Turing", "Margaret Hamilton"];

export function UsersList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";

  const filtered = ALL_USERS.filter((name) => name.toLowerCase().includes(query.toLowerCase()));

  return (
    <section>
      <h2>Users</h2>
      <p>Filtering here writes to the URL's query string via useSearchParams — try reloading mid-filter.</p>
      <input
        type="text"
        placeholder="Filter users..."
        value={query}
        onChange={(e) => {
          const next = new URLSearchParams(searchParams);
          if (e.target.value) next.set("q", e.target.value);
          else next.delete("q");
          setSearchParams(next);
        }}
      />
      <ul>
        {filtered.map((name, i) => (
          <li key={name}>
            <Link to={`/users/${i + 1}`}>{name}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
