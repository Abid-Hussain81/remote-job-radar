import { greenhouseAdapter } from '../src/lib/sources/greenhouse';
import { leverAdapter } from '../src/lib/sources/lever';
import { ashbyAdapter } from '../src/lib/sources/ashby';
import { COMPANIES } from '../src/lib/sources/companies';
import type { NormalizedJob } from '../src/types/job';

async function main() {
  console.log('====================================================');
  console.log('   Remote Job Radar - Direct Company Boards Fetch   ');
  console.log('====================================================\n');

  console.log(`Loaded ${COMPANIES.length} verified companies from data/companies.json:`);
  console.log(
    COMPANIES.map((c) => `${c.name} (${c.platform}/${c.token})`).join(', ')
  );
  console.log('\n----------------------------------------------------\n');

  const allJobs: NormalizedJob[] = [];

  // 1. Greenhouse
  console.log('--- [GREENHOUSE] Fetching company boards ---');
  const ghJobs = await greenhouseAdapter.fetchJobs({ remoteOnly: true });
  allJobs.push(...ghJobs);
  const ghDetails = greenhouseAdapter.getLastRunDetails?.() || [];
  for (const d of ghDetails) {
    const icon = d.ok ? '✓' : '✗';
    console.log(
      `${icon} ${d.company.padEnd(16)} | Total: ${String(d.total).padStart(
        3
      )} | Remote Kept: ${String(d.remoteKept).padStart(3)} ${
        d.error ? `| Error: ${d.error}` : ''
      }`
    );
  }
  console.log(`Subtotal Greenhouse remote jobs: ${ghJobs.length}\n`);

  // 2. Lever
  console.log('--- [LEVER] Fetching company boards ---');
  const leverJobs = await leverAdapter.fetchJobs({ remoteOnly: true });
  allJobs.push(...leverJobs);
  const leverDetails = leverAdapter.getLastRunDetails?.() || [];
  for (const d of leverDetails) {
    const icon = d.ok ? '✓' : '✗';
    console.log(
      `${icon} ${d.company.padEnd(16)} | Total: ${String(d.total).padStart(
        3
      )} | Remote Kept: ${String(d.remoteKept).padStart(3)} ${
        d.error ? `| Error: ${d.error}` : ''
      }`
    );
  }
  console.log(`Subtotal Lever remote jobs: ${leverJobs.length}\n`);

  // 3. Ashby
  console.log('--- [ASHBY] Fetching company boards ---');
  const ashbyJobs = await ashbyAdapter.fetchJobs({ remoteOnly: true });
  allJobs.push(...ashbyJobs);
  const ashbyDetails = ashbyAdapter.getLastRunDetails?.() || [];
  for (const d of ashbyDetails) {
    const icon = d.ok ? '✓' : '✗';
    console.log(
      `${icon} ${d.company.padEnd(16)} | Total: ${String(d.total).padStart(
        3
      )} | Remote Kept: ${String(d.remoteKept).padStart(3)} ${
        d.error ? `| Error: ${d.error}` : ''
      }`
    );
  }
  console.log(`Subtotal Ashby remote jobs: ${ashbyJobs.length}\n`);

  // 4. Sample Jobs
  console.log('====================================================');
  console.log('                 SAMPLE REMOTE JOBS                 ');
  console.log('====================================================');
  const samples = allJobs.slice(0, 3);
  samples.forEach((job, idx) => {
    console.log(`\n${idx + 1}. [${job.source.toUpperCase()}] "${job.title}" at ${job.company}`);
    console.log(`   Worldwide: ${job.isWorldwide} | Eligible Countries (${job.eligibleCountries.length}): ${job.eligibleCountries.join(', ') || 'None'}`);
    console.log(`   Location: ${job.locationText}`);
    console.log(`   Apply URL: ${job.url}`);
  });

  // 5. Dropped Candidate Notes
  console.log('\n====================================================');
  console.log('         DROPPED CANDIDATES (NO DATA / 404)         ');
  console.log('====================================================');
  console.log('• Plaid (lever / plaid): Returned HTTP 404 Not Found on public postings endpoint. Dropped from registry.');

  console.log('\n====================================================');
  console.log(`Total Remote Jobs Found: ${allJobs.length} across ${COMPANIES.length} direct employers`);
  console.log('====================================================\n');
}

main().catch((err) => {
  console.error('Fatal error running companies fetch check:', err);
  process.exit(1);
});
