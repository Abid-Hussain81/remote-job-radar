export type JobSource = 'remoteok' | 'wwr' | 'jobicy' | 'himalayas';

export type JobStatus = 'new' | 'applied' | 'hidden';

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
