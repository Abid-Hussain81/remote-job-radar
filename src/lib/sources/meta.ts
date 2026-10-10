import type { JobSource } from '@/types/job';

export interface SourceMeta {
  name: string;
  homepage: string;
  requiresCredit: boolean;
  creditText?: string;
  notes?: string;
}

export const SOURCE_META: Record<JobSource, SourceMeta> = {
  remoteok: {
    name: 'RemoteOK',
    homepage: 'https://remoteok.com',
    requiresCredit: true,
    creditText: 'Jobs provided by RemoteOK',
  },
  wwr: {
    name: 'We Work Remotely',
    homepage: 'https://weworkremotely.com',
    requiresCredit: false,
    creditText: 'Jobs provided by We Work Remotely',
  },
  jobicy: {
    name: 'Jobicy',
    homepage: 'https://jobicy.com',
    requiresCredit: true,
    creditText: 'Jobs provided by Jobicy',
    notes: 'Apply buttons must link to the original url in its feed',
  },
  himalayas: {
    name: 'Himalayas',
    homepage: 'https://himalayas.app',
    requiresCredit: true,
    creditText: 'Jobs provided by Himalayas',
  },
};
