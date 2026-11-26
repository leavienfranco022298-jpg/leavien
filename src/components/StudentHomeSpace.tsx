import {BookOpen, Bot, MailOpen, Star, Target, Trophy} from 'lucide-react';
import {motion} from 'motion/react';
import React from 'react';
import {type StudentProfile, type WelcomeNote} from '../types/math';
import {soundFx} from '../utils/soundFx';
import {BatteryProgress} from './BatteryProgress';
import {MovingRobot} from './MovingRobot';

interface StudentHomeSpaceProps {
  student: StudentProfile;
  welcomeNote: WelcomeNote;
  onClickWelcomeNote: () => void;
  onOpenLearn: () => void;
  onOpenPractice: () => void;
  onOpenAskAi: () => void;
  onOpenRewards: () => void;
  onOpenProfile: () => void;
}

export const StudentHomeSpace: React.FC<StudentHomeSpaceProps> = ({
  student,
  welcomeNote,
  onClickWelcomeNote,
  onOpenLearn,
  onOpenPractice,
  onOpenAskAi,
  onOpenRewards,
  onOpenProfile,
}) => {
  const journeyPercent = Math.min(100, Math.max(12, Math.round(((student.xp % 300) / 300) * 100) || (student.xp > 0 ? 100 : 12)));

  return (
    <section className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-8 space-y-5">
      {/* Main Cosmic Container matching reference screenshot */}
      <motion.div
        initial={{opacity: 0, y: 12}}
        animate={{opacity: 1, y: 0}}
        transition={{duration: 0.24, ease: [0.16, 1, 0.3, 1]}}
        className="overflow-hidden rounded-3xl border border-white/10 bg-[#14153b] p-5 sm:p-7 shadow-2xl space-y-5"
      >
        {/* Top Greeting + Moving Robot Companion */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Hello, {student.name}!{' '}
              <motion.span
                aria-hidden="true"
                className="inline-block"
                animate={{rotate: [0, 18, -8, 18, 0]}}
                transition={{duration: 2.2, repeat: Infinity, repeatDelay: 2.5}}
                style={{transformOrigin: '70% 70%'}}
              >
                👋
              </motion.span>
            </h1>
            <p className="mt-1 text-sm text-indigo-200/85">
              Ready to level up your Grade 11 General Mathematics skills?
            </p>
          </div>

          <div className="shrink-0 self-center sm:self-auto">
            <MovingRobot compact />
          </div>
        </div>

        {/* Clickable Teacher Welcome Note (Launches Diagnostic Exam) */}
        <motion.button
          type="button"
          whileHover={{y: -2}}
          whileTap={{scale: 0.99}}
          onClick={() => {
            soundFx.openNote();
            onClickWelcomeNote();
          }}
          className="flex w-full items-center justify-between gap-4 rounded-2xl border border-amber-300/35 bg-[#1d2050] px-4 sm:px-5 py-3.5 text-left transition-colors hover:border-amber-300/70 cursor-pointer"
        >
          <div className="flex items-start gap-3">
            <MailOpen className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
            <div>
              <div className="text-xs font-semibold text-amber-200">
                Welcome Note from {welcomeNote.teacherName}
              </div>
              <div className="mt-0.5 text-xs text-indigo-100/90 line-clamp-2">
                {student.diagnostic
                  ? 'Tap this note anytime to retake your General Math Diagnostic Exam.'
                  : 'Tap this note to take your Diagnostic Exam and begin your private remediation or advancement.'}
              </div>
            </div>
          </div>
          <span className="shrink-0 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-950 whitespace-nowrap">
            {student.diagnostic ? 'Retake Exam' : 'Open Note'}
          </span>
        </motion.button>

        {/* Your Learning Journey Bar + Mastery Battery */}
        <motion.button
          type="button"
          whileHover={{y: -1}}
          whileTap={{scale: 0.995}}
          onClick={() => {
            soundFx.tap();
            onOpenProfile();
          }}
          className="block w-full rounded-2xl border border-white/10 bg-[#23265a] p-4 sm:p-5 text-left transition-colors hover:border-amber-300/40 cursor-pointer"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm sm:text-base font-semibold text-white">Your Learning Journey</span>
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-300 tabular-nums">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
              {student.xp} XP
            </span>
          </div>

          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-[#131538]">
            <motion.div
              initial={{width: 0}}
              animate={{width: `${journeyPercent}%`}}
              transition={{duration: 0.7, ease: [0.16, 1, 0.3, 1]}}
              className="h-full rounded-full bg-amber-400"
            />
          </div>

          <div className="mt-3.5 grid gap-3 sm:grid-cols-[1fr_auto] items-center">
            <p className="text-xs text-indigo-200/80">
              {student.diagnostic
                ? `Your Math Charge is ${student.diagnostic.overallPercent}% — tap to view full battery analytics!`
                : 'Keep learning to charge your math mastery battery!'}
            </p>
            <div className="w-40">
              <BatteryProgress
                percent={student.diagnostic ? student.diagnostic.overallPercent : journeyPercent}
                size="sm"
                showChargingIcon
              />
            </div>
          </div>
        </motion.button>

        {/* What do you want to do? 2x2 Action Grid (Matches screenshot) */}
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white">What do you want to do?</h2>

          <div className="mt-3.5 grid gap-3.5 sm:grid-cols-2">
            {/* Learn */}
            <motion.button
              type="button"
              whileHover={{y: -3}}
              whileTap={{scale: 0.985}}
              onClick={() => {
                soundFx.tap();
                onOpenLearn();
              }}
              className="flex flex-col items-start justify-between rounded-2xl bg-[#4f6af0] p-5 text-left text-white shadow-md transition-colors hover:bg-[#5b75f5] cursor-pointer min-h-[116px]"
            >
              <BookOpen className="h-6 w-6 text-amber-200" aria-hidden="true" />
              <div className="mt-3">
                <div className="text-base font-bold">Learn</div>
                <div className="text-xs text-indigo-100">Discover math concepts</div>
              </div>
            </motion.button>

            {/* Practice */}
            <motion.button
              type="button"
              whileHover={{y: -3}}
              whileTap={{scale: 0.985}}
              onClick={() => {
                soundFx.tap();
                onOpenPractice();
              }}
              className="flex flex-col items-start justify-between rounded-2xl bg-[#0e9b88] p-5 text-left text-white shadow-md transition-colors hover:bg-[#12ad98] cursor-pointer min-h-[116px]"
            >
              <Target className="h-6 w-6 text-rose-200" aria-hidden="true" />
              <div className="mt-3">
                <div className="text-base font-bold">Practice</div>
                <div className="text-xs text-teal-100">Test your understanding</div>
              </div>
            </motion.button>

            {/* Ask LA Chatbot */}
            <motion.button
              type="button"
              whileHover={{y: -3}}
              whileTap={{scale: 0.985}}
              onClick={() => {
                soundFx.openNote();
                onOpenAskAi();
              }}
              className="flex flex-col items-start justify-between rounded-2xl bg-[#9453d2] p-5 text-left text-white shadow-md transition-colors hover:bg-[#a161de] cursor-pointer min-h-[116px]"
            >
              <Bot className="h-6 w-6 text-cyan-200" aria-hidden="true" />
              <div className="mt-3">
                <div className="text-base font-bold">Ask LA</div>
                <div className="text-xs text-purple-100">Instant math chat & hints</div>
              </div>
            </motion.button>

            {/* My Progress */}
            <motion.button
              type="button"
              whileHover={{y: -3}}
              whileTap={{scale: 0.985}}
              onClick={() => {
                soundFx.tap();
                onOpenProfile();
              }}
              className="flex flex-col items-start justify-between rounded-2xl bg-[#c67e1d] p-5 text-left text-white shadow-md transition-colors hover:bg-[#d48b28] cursor-pointer min-h-[116px]"
            >
              <Trophy className="h-6 w-6 text-amber-200" aria-hidden="true" />
              <div className="mt-3">
                <div className="text-base font-bold">My Progress</div>
                <div className="text-xs text-amber-100">Track your achievements</div>
              </div>
            </motion.button>
          </div>
        </div>
      </motion.div>
    </section>
  );
};
