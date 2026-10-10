import { runAllSources } from '../src/lib/sources';

async function main() {
  console.log('====================================================');
  console.log('   Remote Job Radar - Live Feed Ingestion Check     ');
  console.log('====================================================\n');

  const startTime = Date.now();
  const { jobs, results } = await runAllSources();
  const totalMs = Date.now() - startTime;

  console.log('--- INGESTION RESULTS BY SOURCE ---\n');

  for (const res of results) {
    const statusIcon = res.ok ? '✓' : '✗';
    console.log(
      `${statusIcon} Source: [${res.source.toUpperCase()}] | Status: ${
        res.ok ? 'OK' : 'FAILED'
      } | Count: ${res.count} jobs | Time: ${res.ms}ms`
    );

    if (!res.ok && res.error) {
      console.log(`  └─ Error: ${res.error}`);
    }

    const sourceJobs = jobs.filter((j) => j.source === res.source);
    const samples = sourceJobs.slice(0, 3);

    if (samples.length > 0) {
      console.log('  └─ Sample Jobs:');
      samples.forEach((sample, idx) => {
        console.log(`     ${idx + 1}. "${sample.title}" at ${sample.company}`);
        console.log(
          `        Worldwide: ${sample.isWorldwide} | Countries: ${
            sample.eligibleCountries.length
          } | URL: ${sample.url}`
        );
      });
    }
    console.log('');
  }

  console.log('====================================================');
  console.log(
    `Total Jobs Fetched: ${jobs.length} across ${results.length} sources in ${totalMs}ms`
  );
  console.log('====================================================');
}

main().catch((err) => {
  console.error('Fatal error running sources check:', err);
  process.exit(1);
});
