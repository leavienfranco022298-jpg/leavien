import {ArrowRight, Award, BatteryCharging, ClipboardList, Flame, LogOut, MailOpen, Target} from 'lucide-react';
import {motion} from 'motion/react';
import React from 'react';
import {STRAND_MODULES} from '../data/mathCurriculum';
import {LearningTrack, MathStrandId, type StudentProfile, type WelcomeNote} from '../types/math';
import {soundFx} from '../utils/soundFx';
import {BatteryProgress} from './BatteryProgress';
import {MovingRobot} from './MovingRobot';

interface StudentProfileViewProps {
  student: StudentProfile;
  welcomeNote: WelcomeNote;
  assignedActivitiesCount?: number;
  onStartDiagnosticFromNote: () => void;
  onGoToStrand: (strandId: MathStrandId) => void;
  onSwitchAccount: () => void;
}

export const StudentProfileView: React.FC<StudentProfileViewProps> = ({
  student,
  welcomeNote,
  assignedActivitiesCount = 0,
  onStartDiagnosticFromNote,
  onGoToStrand,
  onSwitchAccount,
}) => {
  const handleOpenNote = () => {
    soundFx.openNote();
    onStartDiagnosticFromNote();
  };

  const totalAttempts = Object.values(student.strandProgress).reduce((s, p) => s + p.attempts, 0);
  const totalCorrect = Object.values(student.strandProgress).reduce((s, p) => s + p.correctAttempts, 0);
  const practiceAccuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : null;
  const overallCharge = student.diagnostic?.overallPercent ?? practiceAccuracy;
  const completedActivities = student.completedActivityIds?.length ?? 0;

  return (
    <section className="mx-auto max-w-5xl px-6 py-8 space-y-6">
      {/* Clickable Welcome Note Focal Card */}
      <motion.div
        role="button"
        tabIndex={0}
        initial={{opacity: 0, y: 10}}
        animate={{opacity: 1, y: 0}}
        whileHover={{y: -3}}
        whileTap={{scale: 0.992}}
        transition={{duration: 0.2, ease: [0.16, 1, 0.3, 1]}}
        onClick={handleOpenNote}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleOpenNote();
          }
        }}
        className="group overflow-hidden rounded-3xl border border-amber-300/25 bg-[#14153b] bg-cosmic-grid p-7 sm:p-8 text-left shadow-2xl hover:border-amber-300/60 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400"
      >
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] items-stretch">
          <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#171942]/95 p-5 backdrop-blur-xs">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-amber-200">
                <MailOpen className="h-4 w-4 text-amber-300" aria-hidden="true" />
                <span>Welcome Note</span>
                <span aria-hidden="true">·</span>
                <span>{welcomeNote.teacherName}</span>
              </div>
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-white">
                {welcomeNote.greetingPrefix}, {student.name}
              </h1>
              <p className="mt-2.5 text-sm leading-relaxed text-indigo-100/90">
                {welcomeNote.message}
              </p>
            </div>

            <div className="mt-6">
              <span className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-xs font-bold text-slate-950 transition-colors group-hover:bg-amber-300">
                <ClipboardList className="h-4 w-4" aria-hidden="true" />
                {student.diagnostic ? 'Retake Diagnostic Exam' : 'Click Note to Start Diagnostic Exam'}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-[#1c1e4f] p-4">
            <MovingRobot greeting="Tap this note to check your math battery!" />
          </div>
        </div>
      </motion.div>

      {/* Student Private Battery Analytics Dashboard */}
      <div className="rounded-3xl border border-white/10 bg-[#171942] p-7 space-y-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs text-indigo-200/80">
              <Award className="h-4 w-4 text-amber-300" aria-hidden="true" />
              <span>Private Student Battery Analytics</span>
              <span aria-hidden="true">·</span>
              <span>Visible only to you & your teacher</span>
            </div>
            <h2 className="mt-1 text-xl font-bold text-white">
              {student.diagnostic ? student.diagnostic.proficiencyLevel : 'Awaiting Diagnostic Assessment'}
            </h2>
          </div>

          <button
            type="button"
            onClick={() => {
              soundFx.tap();
              onSwitchAccount();
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10 cursor-pointer whitespace-nowrap"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            Switch Account
          </button>
        </div>

        {/* Overall Mastery Battery + Quick Stats */}
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr] items-center rounded-2xl border border-white/10 bg-[#0e102c] p-5">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
              <BatteryCharging className="h-4 w-4" aria-hidden="true" />
              <span>Overall Grade 11 Math Battery Charge</span>
            </div>
            <BatteryProgress
              percent={overallCharge}
              size="lg"
              showChargingIcon
            />
            <p className="text-xs text-indigo-200/80">
              {overallCharge === null
                ? 'Take the diagnostic exam or practice quizzes to charge your math mastery battery.'
                : overallCharge >= 75
                ? 'Strong charge! You are ready for Advancement activities.'
                : overallCharge >= 50
                ? 'Developing charge — keep completing Remediation exercises to power up above 75%!'
                : 'Low battery alert — review step-by-step lessons and ask LA Chatbot for guided help.'}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-xl border border-white/10 bg-[#171942] p-3 text-center">
              <div className="text-[11px] text-indigo-200/75">Practice</div>
              <div className="mt-1 font-mono text-base font-bold text-white tabular-nums">
                {practiceAccuracy !== null ? `${practiceAccuracy}%` : '—'}
              </div>
              <div className="text-[10px] text-indigo-300 tabular-nums">
                {totalCorrect}/{totalAttempts} solved
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#171942] p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-[11px] text-indigo-200/75">
                <Flame className="h-3 w-3 text-amber-400" aria-hidden="true" />
                Streak
              </div>
              <div className="mt-1 font-mono text-base font-bold text-amber-300 tabular-nums">
                {student.bestStreak}
              </div>
              <div className="text-[10px] text-indigo-300 tabular-nums">best</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#171942] p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-[11px] text-indigo-200/75">
                <Target className="h-3 w-3 text-emerald-300" aria-hidden="true" />
                Activities
              </div>
              <div className="mt-1 font-mono text-base font-bold text-emerald-300 tabular-nums">
                {completedActivities}/{Math.max(assignedActivitiesCount, completedActivities)}
              </div>
              <div className="text-[10px] text-indigo-300">done</div>
            </div>
          </div>
        </div>

        {/* 4 Strand Battery Analytics Cards */}
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {STRAND_MODULES.map((strand) => {
            const score = student.diagnostic?.strandScores[strand.id];
            const prog = student.strandProgress[strand.id];
            const practicePct =
              prog.attempts > 0 ? Math.round((prog.correctAttempts / prog.attempts) * 100) : null;
            const strandBatteryPct = score?.percent ?? practicePct;
            const isRem =
              !prog.masteredRemediation &&
              (prog.trackOverride === LearningTrack.REMEDIATION ||
                score?.recommendedTrack === LearningTrack.REMEDIATION);

            return (
              <motion.button
                key={strand.id}
                type="button"
                whileHover={{y: -2}}
                whileTap={{scale: 0.985}}
                onClick={() => {
                  soundFx.tap();
                  onGoToStrand(strand.id);
                }}
                className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#23265a] p-4 text-left hover:border-[#4f6af0] hover:bg-[#2a2e6c] transition-colors cursor-pointer space-y-3"
              >
                <div>
                  <div className="text-xs font-semibold text-white">{strand.shortTitle}</div>
                  <div className="mt-0.5 text-[11px] text-indigo-200/75 tabular-nums">
                    Practice: {prog.correctAttempts}/{prog.attempts} solved
                  </div>
                </div>

                <BatteryProgress
                  percent={strandBatteryPct}
                  size="md"
                  showChargingIcon={!isRem && (strandBatteryPct ?? 0) >= 75}
                />

                <div className={`text-xs font-semibold ${isRem ? 'text-amber-300' : 'text-emerald-300'}`}>
                  {isRem ? 'Needs Remediation →' : 'Advancement Ready →'}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
