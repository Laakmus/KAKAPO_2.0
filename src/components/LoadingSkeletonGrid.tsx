import React from 'react';
import { Card } from './ui/card';

/**
 * Props dla LoadingSkeletonGrid
 */
type LoadingSkeletonGridProps = {
  count?: number;
};

/**
 * Siatka szkieletów ładowania (skeleton loading)
 *
 * Wyświetla animowane karty podczas ładowania ofert
 */
export function LoadingSkeletonGrid({ count = 6 }: LoadingSkeletonGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="p-4 animate-pulse">
          {/* Miniatura */}
          <div className="mb-3 rounded-md aspect-video bg-muted" />

          {/* Tytuł */}
          <div className="h-6 bg-muted rounded mb-2" />

          {/* Opis */}
          <div className="space-y-2 mb-3">
            <div className="h-4 bg-muted rounded" />
            <div className="h-4 bg-muted rounded w-5/6" />
          </div>

          {/* Meta */}
          <div className="flex justify-between">
            <div className="h-4 bg-muted rounded w-20" />
            <div className="h-4 bg-muted rounded w-16" />
          </div>
        </Card>
      ))}
    </div>
  );
}
