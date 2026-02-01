import React from 'react';
import type { OffersPaginationMeta } from '@/types';
import { Button } from './ui/button';

/**
 * Props dla PaginationControls
 */
type PaginationControlsProps = {
  pagination: OffersPaginationMeta;
  onPageChange: (page: number) => void;
};

/**
 * Kontrolki paginacji
 *
 * Funkcjonalności:
 * - Przyciski Previous/Next
 * - Info "Strona X z Y"
 * - Disabled gdy na pierwszej/ostatniej stronie
 */
export function PaginationControls({ pagination, onPageChange }: PaginationControlsProps) {
  const { page, total_pages } = pagination;

  const canGoPrevious = page > 1;
  const canGoNext = page < total_pages;

  const handlePrevious = () => {
    if (canGoPrevious) {
      onPageChange(page - 1);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      onPageChange(page + 1);
    }
  };

  return (
    <div className="flex items-center justify-center gap-4">
      {/* Previous */}
      <Button variant="outline" onClick={handlePrevious} disabled={!canGoPrevious} aria-label="Poprzednia strona">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 mr-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Poprzednia
      </Button>

      {/* Info */}
      <span className="text-sm text-muted-foreground">
        Strona {page} z {total_pages}
      </span>

      {/* Next */}
      <Button variant="outline" onClick={handleNext} disabled={!canGoNext} aria-label="Następna strona">
        Następna
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 ml-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Button>
    </div>
  );
}
