export type Environment = 'local' | 'integration' | 'prod';

export type FeatureFlag = 'chat-feature' | 'interest-feature' | 'user-profiles';

export type FeatureFlagRecord = Record<FeatureFlag, boolean>;
