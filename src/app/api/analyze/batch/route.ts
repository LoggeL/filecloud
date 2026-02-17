import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { analyzeFile } from '@/lib/analyze';

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const unanalyzed = db.getUnanalyzedFiles(user.id);

  if (unanalyzed.length === 0) {
    return NextResponse.json({ success: true, message: 'All files already analyzed', processed: 0 });
  }

  // Process files with 1-second delay between each to avoid rate limiting
  const results: { fileId: string; fileName: string; success: boolean; error?: string }[] = [];

  for (const file of unanalyzed) {
    const result = await analyzeFile(file.id, user.id);
    results.push({
      fileId: file.id,
      fileName: file.original_name,
      success: result.success,
      error: result.error,
    });

    // Rate limit: wait 1 second between API calls
    if (unanalyzed.indexOf(file) < unanalyzed.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  const successCount = results.filter(r => r.success).length;
  return NextResponse.json({
    success: true,
    processed: results.length,
    succeeded: successCount,
    failed: results.length - successCount,
    results,
  });
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const stats = db.getAnalysisStats(user.id);
  return NextResponse.json(stats);
}
