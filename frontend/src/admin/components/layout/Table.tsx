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
    <div className={cn("w-full border border-border/70 rounded-xl bg-card overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border/70 bg-secondary/30">
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
                      "px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider select-none whitespace-nowrap",
                      col.sortable && "cursor-pointer hover:text-foreground transition-colors",
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
                              <ArrowUp className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <ArrowDown className="h-3 w-3 text-emerald-500" />
                            )
                          ) : (
                            <ArrowUpDown className="h-2.5 w-2.5 opacity-40 group-hover:opacity-100" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="py-16 text-center">
                  <Loader message="Loading data stream..." size="sm" />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 px-4">
                  <EmptyState
                    title={emptyTitle || emptyMessage || "No records found"}
                    description={emptyDescription || "No entries available in this operational view."}
                  />
                </td>
              </tr>
            ) : (
              data.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className="hover:bg-secondary/30 transition-colors group"
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
                          "px-4 py-3 text-xs text-foreground/90 font-medium",
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
