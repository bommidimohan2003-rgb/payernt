import { Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";

export function SearchBar({
  initial = "",
  compact = false,
}: {
  initial?: string;
  compact?: boolean;
}) {
  const [q, setQ] = useState(initial);
  const navigate = useNavigate();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    navigate({ to: "/categories", search: { q } as never });
  };

  return (
    <form
      onSubmit={submit}
      className={`glass flex items-center gap-2 rounded-full pl-5 pr-2 ${compact ? "h-11" : "h-14"} w-full max-w-2xl`}
    >
      <Search className="h-4 w-4 text-muted-foreground" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search rentals"
        aria-label="Search rentals"
        className="flex-1 bg-transparent outline-none text-sm"
      />
      <button
        type="submit"
        className="rounded-full px-5 h-9 text-sm font-medium bg-neutral-950 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 transition-colors cursor-pointer"
      >
        Search
      </button>
    </form>
  );
}
