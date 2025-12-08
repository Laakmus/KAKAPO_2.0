import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createMessageSchema } from '@/schemas/chats.schema';
import type { SendMessageFormValues } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

/**
 * Props dla komponentu MessageComposer
 */
type MessageComposerProps = {
  /**
   * Callback wywoływany po wysłaniu wiadomości
   */
  onSend: (body: string) => Promise<void>;
  /**
   * Czy trwa wysyłanie wiadomości
   */
  isSending: boolean;
};

/**
 * MessageComposer - Formularz wysyłania wiadomości
 *
 * Funkcjonalności:
 * - Pole textarea z walidacją 1-2000 znaków
 * - Przycisk "Wyślij" wyłączony gdy invalid lub isSending
 * - Licznik znaków
 * - Inline error message
 * - Auto-reset po wysłaniu
 *
 * @param onSend - callback wysyłania wiadomości
 * @param isSending - czy trwa wysyłanie
 */
export function MessageComposer({ onSend, isSending }: MessageComposerProps) {
  const [charCount, setCharCount] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    watch,
  } = useForm<SendMessageFormValues>({
    resolver: zodResolver(createMessageSchema),
    mode: 'onChange',
    defaultValues: {
      body: '',
    },
  });

  // Watch body dla licznika znaków
  const bodyValue = watch('body');
  React.useEffect(() => {
    setCharCount(bodyValue?.length ?? 0);
  }, [bodyValue]);

  /**
   * Obsługa submit formularza
   */
  const onSubmit = async (data: SendMessageFormValues) => {
    try {
      await onSend(data.body);
      reset(); // Wyczyść formularz po sukcesie
      setCharCount(0);
    } catch (error) {
      console.error('[MessageComposer] Send error:', error);
    }
  };

  /**
   * Obsługa Enter (Shift+Enter dla nowej linii, Enter wysyła)
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(onSubmit)();
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
      {/* Textarea */}
      <div className="relative">
        <Textarea
          {...register('body')}
          placeholder="Napisz wiadomość... (Shift+Enter dla nowej linii)"
          rows={3}
          disabled={isSending}
          onKeyDown={handleKeyDown}
          className={errors.body ? 'border-destructive' : ''}
          aria-label="Treść wiadomości"
        />

        {/* Licznik znaków */}
        <div
          className={`absolute bottom-2 right-2 text-xs ${
            charCount > 2000 ? 'text-destructive font-semibold' : 'text-muted-foreground'
          }`}
        >
          {charCount}/2000
        </div>
      </div>

      {/* Błąd walidacji */}
      {errors.body && <p className="text-sm text-destructive">{errors.body.message}</p>}

      {/* Przycisk wysyłania */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Shift+Enter dla nowej linii, Enter aby wysłać</p>
        <Button type="submit" disabled={!isValid || isSending || charCount === 0} size="default">
          {isSending ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Wysyłanie...
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
              Wyślij
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
