import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { changePasswordFormSchema, type ChangePasswordFormValues } from '@/schemas/profile.schema';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import type { ChangePasswordCommand } from '@/types';

type ChangePasswordCardProps = {
  onSubmit: (payload: ChangePasswordCommand) => Promise<boolean>;
  onCancel?: () => void;
  isSubmitting: boolean;
  error?: string;
};

export function ChangePasswordCard({ onSubmit, onCancel, isSubmitting, error }: ChangePasswordCardProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordFormSchema),
  });

  const handleFormSubmit = async (data: ChangePasswordFormValues) => {
    const success = await onSubmit({
      current_password: data.current_password,
      new_password: data.new_password,
      confirm_password: data.confirm_password,
    });
    if (success) {
      reset();
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Zmień hasło</h2>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="current_password">Obecne hasło</Label>
          <Input
            id="current_password"
            type="password"
            {...register('current_password')}
            placeholder="Wprowadź obecne hasło"
            disabled={isSubmitting}
            className="mt-1"
            autoComplete="current-password"
          />
          {errors.current_password && (
            <p className="text-sm text-destructive mt-1">{errors.current_password.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="new_password">Nowe hasło</Label>
          <Input
            id="new_password"
            type="password"
            {...register('new_password')}
            placeholder="Wprowadź nowe hasło"
            disabled={isSubmitting}
            className="mt-1"
            autoComplete="new-password"
          />
          {errors.new_password && <p className="text-sm text-destructive mt-1">{errors.new_password.message}</p>}
        </div>

        <div>
          <Label htmlFor="confirm_password">Potwierdź nowe hasło</Label>
          <Input
            id="confirm_password"
            type="password"
            {...register('confirm_password')}
            placeholder="Powtórz nowe hasło"
            disabled={isSubmitting}
            className="mt-1"
            autoComplete="new-password"
          />
          {errors.confirm_password && (
            <p className="text-sm text-destructive mt-1">{errors.confirm_password.message}</p>
          )}
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive text-destructive px-3 py-2 rounded text-sm">
            {error}
          </div>
        )}

        {isDirty && !isSubmitting && <p className="text-xs text-muted-foreground">Masz niezapisane zmiany</p>}

        <div className="flex gap-2 justify-end pt-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Anuluj
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Zapisywanie...' : 'Zmień hasło'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
