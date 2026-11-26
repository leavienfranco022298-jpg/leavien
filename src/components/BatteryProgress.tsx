import {BatteryCharging} from 'lucide-react';
import {motion} from 'motion/react';
import React from 'react';

interface BatteryProgressProps {
  percent: number | null;
  label?: string;
  sublabel?: string;
  size?: 'sm' | 'md' | 'lg';
  showChargingIcon?: boolean;
}

export const BatteryProgress: React.FC<BatteryProgressProps> = ({
  percent,
  label,
  sublabel,
  size = 'md',
  showChargingIcon = false,
}) => {
  const value = percent === null ? 0 : Math.max(0, Math.min(100, Math.round(percent)));

  const tone =
    percent === null
      ? {
          fill: 'bg-slate-500/40',
          border: 'border-slate-500/40',
          text: 'text-slate-300',
          glow: '',
          status: 'Unassessed',
        }
      : value >= 75
      ? {
          fill: 'bg-gradient-to-r from-emerald-500 to-teal-400',
          border: 'border-emerald-400/50',
          text: 'text-emerald-300',
          glow: 'shadow-[0_0_12px_rgba(16,185,129,0.35)]',
          status: 'Strong Charge',
        }
      : value >= 50
      ? {
          fill: 'bg-gradient-to-r from-amber-500 to-yellow-400',
          border: 'border-amber-400/50',
          text: 'text-amber-300',
          glow: 'shadow-[0_0_12px_rgba(245,158,11,0.3)]',
          status: 'Developing',
        }
      : {
          fill: 'bg-gradient-to-r from-rose-600 to-orange-400',
          border: 'border-rose-400/55',
          text: 'text-rose-300',
          glow: 'shadow-[0_0_12px_rgba(244,63,94,0.35)]',
          status: 'Low · Remediation',
        };

  const dims =
    size === 'lg'
      ? {height: 'h-10', width: 'w-full', cap: 'h-4 w-1.5', text: 'text-sm'}
      : size === 'sm'
      ? {height: 'h-5', width: 'w-28 sm:w-32', cap: 'h-2.5 w-1', text: 'text-[11px]'}
      : {height: 'h-7', width: 'w-full', cap: 'h-3 w-1.5', text: 'text-xs'};

  return (
    <div className="space-y-1.5">
      {(label || sublabel) && (
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-white truncate">{label}</span>
          {sublabel && (
            <span className={`font-mono tabular-nums font-semibold ${tone.text}`}>{sublabel}</span>
          )}
        </div>
      )}

      <div className="flex items-center gap-1.5">
        <div className="flex items-center flex-1 min-w-0">
          {/* Main Battery Casing */}
          <div
            className={`relative ${dims.height} ${dims.width} rounded-lg border-2 ${tone.border} bg-[#0b0d26] p-0.5 overflow-hidden ${tone.glow}`}
            role="progressbar"
            aria-valuenow={percent ?? 0}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={label ? `${label}: ${percent ?? 0}%` : `Progress: ${percent ?? 0}%`}
          >
            {/* Animated Charge Level */}
            <motion.div
              initial={{width: 0}}
              animate={{width: `${percent === null ? 6 : Math.max(8, value)}%`}}
              transition={{duration: 0.65, ease: [0.16, 1, 0.3, 1]}}
              className={`h-full rounded-[4px] ${tone.fill}`}
            />

            {/* Subtle 4-cell Battery Segment Dividers */}
            <div className="pointer-events-none absolute inset-0 grid grid-cols-4">
              <div className="border-r border-[#0b0d26]/65" />
              <div className="border-r border-[#0b0d26]/65" />
              <div className="border-r border-[#0b0d26]/65" />
              <div />
            </div>

            {/* Centered Battery Percentage Label */}
            <div
              className={`pointer-events-none absolute inset-0 flex items-center justify-center gap-1 font-mono font-bold tabular-nums text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] ${dims.text}`}
            >
              {showChargingIcon && <BatteryCharging className="h-3.5 w-3.5" aria-hidden="true" />}
              <span>{percent === null ? '0%' : `${value}%`}</span>
            </div>
          </div>

          {/* Positive Battery Terminal Nub */}
          <div className={`${dims.cap} rounded-r-sm bg-indigo-200/70 shrink-0 ml-0.5`} />
        </div>
      </div>
    </div>
  );
};
