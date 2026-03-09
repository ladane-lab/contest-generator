import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { LANGUAGE_CONFIG, Language } from '@/lib/types';

const JUDGE0_URL = 'https://ce.judge0.com/submissions?base64_encoded=false&wait=true';

interface Judge0Response {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  status: { id: number; description: string };
}

async function runCode(language: Language, code: string, stdin: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const config = LANGUAGE_CONFIG[language];
  const body = {
    source_code: code,
    language_id: config.judge0Id,
    stdin: stdin || '',
    cpu_time_limit: 5.0
  };

  try {
    const res = await fetch(JUDGE0_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return { stdout: '', stderr: `Judge Error: API returned ${res.status}`, exitCode: 1 };
    }

    const data: Judge0Response = await res.json();
    
    if (data.status.id === 6 || data.compile_output) {
      return { stdout: '', stderr: data.compile_output || 'Compilation Error', exitCode: 1 };
    }
    
    const isSuccess = data.status.id === 3;
    return { 
      stdout: data.stdout || '', 
      stderr: data.stderr || data.message || (!isSuccess ? data.status.description : ''), 
      exitCode: isSuccess ? 0 : 1 
    };
  } catch (err: any) {
    return { stdout: '', stderr: `Judge Network Error: ${err.message}`, exitCode: 1 };
  }
}

function normalizeOutput(s: string): string {
  if (!s) return '';
  // Replace all sequences of whitespace (spaces, tabs, newlines, carriage returns) 
  // with a single space, and trim the ends. This allows bulletproof token matching.
  return s.replace(/\s+/g, ' ').trim();
}

export async function POST(req: NextRequest) {
  try {
    const { participant_id, problem_id, language, code, mode } = await req.json();

    if (!code || !language || !problem_id) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const lang = language as Language;
    if (!LANGUAGE_CONFIG[lang]) {
      return NextResponse.json({ error: 'Unsupported language' }, { status: 400 });
    }

    // Fetch problem + test cases
    const { data: problem } = await supabase.from('problems').select('*').eq('id', problem_id).single();
    if (!problem) return NextResponse.json({ error: 'Problem not found' }, { status: 404 });

    // RUN mode: only test against sample I/O (no submission saved)
    if (mode === 'run') {
      const start = Date.now();
      const result = await runCode(lang, code, problem.sample_input);
      const runtime = Date.now() - start;
      if (result.exitCode !== 0 && result.stderr) {
        return NextResponse.json({ verdict: 'CE', output: result.stderr, runtime_ms: runtime });
      }
      const got = normalizeOutput(result.stdout);
      const expected = normalizeOutput(problem.sample_output);
      return NextResponse.json({
        verdict: got === expected ? 'AC' : 'WA',
        output: result.stdout,
        expected: problem.sample_output,
        runtime_ms: runtime,
      });
    }

    // SUBMIT mode: run all test cases
    const { data: testCases } = await supabase
      .from('test_cases')
      .select('*')
      .eq('problem_id', problem_id)
      .order('is_hidden', { ascending: true });

    const allCases = testCases || [];
    let verdict: 'AC' | 'WA' | 'TLE' | 'RE' | 'CE' = 'AC';
    let totalRuntime = 0;
    let failOutput = '';
    let passedCount = 0;

    for (const tc of allCases) {
      const start = Date.now();
      const result = await runCode(lang, code, tc.input);
      const runtime = Date.now() - start;
      totalRuntime += runtime;

      if (result.exitCode !== 0 && result.stderr && !result.stdout) {
        // CE or RE
        const isCE = result.stderr.toLowerCase().includes('error') && runtime < 500;
        verdict = isCE ? 'CE' : 'RE';
        failOutput = result.stderr;
        break;
      }

      if (runtime > problem.time_limit_ms) {
        verdict = 'TLE';
        break;
      }

      const got = normalizeOutput(result.stdout);
      const expected = normalizeOutput(tc.expected_output);
      if (got !== expected) {
        verdict = 'WA';
        failOutput = `Input:\n${tc.input}\n\nExpected:\n${expected}\n\nGot:\n${got}`;
        break;
      }
      passedCount++;
    }

    // Partial scoring based on passed test cases
    const score = allCases.length > 0
      ? Math.floor((passedCount / allCases.length) * problem.points)
      : (verdict === 'AC' ? problem.points : 0);

    // Save submission
    if (participant_id) {
      const { error: dbError } = await supabase.from('submissions').insert({
        participant_id,
        problem_id,
        language,
        code,
        verdict,
        score,
        runtime_ms: Math.round(totalRuntime / Math.max(allCases.length, 1)),
      });
      if (dbError) {
        console.error('Failed to save submission to database:', dbError);
      }
    }

    return NextResponse.json({
      verdict,
      score,
      passed: passedCount,
      total: allCases.length,
      runtime_ms: totalRuntime,
      output: failOutput,
    });
  } catch (err) {
    console.error('Judge error:', err);
    return NextResponse.json({ error: 'Internal judge error' }, { status: 500 });
  }
}
