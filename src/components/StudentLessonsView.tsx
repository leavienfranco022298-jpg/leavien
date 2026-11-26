import {ArrowRight, Eye, Sparkles} from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';
import React, {useMemo, useState} from 'react';
import {STRAND_MODULES} from '../data/mathCurriculum';
import {LearningTrack, MathStrandId, type StudentProfile} from '../types/math';
import {soundFx} from '../utils/soundFx';
import {MathText} from './MathText';
import {MathVisualizer} from './MathVisualizer';

interface StudentLessonsViewProps {
  student: StudentProfile;
  selectedStrandId: MathStrandId;
  onSelectStrand: (strandId: MathStrandId) => void;
  onGoToQuiz: (strandId: MathStrandId) => void;
  onOpenAskAi: () => void;
}

export const StudentLessonsView: React.FC<StudentLessonsViewProps> = ({
  student,
  selectedStrandId,
  onSelectStrand,
  onGoToQuiz,
  onOpenAskAi,
}) => {
  const orderedStrands = useMemo(() => {
    return [...STRAND_MODULES].sort((a, b) => {
      const aScore = student.diagnostic?.strandScores[a.id]?.percent ?? 0;
      const bScore = student.diagnostic?.strandScores[b.id]?.percent ?? 0;
      return aScore - bScore;
    });
  }, [student.diagnostic]);

  const activeStrand = STRAND_MODULES.find((s) => s.id === selectedStrandId) ?? orderedStrands[0];
  const strandDiag = student.diagnostic?.strandScores[activeStrand.id];
  const strandProgress = student.strandProgress[activeStrand.id];

  const activeTrack =
    strandProgress.trackOverride ??
    (strandProgress.masteredRemediation
      ? LearningTrack.ADVANCEMENT
      : strandDiag?.recommendedTrack ?? LearningTrack.REMEDIATION);

  const workedExample =
    activeTrack === LearningTrack.REMEDIATION
      ? activeStrand.remediationExample
      : activeStrand.advancementExample;

  const [revealedSteps, setRevealedSteps] = useState(1);

  return (
    <section className="mx-auto max-w-5xl px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Grade 11 Lessons</h1>
          <p className="mt-1 text-xs text-indigo-200/80">
            Interactive math visualizers and step-by-step worked examples.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <motion.button
            type="button"
            whileTap={{scale: 0.97}}
            onClick={() => {
              soundFx.tap();
              onOpenAskAi();
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#9453d2] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#a161de] cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Ask LA
          </motion.button>
          <motion.button
            type="button"
            whileTap={{scale: 0.97}}
            onClick={() => {
              soundFx.tap();
              onGoToQuiz(activeStrand.id);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0e9b88] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#12ad98] cursor-pointer whitespace-nowrap"
          >
            Practice Quiz
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </motion.button>
        </div>
      </div>

      {/* 4 Strand Selector Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {orderedStrands.map((strand) => {
          const diag = student.diagnostic?.strandScores[strand.id];
          const prog = student.strandProgress[strand.id];
          const isActive = strand.id === activeStrand.id;
          const isRem =
            !prog.masteredRemediation &&
            (prog.trackOverride === LearningTrack.REMEDIATION ||
              diag?.recommendedTrack === LearningTrack.REMEDIATION);

          return (
            <motion.button
              key={strand.id}
              type="button"
              whileHover={{y: -2}}
              whileTap={{scale: 0.985}}
              onClick={() => {
                soundFx.tap();
                onSelectStrand(strand.id);
                setRevealedSteps(1);
              }}
              className={`rounded-2xl border p-4 text-left transition-colors cursor-pointer ${
                isActive
                  ? 'border-[#4f6af0] bg-[#23265a] ring-1 ring-[#4f6af0]'
                  : 'border-white/10 bg-[#171942] hover:border-white/25'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className={isRem ? 'font-semibold text-amber-300' : 'font-semibold text-emerald-300'}>
                  {isRem ? 'Remediation' : 'Advancement'}
                </span>
                <span className="font-mono tabular-nums text-indigo-200">
                  {diag ? `${diag.percent}%` : '—'}
                </span>
              </div>
              <div className="mt-1.5 text-sm font-semibold text-white">{strand.shortTitle}</div>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeStrand.id}
          initial={{opacity: 0, y: 8}}
          animate={{opacity: 1, y: 0}}
          exit={{opacity: 0, y: -6}}
          transition={{duration: 0.18}}
          className="space-y-5"
        >
          <MathVisualizer strandId={activeStrand.id} />

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-[#171942] p-6">
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-4">
                <div>
                  <div className="text-xs font-semibold text-amber-300">
                    {activeTrack === LearningTrack.REMEDIATION ? 'Remediation Example' : 'Advancement Example'}
                  </div>
                  <h2 className="mt-0.5 text-base font-semibold text-white">{activeStrand.title}</h2>
                </div>
                <motion.button
                  type="button"
                  whileTap={{scale: 0.96}}
                  onClick={() => {
                    soundFx.tap();
                    setRevealedSteps((c) => (c < workedExample.steps.length ? c + 1 : 1));
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#4f6af0] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#5b75f5] cursor-pointer whitespace-nowrap"
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  {revealedSteps < workedExample.steps.length ? 'Next Step' : 'Restart'}
                </motion.button>
              </div>

              <p className="mt-4 text-sm font-semibold text-white">
                <MathText text={workedExample.problem} />
              </p>

              <ol className="mt-4 space-y-2 text-xs text-slate-200">
                {workedExample.steps.slice(0, revealedSteps).map((step) => (
                  <motion.li
                    key={step}
                    initial={{opacity: 0, x: 6}}
                    animate={{opacity: 1, x: 0}}
                    className="rounded-xl border border-white/10 bg-[#0e102c] px-3.5 py-2.5"
                  >
                    <MathText text={step} />
                  </motion.li>
                ))}
              </ol>

              {revealedSteps >= workedExample.steps.length && (
                <div className="mt-3 text-xs font-semibold text-emerald-300">
                  Answer: <MathText text={workedExample.answer} />
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#171942] p-6 space-y-4">
              <h3 className="text-base font-semibold text-white">Key Formulas & Rules</h3>
              <ul className="space-y-2 text-xs text-indigo-100">
                {activeStrand.keyFormulas.map((f) => (
                  <li key={f} className="rounded-xl border border-white/10 bg-[#0e102c] px-3.5 py-2.5 leading-relaxed">
                    <MathText text={f} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  );
};
