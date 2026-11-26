import {STRAND_MODULES} from '../data/mathCurriculum';
import {
  type AssignedActivity,
  type CachedTutorReply,
  LearningTrack,
  MathStrandId,
  type PracticeProblem,
  ProficiencyLevel,
  type StudentProfile,
} from '../types/math';

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffleChoices(correct: string, distractors: string[]): {choices: string[]; correctIndex: number} {
  const unique = Array.from(new Set([correct, ...distractors])).slice(0, 4);
  while (unique.length < 4) {
    unique.push(`${correct} (alt ${unique.length})`);
  }
  const indexed = unique.map((text) => ({text, sort: Math.random()})).sort((a, b) => a.sort - b.sort);
  const choices = indexed.map((item) => item.text);
  const correctIndex = choices.indexOf(correct);
  return {choices, correctIndex};
}

export function generateOfflinePracticeProblem(
  strandId: MathStrandId,
  track: LearningTrack,
): PracticeProblem {
  const id = `off-${strandId}-${Date.now()}-${randomInt(100, 999)}`;

  if (strandId === MathStrandId.FUNCTIONS) {
    if (track === LearningTrack.REMEDIATION) {
      const a = randomInt(2, 5);
      const b = randomInt(-6, 6);
      const x = randomInt(-4, 5);
      const ans = a * x * x + b;
      const {choices, correctIndex} = shuffleChoices(String(ans), [
        String(a * x + b),
        String(-a * x * x + b),
        String(ans + 4),
      ]);
      return {
        id,
        strandId,
        track,
        prompt: `Evaluate f(${x}) for the quadratic function f(x) = ${a}x² ${b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`}.`,
        choices,
        correctIndex,
        hint: `Square ${x} first (${x}² = ${x * x}), multiply by ${a}, then ${b >= 0 ? `add ${b}` : `subtract ${Math.abs(b)}`}.`,
        steps: [
          `Substitute x = ${x}: f(${x}) = ${a}(${x})² ${b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`}`,
          `Evaluate square: (${x})² = ${x * x}`,
          `Multiply: ${a} × ${x * x} = ${a * x * x}`,
          `Final result: ${a * x * x} ${b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`} = ${ans}`,
        ],
        conceptTip: 'Always evaluate exponents before multiplying by the leading coefficient.',
        source: 'offline-generator',
      };
    }

    const h = randomInt(2, 7);
    const k = randomInt(1, 5);
    const ans = `f⁻¹(x) = (${h}x + 1) / (x - ${k})`;
    const {choices, correctIndex} = shuffleChoices(ans, [
      `f⁻¹(x) = (x - ${h}) / (${k}x + 1)`,
      `f⁻¹(x) = (${h}x - 1) / (x + ${k})`,
      `f⁻¹(x) = (${k}x + 1) / (x - ${h})`,
    ]);
    return {
      id,
      strandId,
      track,
      prompt: `Find the inverse function f⁻¹(x) of f(x) = (${k}x + 1) / (x - ${h}).`,
      choices,
      correctIndex,
      hint: `Swap x and y: x = (${k}y + 1) / (y - ${h}), then multiply by (y - ${h}).`,
      steps: [
        `Swap variables: x = (${k}y + 1) / (y - ${h})`,
        `Cross-multiply: x(y - ${h}) = ${k}y + 1 → xy - ${h}x = ${k}y + 1`,
        `Collect y terms: xy - ${k}y = ${h}x + 1 → y(x - ${k}) = ${h}x + 1`,
        `Solve for y: f⁻¹(x) = (${h}x + 1) / (x - ${k})`,
      ],
      conceptTip: 'Swapping numerator and denominator constants cleanly reveals the inverse pattern.',
      source: 'offline-generator',
    };
  }

  if (strandId === MathStrandId.EXPONENTIAL) {
    if (track === LearningTrack.REMEDIATION) {
      const base = [2, 3, 5][randomInt(0, 2)];
      const exp = randomInt(2, 4);
      const shift = randomInt(1, 3);
      const rhs = Math.pow(base, exp);
      const x = exp - shift;
      const {choices, correctIndex} = shuffleChoices(`x = ${x}`, [
        `x = ${exp}`,
        `x = ${exp + shift}`,
        `x = ${x + 2}`,
      ]);
      return {
        id,
        strandId,
        track,
        prompt: `Solve for x: ${base}^(x + ${shift}) = ${rhs}`,
        choices,
        correctIndex,
        hint: `Rewrite ${rhs} as ${base}^${exp}, then set x + ${shift} = ${exp}.`,
        steps: [
          `Express ${rhs} with base ${base}: ${rhs} = ${base}^${exp}`,
          `Equate exponents: x + ${shift} = ${exp}`,
          `Subtract ${shift}: x = ${x}`,
        ],
        conceptTip: 'Once both sides share the same positive base (≠ 1), their exponents must be equal.',
        source: 'offline-generator',
      };
    }

    const base = [2, 3, 4][randomInt(0, 2)];
    const val1 = base * base;
    const val2 = base;
    const ans = 3;
    const {choices, correctIndex} = shuffleChoices(String(ans), ['1', '2', '4']);
    return {
      id,
      strandId,
      track,
      prompt: `Simplify using logarithm laws: log_${base}(${val1}) + log_${base}(${val2})`,
      choices,
      correctIndex,
      hint: `Combine using log_b(A) + log_b(B) = log_b(A · B), or evaluate each term.`,
      steps: [
        `Product rule: log_${base}(${val1} × ${val2}) = log_${base}(${val1 * val2})`,
        `Since ${base}³ = ${val1 * val2}, log_${base}(${val1 * val2}) = 3`,
        `Check individually: 2 + 1 = 3`,
      ],
      conceptTip: 'Adding two logs with the same base multiplies their arguments inside a single log.',
      source: 'offline-generator',
    };
  }

  if (strandId === MathStrandId.BUSINESS) {
    if (track === LearningTrack.REMEDIATION) {
      const principal = randomInt(4, 15) * 1000;
      const ratePct = randomInt(3, 8);
      const years = randomInt(2, 5);
      const interest = Math.round(principal * (ratePct / 100) * years);
      const {choices, correctIndex} = shuffleChoices(`₱${interest.toLocaleString()}`, [
        `₱${Math.round(interest / years).toLocaleString()}`,
        `₱${(principal + interest).toLocaleString()}`,
        `₱${(interest * 2).toLocaleString()}`,
      ]);
      return {
        id,
        strandId,
        track,
        prompt: `Calculate the simple interest on ₱${principal.toLocaleString()} invested at ${ratePct}% per year for ${years} years.`,
        choices,
        correctIndex,
        hint: `Multiply P × r × t: ${principal} × ${(ratePct / 100).toFixed(2)} × ${years}.`,
        steps: [
          `Convert rate: ${ratePct}% = ${(ratePct / 100).toFixed(2)}`,
          `Compute annual interest: ₱${principal.toLocaleString()} × ${(ratePct / 100).toFixed(2)} = ₱${Math.round(principal * (ratePct / 100)).toLocaleString()}`,
          `Multiply by ${years} years: ₱${interest.toLocaleString()}`,
        ],
        conceptTip: 'Simple interest is calculated strictly on the original principal.',
        source: 'offline-generator',
      };
    }

    const principal = randomInt(5, 12) * 2000;
    const ratePct = [4, 6, 8][randomInt(0, 2)];
    const years = 2;
    const compound = Number((principal * Math.pow(1 + ratePct / 100, years)).toFixed(2));
    const simple = principal * (1 + (ratePct / 100) * years);
    const diff = (compound - simple).toFixed(2);
    const {choices, correctIndex} = shuffleChoices(`₱${compound.toLocaleString('en-US', {minimumFractionDigits: 2})}`, [
      `₱${simple.toLocaleString('en-US', {minimumFractionDigits: 2})}`,
      `₱${(compound + 120).toLocaleString('en-US', {minimumFractionDigits: 2})}`,
      `₱${(principal + Number(diff)).toLocaleString('en-US', {minimumFractionDigits: 2})}`,
    ]);
    return {
      id,
      strandId,
      track,
      prompt: `₱${principal.toLocaleString()} is compounded annually at ${ratePct}% for ${years} years. What is the compound maturity value?`,
      choices,
      correctIndex,
      hint: `Compute F = ${principal} × (1.${ratePct < 10 ? `0${ratePct}` : ratePct})².`,
      steps: [
        `Use F = P(1 + r)^t`,
        `Growth factor: (1 + ${(ratePct / 100).toFixed(2)})² = ${Math.pow(1 + ratePct / 100, 2).toFixed(4)}`,
        `Multiply by ₱${principal.toLocaleString()}: ₱${compound.toLocaleString('en-US', {minimumFractionDigits: 2})}`,
      ],
      conceptTip: 'In compound interest, year 2 earns interest on both the principal and year 1 interest.',
      source: 'offline-generator',
    };
  }

  // Strand 4: Logic
  const pVal = randomInt(0, 1) === 1;
  const qVal = randomInt(0, 1) === 1;
  if (track === LearningTrack.REMEDIATION) {
    const res = !pVal || qVal; // p -> q
    const ans = res ? 'TRUE' : 'FALSE';
    const {choices, correctIndex} = shuffleChoices(ans, [
      res ? 'FALSE' : 'TRUE',
      'Undetermined',
      'TRUE only if p = q',
    ]);
    return {
      id,
      strandId,
      track,
      prompt: `Given p is ${pVal ? 'TRUE' : 'FALSE'} and q is ${qVal ? 'TRUE' : 'FALSE'}, what is the truth value of (p → q)?`,
      choices,
      correctIndex,
      hint: 'An implication p → q is FALSE only when p is TRUE and q is FALSE.',
      steps: [
        `Substitute p = ${pVal ? 'T' : 'F'} and q = ${qVal ? 'T' : 'F'} into p → q`,
        pVal && !qVal
          ? 'Since T → F has a true hypothesis and false conclusion, it is FALSE.'
          : 'Because it is not the T → F case, the conditional evaluates to TRUE.',
      ],
      conceptTip: 'Whenever the hypothesis p is FALSE, p → q is automatically TRUE.',
      source: 'offline-generator',
    };
  }

  const exprAns = !pVal && qVal ? 'TRUE' : 'FALSE';
  const {choices, correctIndex} = shuffleChoices(exprAns, [
    exprAns === 'TRUE' ? 'FALSE' : 'TRUE',
    'Always TRUE (Tautology)',
    'Undefined',
  ]);
  return {
    id,
    strandId,
    track,
    prompt: `Given p = ${pVal ? 'TRUE' : 'FALSE'} and q = ${qVal ? 'TRUE' : 'FALSE'}, evaluate ¬(p ∨ ¬q).`,
    choices,
    correctIndex,
    hint: 'Apply De Morgan’s Law: ¬(p ∨ ¬q) ≡ ¬p ∧ q.',
    steps: [
      `Rewrite with De Morgan’s Law: ¬(p ∨ ¬q) ≡ ¬p ∧ q`,
      `¬p = ${!pVal ? 'TRUE' : 'FALSE'} and q = ${qVal ? 'TRUE' : 'FALSE'}`,
      `Conjunction evaluates to ${exprAns}`,
    ],
    conceptTip: 'De Morgan’s Law simplifies negated OR/AND blocks before substituting truth values.',
    source: 'offline-generator',
  };
}

// Safe recursive-descent arithmetic evaluator (supports +, -, *, /, ^, parentheses, sqrt())
function evaluateArithmeticExpression(rawExpr: string): number | null {
  const cleaned = rawExpr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/\s+/g, '')
    .replace(/sqrt\(([^)]+)\)/gi, (_, inner) => {
      const val = evaluateArithmeticExpression(inner);
      return val !== null && val >= 0 ? String(Math.sqrt(val)) : 'NaN';
    });

  if (!cleaned || !/^[0-9+\-*/^().]+$/.test(cleaned)) {
    return null;
  }

  let pos = 0;

  function parseExpression(): number {
    let val = parseTerm();
    while (pos < cleaned.length && (cleaned[pos] === '+' || cleaned[pos] === '-')) {
      const op = cleaned[pos++];
      const right = parseTerm();
      val = op === '+' ? val + right : val - right;
    }
    return val;
  }

  function parseTerm(): number {
    let val = parsePower();
    while (pos < cleaned.length && (cleaned[pos] === '*' || cleaned[pos] === '/')) {
      const op = cleaned[pos++];
      const right = parsePower();
      if (op === '/' && right === 0) return NaN;
      val = op === '*' ? val * right : val / right;
    }
    return val;
  }

  function parsePower(): number {
    const base = parseUnary();
    if (pos < cleaned.length && cleaned[pos] === '^') {
      pos++;
      const exp = parsePower();
      return Math.pow(base, exp);
    }
    return base;
  }

  function parseUnary(): number {
    if (cleaned[pos] === '-') {
      pos++;
      return -parseUnary();
    }
    if (cleaned[pos] === '+') {
      pos++;
      return parseUnary();
    }
    return parsePrimary();
  }

  function parsePrimary(): number {
    if (cleaned[pos] === '(') {
      pos++;
      const val = parseExpression();
      if (cleaned[pos] === ')') pos++;
      return val;
    }
    const start = pos;
    while (pos < cleaned.length && /[0-9.]/.test(cleaned[pos])) {
      pos++;
    }
    if (start === pos) return NaN;
    return Number(cleaned.slice(start, pos));
  }

  const result = parseExpression();
  if (pos !== cleaned.length || !Number.isFinite(result)) {
    return null;
  }
  return Number(result.toFixed(6));
}

function normalizeLatexMathInput(raw: string): string {
  let out = raw.replace(/\$\$/g, '').replace(/\$/g, '').trim();
  // Unwrap \left( and \right)
  out = out.replace(/\\left\(/g, '(').replace(/\\right\)/g, ')');
  // Convert \frac{a}{b} -> (a)/(b) iteratively for simple nested fractions
  for (let i = 0; i < 3; i++) {
    out = out.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)');
  }
  out = out.replace(/\\log_\{([^{}]+)\}/g, 'log_$1');
  out = out.replace(/\\log_([A-Za-z0-9]+)/g, 'log_$1');
  out = out.replace(/\\sqrt\{([^{}]+)\}/g, 'sqrt($1)');
  out = out.replace(/\^\{([^{}]+)\}/g, '^($1)');
  out = out.replace(/\\times/g, '*').replace(/\\div/g, '/').replace(/\\cdot/g, '*');
  out = out.replace(/\\rightarrow/g, '->').replace(/\\neg/g, '¬');
  return out;
}

export function solveMathQuestionOffline(
  rawQuestion: string,
  strandId: MathStrandId,
): CachedTutorReply {
  const q = normalizeLatexMathInput(rawQuestion);
  const lower = q.toLowerCase();
  const strand = STRAND_MODULES.find((m) => m.id === strandId) ?? STRAND_MODULES[0];

  // 1. Percentage of a number: e.g. "15% of 200"
  const pctMatch = /(\d+(?:\.\d+)?)\s*%\s*of\s*(\d+(?:\.\d+)?)/i.exec(q);
  if (pctMatch) {
    const pct = Number(pctMatch[1]);
    const whole = Number(pctMatch[2]);
    const ans = Number(((pct / 100) * whole).toFixed(4));
    return {
      id: `la-${Date.now()}`,
      problemPrompt: q,
      guidance: `LA solved it! ${pct}% of ${whole} equals ${ans}.`,
      steps: [
        `Convert the percentage to a decimal: ${pct}% = ${pct} ÷ 100 = ${(pct / 100).toString()}`,
        `Multiply by the base amount: ${(pct / 100).toString()} × ${whole} = ${ans}`,
      ],
      keyRule: 'Percent of a number = (Percent ÷ 100) × Base',
      checkQuestion: 'Want to try another percentage or interest calculation?',
      source: 'offline-engine',
      createdAt: new Date().toISOString(),
    };
  }

  // 2. Logarithm pattern: e.g. "log2(16)" or "log_3(81)"
  const logMatch = /log[_ ]?(\d+)\s*\(\s*(\d+(?:\.\d+)?)\s*\)/i.exec(q);
  if (logMatch) {
    const base = Number(logMatch[1]);
    const arg = Number(logMatch[2]);
    if (base > 1 && arg > 0) {
      const val = Math.log(arg) / Math.log(base);
      const rounded = Number(val.toFixed(4));
      return {
        id: `la-${Date.now()}`,
        problemPrompt: q,
        guidance: `LA solved it! log_${base}(${arg}) = ${rounded}.`,
        steps: [
          `Rewrite log_${base}(${arg}) = y into exponential form: ${base}^y = ${arg}.`,
          `Find the exponent y that raises ${base} to ${arg}: ${base}^${rounded} = ${arg}.`,
          `Therefore, log_${base}(${arg}) = ${rounded}.`,
        ],
        keyRule: 'log_b(x) = y means b^y = x (with b > 0, b ≠ 1, and x > 0).',
        checkQuestion: `Try checking: what is ${base} raised to ${rounded}?`,
        source: 'offline-engine',
        createdAt: new Date().toISOString(),
      };
    }
  }

  // 3. Linear equation pattern: e.g. "2x + 6 = 14" or "3x - 5 = 10" or "5x = 35"
  const linMatch = /(-?\d*)\s*x\s*([+\-]\s*\d+)?\s*=\s*(-?\d+(?:\.\d+)?)/i.exec(q.replace(/\s+/g, ''));
  if (linMatch && !lower.includes('^') && !lower.includes('log')) {
    const coeffRaw = linMatch[1];
    const a = coeffRaw === '' || coeffRaw === '+' ? 1 : coeffRaw === '-' ? -1 : Number(coeffRaw);
    const b = linMatch[2] ? Number(linMatch[2].replace(/\s+/g, '')) : 0;
    const c = Number(linMatch[3]);
    if (a !== 0 && Number.isFinite(a) && Number.isFinite(b) && Number.isFinite(c)) {
      const rhsAfter = c - b;
      const xVal = Number((rhsAfter / a).toFixed(4));
      return {
        id: `la-${Date.now()}`,
        problemPrompt: q,
        guidance: `LA solved your linear equation! x = ${xVal}.`,
        steps: [
          `Start with: ${a}x ${b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`} = ${c}`,
          b !== 0
            ? `${b > 0 ? `Subtract ${b}` : `Add ${Math.abs(b)}`} on both sides: ${a}x = ${rhsAfter}`
            : `Variable term is already isolated: ${a}x = ${rhsAfter}`,
          `Divide both sides by ${a}: x = ${rhsAfter} ÷ ${a} = ${xVal}`,
        ],
        keyRule: 'Undo addition/subtraction first, then divide by the coefficient of x.',
        checkQuestion: `Check: does ${a}(${xVal}) ${b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`} equal ${c}?`,
        source: 'offline-engine',
        createdAt: new Date().toISOString(),
      };
    }
  }

  // 4. Domain of simple rational function: e.g. "domain of 1/(x - 3)"
  const domMatch = /\/\s*\(?\s*x\s*([+\-]\s*\d+)\s*\)?/i.exec(q.replace(/\s+/g, ''));
  if (lower.includes('domain') && domMatch) {
    const offset = Number(domMatch[1]);
    const excluded = -offset;
    return {
      id: `la-${Date.now()}`,
      problemPrompt: q,
      guidance: `LA found the domain restriction! Every real number except x = ${excluded}.`,
      steps: [
        `A rational function is undefined whenever its denominator equals 0.`,
        `Set the denominator to zero: x ${offset >= 0 ? `+ ${offset}` : `- ${Math.abs(offset)}`} = 0`,
        `Solve for x: x = ${excluded}. Exclude this value from the domain.`,
      ],
      keyRule: 'Domain of p(x)/q(x): { x ∈ ℝ | q(x) ≠ 0 }.',
      checkQuestion: `Why can’t we plug x = ${excluded} into the denominator?`,
      source: 'offline-engine',
      createdAt: new Date().toISOString(),
    };
  }

  // 5. Direct arithmetic expression (e.g. "2 + 3 * 4", "(10+6)/4", "sqrt(144)", "what is 18 / 3 + 4")
  const mathExprCandidate = q
    .replace(/^(what is|calculate|solve|compute|evaluate|=|\s)+/i, '')
    .replace(/[?=]+$/g, '')
    .trim();
  const arithVal = evaluateArithmeticExpression(mathExprCandidate);
  if (arithVal !== null) {
    return {
      id: `la-${Date.now()}`,
      problemPrompt: q,
      guidance: `LA calculated ${mathExprCandidate} = ${arithVal}.`,
      steps: [
        `Read the expression using order of operations (PEMDAS): ${mathExprCandidate}`,
        `Evaluate parentheses and exponents/roots first, then multiplication/division left to right, then addition/subtraction.`,
        `Exact result: ${arithVal}`,
      ],
      keyRule: 'Order of Operations (PEMDAS): Parentheses → Exponents → Multiply/Divide → Add/Subtract.',
      checkQuestion: 'Want to test another math expression or Grade 11 problem?',
      source: 'offline-engine',
      createdAt: new Date().toISOString(),
    };
  }

  // 6. Basic & Grade 11 Conceptual Math Topics
  if (lower.includes('simple') && lower.includes('interest')) {
    return {
      id: `la-${Date.now()}`,
      problemPrompt: q,
      guidance: 'Simple Interest grows only on your starting principal P using I = P · r · t.',
      steps: [
        '1. P = Principal (starting money), r = annual rate as a decimal (e.g. 5% → 0.05), t = time in years.',
        '2. Multiply I = P × r × t to find the interest earned.',
        '3. Add back to principal for total maturity value: F = P + I.',
      ],
      keyRule: 'Simple Interest: I = P · r · t   |   Compound Interest: F = P(1 + r/n)^(nt)',
      checkQuestion: 'Remember: if time is given in months, divide by 12 before multiplying!',
      source: 'offline-engine',
      createdAt: new Date().toISOString(),
    };
  }

  if (lower.includes('compound') && lower.includes('interest')) {
    return {
      id: `la-${Date.now()}`,
      problemPrompt: q,
      guidance: 'Compound Interest earns interest on BOTH the original principal and earlier interest!',
      steps: [
        '1. Use F = P(1 + r/n)^(n·t), where n is compounds per year (annually=1, quarterly=4, monthly=12).',
        '2. Divide annual decimal rate r by n, and multiply years t by n.',
        '3. Subtract P from F if you only want the compound interest (I_c = F - P).',
      ],
      keyRule: 'Compound Amount: F = P(1 + r/n)^(nt)',
      checkQuestion: 'Which grows faster over 5 years at 6%: simple or compound interest?',
      source: 'offline-engine',
      createdAt: new Date().toISOString(),
    };
  }

  if (lower.includes('p -> q') || lower.includes('p → q') || lower.includes('implication') || lower.includes('conditional')) {
    return {
      id: `la-${Date.now()}`,
      problemPrompt: q,
      guidance: 'A conditional statement p → q ("If p, then q") is FALSE in only ONE case: when p is TRUE and q is FALSE!',
      steps: [
        'T → T is TRUE (promise kept).',
        'T → F is FALSE (promise broken!).',
        'F → T and F → F are both TRUE (vacuously true when hypothesis is false).',
      ],
      keyRule: 'p → q is FALSE only for (T → F). Contrapositive (¬q → ¬p) always has the same truth value.',
      checkQuestion: 'What is the truth value of p → q when p is FALSE and q is TRUE?',
      source: 'offline-engine',
      createdAt: new Date().toISOString(),
    };
  }

  if (lower.includes('slope')) {
    return {
      id: `la-${Date.now()}`,
      problemPrompt: q,
      guidance: 'Slope (m) measures how steep a line is: vertical change divided by horizontal change (Rise over Run).',
      steps: [
        '1. Pick two points on the line: (x₁, y₁) and (x₂, y₂).',
        '2. Compute Rise = y₂ - y₁ and Run = x₂ - x₁.',
        '3. Divide: m = (y₂ - y₁) / (x₂ - x₁). Positive slopes go up left-to-right; negative go down.',
      ],
      keyRule: 'Slope formula: m = (y₂ - y₁) / (x₂ - x₁)',
      checkQuestion: 'What is the slope between (1, 2) and (3, 6)?',
      source: 'offline-engine',
      createdAt: new Date().toISOString(),
    };
  }

  if (lower.includes('fraction')) {
    return {
      id: `la-${Date.now()}`,
      problemPrompt: q,
      guidance: 'A fraction a/b shows a part out of b equal parts (where the denominator b ≠ 0).',
      steps: [
        'Adding/Subtracting: Find a common denominator first, then add/subtract numerators.',
        'Multiplying: Multiply straight across (numerator × numerator) / (denominator × denominator).',
        'Dividing: Keep the first fraction, Change ÷ to ×, Flip the second fraction (reciprocal).',
      ],
      keyRule: 'To divide fractions: Keep, Change, Flip! (a/b ÷ c/d = a/b × d/c)',
      checkQuestion: 'Try typing a fraction calculation like (1/2) + (1/4) for me to compute!',
      source: 'offline-engine',
      createdAt: new Date().toISOString(),
    };
  }

  // Fallback matched to selected Grade 11 strand
  return {
    id: `la-${Date.now()}`,
    problemPrompt: q,
    guidance: `LA’s ${strand.shortTitle} Guide: ${strand.summary}`,
    steps: strand.remediationExample.steps,
    keyRule: strand.keyFormulas[0],
    checkQuestion: `Tip: ${strand.commonPitfalls[0]} Try asking a calculation like "2x + 4 = 12", "log2(16)", or "15% of 200"!`,
    source: 'offline-engine',
    createdAt: new Date().toISOString(),
  };
}

export function explainWrongAnswerOffline(
  problem: PracticeProblem,
  chosenIndex: number,
): {whyWrong: string; keyCorrection: string; encouragement: string} {
  const chosenText = problem.choices[chosenIndex] ?? 'your choice';
  const correctText = problem.choices[problem.correctIndex] ?? 'the correct choice';
  const promptLower = problem.prompt.toLowerCase();
  const strand = STRAND_MODULES.find((m) => m.id === problem.strandId) ?? STRAND_MODULES[0];

  let whyWrong = `"${chosenText}" does not satisfy all parts of the equation or rule, whereas "${correctText}" matches every step.`;

  if (problem.strandId === MathStrandId.FUNCTIONS) {
    if (promptLower.includes('domain') || promptLower.includes('excluded')) {
      whyWrong = `Picking "${chosenText}" misses the exact x-value that makes the denominator zero (or checks the wrong sign/numerator). Remember: only the denominator causes division by zero!`;
    } else if (promptLower.includes('inverse') || promptLower.includes('f⁻¹')) {
      whyWrong = `"${chosenText}" usually comes from flipping signs or swapping numerator/denominator without solving y after cross-multiplying x = f(y).`;
    } else {
      whyWrong = `"${chosenText}" results from a sign or order-of-operations slip when substituting x into the function (for example, multiplying before squaring).`;
    }
  } else if (problem.strandId === MathStrandId.EXPONENTIAL) {
    if (promptLower.includes('log')) {
      whyWrong = `"${chosenText}" confuses the base, argument, or exponent—remember log_b(x) asks "what power of b gives x?", not b × x or x ÷ b.`;
    } else {
      whyWrong = `"${chosenText}" happens when bases are not matched first or a shift in the exponent (+ or -) is moved with the wrong sign.`;
    }
  } else if (problem.strandId === MathStrandId.BUSINESS) {
    if (promptLower.includes('compound')) {
      whyWrong = `"${chosenText}" reflects either simple interest or an incorrect compounding period—compound interest applies (1 + r/n)^(n·t) so prior interest also earns interest.`;
    } else {
      whyWrong = `"${chosenText}" often comes from using the rate without converting % to a decimal, forgetting to multiply by t years, or adding principal P when only interest I was asked.`;
    }
  } else if (problem.strandId === MathStrandId.LOGIC) {
    whyWrong = `"${chosenText}" reverses the truth-table rule. For p → q, the ONLY false case is (True → False); when p is false, p → q is always TRUE!`;
  }

  return {
    whyWrong,
    keyCorrection: `Correct Answer: ${correctText}. ${problem.conceptTip || strand.keyFormulas[0]}`,
    encouragement: 'Mistakes help you spot tricky traps—review the steps below and try the next one!',
  };
}

export function generateOfflineTutorReply(params: {
  strandId: MathStrandId;
  proficiencyLevel: ProficiencyLevel;
  track: LearningTrack;
  problemPrompt: string;
  studentQuestion?: string;
  mode: 'hint' | 'step-by-step' | 'challenge';
  fallbackSteps?: string[];
  fallbackHint?: string;
}): CachedTutorReply {
  const query = params.studentQuestion?.trim() || params.problemPrompt;
  const solved = solveMathQuestionOffline(query, params.strandId);
  if (params.mode === 'hint' && params.fallbackHint) {
    return {
      ...solved,
      guidance: `LA Hint (${params.proficiencyLevel}): ${params.fallbackHint}`,
    };
  }
  return solved;
}

export function generateOfflineTeacherPlan(params: {
  strandTitle: string;
  remediationCount: number;
  advancementCount: number;
  averageScore: number;
}) {
  return {
    summary: `Offline Instructional Plan for ${params.strandTitle}: Class mastery is ${params.averageScore}%, with ${params.remediationCount} student(s) in Remediation and ${params.advancementCount} in Advancement.`,
    remediationActivities: [
      `15-min Guided Think-Aloud: Walk through one foundational worked example in ${params.strandTitle}, highlighting sign errors and domain checks.`,
      `Peer Pair-Check Drill: Students complete 3 scaffolded problems offline using the Interactive Visualizer to verify answers visually.`,
      `Error-Analysis Warmup: Present a flawed solution and ask remediation students to pinpoint the exact algebraic or logical step where it broke.`,
    ],
    advancementExtensions: [
      `Real-World Modeling Task: Challenge proficient students to construct an original word problem using ${params.strandTitle} and exchange with a partner.`,
      `Boundary & Edge-Case Proof: Have advanced students explain why domain restrictions or vacuously true implications behave as they do.`,
    ],
    exitTicket: `Before leaving, write one key rule for ${params.strandTitle} and solve one quick verification check without notes.`,
  };
}

export function generateActivityPackOffline(params: {
  strandId: MathStrandId;
  track: LearningTrack;
  targetSection: string;
  count?: number;
  titleOverride?: string;
}): AssignedActivity {
  const strand = STRAND_MODULES.find((m) => m.id === params.strandId) ?? STRAND_MODULES[0];
  const problemCount = params.count ?? 3;
  const problems: PracticeProblem[] = [];
  const seenPrompts = new Set<string>();

  for (let i = 0; i < problemCount * 4 && problems.length < problemCount; i++) {
    const generated = generateOfflinePracticeProblem(params.strandId, params.track);
    if (!seenPrompts.has(generated.prompt)) {
      seenPrompts.add(generated.prompt);
      problems.push({
        ...generated,
        id: `actp-${params.strandId}-${params.track}-${Date.now()}-${problems.length + 1}`,
      });
    }
  }

  while (problems.length < problemCount) {
    const fallback = generateOfflinePracticeProblem(params.strandId, params.track);
    problems.push({
      ...fallback,
      id: `actp-${params.strandId}-${params.track}-${Date.now()}-${problems.length + 1}`,
    });
  }

  const isRem = params.track === LearningTrack.REMEDIATION;
  return {
    id: `act-${params.track}-${params.strandId}-${Date.now()}-${randomInt(10, 99)}`,
    title:
      params.titleOverride ??
      `${strand.shortTitle}: ${isRem ? 'Guided Remediation Activity' : 'Advancement Challenge Pack'}`,
    strandId: params.strandId,
    track: params.track,
    targetSection: params.targetSection,
    instructions: isRem
      ? `Complete these ${problemCount} step-by-step ${strand.title} exercises to build mastery.`
      : `Solve these ${problemCount} enrichment problems in ${strand.title} to push your mastery further.`,
    problems,
    createdAt: new Date().toISOString(),
    source: 'offline-generator',
  };
}

export function generateAutoDifferentiatedActivitiesOffline(
  students: StudentProfile[],
  targetSection: string,
): AssignedActivity[] {
  const scoped =
    targetSection === 'ALL'
      ? students
      : students.filter((s) => s.gradeSection === targetSection);

  // Pick the weakest strand for remediation and strongest/enrichment strand for advancement
  const strandNeeds = STRAND_MODULES.map((strand) => {
    const assessed = scoped.filter((s) => s.diagnostic?.strandScores[strand.id]);
    const remCount = scoped.filter((s) => {
      const prog = s.strandProgress[strand.id];
      const diagTrack = s.diagnostic?.strandScores[strand.id]?.recommendedTrack;
      const active =
        prog.trackOverride ??
        (prog.masteredRemediation ? LearningTrack.ADVANCEMENT : diagTrack);
      return !prog.masteredRemediation && active === LearningTrack.REMEDIATION;
    }).length;
    const avgPct =
      assessed.length > 0
        ? assessed.reduce((sum, s) => sum + (s.diagnostic?.strandScores[strand.id]?.percent ?? 0), 0) /
          assessed.length
        : 50;
    return {strandId: strand.id, remCount, avgPct};
  });

  const weakest = [...strandNeeds].sort((a, b) => b.remCount - a.remCount || a.avgPct - b.avgPct)[0];
  const strongest = [...strandNeeds].sort((a, b) => b.avgPct - a.avgPct || a.remCount - b.remCount)[0];

  const remActivity = generateActivityPackOffline({
    strandId: weakest?.strandId ?? MathStrandId.FUNCTIONS,
    track: LearningTrack.REMEDIATION,
    targetSection,
    count: 3,
  });

  const advStrand =
    strongest && strongest.strandId !== remActivity.strandId
      ? strongest.strandId
      : MathStrandId.BUSINESS;

  const advActivity = generateActivityPackOffline({
    strandId: advStrand,
    track: LearningTrack.ADVANCEMENT,
    targetSection,
    count: 3,
  });

  return [remActivity, advActivity];
}
