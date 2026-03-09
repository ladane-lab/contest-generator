import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { LANGUAGE_CONFIG, Language } from '@/lib/types';

const PISTON_URL = 'https://emkc.org/api/v2/piston/execute';

interface PistonResponse {
  run: { stdout: string; stderr: string; code: number; };
  compile?: { stdout: string; stderr: string; code: number; };
}

async function runCode(language: Language, code: string, stdin: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const config = LANGUAGE_CONFIG[language];
  const body = {
    language: config.pistonName,
    version: config.pistonVersion,
    files: [{ name: language === 'java' ? 'Main.java' : `solution.${language === 'cpp' ? 'cpp' : language === 'python' ? 'py' : 'c'}`, content: code }],
    stdin,
    run_timeout: 5000,
  };

  const res = await fetch(PISTON_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });

  const data: PistonResponse = await res.json();
  
  if (data.compile && data.compile.code !== 0) {
    return { stdout: '', stderr: data.compile.stderr || data.compile.stdout, exitCode: data.compile.code };
  }
  return { stdout: data.run.stdout || '', stderr: data.run.stderr || '', exitCode: data.run.code };
}

function normalizeOutput(s: string): string {
  return s.replace(/\r\n/g, '\n').trim();
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
        if (!tc.is_hidden) failOutput = `Expected:\n${expected}\n\nGot:\n${got}`;
        break;
      }
      passedCount++;
    }

    const score = verdict === 'AC' ? problem.points : 0;

    // Save submission
    if (participant_id) {
      await supabase.from('submissions').insert({
        participant_id,
        problem_id,
        language,
        code,
        verdict,
        score,
        runtime_ms: Math.round(totalRuntime / Math.max(allCases.length, 1)),
      });
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
