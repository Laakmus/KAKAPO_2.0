import type { Environment, FeatureFlag, FeatureFlagRecord } from './types';
import { FLAGS } from './flags';

export type { Environment, FeatureFlag, FeatureFlagRecord };

export function getEnvironment(): Environment {
  const env = import.meta.env.ENV_NAME as string | undefined;
  if (env === 'integration' || env === 'prod') {
    return env;
  }
  return 'local';
}

export async function isFeatureEnabled(flag: FeatureFlag): Promise<boolean> {
  const environment = getEnvironment();
  const config = FLAGS[flag];
  return config?.[environment] ?? false;
}

export function getDefaultFlags(): FeatureFlagRecord {
  const entries = (Object.keys(FLAGS) as FeatureFlag[]).map((flag) => [flag, true] as const);
  return Object.fromEntries(entries) as FeatureFlagRecord;
}

export async function getAllFlags(): Promise<FeatureFlagRecord> {
  const environment = getEnvironment();
  const entries = (Object.keys(FLAGS) as FeatureFlag[]).map(
    (flag) => [flag, FLAGS[flag][environment] ?? false] as const,
  );
  return Object.fromEntries(entries) as FeatureFlagRecord;
}
