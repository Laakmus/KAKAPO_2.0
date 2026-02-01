import { createContext, useContext } from 'react';
import type { FeatureFlag, FeatureFlagRecord } from './types';

const FeatureFlagContext = createContext<FeatureFlagRecord | null>(null);

interface FeatureFlagProviderProps {
  flags: FeatureFlagRecord;
  children: React.ReactNode;
}

export function FeatureFlagProvider({ flags, children }: FeatureFlagProviderProps) {
  return <FeatureFlagContext.Provider value={flags}>{children}</FeatureFlagContext.Provider>;
}

export function useFeatureFlag(flag: FeatureFlag): boolean {
  const flags = useContext(FeatureFlagContext);
  if (flags === null) {
    throw new Error('useFeatureFlag must be used within a FeatureFlagProvider');
  }
  return flags[flag] ?? false;
}
