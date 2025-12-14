import { cn } from '@/lib/utils';

describe('cn', () => {
  it('joins class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('merges tailwind conflicts (tailwind-merge)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('px-2', 'px-4', 'py-1')).toBe('px-4 py-1');
  });
});
