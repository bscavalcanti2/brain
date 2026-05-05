import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

export async function GET() {
  const results: Record<string, string> = {};

  // Check env vars exist
  results.DIRECT_URL = process.env.DIRECT_URL ? `set (${process.env.DIRECT_URL.length} chars)` : 'MISSING';
  results.DATABASE_URL = process.env.DATABASE_URL ? `set (${process.env.DATABASE_URL.length} chars)` : 'MISSING';

  // Try DB connection
  try {
    const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
    if (!connectionString) {
      results.db = 'ERROR: no connection string';
    } else {
      const adapter = new PrismaPg({ connectionString });
      const db = new PrismaClient({ adapter });
      const count = await db.note.count();
      results.db = `OK (${count} notes)`;
      await db.$disconnect();
    }
  } catch (err: unknown) {
    const e = err as Error;
    results.db = `ERROR: ${e.message}`;
    if ('code' in (e as Record<string, unknown>)) {
      results.dbCode = String((e as Record<string, unknown>).code);
    }
  }

  return NextResponse.json(results);
}
