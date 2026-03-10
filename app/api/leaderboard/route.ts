import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  global: {
    fetch: (...args) => {
      const [url, options] = args;
      return fetch(url, { ...options, cache: 'no-store' });
    }
  }
});

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const contestId = searchParams.get('contest_id');
  if (!contestId) return NextResponse.json({ error: 'contest_id required' }, { status: 400 });

  // Get all problems for this contest
  const { data: problems, error: pErr } = await supabase
    .from('problems').select('id, title, points').eq('contest_id', contestId);
  if (pErr) console.error('PROBLEMS FETCH ERROR:', pErr);

  // Get all participants for this contest
  const { data: participants, error: partErr } = await supabase
    .from('participants').select('id, name, college').eq('contest_id', contestId);
  if (partErr) console.error('PARTS FETCH ERROR:', partErr);
  console.log("RAW PARTS FETCH:", participants?.length, partErr);

  const { data: subs, error: sErr } = await supabase
    .from('submissions')
    .select('participant_id, problem_id, verdict, score, submitted_at')
    .order('submitted_at', { ascending: true });
  if (sErr) console.error('SUBS FETCH ERROR:', sErr);

  console.log('DEBUG API leaderboard:', {
     cid: contestId, 
     probCount: problems?.length, 
     partCount: participants?.length, 
     subCount: subs?.length 
  });


  const map: Record<string, {
    participant_id: string; name: string; college: string;
    total_score: number; problems_solved: number;
    last_submit_at: string | null;
    problem_verdicts: Record<string, { verdict: string; score: number }>;
  }> = {};

  // Initialize all participants with 0 score
  for (const p of (participants || [])) {
    map[p.id] = {
      participant_id: p.id,
      name: p.name,
      college: p.college,
      total_score: 0,
      problems_solved: 0,
      last_submit_at: null,
      problem_verdicts: {},
    };
  }

  // Overlay submission data
  for (const sub of (subs || [])) {
    const pid = sub.participant_id;
    if (!map[pid]) continue; // Fallback if participant was deleted but sub remains

    const entry = map[pid];
    const existing = entry.problem_verdicts[sub.problem_id];

    // Track best submission per problem
    if (!existing || sub.score > existing.score) {
      const wasAC = existing?.verdict === 'AC';
      const nowAC = sub.verdict === 'AC';

      // Subtract old score, add new
      entry.total_score -= existing?.score || 0;
      entry.total_score += sub.score;

      if (!wasAC && nowAC) entry.problems_solved++;
      if (wasAC && !nowAC) entry.problems_solved--;

      entry.problem_verdicts[sub.problem_id] = { verdict: sub.verdict, score: sub.score };
      
      // Update last_submit_at if this submission improved the score
      if (!entry.last_submit_at || new Date(sub.submitted_at) > new Date(entry.last_submit_at)) {
         entry.last_submit_at = sub.submitted_at;
      }
    }
  }

  const leaderboard = Object.values(map)
    .sort((a, b) => {
      if (b.total_score !== a.total_score) return b.total_score - a.total_score;
      if (!a.last_submit_at && !b.last_submit_at) return 0;
      if (!a.last_submit_at) return 1;
      if (!b.last_submit_at) return -1;
      return new Date(a.last_submit_at).getTime() - new Date(b.last_submit_at).getTime();
    });

  return NextResponse.json(
    { 
       leaderboard, 
       problems: problems || [],
       __debug: {
          cid: contestId,
          partErr,
          sErr,
          pErr,
          probCount: problems?.length, 
          partCount: participants?.length, 
          subCount: subs?.length 
       }
    },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
  );
}
