import Link from "next/link";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
}

export function Pagination({ currentPage, totalPages, basePath }: PaginationProps) {
  if (totalPages <= 1) return null;

  const prevPage = currentPage > 1 ? currentPage - 1 : null;
  const nextPage = currentPage < totalPages ? currentPage + 1 : null;

  function href(page: number) {
    if (page === 1) return basePath;
    const separator = basePath.includes("?") ? "&" : "?";
    return `${basePath}${separator}page=${page}`;
  }

  return (
    <div className="flex items-center justify-between mt-4 px-1">
      <p className="text-sm text-muted-foreground">
        第 {currentPage} / {totalPages} 頁
      </p>
      <div className="flex gap-2">
        {prevPage ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={href(prevPage)}>上一頁</Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            上一頁
          </Button>
        )}
        {nextPage ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={href(nextPage)}>下一頁</Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            下一頁
          </Button>
        )}
      </div>
    </div>
  );
}
