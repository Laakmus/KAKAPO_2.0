import type { Environment, FeatureFlag } from './types';

export const FLAGS: Record<FeatureFlag, Record<Environment, boolean>> = {
  'chat-feature': { local: true, integration: true, prod: true },
  'interest-feature': { local: true, integration: true, prod: true },
  'user-profiles': { local: true, integration: true, prod: true },
};
