export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Contest {
  id: string;
  title: string;
  slug: string;
  description: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

export interface Problem {
  id: string;
  contest_id: string;
  title: string;
  statement: string;
  input_format: string;
  output_format: string;
  constraints: string;
  points: number;
  time_limit_ms: number;
  sample_input: string;
  sample_output: string;
  order_index: number;
}

export interface TestCase {
  id: string;
  problem_id: string;
  input: string;
  expected_output: string;
  is_hidden: boolean;
}

export interface Participant {
  id: string;
  contest_id: string;
  name: string;
  college: string;
  joined_at: string;
}

export interface Submission {
  id: string;
  participant_id: string;
  problem_id: string;
  language: string;
  code: string;
  verdict: 'AC' | 'WA' | 'TLE' | 'RE' | 'CE' | 'PENDING';
  score: number;
  runtime_ms: number | null;
  submitted_at: string;
  participants?: Participant;
  problems?: Problem;
}

export interface LeaderboardEntry {
  participant_id: string;
  name: string;
  college: string;
  total_score: number;
  problems_solved: number;
  last_submit_at: string | null;
  problem_verdicts: Record<string, { verdict: string; score: number }>;
}

export type Language = 'python' | 'cpp' | 'c' | 'java';

export const LANGUAGE_CONFIG: Record<Language, { label: string; judge0Id: number; monacoLang: string; template: string }> = {
  python: {
    label: 'Python 3',
    judge0Id: 100, // Python 3.12
    monacoLang: 'python',
    template: `# Python 3
import sys
input = sys.stdin.readline

def solve():
    pass

solve()
`,
  },
  cpp: {
    label: 'C++14',
    judge0Id: 105, // C++ (GCC 14.1)
    monacoLang: 'cpp',
    template: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    // your code here
    
    return 0;
}
`,
  },
  c: {
    label: 'C',
    judge0Id: 103, // C (GCC 14.1)
    monacoLang: 'c',
    template: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main() {
    // your code here
    return 0;
}
`,
  },
  java: {
    label: 'Java 17',
    judge0Id: 91, // Java (JDK 17.0.6)
    monacoLang: 'java',
    template: `import java.util.*;
import java.io.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        // your code here
    }
}
`,
  },
};
