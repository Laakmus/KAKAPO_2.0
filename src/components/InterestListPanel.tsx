import React, { useEffect, useRef, useState } from 'react';
import { useInterestsList } from '@/hooks/useInterestsList';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Card } from './ui/card';

/**
 * Props dla InterestListPanel
 */
type InterestListPanelProps = {
  offerId: string | null;
  isOpen: boolean;
  onClose: () => void;
  /**
   * Callback wywoływany, gdy lista zainteresowanych faktycznie została załadowana
   * i wyrenderowana (tzn. isOpen=true, brak error, isLoading=false i interests.length>0).
   * Używane do gaszenia "kropki" (badge-dot) po realnym zobaczeniu listy.
   */
  onInterestsDisplayed?: (offerId: string, totalInterests: number) => void;
};

/**
 * Panel/modal z paginowaną listą zainteresowanych
 *
 * Funkcjonalności:
 * - Wyświetla listę użytkowników zainteresowanych ofertą
 * - Paginacja (Next/Previous)
 * - Linki do profili użytkowników i ich ofert
 * - Obsługa błędów 403/404
 */
export function InterestListPanel({ offerId, isOpen, onClose, onInterestsDisplayed }: InterestListPanelProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const { interests, pagination, isLoading, error } = useInterestsList(offerId, currentPage, 20);
  const displayedForOfferIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Reset "notified" when offer changes / panel closes
    if (!isOpen) {
      displayedForOfferIdRef.current = null;
      return;
    }
    if (!offerId) return;
    if (displayedForOfferIdRef.current === offerId) return;

    if (!isLoading && !error && interests.length > 0) {
      displayedForOfferIdRef.current = offerId;
      const total = pagination?.total ?? interests.length;
      onInterestsDisplayed?.(offerId, total);
    }
  }, [isOpen, offerId, isLoading, error, interests.length, pagination?.total, onInterestsDisplayed]);

  /**
   * Handler zmiany strony
   */
  const handleNextPage = () => {
    if (pagination && currentPage < pagination.total_pages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  /**
   * Reset strony przy zamknięciu
   */
  const handleClose = () => {
    setCurrentPage(1);
    onClose();
  };

  /**
   * Format statusu zainteresowania
   */
  const formatStatus = (status: string): string => {
    switch (status) {
      case 'PROPOSED':
        return 'Zaproponowane';
      case 'ACCEPTED':
        return 'Zaakceptowane';
      case 'REALIZED':
        return 'Zrealizowane';
      default:
        return status;
    }
  };

  /**
   * Kolor badge dla statusu
   */
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'PROPOSED':
        return 'bg-blue-100 text-blue-800';
      case 'ACCEPTED':
        return 'bg-green-100 text-green-800';
      case 'REALIZED':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  /**
   * Format daty
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Zainteresowani ofertą</DialogTitle>
          <DialogDescription>Lista użytkowników zainteresowanych Twoją ofertą</DialogDescription>
        </DialogHeader>

        {/* Stan loading */}
        {isLoading && (
          <div className="space-y-3">
            <Card className="p-4 h-20 bg-muted animate-pulse" />
            <Card className="p-4 h-20 bg-muted animate-pulse" />
            <Card className="p-4 h-20 bg-muted animate-pulse" />
          </div>
        )}

        {/* Stan error */}
        {error && (
          <Card className="p-6 text-center">
            <p className="text-destructive mb-4">{error.error.message}</p>
            {error.status === 403 && (
              <p className="text-sm text-muted-foreground">
                Nie masz uprawnień do przeglądania zainteresowań tej oferty.
              </p>
            )}
            {error.status === 404 && <p className="text-sm text-muted-foreground">Oferta nie została znaleziona.</p>}
            <Button onClick={handleClose} variant="outline" className="mt-4">
              Zamknij
            </Button>
          </Card>
        )}

        {/* Stan empty */}
        {!isLoading && !error && interests.length === 0 && (
          <Card className="p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              {/* Ikona */}
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-1">Brak zainteresowanych</h3>
                <p className="text-sm text-muted-foreground">Nikt jeszcze nie wyraził zainteresowania tą ofertą.</p>
              </div>
            </div>
          </Card>
        )}

        {/* Stan success - lista zainteresowanych */}
        {!isLoading && !error && interests.length > 0 && (
          <div className="space-y-3">
            {interests.map((interest) => (
              <Card key={interest.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Nazwa użytkownika */}
                    <h4 className="font-semibold text-base mb-1">{interest.user_name || 'Użytkownik usunięty'}</h4>

                    {/* Data i status */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-muted-foreground">{formatDate(interest.created_at)}</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(interest.status)}`}>
                        {formatStatus(interest.status)}
                      </span>
                    </div>

                    {/* Linki */}
                    <div className="flex gap-2 flex-wrap">
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={`/users/${interest.user_id}`}
                          aria-label={`Zobacz profil użytkownika ${interest.user_name || 'Użytkownik usunięty'}`}
                        >
                          Zobacz profil
                        </a>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={`/users/${interest.user_id}#user-offers-heading`}
                          aria-label={`Zobacz oferty użytkownika ${interest.user_name || 'Użytkownik usunięty'}`}
                        >
                          Zobacz oferty
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            {/* Paginacja */}
            {pagination && pagination.total_pages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Strona {pagination.page} z {pagination.total_pages} (łącznie: {pagination.total})
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handlePreviousPage} disabled={currentPage === 1}>
                    Poprzednia
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage >= pagination.total_pages}
                  >
                    Następna
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Przycisk zamknij */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleClose} variant="default">
            Zamknij
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
