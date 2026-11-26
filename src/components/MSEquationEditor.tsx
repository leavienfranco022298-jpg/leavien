import {Check, Copy, Eraser, FunctionSquare, Plus} from 'lucide-react';
import React, {useRef, useState} from 'react';
import {soundFx} from '../utils/soundFx';
import {MathText} from './MathText';

interface MSEquationEditorProps {
  initialLatex?: string;
  actionLabel?: string;
  onInsertEquation: (wrappedLatex: string, rawLatex: string) => void;
  onCancel?: () => void;
}

type RibbonTab = 'structures' | 'symbols' | 'templates';

const STRUCTURE_BUTTONS: Array<{
  label: string;
  preview: string;
  insert: string;
  cursorOffset?: number;
}> = [
  {label: 'Fraction', preview: '$\\frac{a}{b}$', insert: '\\frac{a}{b}'},
  {label: 'Exponent', preview: '$x^{n}$', insert: 'x^{n}'},
  {label: 'Subscript / Log', preview: '$\\log_{b}(x)$', insert: '\\log_{2}(16)'},
  {label: 'Radical', preview: '$\\sqrt{x}$', insert: '\\sqrt{x}'},
  {label: 'Inverse', preview: '$f^{-1}(x)$', insert: 'f^{-1}(x)'},
  {label: 'Parentheses', preview: '$(x)$', insert: '\\left(x\\right)'},
  {label: 'Rational f(x)', preview: '$\\frac{ax+b}{cx+d}$', insert: 'f(x) = \\frac{x + 2}{x - 3}'},
  {label: 'Compound', preview: '$P(1+\\frac{r}{n})^{nt}$', insert: 'F = P\\left(1 + \\frac{r}{n}\\right)^{nt}'},
];

const SYMBOL_BUTTONS: Array<{label: string; preview: string; insert: string}> = [
  {label: 'Not equal', preview: '$\\neq$', insert: ' \\neq '},
  {label: 'Less/eq', preview: '$\\le$', insert: ' \\le '},
  {label: 'Greater/eq', preview: '$\\ge$', insert: ' \\ge '},
  {label: 'Plus/minus', preview: '$\\pm$', insert: ' \\pm '},
  {label: 'Multiply', preview: '$\\times$', insert: ' \\times '},
  {label: 'Divide', preview: '$\\div$', insert: ' \\div '},
  {label: 'Dot', preview: '$\\cdot$', insert: ' \\cdot '},
  {label: 'Implies', preview: '$\\rightarrow$', insert: ' \\rightarrow '},
  {label: 'Iff', preview: '$\\leftrightarrow$', insert: ' \\leftrightarrow '},
  {label: 'Not', preview: '$\\neg$', insert: '\\neg '},
  {label: 'And', preview: '$\\land$', insert: ' \\land '},
  {label: 'Or', preview: '$\\lor$', insert: ' \\lor '},
  {label: 'Real nums', preview: '$\\in \\mathbb{R}$', insert: ' \\in \\mathbb{R}'},
  {label: 'Infinity', preview: '$\\infty$', insert: '\\infty'},
];

const TEMPLATE_BUTTONS: Array<{title: string; latex: string}> = [
  {title: 'Quadratic Evaluation', latex: 'f(x) = 3x^{2} - 2x + 5'},
  {title: 'Rational Function', latex: 'g(x) = \\frac{2x + 1}{x - 4}'},
  {title: 'Exponential Equation', latex: '2^{x + 1} = 32'},
  {title: 'Logarithm Law', latex: '\\log_{2}(8) + \\log_{2}(4) = \\log_{2}(32)'},
  {title: 'Simple Interest', latex: 'I = P \\cdot r \\cdot t'},
  {title: 'Compound Maturity', latex: 'F = 10000\\left(1 + \\frac{0.06}{4}\\right)^{4 \\cdot 2}'},
  {title: 'Contrapositive Rule', latex: '(p \\rightarrow q) \\equiv (\\neg q \\rightarrow \\neg p)'},
  {title: 'Quadratic Formula', latex: 'x = \\frac{-b \\pm \\sqrt{b^{2} - 4ac}}{2a}'},
];

export const MSEquationEditor: React.FC<MSEquationEditorProps> = ({
  initialLatex = '',
  actionLabel = 'Insert Equation',
  onInsertEquation,
  onCancel,
}) => {
  const [latex, setLatex] = useState(initialLatex);
  const [activeTab, setActiveTab] = useState<RibbonTab>('structures');
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const insertAtCursor = (snippet: string) => {
    soundFx.tap();
    const el = inputRef.current;
    if (!el) {
      setLatex((prev) => `${prev}${snippet}`);
      return;
    }
    const start = el.selectionStart ?? latex.length;
    const end = el.selectionEnd ?? latex.length;
    const next = `${latex.slice(0, start)}${snippet}${latex.slice(end)}`;
    setLatex(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + snippet.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleCopy = async () => {
    if (!latex.trim()) return;
    try {
      await navigator.clipboard.writeText(`$${latex.trim()}$`);
      setCopied(true);
      soundFx.correct();
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard unavailable
    }
  };

  const handleSubmit = () => {
    const clean = latex.trim();
    if (!clean) return;
    soundFx.openNote();
    onInsertEquation(`$${clean}$`, clean);
  };

  return (
    <div className="rounded-xl border border-cyan-400/35 bg-[#0b1033] p-3.5 text-slate-100 shadow-lg space-y-3">
      {/* MS Equation Ribbon Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 text-white">
            <FunctionSquare className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">MS Equation Editor</div>
            <div className="text-[10px] text-cyan-200/80">
              Build properly formatted math equations (fractions, powers, logs, roots, logic)
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-[#141848] p-0.5 border border-white/10 text-[11px]">
          {(['structures', 'symbols', 'templates'] as RibbonTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                soundFx.tap();
                setActiveTab(tab);
              }}
              className={`rounded-md px-2.5 py-1 font-semibold capitalize transition-colors cursor-pointer ${
                activeTab === tab ? 'bg-[#4f6af0] text-white' : 'text-indigo-200 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Ribbon Toolbar Palette */}
      {activeTab === 'structures' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {STRUCTURE_BUTTONS.map((btn) => (
            <button
              key={btn.label}
              type="button"
              onClick={() => insertAtCursor(btn.insert)}
              className="flex flex-col items-center justify-center rounded-lg border border-white/10 bg-[#141848] px-2 py-2 text-center hover:border-cyan-400/50 hover:bg-[#1b2163] cursor-pointer transition-colors"
            >
              <span className="text-xs text-white">
                <MathText text={btn.preview} />
              </span>
              <span className="mt-1 text-[10px] text-indigo-200/80">{btn.label}</span>
            </button>
          ))}
        </div>
      )}

      {activeTab === 'symbols' && (
        <div className="flex flex-wrap gap-1.5">
          {SYMBOL_BUTTONS.map((btn) => (
            <button
              key={btn.label}
              type="button"
              onClick={() => insertAtCursor(btn.insert)}
              title={btn.label}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#141848] px-2.5 py-1.5 text-xs text-white hover:border-cyan-400/50 hover:bg-[#1b2163] cursor-pointer"
            >
              <MathText text={btn.preview} />
              <span className="text-[10px] text-indigo-200/75">{btn.label}</span>
            </button>
          ))}
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="grid sm:grid-cols-2 gap-1.5">
          {TEMPLATE_BUTTONS.map((tpl) => (
            <button
              key={tpl.title}
              type="button"
              onClick={() => {
                soundFx.tap();
                setLatex(tpl.latex);
              }}
              className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#141848] px-3 py-2 text-left hover:border-cyan-400/50 hover:bg-[#1b2163] cursor-pointer"
            >
              <span className="text-[11px] font-medium text-indigo-200">{tpl.title}</span>
              <span className="text-xs text-white truncate max-w-[55%]">
                <MathText text={`$${tpl.latex}$`} />
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Raw Equation Input + Live Rendered Math Preview */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={latex}
            onChange={(e) => setLatex(e.target.value)}
            placeholder="Click a structure above or type math (e.g. \frac{2x+1}{x-4} or 2^{x+1}=32)..."
            className="flex-1 rounded-lg border border-white/15 bg-[#070a24] px-3 py-2 font-mono text-xs text-cyan-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => {
              soundFx.tap();
              setLatex('');
            }}
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer"
            title="Clear equation"
            aria-label="Clear equation"
          >
            <Eraser className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => void handleCopy()}
            disabled={!latex.trim()}
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-40 cursor-pointer"
            title="Copy equation"
            aria-label="Copy equation"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>

        <div className="min-h-[48px] rounded-lg border border-indigo-400/20 bg-[#141848]/70 px-3.5 py-2 flex items-center justify-between gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-300 shrink-0">
            Preview
          </span>
          <div className="flex-1 text-center text-sm sm:text-base text-white overflow-x-auto">
            {latex.trim() ? (
              <MathText text={`$$${latex.trim()}$$`} />
            ) : (
              <span className="text-xs italic text-slate-400">Your formatted math equation appears here</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={() => {
              soundFx.tap();
              onCancel();
            }}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 cursor-pointer"
          >
            Close
          </button>
        )}
        <button
          type="button"
          disabled={!latex.trim()}
          onClick={handleSubmit}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#0e9b88] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#12ad98] disabled:opacity-40 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          {actionLabel}
        </button>
      </div>
    </div>
  );
};
