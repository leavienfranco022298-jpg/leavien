import {
  ArrowRight,
  Award,
  Bot,
  CheckCircle2,
  ClipboardList,
  Flame,
  Sparkles,
  Target,
  XCircle,
} from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';
import React, {useMemo, useRef, useState} from 'react';
import {DIAGNOSTIC_QUESTIONS, STRAND_MODULES, evaluateProficiencyLevel} from '../data/mathCurriculum';
import {
  type AssignedActivity,
  type DiagnosticResult,
  LearningTrack,
  MathStrandId,
  type PracticeProblem,
  ProficiencyLevel,
  type StudentProfile,
} from '../types/math';
import {
  explainWrongAnswerOffline,
  generateActivityPackOffline,
  generateOfflinePracticeProblem,
} from '../utils/offlineMathEngine';
import {soundFx} from '../utils/soundFx';
import {BatteryProgress} from './BatteryProgress';
import {MathText} from './MathText';

interface StudentQuizViewProps {
  student: StudentProfile;
  assignedActivities: AssignedActivity[];
  selectedStrandId: MathStrandId;
  onSelectStrand: (strandId: MathStrandId) => void;
  effectiveOnline: boolean;
  quizMode: 'practice' | 'diagnostic' | 'report';
  onSetQuizMode: (mode: 'practice' | 'diagnostic' | 'report') => void;
  onCompleteDiagnostic: (result: DiagnosticResult) => void;
  onRecordPracticeAttempt: (strandId: MathStrandId, track: LearningTrack, isCorrect: boolean) => void;
  onSaveGeneratedActivity: (activity: AssignedActivity) => void;
  onCompleteActivity: (activityId: string) => void;
  onGoToLessons: (strandId: MathStrandId) => void;
  onOpenAskAi?: () => void;
}

export const StudentQuizView: React.FC<StudentQuizViewProps> = ({
  student,
  assignedActivities,
  selectedStrandId,
  onSelectStrand,
  effectiveOnline,
  quizMode,
  onSetQuizMode,
  onCompleteDiagnostic,
  onRecordPracticeAttempt,
  onSaveGeneratedActivity,
  onCompleteActivity,
  onGoToLessons,
  onOpenAskAi,
}) => {
  const [diagIdx, setDiagIdx] = useState(0);
  const [diagAnswers, setDiagAnswers] = useState<Record<string, number>>({});

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

  const curatedMatching = activeStrand.curatedPractice.filter((p) => p.track === activeTrack);
  const [customProblem, setCustomProblem] = useState<PracticeProblem | null>(null);
  const [curatedIdx, setCuratedIdx] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [checkedResult, setCheckedResult] = useState<'correct' | 'incorrect' | null>(null);
  const [nextLoading, setNextLoading] = useState(false);
  const [mistakeExplanation, setMistakeExplanation] = useState<{
    whyWrong: string;
    keyCorrection: string;
    encouragement: string;
    source: 'offline-engine' | 'ai-online';
  } | null>(null);

  // Interactive Assigned Activity Runner
  const [activeActivity, setActiveActivity] = useState<AssignedActivity | null>(null);
  const [activityStepIdx, setActivityStepIdx] = useState(0);
  const [activityGenerating, setActivityGenerating] = useState(false);
  const [activityCompletedBanner, setActivityCompletedBanner] = useState<string | null>(null);

  const visibleActivities = useMemo(() => {
    return assignedActivities.filter(
      (a) => a.targetSection === 'ALL' || a.targetSection === student.gradeSection,
    );
  }, [assignedActivities, student.gradeSection]);

  const currentProblem: PracticeProblem = activeActivity
    ? activeActivity.problems[activityStepIdx] ?? activeActivity.problems[0]
    : customProblem && customProblem.strandId === activeStrand.id && customProblem.track === activeTrack
    ? customProblem
    : curatedMatching[curatedIdx % Math.max(curatedMatching.length, 1)] ??
      activeStrand.curatedPractice[0];

  const activeProblemIdRef = useRef(currentProblem.id);
  activeProblemIdRef.current = currentProblem.id;

  const handleSubmitDiagnostic = () => {
    soundFx.celebrate();
    let totalCorrect = 0;
    const strandCorrect: Record<MathStrandId, number> = {
      [MathStrandId.FUNCTIONS]: 0,
      [MathStrandId.EXPONENTIAL]: 0,
      [MathStrandId.BUSINESS]: 0,
      [MathStrandId.LOGIC]: 0,
    };
    const strandTotals: Record<MathStrandId, number> = {
      [MathStrandId.FUNCTIONS]: 0,
      [MathStrandId.EXPONENTIAL]: 0,
      [MathStrandId.BUSINESS]: 0,
      [MathStrandId.LOGIC]: 0,
    };

    for (const q of DIAGNOSTIC_QUESTIONS) {
      strandTotals[q.strandId] += 1;
      if (diagAnswers[q.id] === q.correctIndex) {
        totalCorrect += 1;
        strandCorrect[q.strandId] += 1;
      }
    }

    const overallPercent = Math.round((totalCorrect / DIAGNOSTIC_QUESTIONS.length) * 100);
    const proficiencyLevel = evaluateProficiencyLevel(overallPercent);

    const strandScores = {
      [MathStrandId.FUNCTIONS]: {
        correct: strandCorrect[MathStrandId.FUNCTIONS],
        total: strandTotals[MathStrandId.FUNCTIONS],
        percent: Math.round((strandCorrect[MathStrandId.FUNCTIONS] / strandTotals[MathStrandId.FUNCTIONS]) * 100),
        recommendedTrack:
          strandCorrect[MathStrandId.FUNCTIONS] / strandTotals[MathStrandId.FUNCTIONS] >= 0.75
            ? LearningTrack.ADVANCEMENT
            : LearningTrack.REMEDIATION,
      },
      [MathStrandId.EXPONENTIAL]: {
        correct: strandCorrect[MathStrandId.EXPONENTIAL],
        total: strandTotals[MathStrandId.EXPONENTIAL],
        percent: Math.round((strandCorrect[MathStrandId.EXPONENTIAL] / strandTotals[MathStrandId.EXPONENTIAL]) * 100),
        recommendedTrack:
          strandCorrect[MathStrandId.EXPONENTIAL] / strandTotals[MathStrandId.EXPONENTIAL] >= 0.75
            ? LearningTrack.ADVANCEMENT
            : LearningTrack.REMEDIATION,
      },
      [MathStrandId.BUSINESS]: {
        correct: strandCorrect[MathStrandId.BUSINESS],
        total: strandTotals[MathStrandId.BUSINESS],
        percent: Math.round((strandCorrect[MathStrandId.BUSINESS] / strandTotals[MathStrandId.BUSINESS]) * 100),
        recommendedTrack:
          strandCorrect[MathStrandId.BUSINESS] / strandTotals[MathStrandId.BUSINESS] >= 0.75
            ? LearningTrack.ADVANCEMENT
            : LearningTrack.REMEDIATION,
      },
      [MathStrandId.LOGIC]: {
        correct: strandCorrect[MathStrandId.LOGIC],
        total: strandTotals[MathStrandId.LOGIC],
        percent: Math.round((strandCorrect[MathStrandId.LOGIC] / strandTotals[MathStrandId.LOGIC]) * 100),
        recommendedTrack:
          strandCorrect[MathStrandId.LOGIC] / strandTotals[MathStrandId.LOGIC] >= 0.75
            ? LearningTrack.ADVANCEMENT
            : LearningTrack.REMEDIATION,
      },
    };

    onCompleteDiagnostic({
      completedAt: new Date().toISOString(),
      totalCorrect,
      totalQuestions: DIAGNOSTIC_QUESTIONS.length,
      overallPercent,
      proficiencyLevel,
      answers: diagAnswers,
      strandScores,
    });
  };

  const handleCheckPractice = () => {
    if (selectedChoice === null) return;
    const isCorrect = selectedChoice === currentProblem.correctIndex;
    setCheckedResult(isCorrect ? 'correct' : 'incorrect');
    if (isCorrect) {
      soundFx.correct();
      setMistakeExplanation(null);
    } else {
      soundFx.incorrect();
      const offlineExplain = explainWrongAnswerOffline(currentProblem, selectedChoice);
      setMistakeExplanation({
        ...offlineExplain,
        source: 'offline-engine',
      });

      if (effectiveOnline) {
        const problemId = currentProblem.id;
        const chosenChoiceText = currentProblem.choices[selectedChoice] ?? '';
        const correctChoiceText = currentProblem.choices[currentProblem.correctIndex] ?? '';
        fetch('/api/ai/explain-mistake', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            strandTitle: activeStrand.title,
            problemPrompt: currentProblem.prompt,
            chosenChoice: chosenChoiceText,
            correctChoice: correctChoiceText,
            steps: currentProblem.steps,
          }),
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (
              data &&
              typeof data.whyWrong === 'string' &&
              activeProblemIdRef.current === problemId
            ) {
              setMistakeExplanation({
                whyWrong: data.whyWrong,
                keyCorrection:
                  typeof data.keyCorrection === 'string'
                    ? data.keyCorrection
                    : offlineExplain.keyCorrection,
                encouragement:
                  typeof data.encouragement === 'string'
                    ? data.encouragement
                    : offlineExplain.encouragement,
                source: 'ai-online',
              });
            }
          })
          .catch(() => {
            // Keep instant offline LA explanation
          });
      }
    }
    onRecordPracticeAttempt(
      activeActivity ? activeActivity.strandId : activeStrand.id,
      activeActivity ? activeActivity.track : activeTrack,
      isCorrect,
    );
  };

  const handleNextPractice = async () => {
    soundFx.tap();
    setSelectedChoice(null);
    setCheckedResult(null);
    setMistakeExplanation(null);

    if (activeActivity) {
      if (activityStepIdx + 1 < activeActivity.problems.length) {
        setActivityStepIdx((i) => i + 1);
      } else {
        soundFx.celebrate();
        onCompleteActivity(activeActivity.id);
        setActivityCompletedBanner(`Completed "${activeActivity.title}"! +50 Bonus XP earned.`);
        setActiveActivity(null);
        setActivityStepIdx(0);
      }
      return;
    }

    if (curatedIdx + 1 < curatedMatching.length && !customProblem) {
      setCuratedIdx((i) => i + 1);
      return;
    }

    if (!effectiveOnline) {
      setCustomProblem(generateOfflinePracticeProblem(activeStrand.id, activeTrack));
      return;
    }

    setNextLoading(true);
    try {
      const res = await fetch('/api/ai/practice', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          strandId: activeStrand.id,
          strandTitle: activeStrand.title,
          track: activeTrack,
          proficiencyLevel: student.diagnostic?.proficiencyLevel ?? ProficiencyLevel.DEVELOPING,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate next quiz item.');
      }
      setCustomProblem({
        id: `ai-${Date.now()}`,
        strandId: activeStrand.id,
        track: activeTrack,
        prompt: data.prompt,
        choices: Array.isArray(data.choices) ? data.choices : ['A', 'B', 'C', 'D'],
        correctIndex: typeof data.correctIndex === 'number' ? data.correctIndex : 0,
        hint: data.hint || 'Break the problem down step by step.',
        steps: Array.isArray(data.steps) ? data.steps : [],
        conceptTip: data.conceptTip || activeStrand.keyFormulas[0],
        source: 'ai-online',
      });
    } catch {
      setCustomProblem(generateOfflinePracticeProblem(activeStrand.id, activeTrack));
    } finally {
      setNextLoading(false);
    }
  };

  const handleAutoGeneratePersonalActivity = async () => {
    soundFx.openNote();
    setActivityGenerating(true);
    setActivityCompletedBanner(null);

    const buildOffline = () =>
      generateActivityPackOffline({
        strandId: activeStrand.id,
        track: activeTrack,
        targetSection: student.gradeSection,
        count: 3,
      });

    try {
      let generated: AssignedActivity;
      if (!effectiveOnline) {
        generated = buildOffline();
      } else {
        const res = await fetch('/api/ai/generate-activities', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            strandId: activeStrand.id,
            strandTitle: activeStrand.title,
            track: activeTrack,
            targetSection: student.gradeSection,
          }),
        });
        const data = await res.json();
        if (!res.ok || !Array.isArray(data.problems) || data.problems.length === 0) {
          generated = buildOffline();
        } else {
          generated = {
            id: `act-${activeTrack}-${activeStrand.id}-${Date.now()}`,
            title:
              data.title ||
              `${activeStrand.shortTitle}: ${
                activeTrack === LearningTrack.REMEDIATION ? 'Guided Remediation Pack' : 'Advancement Pack'
              }`,
            strandId: activeStrand.id,
            track: activeTrack,
            targetSection: student.gradeSection,
            instructions:
              data.instructions ||
              `Complete these 3 personalized ${activeStrand.shortTitle} problems.`,
            problems: data.problems.slice(0, 3).map((p: Partial<PracticeProblem>, idx: number) => ({
              id: `actp-${Date.now()}-${idx}`,
              strandId: activeStrand.id,
              track: activeTrack,
              prompt: p.prompt || 'Solve the problem.',
              choices: Array.isArray(p.choices) && p.choices.length === 4 ? p.choices : ['A', 'B', 'C', 'D'],
              correctIndex: typeof p.correctIndex === 'number' ? p.correctIndex : 0,
              hint: p.hint || 'Work step-by-step.',
              steps: Array.isArray(p.steps) ? p.steps : [],
              conceptTip: p.conceptTip || activeStrand.keyFormulas[0],
              source: 'ai-online',
            })),
            createdAt: new Date().toISOString(),
            source: 'ai-online',
          };
        }
      }

      onSaveGeneratedActivity(generated);
      setActiveActivity(generated);
      setActivityStepIdx(0);
      setSelectedChoice(null);
      setCheckedResult(null);
      setMistakeExplanation(null);
    } catch {
      const fallback = buildOffline();
      onSaveGeneratedActivity(fallback);
      setActiveActivity(fallback);
      setActivityStepIdx(0);
      setSelectedChoice(null);
      setCheckedResult(null);
      setMistakeExplanation(null);
    } finally {
      setActivityGenerating(false);
    }
  };

  if (quizMode === 'diagnostic') {
    const q = DIAGNOSTIC_QUESTIONS[diagIdx];
    const strand = STRAND_MODULES.find((s) => s.id === q.strandId);
    const progressPct = Math.round(((diagIdx + 1) / DIAGNOSTIC_QUESTIONS.length) * 100);
    const chosen = diagAnswers[q.id];

    return (
      <section className="mx-auto max-w-3xl px-6 py-10">
        <motion.div
          initial={{opacity: 0, y: 10}}
          animate={{opacity: 1, y: 0}}
          className="rounded-3xl border border-white/10 bg-[#171942] p-8 shadow-2xl"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <div className="text-xs font-medium text-indigo-200">Grade 11 Diagnostic · {strand?.shortTitle}</div>
              <h2 className="mt-0.5 text-lg font-semibold text-white tabular-nums">
                Question {diagIdx + 1} of {DIAGNOSTIC_QUESTIONS.length}
              </h2>
            </div>
            <div className="w-36">
              <BatteryProgress percent={progressPct} size="sm" showChargingIcon />
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={q.id}
              initial={{opacity: 0, x: 10}}
              animate={{opacity: 1, x: 0}}
              exit={{opacity: 0, x: -10}}
              transition={{duration: 0.16}}
              className="mt-7"
            >
              <p className="text-lg font-medium leading-relaxed text-white">
                <MathText text={q.prompt} />
              </p>
              <div className="mt-6 space-y-3">
                {q.choices.map((choice, idx) => {
                  const isSelected = chosen === idx;
                  return (
                    <motion.button
                      key={choice}
                      type="button"
                      whileHover={{y: -1}}
                      whileTap={{scale: 0.99}}
                      onClick={() => {
                        soundFx.tap();
                        setDiagAnswers((prev) => ({...prev, [q.id]: idx}));
                      }}
                      className={`flex w-full items-center gap-3.5 rounded-xl border px-4 py-3.5 text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-[#4f6af0] bg-[#4f6af0]/25 text-white'
                          : 'border-white/10 bg-[#0e102c] text-slate-200 hover:border-white/25'
                      }`}
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md font-mono text-xs font-semibold ${
                          isSelected ? 'bg-[#4f6af0] text-white' : 'bg-white/10 text-indigo-200'
                        }`}
                      >
                        {['A', 'B', 'C', 'D'][idx]}
                      </span>
                      <span className="text-sm font-medium">
                        <MathText text={choice} />
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-6">
            <button
              type="button"
              disabled={diagIdx === 0}
              onClick={() => {
                soundFx.tap();
                setDiagIdx((i) => Math.max(0, i - 1));
              }}
              className="rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-slate-200 disabled:opacity-40 hover:bg-white/10 cursor-pointer"
            >
              Back
            </button>

            {diagIdx < DIAGNOSTIC_QUESTIONS.length - 1 ? (
              <motion.button
                type="button"
                whileTap={{scale: 0.97}}
                disabled={chosen === undefined}
                onClick={() => {
                  soundFx.tap();
                  setDiagIdx((i) => Math.min(DIAGNOSTIC_QUESTIONS.length - 1, i + 1));
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#4f6af0] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40 hover:bg-[#5b75f5] cursor-pointer"
              >
                Continue
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </motion.button>
            ) : (
              <motion.button
                type="button"
                whileTap={{scale: 0.97}}
                disabled={chosen === undefined}
                onClick={handleSubmitDiagnostic}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0e9b88] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40 hover:bg-[#12ad98] cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                See My Proficiency Level
              </motion.button>
            )}
          </div>
        </motion.div>
      </section>
    );
  }

  if (quizMode === 'report' && student.diagnostic) {
    const diag = student.diagnostic;
    const needsRem = STRAND_MODULES.filter(
      (s) => diag.strandScores[s.id].recommendedTrack === LearningTrack.REMEDIATION,
    );
    const priorityStrand = needsRem[0]?.id ?? MathStrandId.FUNCTIONS;

    return (
      <section className="mx-auto max-w-4xl px-6 py-10">
        <motion.div
          initial={{opacity: 0, y: 10}}
          animate={{opacity: 1, y: 0}}
          className="rounded-3xl border border-white/10 bg-[#171942] p-8 shadow-2xl space-y-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-amber-300">
                <Award className="h-4 w-4" aria-hidden="true" />
                <span>Diagnostic Complete · +100 XP Earned</span>
              </div>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">
                {diag.proficiencyLevel}
              </h2>
              <p className="mt-2 text-sm text-indigo-200/85">
                {needsRem.length > 0
                  ? `Your personalized Grade 11 remediation starts with ${needsRem.map((s) => s.shortTitle).join(', ')}.`
                  : 'All strands mastered! Your advancement challenges are ready.'}
              </p>
            </div>

            <div className="w-56 rounded-2xl border border-white/10 bg-[#0e102c] p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-indigo-200">
                <span>Overall Battery</span>
                <span className="font-mono font-semibold text-white tabular-nums">
                  {diag.totalCorrect}/{diag.totalQuestions}
                </span>
              </div>
              <BatteryProgress percent={diag.overallPercent} size="lg" showChargingIcon />
            </div>
          </div>

          {/* 4-Strand Battery Charge Breakdown */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STRAND_MODULES.map((strand) => {
              const sScore = diag.strandScores[strand.id];
              return (
                <div key={strand.id} className="rounded-2xl border border-white/10 bg-[#0e102c] p-4 space-y-2">
                  <BatteryProgress
                    percent={sScore.percent}
                    label={strand.shortTitle}
                    sublabel={sScore.recommendedTrack === LearningTrack.REMEDIATION ? 'Remediation' : 'Advancement'}
                    size="sm"
                  />
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap justify-between gap-3 border-t border-white/10 pt-6">
            <button
              type="button"
              onClick={() => {
                soundFx.tap();
                onGoToLessons(priorityStrand);
              }}
              className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10 cursor-pointer"
            >
              Review Lesson First
            </button>
            <motion.button
              type="button"
              whileTap={{scale: 0.97}}
              onClick={() => {
                soundFx.openNote();
                onSelectStrand(priorityStrand);
                onSetQuizMode('practice');
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0e9b88] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#12ad98] cursor-pointer"
            >
              Start {needsRem.length > 0 ? 'Remediation Quiz' : 'Advancement Quiz'}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </motion.button>
          </div>
        </motion.div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Practice Quiz & Activities</h1>
          <div className="mt-1 flex items-center gap-2 text-xs text-indigo-200/80">
            <span className={activeTrack === LearningTrack.REMEDIATION ? 'font-semibold text-amber-300' : 'font-semibold text-emerald-300'}>
              {activeTrack === LearningTrack.REMEDIATION ? 'Remediation' : 'Advancement'}
            </span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Flame className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
              Streak: {student.streak}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-white">{student.xp} XP</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <motion.button
            type="button"
            whileTap={{scale: 0.97}}
            disabled={activityGenerating}
            onClick={() => void handleAutoGeneratePersonalActivity()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#9453d2] px-4 py-2 text-xs font-semibold text-white hover:bg-[#a161de] disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            {activityGenerating
              ? 'Generating Activity...'
              : `Auto-Generate ${activeTrack === LearningTrack.REMEDIATION ? 'Remediation' : 'Advancement'} Activity`}
          </motion.button>
          <button
            type="button"
            onClick={() => {
              soundFx.openNote();
              setDiagIdx(0);
              setDiagAnswers({});
              onSetQuizMode('diagnostic');
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10 cursor-pointer whitespace-nowrap"
          >
            <ClipboardList className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
            {student.diagnostic ? 'Retake Diagnostic' : 'Start Diagnostic'}
          </button>
        </div>
      </div>

      {activityCompletedBanner && (
        <div className="rounded-2xl border border-emerald-400/35 bg-emerald-500/15 px-5 py-3 text-xs font-semibold text-emerald-200 flex items-center justify-between gap-2">
          <span>{activityCompletedBanner}</span>
          <button
            type="button"
            onClick={() => setActivityCompletedBanner(null)}
            className="text-emerald-300 hover:text-white cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Assigned Remediation & Advancement Activities Strip */}
      {visibleActivities.length > 0 && !activeActivity && (
        <div className="rounded-2xl border border-white/10 bg-[#14153b] p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
              <Target className="h-4 w-4" aria-hidden="true" />
              <span>Assigned Remediation & Advancement Activities ({visibleActivities.length})</span>
            </div>
            <span className="text-[11px] text-indigo-200/75">
              Complete any pack for +50 Bonus XP
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {visibleActivities.slice(0, 4).map((act) => {
              const isDone = student.completedActivityIds?.includes(act.id);
              const isRem = act.track === LearningTrack.REMEDIATION;
              return (
                <button
                  key={act.id}
                  type="button"
                  onClick={() => {
                    soundFx.openNote();
                    onSelectStrand(act.strandId);
                    setActiveActivity(act);
                    setActivityStepIdx(0);
                    setSelectedChoice(null);
                    setCheckedResult(null);
                    setMistakeExplanation(null);
                  }}
                  className="flex flex-col justify-between rounded-xl border border-white/10 bg-[#1c1f4f] p-4 text-left hover:border-cyan-400/50 transition-colors cursor-pointer space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[11px] font-semibold ${
                        isRem ? 'text-amber-300' : 'text-emerald-300'
                      }`}
                    >
                      {isRem ? 'Remediation Activity' : 'Advancement Activity'}
                    </span>
                    <span className="text-[11px] font-mono text-indigo-200">
                      {isDone ? '✓ Completed' : `${act.problems.length} Qs`}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-white">{act.title}</div>
                  <div className="text-xs text-indigo-200/75 line-clamp-2">{act.instructions}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4 Clean Strand Tabs */}
      {!activeActivity && (
        <div className="grid gap-2.5 grid-cols-2 lg:grid-cols-4">
          {orderedStrands.map((strand) => {
            const isActive = strand.id === activeStrand.id;
            return (
              <button
                key={strand.id}
                type="button"
                onClick={() => {
                  soundFx.tap();
                  onSelectStrand(strand.id);
                  setCustomProblem(null);
                  setSelectedChoice(null);
                  setCheckedResult(null);
                  setMistakeExplanation(null);
                }}
                className={`rounded-xl border px-4 py-3 text-left text-xs font-semibold transition-colors cursor-pointer ${
                  isActive
                    ? 'border-[#0e9b88] bg-[#23265a] text-white ring-1 ring-[#0e9b88]'
                    : 'border-white/10 bg-[#171942] text-indigo-200 hover:text-white'
                }`}
              >
                {strand.shortTitle}
              </button>
            );
          })}
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-[#171942] p-8 shadow-xl">
        {activeActivity ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <div className="text-xs font-semibold text-cyan-300">
                {activeActivity.title} · Item {activityStepIdx + 1} of {activeActivity.problems.length}
              </div>
              <div className="text-[11px] text-indigo-200/80">{activeActivity.instructions}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-28">
                <BatteryProgress
                  percent={Math.round(((activityStepIdx + 1) / activeActivity.problems.length) * 100)}
                  size="sm"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  soundFx.tap();
                  setActiveActivity(null);
                  setSelectedChoice(null);
                  setCheckedResult(null);
                  setMistakeExplanation(null);
                }}
                className="text-xs text-slate-300 hover:text-white cursor-pointer"
              >
                Exit Pack
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs text-indigo-200/80 border-b border-white/10 pb-4">
            <span>{activeStrand.title}</span>
            <span className="font-mono tabular-nums text-white">
              {strandProgress.correctAttempts} / {strandProgress.attempts} solved
            </span>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={currentProblem.id}
            initial={{opacity: 0, x: 8}}
            animate={{opacity: 1, x: 0}}
            exit={{opacity: 0, x: -8}}
            transition={{duration: 0.16}}
          >
            <p className="mt-6 text-lg font-medium leading-relaxed text-white">
              <MathText text={currentProblem.prompt} />
            </p>

            <div className="mt-5 space-y-2.5">
              {currentProblem.choices.map((choice, idx) => {
                const isSelected = selectedChoice === idx;
                const isCorrectChoice = checkedResult && idx === currentProblem.correctIndex;
                const isWrongSelected = checkedResult === 'incorrect' && isSelected;
                return (
                  <motion.button
                    key={`${currentProblem.id}-${idx}`}
                    type="button"
                    whileHover={!checkedResult ? {y: -1} : undefined}
                    whileTap={!checkedResult ? {scale: 0.99} : undefined}
                    onClick={() => {
                      if (!checkedResult) {
                        soundFx.tap();
                        setSelectedChoice(idx);
                      }
                    }}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition-colors cursor-pointer ${
                      isCorrectChoice
                        ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100'
                        : isWrongSelected
                        ? 'border-rose-400 bg-rose-500/20 text-rose-100'
                        : isSelected
                        ? 'border-[#4f6af0] bg-[#4f6af0]/25 text-white'
                        : 'border-white/10 bg-[#0e102c] text-slate-200 hover:border-white/25'
                    }`}
                  >
                    <span>
                      <span className="mr-2.5 font-mono text-xs text-indigo-300">{['A', 'B', 'C', 'D'][idx]}.</span>
                      <MathText text={choice} />
                    </span>
                    {isCorrectChoice && <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0" />}
                    {isWrongSelected && <XCircle className="h-4 w-4 text-rose-300 shrink-0" />}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        {checkedResult && (
          <motion.div
            initial={{opacity: 0, y: 6}}
            animate={{opacity: 1, y: 0}}
            className={`mt-5 rounded-xl border p-4 text-xs ${
              checkedResult === 'correct'
                ? 'border-emerald-400/35 bg-emerald-500/15 text-emerald-100'
                : 'border-rose-400/35 bg-rose-500/15 text-rose-100'
            }`}
          >
            <div className="font-semibold">
              {checkedResult === 'correct' ? 'Correct! +25 XP earned.' : 'Review the steps:'}
            </div>

            {checkedResult === 'incorrect' && mistakeExplanation && (
              <div className="mt-3 rounded-xl border border-cyan-400/30 bg-[#0e102c]/90 p-3.5 text-slate-100 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-1.5 font-semibold text-cyan-300">
                    <Bot className="h-4 w-4" aria-hidden="true" />
                    <span>LA Explains Why That Answer Was Wrong</span>
                  </div>
                  <span className="rounded-md bg-cyan-500/15 px-2 py-0.5 text-[10px] font-medium text-cyan-200">
                    {mistakeExplanation.source === 'ai-online' ? 'LA Online' : 'LA Offline'}
                  </span>
                </div>
                <p className="leading-relaxed text-slate-200">
                  <MathText text={mistakeExplanation.whyWrong} />
                </p>
                <p className="font-medium text-emerald-200">
                  <MathText text={mistakeExplanation.keyCorrection} />
                </p>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] text-indigo-200/85">
                    {mistakeExplanation.encouragement}
                  </span>
                  {onOpenAskAi && (
                    <button
                      type="button"
                      onClick={() => {
                        soundFx.openNote();
                        onOpenAskAi();
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#9453d2] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#a161de] cursor-pointer"
                    >
                      <Bot className="h-3.5 w-3.5" aria-hidden="true" />
                      Ask LA Chatbot
                    </button>
                  )}
                </div>
              </div>
            )}

            <ol className="mt-3 space-y-1.5">
              {currentProblem.steps.map((s) => (
                <li key={s}>
                  <MathText text={s} />
                </li>
              ))}
            </ol>
          </motion.div>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-5">
          <button
            type="button"
            onClick={() => {
              soundFx.tap();
              onGoToLessons(activeStrand.id);
            }}
            className="text-xs font-semibold text-indigo-200 hover:text-white cursor-pointer"
          >
            Open Lesson →
          </button>

          {!checkedResult ? (
            <motion.button
              type="button"
              whileTap={{scale: 0.97}}
              disabled={selectedChoice === null}
              onClick={handleCheckPractice}
              className="rounded-xl bg-[#0e9b88] px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-40 hover:bg-[#12ad98] cursor-pointer"
            >
              Check Answer
            </motion.button>
          ) : (
            <motion.button
              type="button"
              whileHover={{y: -1}}
              whileTap={{scale: 0.97}}
              disabled={nextLoading}
              onClick={handleNextPractice}
              className="inline-flex items-center gap-2 rounded-xl bg-[#4f6af0] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#5b75f5] disabled:opacity-50 cursor-pointer"
            >
              {nextLoading
                ? 'Loading Next...'
                : activeActivity && activityStepIdx + 1 >= activeActivity.problems.length
                ? 'Finish Activity (+50 XP)'
                : 'Next Question'}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </motion.button>
          )}
        </div>
      </div>
    </section>
  );
};
