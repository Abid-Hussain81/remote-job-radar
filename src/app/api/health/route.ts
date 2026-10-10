import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import JobModel from '@/lib/models/Job';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectToDatabase();
    const count = await JobModel.countDocuments();

    return NextResponse.json({
      ok: true,
      jobs: count,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown database error';

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
