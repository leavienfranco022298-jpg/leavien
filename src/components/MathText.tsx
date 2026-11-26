import katex from 'katex';
import React, {useEffect, useMemo, useRef} from 'react';

interface KatexSpanProps {
  latex: string;
  displayMode?: boolean;
}

const KatexSpan: React.FC<KatexSpanProps> = ({latex, displayMode = false}) => {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    try {
      katex.render(latex, el, {
        displayMode,
        throwOnError: false,
        strict: false,
        trust: false,
      });
    } catch {
      el.textContent = latex;
    }
  }, [latex, displayMode]);

  return (
    <span
      ref={ref}
      className={displayMode ? 'my-1.5 block overflow-x-auto text-center' : 'inline-block align-baseline mx-0.5'}
    />
  );
};

const SUPERSCRIPT_MAP: Record<string, string> = {
  '⁰': '0',
  '¹': '1',
  '²': '2',
  '³': '3',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9',
};

const SUBSCRIPT_MAP: Record<string, string> = {
  '₀': '0',
  '₁': '1',
  '₂': '2',
  '₃': '3',
  '₄': '4',
  '₅': '5',
  '₆': '6',
  '₇': '7',
  '₈': '8',
  '₉': '9',
};

function convertUnicodeMathToLatex(raw: string): string {
  let out = raw;
  out = out.replace(/f⁻¹/g, 'f^{-1}');
  out = out.replace(/⁻¹/g, '^{-1}');
  out = out.replace(/([A-Za-z0-9)\]])([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (_, base: string, sups: string) => {
    const digits = sups
      .split('')
      .map((ch) => SUPERSCRIPT_MAP[ch] ?? ch)
      .join('');
    return `${base}^{${digits}}`;
  });
  out = out.replace(/([A-Za-z0-9)\]])([₀₁₂₃₄₅₆₇₈₉]+)/g, (_, base: string, subs: string) => {
    const digits = subs
      .split('')
      .map((ch) => SUBSCRIPT_MAP[ch] ?? ch)
      .join('');
    return `${base}_{${digits}}`;
  });
  out = out.replace(/log_([A-Za-z0-9]+)/g, '\\log_{$1}');
  out = out.replace(/log([₀₁₂₃₄₅₆₇₈₉]+)/g, (_, subs: string) => {
    const digits = subs
      .split('')
      .map((ch) => SUBSCRIPT_MAP[ch] ?? ch)
      .join('');
    return `\\log_{${digits}}`;
  });
  out = out.replace(/log_\{([^}]+)\}/g, '\\log_{$1}');
  out = out.replace(/\\\\log/g, '\\log');
  out = out.replace(/sqrt\(([^)]+)\)/gi, '\\sqrt{$1}');
  out = out.replace(/√\(([^)]+)\)/g, '\\sqrt{$1}');
  out = out.replace(/√([A-Za-z0-9]+)/g, '\\sqrt{$1}');
  out = out.replace(/\^\(([^)]+)\)/g, '^{$1}');
  out = out.replace(/->/g, '\\rightarrow ');
  out = out.replace(/→/g, '\\rightarrow ');
  out = out.replace(/⇔/g, '\\Leftrightarrow ');
  out = out.replace(/↔/g, '\\leftrightarrow ');
  out = out.replace(/¬/g, '\\neg ');
  out = out.replace(/∧/g, '\\land ');
  out = out.replace(/∨/g, '\\lor ');
  out = out.replace(/≠/g, '\\neq ');
  out = out.replace(/≤/g, '\\le ');
  out = out.replace(/≥/g, '\\ge ');
  out = out.replace(/±/g, '\\pm ');
  out = out.replace(/≡/g, '\\equiv ');
  out = out.replace(/∈/g, '\\in ');
  out = out.replace(/ℝ/g, '\\mathbb{R}');
  out = out.replace(/·/g, '\\cdot ');
  out = out.replace(/×/g, '\\times ');
  out = out.replace(/÷/g, '\\div ');

  // Convert explicit parenthesized fractions like (2x + 1) / (x - 4) or 12/(x^{2} - 4)
  out = out.replace(
    /\(([^()]+)\)\s*\/\s*\(([^()]+)\)/g,
    '\\frac{$1}{$2}',
  );
  out = out.replace(
    /(\b[A-Za-z0-9]+(?:\^\{[^}]+\})?)\s*\/\s*\(([^()]+)\)/g,
    '\\frac{$1}{$2}',
  );
  out = out.replace(
    /\(([^()]+)\)\s*\/\s*(\b[A-Za-z0-9]+)\b/g,
    '\\frac{$1}{$2}',
  );
  // Simple numeric fraction like 1/2 or 6/12 (skip URLs or dates or text like and/or)
  out = out.replace(/\b(\d+)\s*\/\s*(\d+)\b/g, '\\frac{$1}{$2}');

  return out;
}

function autoWrapMathTokensInPlainSegment(segment: string): string {
  // Wrap clear inline math equations/expressions inside $...$ while leaving English prose untouched
  let text = segment;

  // Don't touch if it's purely a simple prose phrase with no math signals
  const hasMathSignal =
    /[=^₀₁₂₃₄₅₆₇₈₉⁰¹²³⁴⁵⁶⁷⁸⁹⁻¹→↔⇔¬∧∨≠≤≥±≡∈ℝ√·×÷]|log[_₀₁₂₃₄₅₆₇₈₉]|\([^)]+\)\s*\/\s*\([^)]+\)|\b\d+\s*\/\s*\d+\b|\bf\(|\bg\(|\bh\(|\bP\(|\bsqrt\(/i.test(
      text,
    );
  if (!hasMathSignal) return text;

  // Wrap common self-contained math spans:
  // 1. Set builder like {x ∈ ℝ | x ≠ 5}
  text = text.replace(/\{[^{}]*[∈≠≤≥ℝ|][^{}]*\}/g, (m) => `$${convertUnicodeMathToLatex(m)}$`);

  // 2. Function/equation expressions like f(x) = ..., y = ..., x = ..., P(t) = ..., 2^(x+1) = 32
  text = text.replace(
    /\b(?:[A-Za-z]\([^)]+\)|[A-Za-z][₀₁₂₃₄₅₆₇₈₉⁻¹]*(?:\^\([^)]+\)|\^[A-Za-z0-9]+)?|\d+(?:\^\([^)]+\)|[⁰¹²³⁴⁵⁶⁷⁸⁹]+|\^[A-Za-z0-9]+)?[A-Za-z]*)\s*(?:=|≠|≤|≥|→|⇔|≡)\s*[^,.;!?]+?(?=(?:\s+(?:and|or|where|since|so|is|are|when|for|with|if|then|by|after|before)\b|[.,;!?]|$))/g,
    (m) => {
      if (m.includes('$') || m.includes('₱')) return m;
      return `$${convertUnicodeMathToLatex(m.trim())}$`;
    },
  );

  // 3. Remaining standalone math tokens: fractions, logs, powers, logic symbols, roots, f(x)
  text = text.replace(
    /(?:\([^()]+\)\s*\/\s*\([^()]+\)|(?:\b\d+|[A-Za-z])\s*\/\s*\([^()]+\)|\([^()]+\)\s*\/\s*(?:\b\d+|[A-Za-z]\b)|\b\d+\/\d+\b|(?:\\?log[_₀₁₂₃₄₅₆₇₈₉]+(?:\{[^}]+\}|\d+)|\\?log_[A-Za-z0-9]+)\s*(?:\[[^\]]+\]|\([^)]+\))|f⁻¹\([^)]+\)|[A-Za-z]\(-?\d+\)|[A-Za-z0-9)]+(?:\^\([^)]+\)|[⁰¹²³⁴⁵⁶⁷⁸⁹⁻¹]+)|(?:¬?\([^)]*[∨∧→↔¬][^)]*\)|¬[pq]|p\s*[→↔∧∨]\s*q)|(?:sqrt\([^)]+\)|√[A-Za-z0-9(]+(?:\))?))/g,
    (m, offset: number, full: string) => {
      // Avoid wrapping inside existing $...$
      const before = full.slice(0, offset);
      const dollarCount = (before.match(/\$/g) || []).length;
      if (dollarCount % 2 === 1) return m;
      if (m.includes('₱')) return m;
      return `$${convertUnicodeMathToLatex(m)}$`;
    },
  );

  return text;
}

type Segment =
  | {type: 'text'; value: string}
  | {type: 'inline-math'; value: string}
  | {type: 'display-math'; value: string};

function parseMathSegments(input: string): Segment[] {
  // First tokenize explicit $$...$$ and $...$, then auto-upgrade un-wrapped plain segments
  const explicitRegex = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g;
  const rawParts = input.split(explicitRegex);
  const upgraded = rawParts
    .map((part) => {
      if (part.startsWith('$$') && part.endsWith('$$')) return part;
      if (part.startsWith('$') && part.endsWith('$')) return part;
      return autoWrapMathTokensInPlainSegment(part);
    })
    .join('');

  const finalParts = upgraded.split(explicitRegex);
  const segments: Segment[] = [];
  for (const part of finalParts) {
    if (!part) continue;
    if (part.startsWith('$$') && part.endsWith('$$') && part.length > 4) {
      segments.push({type: 'display-math', value: part.slice(2, -2).trim()});
    } else if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
      segments.push({type: 'inline-math', value: part.slice(1, -1).trim()});
    } else {
      segments.push({type: 'text', value: part});
    }
  }
  return segments;
}

interface MathTextProps {
  text: string;
  className?: string;
}

export const MathText: React.FC<MathTextProps> = ({text, className}) => {
  const segments = useMemo(() => parseMathSegments(text), [text]);

  return (
    <span className={className}>
      {segments.map((seg, idx) => {
        if (seg.type === 'display-math') {
          return <KatexSpan key={`dm-${idx}`} latex={seg.value} displayMode />;
        }
        if (seg.type === 'inline-math') {
          return <KatexSpan key={`im-${idx}`} latex={seg.value} />;
        }
        return <React.Fragment key={`tx-${idx}`}>{seg.value}</React.Fragment>;
      })}
    </span>
  );
};
