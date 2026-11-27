import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Loader } from "./Loader";
import { EmptyState } from "./EmptyState";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T, index: number) => React.ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  onSort?: (key: string) => void;
  sortKey?: string;
  sortOrder?: "asc" | "desc";
  emptyTitle?: string;
  emptyDescription?: string;
  emptyMessage?: string;
  className?: string;
}

export function Table<T>({
  columns,
  data,
  loading = false,
  onSort,
  sortKey,
  sortOrder,
  emptyTitle,
  emptyDescription,
  emptyMessage,
  className,
}: TableProps<T>) {
  return (
    <div
      className={cn(
        "w-full border border-[var(--admin-border)] rounded-xl bg-[var(--admin-card)] overflow-hidden",
        className
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--admin-border)] bg-[var(--admin-elevated)]/60">
              {columns.map((col) => {
                const isSorted = sortKey === col.key;
                const alignClass = {
                  left: "text-left",
                  center: "text-center",
                  right: "text-right",
                }[col.align || "left"];

                return (
                  <th
                    key={col.key}
                    onClick={() => col.sortable && onSort && onSort(col.key)}
                    className={cn(
                      "px-4 py-3 text-xs font-medium text-[var(--admin-text-secondary)] select-none whitespace-nowrap",
                      col.sortable && "cursor-pointer hover:text-[var(--admin-text)] transition-colors",
                      alignClass,
                      col.className
                    )}
                  >
                    <div
                      className={cn(
                        "inline-flex items-center gap-1.5",
                        col.align === "center" && "justify-center",
                        col.align === "right" && "justify-end"
                      )}
                    >
                      <span>{col.label}</span>
                      {col.sortable && (
                        <span className="shrink-0">
                          {isSorted ? (
                            sortOrder === "asc" ? (
                              <ArrowUp className="h-3.5 w-3.5 text-[var(--admin-text)]" strokeWidth={1.5} />
                            ) : (
                              <ArrowDown className="h-3.5 w-3.5 text-[var(--admin-text)]" strokeWidth={1.5} />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-40" strokeWidth={1.5} />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--admin-border)]">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="py-16 text-center">
                  <Loader message="Loading records" size="sm" />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 px-4">
                  <EmptyState
                    title={emptyTitle || emptyMessage || "No records found"}
                    description={emptyDescription || "No entries match your current view"}
                  />
                </td>
              </tr>
            ) : (
              data.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className="hover:bg-[var(--admin-elevated)]/40 transition-colors group"
                >
                  {columns.map((col) => {
                    const alignClass = {
                      left: "text-left",
                      center: "text-center",
                      right: "text-right",
                    }[col.align || "left"];

                    return (
                      <td
                        key={col.key}
                        className={cn(
                          "px-4 py-3 text-xs text-[var(--admin-text)] tabular-nums",
                          alignClass,
                          col.className
                        )}
                      >
                        {col.render
                          ? col.render(row, rIdx)
                          : ((row as Record<string, unknown>)[col.key] as React.ReactNode)}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
