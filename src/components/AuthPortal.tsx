import {ArrowLeft, GraduationCap, Lock, Pencil, ShieldCheck, Sparkles, User} from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';
import React, {useMemo, useState} from 'react';
import {GRADE_11_SECTIONS} from '../data/mathCurriculum';
import {type StudentProfile, type TeacherProfile, UserRole} from '../types/math';
import {soundFx} from '../utils/soundFx';
import {MovingRobot} from './MovingRobot';

interface AuthPortalProps {
  students: StudentProfile[];
  teacher: TeacherProfile;
  teacherSections: string[];
  onSelectStudent: (studentId: string) => void;
  onCreateStudent: (name: string, gradeSection: string, pin: string) => void;
  onSignInTeacher: () => void;
  onCreateTeacher: (name: string, department: string, pin: string, sections: string[]) => void;
}

export const AuthPortal: React.FC<AuthPortalProps> = ({
  students,
  teacher,
  teacherSections,
  onSelectStudent,
  onCreateStudent,
  onSignInTeacher,
  onCreateTeacher,
}) => {
  const [authStep, setAuthStep] = useState<'landing' | 'login' | 'signup'>('landing');
  const [roleTab, setRoleTab] = useState<UserRole>(UserRole.STUDENT);

  const availableSections = useMemo(() => {
    const set = new Set<string>(teacherSections);
    students.forEach((s) => {
      if (s.gradeSection) set.add(s.gradeSection);
    });
    if (set.size === 0) {
      GRADE_11_SECTIONS.forEach((sec) => set.add(sec));
    }
    return Array.from(set);
  }, [students, teacherSections]);

  const [loginSection, setLoginSection] = useState<string>(availableSections[0] ?? 'Grade 11 — Curie');
  const studentsInSection = useMemo(
    () => students.filter((s) => s.gradeSection === loginSection),
    [students, loginSection],
  );

  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    studentsInSection[0]?.id ?? students[0]?.id ?? '',
  );
  const [studentPin, setStudentPin] = useState('');

  const [newName, setNewName] = useState('');
  const [newSection, setNewSection] = useState<string>(availableSections[0] ?? 'Grade 11 — Curie');
  const [newPin, setNewPin] = useState('');

  const [teacherPin, setTeacherPin] = useState('');
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherDept, setNewTeacherDept] = useState('Grade 11 General Mathematics');
  const [newTeacherSections, setNewTeacherSections] = useState('Grade 11 — Curie, Grade 11 — Newton');
  const [newTeacherPin, setNewTeacherPin] = useState('');

  const [authError, setAuthError] = useState<string | null>(null);

  const openAuthFlow = (nextStep: 'login' | 'signup') => {
    soundFx.openNote();
    soundFx.speak(
      nextStep === 'login'
        ? 'Great! Choose Student or Teacher to log in to your account!'
        : 'Awesome! Choose Student or Teacher to create your account!',
    );
    setAuthError(null);
    setAuthStep(nextStep);
  };

  const handleSectionChange = (nextSection: string) => {
    setLoginSection(nextSection);
    const matching = students.filter((s) => s.gradeSection === nextSection);
    setSelectedStudentId(matching[0]?.id ?? '');
    setStudentPin('');
    setAuthError(null);
  };

  const handleStudentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const target = studentsInSection.find((s) => s.id === selectedStudentId);
    if (!target) {
      setAuthError('No student selected in this section. Choose another section or sign up.');
      return;
    }
    if (studentPin.trim() !== target.pin) {
      soundFx.incorrect();
      setAuthError('Incorrect 4-digit passcode. Ask your teacher if you need help.');
      return;
    }
    soundFx.openNote();
    onSelectStudent(target.id);
  };

  const handleStudentSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!newSection.trim()) {
      setAuthError('Please enter or choose your section.');
      return;
    }
    if (!newName.trim()) {
      setAuthError('Please enter your full name.');
      return;
    }
    if (!/^\d{4}$/.test(newPin.trim())) {
      setAuthError('Create a 4-digit numeric passcode so your progress stays private.');
      return;
    }
    soundFx.openNote();
    onCreateStudent(newName.trim(), newSection.trim(), newPin.trim());
  };

  const handleTeacherLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (teacherPin.trim() !== teacher.pin) {
      soundFx.incorrect();
      setAuthError(`Incorrect passcode. (Demo PIN: ${teacher.pin})`);
      return;
    }
    soundFx.openNote();
    onSignInTeacher();
  };

  const handleTeacherSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!newTeacherName.trim()) {
      setAuthError('Please enter your teacher name.');
      return;
    }
    const parsedSections = newTeacherSections
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parsedSections.length === 0) {
      setAuthError('Please register at least one section you teach in General Mathematics.');
      return;
    }
    if (!/^\d{4}$/.test(newTeacherPin.trim())) {
      setAuthError('Create a 4-digit numeric passcode for your Teacher Dashboard.');
      return;
    }
    soundFx.openNote();
    onCreateTeacher(
      newTeacherName.trim(),
      newTeacherDept.trim() || 'Grade 11 General Mathematics',
      newTeacherPin.trim(),
      parsedSections,
    );
  };

  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
      <motion.div
        initial={{opacity: 0, y: 12}}
        animate={{opacity: 1, y: 0}}
        transition={{duration: 0.25, ease: [0.16, 1, 0.3, 1]}}
        className="relative overflow-hidden rounded-3xl border border-blue-400/25 bg-gradient-to-br from-[#070f36] via-[#0c1a54] to-[#08123d] p-6 sm:p-10 shadow-2xl"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl"
        />

        <AnimatePresence mode="wait">
          {authStep === 'landing' ? (
            <motion.div
              key="auth-landing"
              initial={{opacity: 0, y: 8}}
              animate={{opacity: 1, y: 0}}
              exit={{opacity: 0, y: -8}}
              transition={{duration: 0.2}}
              className="relative flex flex-col items-center text-center"
            >
              {/* Brand Title & Full Meaning of LEAVIEN */}
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <span>Grade 11 General Mathematics</span>
              </div>

              <h1 className="mt-2 text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
                LEAVIEN <span className="text-sky-400 drop-shadow-[0_0_16px_rgba(56,189,248,0.6)]">AI</span>
              </h1>
              <p className="mt-2 max-w-2xl text-xs sm:text-sm font-medium text-cyan-200/95">
                Learning Enhancement through Artificial Intelligence, Visualization, Interaction, Engagement, and Numeracy
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                Learn Smarter. Achieve More!
              </p>

              {/* Flying, Twisting Girl Robot Hovering Above and Pointing Down at Log In */}
              <div className="mt-5">
                <MovingRobot
                  autoSpeakOnMount
                  pointToLogin
                  greeting="Hey! Welcome explorer! I am LEAVIEN AI. Just log in to your account!"
                />
              </div>

              {/* Log In & Sign Up Buttons Directly Below the Pointing Finger */}
              <div className="mt-2 w-full max-w-xs space-y-3">
                <motion.button
                  type="button"
                  whileHover={{scale: 1.03, y: -2}}
                  whileTap={{scale: 0.98}}
                  onClick={() => openAuthFlow('login')}
                  className="flex w-full items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-4 text-base font-bold text-white shadow-[0_0_24px_rgba(37,99,235,0.65)] ring-2 ring-cyan-300/70 hover:from-blue-500 hover:to-cyan-400 cursor-pointer"
                >
                  <User className="h-5 w-5" aria-hidden="true" />
                  Log In
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={{scale: 1.02, y: -2}}
                  whileTap={{scale: 0.98}}
                  onClick={() => openAuthFlow('signup')}
                  className="flex w-full items-center justify-center gap-2.5 rounded-full border-2 border-indigo-300/50 bg-[#0b1647]/80 px-6 py-3.5 text-base font-bold text-white hover:border-cyan-300 hover:bg-[#112061] cursor-pointer"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  Sign Up
                </motion.button>
              </div>

              <p className="mt-4 text-xs text-indigo-200/75">
                Works offline & online · Student progress stays private to each student & teacher
              </p>
            </motion.div>
          ) : (
            <motion.div
              key={`auth-form-${authStep}`}
              initial={{opacity: 0, y: 10}}
              animate={{opacity: 1, y: 0}}
              exit={{opacity: 0, y: -10}}
              transition={{duration: 0.2}}
              className="relative grid gap-8 lg:grid-cols-[0.9fr_1.1fr] items-center"
            >
              <div className="flex flex-col items-center text-center">
                <MovingRobot
                  greeting={
                    authStep === 'login'
                      ? 'Choose Student or Teacher and log in to your account!'
                      : 'Create your private account and let’s master Grade 11 Math!'
                  }
                />
                <p className="mt-3 text-xs text-cyan-200/90 max-w-xs">
                  Learning Enhancement through Artificial Intelligence, Visualization, Interaction, Engagement, and Numeracy
                </p>
              </div>

              <div className="rounded-2xl border border-white/15 bg-[#12194b]/90 p-6 backdrop-blur-xs shadow-xl">
                <div className="flex items-center justify-between gap-2 pb-4 border-b border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.tap();
                      setAuthStep('landing');
                      setAuthError(null);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 hover:text-white cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                    Back
                  </button>

                  <div className="text-sm font-bold text-white">
                    {authStep === 'login' ? 'Log In' : 'Sign Up'}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      soundFx.tap();
                      setAuthStep(authStep === 'login' ? 'signup' : 'login');
                      setAuthError(null);
                    }}
                    className="text-xs font-semibold text-amber-300 hover:text-amber-200 cursor-pointer"
                  >
                    {authStep === 'login' ? 'Need an account?' : 'Have an account?'}
                  </button>
                </div>

                {/* Role Toggle: Student vs Teacher */}
                <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-[#090f33] p-1 border border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.tap();
                      setRoleTab(UserRole.STUDENT);
                      setAuthError(null);
                    }}
                    className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      roleTab === UserRole.STUDENT
                        ? 'bg-[#4f6af0] text-white'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <GraduationCap className="h-4 w-4" aria-hidden="true" />
                    Student
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.tap();
                      setRoleTab(UserRole.TEACHER);
                      setAuthError(null);
                    }}
                    className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      roleTab === UserRole.TEACHER
                        ? 'bg-[#0e9b88] text-white'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    Teacher
                  </button>
                </div>

                <p className="mt-2.5 text-xs text-indigo-200/80">
                  {roleTab === UserRole.STUDENT
                    ? 'Student Features: Welcome Note diagnostic, Lessons, Quiz with LA mistake help, Ask LA & Rewards.'
                    : 'Teacher Features: Register sections taught, remediation analytics list, private scores & CSV summary.'}
                </p>

                {authError && (
                  <div className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/15 px-3.5 py-2.5 text-xs font-medium text-rose-200">
                    {authError}
                  </div>
                )}

                {roleTab === UserRole.STUDENT ? (
                  authStep === 'login' ? (
                    <form onSubmit={handleStudentLogin} className="mt-4 space-y-3.5">
                      <div>
                        <label htmlFor="login-section-select" className="block text-xs font-medium text-indigo-200 mb-1">
                          Grade 11 Section
                        </label>
                        <select
                          id="login-section-select"
                          value={loginSection}
                          onChange={(e) => handleSectionChange(e.target.value)}
                          className="w-full rounded-xl border border-white/15 bg-[#090f33] px-3.5 py-2.5 text-sm text-white focus:border-[#4f6af0] focus:outline-none"
                        >
                          {availableSections.map((sec) => (
                            <option key={sec} value={sec}>
                              {sec}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="student-select" className="block text-xs font-medium text-indigo-200 mb-1">
                          Your Name
                        </label>
                        <select
                          id="student-select"
                          value={selectedStudentId}
                          onChange={(e) => {
                            setSelectedStudentId(e.target.value);
                            setAuthError(null);
                          }}
                          className="w-full rounded-xl border border-white/15 bg-[#090f33] px-3.5 py-2.5 text-sm text-white focus:border-[#4f6af0] focus:outline-none"
                        >
                          {studentsInSection.length > 0 ? (
                            studentsInSection.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))
                          ) : (
                            <option value="">No students in this section yet</option>
                          )}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="student-pin-input" className="block text-xs font-medium text-indigo-200 mb-1">
                          Private 4-Digit Passcode
                        </label>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-indigo-300" aria-hidden="true" />
                          <input
                            id="student-pin-input"
                            type="password"
                            inputMode="numeric"
                            maxLength={4}
                            value={studentPin}
                            onChange={(e) => setStudentPin(e.target.value)}
                            placeholder="••••"
                            className="w-full rounded-xl border border-white/15 bg-[#090f33] pl-10 pr-3.5 py-2.5 font-mono text-sm tracking-widest text-white placeholder:text-slate-500 focus:border-[#4f6af0] focus:outline-none"
                          />
                        </div>
                      </div>

                      <motion.button
                        type="submit"
                        whileTap={{scale: 0.98}}
                        className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 text-sm font-bold text-white hover:from-blue-500 hover:to-cyan-400 cursor-pointer"
                      >
                        Log In to My Space →
                      </motion.button>
                    </form>
                  ) : (
                    <form onSubmit={handleStudentSignup} className="mt-4 space-y-3">
                      <div>
                        <label htmlFor="signup-section" className="block text-xs font-medium text-indigo-200 mb-1">
                          Your Section (type your own or pick one)
                        </label>
                        <input
                          id="signup-section"
                          type="text"
                          list="grade11-sections-list"
                          value={newSection}
                          onChange={(e) => setNewSection(e.target.value)}
                          placeholder="e.g. Grade 11 — Curie or STEM 11-A"
                          className="w-full rounded-xl border border-white/15 bg-[#090f33] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-[#4f6af0] focus:outline-none"
                        />
                        <datalist id="grade11-sections-list">
                          {availableSections.map((sec) => (
                            <option key={sec} value={sec} />
                          ))}
                        </datalist>
                      </div>

                      <div>
                        <label htmlFor="signup-name" className="block text-xs font-medium text-indigo-200 mb-1">
                          Full Name
                        </label>
                        <input
                          id="signup-name"
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          placeholder="e.g. Jordan Reyes"
                          className="w-full rounded-xl border border-white/15 bg-[#090f33] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-[#4f6af0] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label htmlFor="signup-pin" className="block text-xs font-medium text-indigo-200 mb-1">
                          Create Private 4-Digit Passcode
                        </label>
                        <input
                          id="signup-pin"
                          type="password"
                          inputMode="numeric"
                          maxLength={4}
                          value={newPin}
                          onChange={(e) => setNewPin(e.target.value)}
                          placeholder="e.g. 2468"
                          className="w-full rounded-xl border border-white/15 bg-[#090f33] px-3.5 py-2.5 font-mono text-sm tracking-widest text-white placeholder:text-slate-400 focus:border-[#4f6af0] focus:outline-none"
                        />
                      </div>

                      <motion.button
                        type="submit"
                        whileTap={{scale: 0.98}}
                        className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 text-sm font-bold text-white hover:from-blue-500 hover:to-cyan-400 cursor-pointer"
                      >
                        Sign Up & Start Learning →
                      </motion.button>
                    </form>
                  )
                ) : authStep === 'login' ? (
                  <form onSubmit={handleTeacherLogin} className="mt-4 space-y-3.5">
                    <div className="rounded-xl border border-white/10 bg-[#1a2260] p-3.5">
                      <div className="text-xs text-indigo-200/80">Instructor</div>
                      <div className="mt-0.5 text-sm font-semibold text-white">{teacher.name}</div>
                      <div className="text-xs text-indigo-200">{teacher.department}</div>
                    </div>

                    <div>
                      <label htmlFor="teacher-pin-input" className="block text-xs font-medium text-indigo-200 mb-1">
                        Teacher Passcode (Demo PIN: <span className="font-mono text-white">{teacher.pin}</span>)
                      </label>
                      <input
                        id="teacher-pin-input"
                        type="password"
                        inputMode="numeric"
                        value={teacherPin}
                        onChange={(e) => setTeacherPin(e.target.value)}
                        placeholder="••••"
                        className="w-full rounded-xl border border-white/15 bg-[#090f33] px-3.5 py-2.5 font-mono text-sm tracking-widest text-white focus:border-[#0e9b88] focus:outline-none"
                      />
                    </div>

                    <motion.button
                      type="submit"
                      whileTap={{scale: 0.98}}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0e9b88] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#12ad98] cursor-pointer"
                    >
                      <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                      Open Teacher Dashboard
                    </motion.button>
                  </form>
                ) : (
                  <form onSubmit={handleTeacherSignup} className="mt-4 space-y-3">
                    <div>
                      <label htmlFor="teacher-signup-name" className="block text-xs font-medium text-indigo-200 mb-1">
                        Teacher Full Name
                      </label>
                      <input
                        id="teacher-signup-name"
                        type="text"
                        value={newTeacherName}
                        onChange={(e) => setNewTeacherName(e.target.value)}
                        placeholder="e.g. Mr. Marco Villanueva"
                        className="w-full rounded-xl border border-white/15 bg-[#090f33] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-[#0e9b88] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label htmlFor="teacher-signup-dept" className="block text-xs font-medium text-indigo-200 mb-1">
                        Department / Subject
                      </label>
                      <input
                        id="teacher-signup-dept"
                        type="text"
                        value={newTeacherDept}
                        onChange={(e) => setNewTeacherDept(e.target.value)}
                        placeholder="Grade 11 General Mathematics"
                        className="w-full rounded-xl border border-white/15 bg-[#090f33] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-[#0e9b88] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label htmlFor="teacher-signup-sections" className="block text-xs font-medium text-indigo-200 mb-1">
                        Sections Taught in General Mathematics (comma-separated)
                      </label>
                      <input
                        id="teacher-signup-sections"
                        type="text"
                        value={newTeacherSections}
                        onChange={(e) => setNewTeacherSections(e.target.value)}
                        placeholder="e.g. Grade 11 — Curie, STEM 11-A, ABM 11-B"
                        className="w-full rounded-xl border border-white/15 bg-[#090f33] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-[#0e9b88] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label htmlFor="teacher-signup-pin" className="block text-xs font-medium text-indigo-200 mb-1">
                        Create 4-Digit Teacher Passcode
                      </label>
                      <input
                        id="teacher-signup-pin"
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        value={newTeacherPin}
                        onChange={(e) => setNewTeacherPin(e.target.value)}
                        placeholder="e.g. 4321"
                        className="w-full rounded-xl border border-white/15 bg-[#090f33] px-3.5 py-2.5 font-mono text-sm tracking-widest text-white placeholder:text-slate-400 focus:border-[#0e9b88] focus:outline-none"
                      />
                    </div>

                    <motion.button
                      type="submit"
                      whileTap={{scale: 0.98}}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0e9b88] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#12ad98] cursor-pointer"
                    >
                      <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                      Register & Open Teacher Dashboard
                    </motion.button>
                  </form>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </main>
  );
};
