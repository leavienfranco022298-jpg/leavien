import {motion} from 'motion/react';
import React, {useState} from 'react';
import {MathStrandId} from '../types/math';
import {soundFx} from '../utils/soundFx';

interface MathVisualizerProps {
  strandId: MathStrandId;
}

export const MathVisualizer: React.FC<MathVisualizerProps> = ({strandId}) => {
  const [fnA, setFnA] = useState(2);
  const [fnH, setFnH] = useState(1);
  const [fnK, setFnK] = useState(1);
  const [evalX, setEvalX] = useState(3);

  const [expA, setExpA] = useState(1);
  const [expB, setExpB] = useState(2);

  const [principal, setPrincipal] = useState(10000);
  const [rate, setRate] = useState(6);
  const [years, setYears] = useState(5);
  const [compFreq, setCompFreq] = useState(4);

  const [propP, setPropP] = useState(true);
  const [propQ, setPropQ] = useState(false);

  if (strandId === MathStrandId.FUNCTIONS) {
    const width = 440;
    const height = 280;
    const minCoord = -6;
    const maxCoord = 6;
    const toSvgX = (x: number) => ((x - minCoord) / (maxCoord - minCoord)) * width;
    const toSvgY = (y: number) => height - ((y - minCoord) / (maxCoord - minCoord)) * height;

    const buildBranch = (xStart: number, xEnd: number) => {
      const pts: string[] = [];
      const steps = 60;
      for (let i = 0; i <= steps; i++) {
        const x = xStart + ((xEnd - xStart) * i) / steps;
        if (Math.abs(x - fnH) < 0.14) continue;
        const y = fnA / (x - fnH) + fnK;
        if (y < minCoord - 2 || y > maxCoord + 2) continue;
        pts.push(`${pts.length === 0 ? 'M' : 'L'} ${toSvgX(x).toFixed(1)} ${toSvgY(y).toFixed(1)}`);
      }
      return pts.join(' ');
    };

    const leftBranch = buildBranch(minCoord, fnH - 0.15);
    const rightBranch = buildBranch(fnH + 0.15, maxCoord);
    const isUndefined = Math.abs(evalX - fnH) < 0.01;
    const evalY = isUndefined ? null : fnA / (evalX - fnH) + fnK;

    return (
      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr] items-stretch">
        <div className="rounded-2xl border border-white/10 bg-[#171942] p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-indigo-200">
            <span className="font-mono font-medium text-white">
              f(x) = {fnA} / (x {fnH >= 0 ? `- ${fnH}` : `+ ${Math.abs(fnH)}`}) {fnK >= 0 ? `+ ${fnK}` : `- ${Math.abs(fnK)}`}
            </span>
            <span className="tabular-nums">
              VA: x = {fnH} · HA: y = {fnK}
            </span>
          </div>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full rounded-xl border border-white/10 bg-[#0e102c]"
            role="img"
            aria-label="Rational function coordinate plane graph"
          >
            {[-5, -4, -3, -2, -1, 1, 2, 3, 4, 5].map((n) => (
              <g key={n}>
                <line x1={toSvgX(n)} y1={0} x2={toSvgX(n)} y2={height} stroke="#23265a" strokeWidth="1" />
                <line x1={0} y1={toSvgY(n)} x2={width} y2={toSvgY(n)} stroke="#23265a" strokeWidth="1" />
              </g>
            ))}
            <line x1={0} y1={toSvgY(0)} x2={width} y2={toSvgY(0)} stroke="#64748b" strokeWidth="1.5" />
            <line x1={toSvgX(0)} y1={0} x2={toSvgX(0)} y2={height} stroke="#64748b" strokeWidth="1.5" />
            <line x1={toSvgX(fnH)} y1={0} x2={toSvgX(fnH)} y2={height} stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="5 5" />
            <line x1={0} y1={toSvgY(fnK)} x2={width} y2={toSvgY(fnK)} stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="5 5" />
            {leftBranch && <path d={leftBranch} fill="none" stroke="#38bdf8" strokeWidth="2.5" />}
            {rightBranch && <path d={rightBranch} fill="none" stroke="#38bdf8" strokeWidth="2.5" />}
            {evalY !== null && evalY >= minCoord && evalY <= maxCoord && (
              <circle cx={toSvgX(evalX)} cy={toSvgY(evalY)} r="6" fill="#34d399" stroke="#0e102c" strokeWidth="2" />
            )}
          </svg>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#171942] p-5 space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-white">Rational Asymptote Lab</h4>
              <button
                type="button"
                onClick={() => {
                  soundFx.tap();
                  setFnA(2);
                  setFnH(1);
                  setFnK(1);
                  setEvalX(1);
                }}
                className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-indigo-200 hover:bg-white/10 cursor-pointer"
              >
                Test Asymptote
              </button>
            </div>
            <label className="block text-xs font-medium text-indigo-200">
              Numerator Scale a: <span className="font-mono tabular-nums text-white">{fnA}</span>
              <input
                type="range"
                min={-4}
                max={4}
                step={1}
                value={fnA}
                onChange={(e) => setFnA(Number(e.target.value) || 1)}
                className="mt-1 w-full accent-[#4f6af0] cursor-pointer"
              />
            </label>
            <label className="block text-xs font-medium text-indigo-200">
              Vertical Asymptote h: <span className="font-mono tabular-nums text-white">{fnH}</span>
              <input
                type="range"
                min={-3}
                max={3}
                step={1}
                value={fnH}
                onChange={(e) => setFnH(Number(e.target.value))}
                className="mt-1 w-full accent-[#4f6af0] cursor-pointer"
              />
            </label>
            <label className="block text-xs font-medium text-indigo-200">
              Horizontal Asymptote k: <span className="font-mono tabular-nums text-white">{fnK}</span>
              <input
                type="range"
                min={-3}
                max={3}
                step={1}
                value={fnK}
                onChange={(e) => setFnK(Number(e.target.value))}
                className="mt-1 w-full accent-[#4f6af0] cursor-pointer"
              />
            </label>
            <label className="block text-xs font-medium text-indigo-200">
              Test Input x₀: <span className="font-mono tabular-nums text-white">{evalX}</span>
              <input
                type="range"
                min={-5}
                max={5}
                step={0.5}
                value={evalX}
                onChange={(e) => setEvalX(Number(e.target.value))}
                className="mt-1 w-full accent-emerald-400 cursor-pointer"
              />
            </label>
          </div>
          <div
            className={`rounded-xl border p-3 text-xs ${
              isUndefined
                ? 'border-rose-400/40 bg-rose-500/15 text-rose-200'
                : 'border-white/10 bg-[#0e102c] text-indigo-100'
            }`}
          >
            <div className="font-semibold text-white">Live Evaluation</div>
            <div className="mt-1 font-mono tabular-nums">
              {isUndefined
                ? `f(${evalX}) is UNDEFINED (denominator = 0)`
                : `f(${evalX}) = ${evalY!.toFixed(2)}`}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (strandId === MathStrandId.EXPONENTIAL) {
    const width = 440;
    const height = 280;
    const minC = -2;
    const maxC = 8;
    const toSvgX = (x: number) => ((x - minC) / (maxC - minC)) * width;
    const toSvgY = (y: number) => height - ((y - minC) / (maxC - minC)) * height;

    const expPts: string[] = [];
    const logPts: string[] = [];
    for (let i = 0; i <= 80; i++) {
      const x = minC + ((maxC - minC) * i) / 80;
      const yExp = expA * Math.pow(expB, x);
      if (yExp >= minC - 0.5 && yExp <= maxC + 0.5) {
        expPts.push(`${expPts.length === 0 ? 'M' : 'L'} ${toSvgX(x).toFixed(1)} ${toSvgY(yExp).toFixed(1)}`);
      }
      if (x > 0.05 && expB !== 1) {
        const yLog = Math.log(x / expA) / Math.log(expB);
        if (yLog >= minC - 0.5 && yLog <= maxC + 0.5) {
          logPts.push(`${logPts.length === 0 ? 'M' : 'L'} ${toSvgX(x).toFixed(1)} ${toSvgY(yLog).toFixed(1)}`);
        }
      }
    }

    return (
      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr] items-stretch">
        <div className="rounded-2xl border border-white/10 bg-[#171942] p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-mono font-medium text-sky-300">
              y = {expA} · {expB}^x
            </span>
            <span className="font-mono font-medium text-emerald-300">
              Inverse: y = log_{expB}(x{expA > 1 ? ` / ${expA}` : ''})
            </span>
          </div>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full rounded-xl border border-white/10 bg-[#0e102c]"
            role="img"
            aria-label="Exponential and logarithmic inverse curves"
          >
            {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
              <g key={n}>
                <line x1={toSvgX(n)} y1={0} x2={toSvgX(n)} y2={height} stroke="#23265a" strokeWidth="1" />
                <line x1={0} y1={toSvgY(n)} x2={width} y2={toSvgY(n)} stroke="#23265a" strokeWidth="1" />
              </g>
            ))}
            <line x1={0} y1={toSvgY(0)} x2={width} y2={toSvgY(0)} stroke="#64748b" strokeWidth="1.5" />
            <line x1={toSvgX(0)} y1={0} x2={toSvgX(0)} y2={height} stroke="#64748b" strokeWidth="1.5" />
            <line x1={toSvgX(minC)} y1={toSvgY(minC)} x2={toSvgX(maxC)} y2={toSvgY(maxC)} stroke="#64748b" strokeWidth="1.2" strokeDasharray="4 4" />
            {expPts.length > 1 && <path d={expPts.join(' ')} fill="none" stroke="#38bdf8" strokeWidth="2.5" />}
            {logPts.length > 1 && <path d={logPts.join(' ')} fill="none" stroke="#34d399" strokeWidth="2.5" />}
            <circle cx={toSvgX(0)} cy={toSvgY(expA)} r="5" fill="#38bdf8" />
            <circle cx={toSvgX(expA)} cy={toSvgY(0)} r="5" fill="#34d399" />
          </svg>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#171942] p-5 space-y-4">
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-white">Exponential & Log Mirror</h4>
            <label className="block text-xs font-medium text-indigo-200">
              Initial Value a: <span className="font-mono tabular-nums text-white">{expA}</span>
              <input
                type="range"
                min={1}
                max={4}
                step={0.5}
                value={expA}
                onChange={(e) => setExpA(Number(e.target.value))}
                className="mt-1 w-full accent-sky-400 cursor-pointer"
              />
            </label>
            <label className="block text-xs font-medium text-indigo-200">
              Base b: <span className="font-mono tabular-nums text-white">{expB}</span>
              <input
                type="range"
                min={1.5}
                max={4}
                step={0.5}
                value={expB}
                onChange={(e) => setExpB(Number(e.target.value))}
                className="mt-1 w-full accent-emerald-400 cursor-pointer"
              />
            </label>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#0e102c] p-3 text-xs text-indigo-200">
            The exponential curve passes through <span className="font-mono text-white">(0, {expA})</span>, while its logarithm passes through <span className="font-mono text-white">({expA}, 0)</span>.
          </div>
        </div>
      </div>
    );
  }

  if (strandId === MathStrandId.BUSINESS) {
    const simpleMaturity = principal * (1 + (rate / 100) * years);
    const compoundMaturity = principal * Math.pow(1 + rate / 100 / compFreq, compFreq * years);
    const simpleInterest = simpleMaturity - principal;
    const compoundInterest = compoundMaturity - principal;
    const advantage = compoundMaturity - simpleMaturity;
    const maxVal = Math.max(compoundMaturity, simpleMaturity, 1);

    return (
      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr] items-stretch">
        <div className="rounded-2xl border border-white/10 bg-[#171942] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-indigo-200">
              <span>Simple vs. Compound Maturity</span>
              <span className="font-mono tabular-nums text-white">{years} yrs @ {rate}%</span>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <div className="flex justify-between text-xs font-medium text-indigo-200 mb-1.5">
                  <span>Simple Interest Total</span>
                  <span className="font-mono tabular-nums text-white">
                    ₱{simpleMaturity.toLocaleString('en-US', {maximumFractionDigits: 2})}
                  </span>
                </div>
                <div className="flex h-7 w-full overflow-hidden rounded-md bg-[#0e102c]">
                  <div className="bg-indigo-400 transition-all duration-300" style={{width: `${(principal / maxVal) * 100}%`}} />
                  <div className="bg-amber-400 transition-all duration-300" style={{width: `${(simpleInterest / maxVal) * 100}%`}} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-indigo-200 mb-1.5">
                  <span>Compound Interest Total (n = {compFreq}/yr)</span>
                  <span className="font-mono tabular-nums text-emerald-300 font-semibold">
                    ₱{compoundMaturity.toLocaleString('en-US', {maximumFractionDigits: 2})}
                  </span>
                </div>
                <div className="flex h-7 w-full overflow-hidden rounded-md bg-[#0e102c]">
                  <div className="bg-indigo-400 transition-all duration-300" style={{width: `${(principal / maxVal) * 100}%`}} />
                  <div className="bg-emerald-400 transition-all duration-300" style={{width: `${(compoundInterest / maxVal) * 100}%`}} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/10 pt-4 text-xs">
            <div>
              <div className="text-indigo-200/75">Simple Interest</div>
              <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-white">
                ₱{simpleInterest.toLocaleString('en-US', {maximumFractionDigits: 2})}
              </div>
            </div>
            <div>
              <div className="text-indigo-200/75">Compound Interest</div>
              <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-sky-300">
                ₱{compoundInterest.toLocaleString('en-US', {maximumFractionDigits: 2})}
              </div>
            </div>
            <div>
              <div className="text-indigo-200/75">Compounding Gain</div>
              <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-emerald-300">
                +₱{advantage.toLocaleString('en-US', {maximumFractionDigits: 2})}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#171942] p-5 space-y-3">
          <h4 className="text-sm font-semibold text-white">Interest Controls</h4>
          <label className="block text-xs font-medium text-indigo-200">
            Principal P: <span className="font-mono tabular-nums text-white">₱{principal.toLocaleString()}</span>
            <input
              type="range"
              min={2000}
              max={50000}
              step={2000}
              value={principal}
              onChange={(e) => setPrincipal(Number(e.target.value))}
              className="mt-1 w-full accent-[#4f6af0] cursor-pointer"
            />
          </label>
          <label className="block text-xs font-medium text-indigo-200">
            Rate r: <span className="font-mono tabular-nums text-white">{rate}%</span>
            <input
              type="range"
              min={2}
              max={15}
              step={1}
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="mt-1 w-full accent-[#4f6af0] cursor-pointer"
            />
          </label>
          <label className="block text-xs font-medium text-indigo-200">
            Time t: <span className="font-mono tabular-nums text-white">{years} years</span>
            <input
              type="range"
              min={1}
              max={15}
              step={1}
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="mt-1 w-full accent-[#4f6af0] cursor-pointer"
            />
          </label>
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            {[
              {label: 'Annual (1)', value: 1},
              {label: 'Semi (2)', value: 2},
              {label: 'Quarterly (4)', value: 4},
            ].map((opt) => (
              <motion.button
                key={opt.value}
                type="button"
                whileTap={{scale: 0.96}}
                onClick={() => {
                  soundFx.tap();
                  setCompFreq(opt.value);
                }}
                className={`rounded-md px-2 py-1.5 text-xs font-medium cursor-pointer whitespace-nowrap ${
                  compFreq === opt.value
                    ? 'bg-[#4f6af0] text-white'
                    : 'bg-[#0e102c] text-indigo-200 hover:bg-white/10'
                }`}
              >
                {opt.label}
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const conj = propP && propQ;
  const disj = propP || propQ;
  const impl = !propP || propQ;
  const contrapos = propQ || !propP;
  const bicond = propP === propQ;

  const rows = [
    {label: 'Conjunction', sym: 'p ∧ q', meaning: 'Both p and q are true', value: conj},
    {label: 'Disjunction', sym: 'p ∨ q', meaning: 'At least one is true', value: disj},
    {label: 'Conditional', sym: 'p → q', meaning: 'If p, then q', value: impl},
    {label: 'Contrapositive', sym: '¬q → ¬p', meaning: 'Equivalent to p → q', value: contrapos},
    {label: 'Biconditional', sym: 'p ↔ q', meaning: 'p if and only if q', value: bicond},
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr] items-stretch">
      <div className="rounded-2xl border border-white/10 bg-[#171942] p-5">
        <div className="mb-3 flex items-center justify-between text-xs text-indigo-200">
          <span>Live Truth Evaluator</span>
          <span className="font-mono text-white">
            p = {propP ? 'TRUE' : 'FALSE'} · q = {propQ ? 'TRUE' : 'FALSE'}
          </span>
        </div>
        <div className="divide-y divide-white/10 border border-white/10 rounded-xl overflow-hidden bg-[#0e102c]">
          {rows.map((r) => (
            <div key={r.sym} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <div>
                <span className="font-mono font-semibold text-white mr-2">{r.sym}</span>
                <span className="text-indigo-200/80 text-xs">{r.label}</span>
              </div>
              <span className={`font-mono text-xs font-semibold ${r.value ? 'text-emerald-300' : 'text-rose-300'}`}>
                {r.value ? 'TRUE' : 'FALSE'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#171942] p-5 flex flex-col justify-between space-y-4">
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-white">Toggle Propositions</h4>
          <motion.button
            type="button"
            whileTap={{scale: 0.98}}
            onClick={() => {
              soundFx.tap();
              setPropP((v) => !v);
            }}
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-[#0e102c] px-4 py-3 text-sm font-medium hover:border-indigo-400 cursor-pointer"
          >
            <span className="font-mono text-white">Proposition p</span>
            <span className={`font-mono text-xs font-semibold ${propP ? 'text-emerald-300' : 'text-rose-300'}`}>
              {propP ? 'TRUE' : 'FALSE'}
            </span>
          </motion.button>
          <motion.button
            type="button"
            whileTap={{scale: 0.98}}
            onClick={() => {
              soundFx.tap();
              setPropQ((v) => !v);
            }}
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-[#0e102c] px-4 py-3 text-sm font-medium hover:border-indigo-400 cursor-pointer"
          >
            <span className="font-mono text-white">Proposition q</span>
            <span className={`font-mono text-xs font-semibold ${propQ ? 'text-emerald-300' : 'text-rose-300'}`}>
              {propQ ? 'TRUE' : 'FALSE'}
            </span>
          </motion.button>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#0e102c] p-3 text-xs text-indigo-200">
          <span className="font-mono text-white">p → q</span> and its contrapositive <span className="font-mono text-white">¬q → ¬p</span> always match.
        </div>
      </div>
    </div>
  );
};
