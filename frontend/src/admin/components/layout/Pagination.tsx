import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  totalPages?: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (limit: number) => void;
}

export function Pagination({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIdx = (currentPage - 1) * itemsPerPage + 1;
  const endIdx = Math.min(currentPage * itemsPerPage, totalItems);

  const getPages = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, currentPage + 2);

      if (currentPage <= 3) {
        end = maxVisible;
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - maxVisible + 1;
      }

      for (let i = start; i <= end; i++) pages.push(i);
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-1">
      <div className="text-xs text-[var(--admin-text-secondary)] tabular-nums order-2 sm:order-1">
        Showing{" "}
        <span className="font-medium text-[var(--admin-text)]">
          {totalItems === 0 ? 0 : startIdx}
        </span>{" "}
        to <span className="font-medium text-[var(--admin-text)]">{endIdx}</span> of{" "}
        <span className="font-medium text-[var(--admin-text)]">{totalItems}</span>
      </div>

      <div className="flex items-center gap-4 order-1 sm:order-2">
        {onItemsPerPageChange && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--admin-text-secondary)]">
              Rows per page
            </span>
            <select
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              className="h-8 bg-[var(--admin-card)] border border-[var(--admin-border)] text-[var(--admin-text)] text-xs rounded-lg px-2 tabular-nums focus:outline-none focus:border-[var(--admin-text-secondary)] cursor-pointer"
            >
              {[5, 10, 25, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-1 bg-[var(--admin-elevated)] p-1 rounded-lg border border-[var(--admin-border)]">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="h-7 w-7 flex items-center justify-center rounded-md text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] disabled:opacity-40 transition-colors cursor-pointer"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
          </button>

          {getPages().map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={cn(
                "h-7 min-w-7 px-2 rounded-md text-xs font-medium tabular-nums transition-colors cursor-pointer",
                currentPage === page
                  ? "bg-[var(--admin-text)] text-[var(--admin-bg)]"
                  : "text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-card)]"
              )}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="h-7 w-7 flex items-center justify-center rounded-md text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] disabled:opacity-40 transition-colors cursor-pointer"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
