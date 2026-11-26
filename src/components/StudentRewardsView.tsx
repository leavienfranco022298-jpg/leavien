import {Award, CheckCircle2, Flame, Lock, Trophy} from 'lucide-react';
import {motion} from 'motion/react';
import React from 'react';
import {REWARD_MILESTONES} from '../data/mathCurriculum';
import {type StudentProfile} from '../types/math';

interface StudentRewardsViewProps {
  student: StudentProfile;
}

export const StudentRewardsView: React.FC<StudentRewardsViewProps> = ({student}) => {
  const unlockedCount = REWARD_MILESTONES.filter((m) => m.isUnlocked(student)).length;
  const level = Math.floor(student.xp / 150) + 1;
  const levelProgress = Math.round(((student.xp % 150) / 150) * 100);

  return (
    <section className="mx-auto max-w-5xl px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Rewards & XP</h1>
        <p className="mt-1 text-xs text-indigo-200/80">
          Earn XP from your diagnostic and quizzes to unlock Grade 11 milestones.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-[#171942] p-6">
          <div className="flex items-center justify-between text-xs text-indigo-200">
            <span>Total Experience</span>
            <Trophy className="h-4 w-4 text-amber-300" aria-hidden="true" />
          </div>
          <div className="mt-2 font-mono text-3xl font-bold tabular-nums text-white">
            {student.xp} XP
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#0e102c]">
            <motion.div
              initial={{width: 0}}
              animate={{width: `${levelProgress}%`}}
              transition={{duration: 0.6, ease: [0.16, 1, 0.3, 1]}}
              className="h-full bg-amber-400"
            />
          </div>
          <div className="mt-2 text-xs text-indigo-200/80 tabular-nums">
            Level {level} · {150 - (student.xp % 150)} XP to Level {level + 1}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#171942] p-6">
          <div className="flex items-center justify-between text-xs text-indigo-200">
            <span>Answer Streak</span>
            <Flame className="h-4 w-4 text-amber-400" aria-hidden="true" />
          </div>
          <div className="mt-2 font-mono text-3xl font-bold tabular-nums text-white">
            {student.streak}
          </div>
          <div className="mt-2 text-xs text-indigo-200/80 tabular-nums">
            Best streak: {student.bestStreak} in a row
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#171942] p-6">
          <div className="flex items-center justify-between text-xs text-indigo-200">
            <span>Milestones</span>
            <Award className="h-4 w-4 text-emerald-300" aria-hidden="true" />
          </div>
          <div className="mt-2 font-mono text-3xl font-bold tabular-nums text-white">
            {unlockedCount} / {REWARD_MILESTONES.length}
          </div>
          <div className="mt-2 text-xs text-indigo-200/80">Saved offline on your device</div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REWARD_MILESTONES.map((milestone, idx) => {
          const unlocked = milestone.isUnlocked(student);
          return (
            <motion.div
              key={milestone.id}
              initial={{opacity: 0, y: 10}}
              animate={{opacity: 1, y: 0}}
              transition={{delay: idx * 0.04}}
              className={`flex flex-col justify-between rounded-2xl border p-6 ${
                unlocked
                  ? 'border-emerald-400/35 bg-[#1d2354]'
                  : 'border-white/10 bg-[#171942]/80'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-amber-300 tabular-nums">
                    +{milestone.xpBonus} XP
                  </span>
                  {unlocked ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-300" aria-hidden="true" />
                  ) : (
                    <Lock className="h-4 w-4 text-indigo-300/60" aria-hidden="true" />
                  )}
                </div>
                <h2 className="mt-3 text-base font-semibold text-white">{milestone.title}</h2>
                <p className="mt-1.5 text-xs leading-relaxed text-indigo-200/85">
                  {milestone.description}
                </p>
              </div>

              <div className="mt-5 border-t border-white/10 pt-3 text-xs font-semibold">
                <span className={unlocked ? 'text-emerald-300' : 'text-indigo-200/75'}>
                  {milestone.progressLabel(student)}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};
