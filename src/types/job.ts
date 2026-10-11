export type JobSource =
  | 'remoteok'
  | 'wwr'
  | 'jobicy'
  | 'himalayas'
  | 'greenhouse'
  | 'lever'
  | 'ashby';

export type JobStatus = 'new' | 'applied' | 'hidden';

export type JobTrust = 'direct' | 'aggregator';

export type CompanyBoardPlatform = 'greenhouse' | 'lever' | 'ashby';

export interface CompanyBoardInfo {
  platform: CompanyBoardPlatform;
  token: string;
}

export interface Job {
  /** Unique ID formed by `${source}:${externalId}` */
  id: string;
  source: JobSource;
  title: string;
  company: string;
  /** Original job or apply URL */
  url: string;
  /** Plain text description with HTML tags stripped */
  description: string;
  tags: string[];
  locationText: string;
  /** true = open worldwide, false = restricted, null = unknown */
  isWorldwide: boolean | null;
  /** Plain country names, no emoji */
  eligibleCountries: string[];
  /** Whether the job is fully remote */
  isRemote: boolean;
  /** Direct from employer or aggregated */
  trust: JobTrust;
  /** Board platform and token if fetched directly from company board */
  companyBoard: CompanyBoardInfo | null;
  seniority: string | null;
  employmentType: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  postedAt: Date;
  expiresAt: Date | null;
  fetchedAt: Date;

  // User state & scoring fields
  status: JobStatus;
  score: number;
  matchedKeywords: string[];
  scoreReasons: string[];
}

/**
 * Normalized job payload returned by source adapters prior to scoring and user state assignment.
 */
export type NormalizedJob = Omit<
  Job,
  'status' | 'score' | 'matchedKeywords' | 'scoreReasons'
>;
