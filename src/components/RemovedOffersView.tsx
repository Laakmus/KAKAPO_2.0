import React, { useState } from 'react';
import { ExchangeChatPanel } from './ExchangeChatPanel';
import { Card } from './ui/card';
import type { OfferListItemDTO } from '@/types';

type RemovedOffersViewProps = {
  offers: OfferListItemDTO[];
};

function buildExchangeLabel(exchange: OfferListItemDTO['exchange']) {
  if (!exchange?.my_offer_title || !exchange?.their_offer_title) {
    return undefined;
  }
  const otherOwner = exchange.other_user_name ?? 'Druga strona';
  return `Ja: ${exchange.my_offer_title} 🤝 ${otherOwner}: ${exchange.their_offer_title}`;
}

function formatExchangeDate(isoDate?: string | null) {
  if (!isoDate) return undefined;
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return undefined;
  const formatted = parsed.toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  return formatted.replace(',', '');
}

/**
 * Widok usuniętych ofert — lista master-detail z panelem czatu wymiany.
 */
export function RemovedOffersView({ offers }: RemovedOffersViewProps) {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
      <div className="space-y-3 md:col-span-3">
        {offers.map((offer, index) => {
          const exchangeLabel = buildExchangeLabel(offer.exchange);
          const exchangeDate = formatExchangeDate(offer.exchange?.realized_at);
          const rowNumber = `${index + 1})`;
          const chatId = offer.exchange?.chat_id ?? null;
          const isSelected = chatId && selectedChatId === chatId;

          return (
            <Card
              key={offer.id}
              className={`group relative p-4 transition-all hover:shadow-xl hover:scale-105 hover:z-10 origin-top bg-muted/40 hover:bg-green-50 border ${
                chatId ? 'cursor-pointer' : 'cursor-default'
              } ${isSelected ? 'ring-2 ring-primary' : ''}`}
              onClick={() => {
                setSelectedOfferId(offer.id);
                if (!chatId) {
                  setSelectedChatId(null);
                  return;
                }
                setSelectedChatId(chatId);
              }}
            >
              <div className="flex flex-col gap-1">
                <p className="mt-1 truncate text-sm font-medium text-foreground">
                  {exchangeLabel
                    ? `${rowNumber} ${exchangeLabel}`
                    : `${rowNumber} ${offer.title} — Oferta została usunięta przez ciebie`}
                </p>
                {exchangeLabel && (
                  <p className="text-sm font-medium text-foreground">{`Data wymiany: ${exchangeDate ?? '-'}`}</p>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      <div className="min-h-[400px] md:col-span-2 h-[480px]">
        {selectedChatId ? (
          <ExchangeChatPanel chatId={selectedChatId} />
        ) : selectedOfferId ? (
          <Card className="h-full flex items-center justify-center p-6 text-center text-base font-medium text-muted-foreground">
            Ta oferta została usunięta ręcznie — brak czatu.
          </Card>
        ) : (
          <div className="rounded-xl border bg-card shadow h-full flex items-center justify-center p-6 text-center text-base font-medium text-muted-foreground">
            Historia czatu
          </div>
        )}
      </div>
    </div>
  );
}
