import {
  BookOpen,
  ClipboardCheck,
  Cloud,
  CloudOff,
  RefreshCw,
  Rocket,
  Trophy,
  User,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';
import {useCallback, useEffect, useRef, useState} from 'react';
import {AskLeavienModal} from './components/AskLeavienModal';
import {AuthPortal} from './components/AuthPortal';
import {PWAInstallButton} from './components/PWAInstallButton';
import {StudentHomeSpace} from './components/StudentHomeSpace';
import {StudentLessonsView} from './components/StudentLessonsView';
import {StudentProfileView} from './components/StudentProfileView';
import {StudentQuizView} from './components/StudentQuizView';
import {StudentRewardsView} from './components/StudentRewardsView';
import {TeacherDashboard} from './components/TeacherDashboard';
import {INITIAL_CLASSROOM_STATE, createInitialStrandProgress} from './data/mathCurriculum';
import {useOnlineStatus} from './hooks/useOnlineStatus';
import {
  type AssignedActivity,
  type CachedTutorReply,
  type ClassroomState,
  type DiagnosticResult,
  LearningTrack,
  MathStrandId,
  type StudentProfile,
  UserRole,
  type WelcomeNote,
} from './types/math';
import {soundFx} from './utils/soundFx';
import {
  fetchServerClassroomState,
  getSyncMeta,
  loadClassroomState,
  saveClassroomState,
  setSyncMeta,
  syncClassroomWithServer,
} from './utils/storage';

type StudentTab = 'home' | 'lessons' | 'quiz' | 'rewards' | 'profile';
type QuizMode = 'practice' | 'diagnostic' | 'report';
type TeacherView = 'class' | 'welcome-plan';
type SyncStatus = 'synced' | 'pending' | 'syncing';

export default function App() {
  const [classroom, setClassroom] = useState<ClassroomState>(INITIAL_CLASSROOM_STATE);
  const [hydrated, setHydrated] = useState(false);

  const [sessionRole, setSessionRole] = useState<UserRole | null>(null);
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);

  const [studentTab, setStudentTab] = useState<StudentTab>('home');
  const [quizMode, setQuizMode] = useState<QuizMode>('practice');
  const [selectedStrandId, setSelectedStrandId] = useState<MathStrandId>(MathStrandId.FUNCTIONS);
  const [teacherView, setTeacherView] = useState<TeacherView>('class');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showAskAiModal, setShowAskAiModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');

  const isBrowserOnline = useOnlineStatus();
  const skipNextLocalSaveRef = useRef(false);
  const latestClassroomRef = useRef(classroom);
  latestClassroomRef.current = classroom;

  useEffect(() => {
    soundFx.enabled = soundEnabled;
  }, [soundEnabled]);

  const performServerSync = useCallback(async (stateToSync: ClassroomState) => {
    setSyncStatus('syncing');
    try {
      const {state: merged} = await syncClassroomWithServer(stateToSync);
      skipNextLocalSaveRef.current = true;
      setClassroom(merged);
      setSyncStatus('synced');
    } catch {
      const prevMeta = getSyncMeta();
      setSyncMeta({pendingSync: true, lastSyncedAt: prevMeta.lastSyncedAt});
      setSyncStatus('pending');
    }
  }, []);

  // Hydrate offline local storage first, then reconcile with server when online
  useEffect(() => {
    let active = true;
    (async () => {
      const localLoaded = await loadClassroomState();
      if (!active) return;
      skipNextLocalSaveRef.current = true;
      setClassroom(localLoaded);
      const meta = getSyncMeta();
      setSyncStatus(meta.pendingSync ? 'pending' : 'synced');
      setHydrated(true);

      if (navigator.onLine) {
        if (meta.pendingSync) {
          await performServerSync(localLoaded);
        } else {
          const remote = await fetchServerClassroomState();
          if (!active) return;
          if (remote) {
            const remoteTime = Date.parse(remote.updatedAt) || 0;
            const localTime = Date.parse(localLoaded.updatedAt) || 0;
            if (remoteTime > localTime) {
              skipNextLocalSaveRef.current = true;
              setClassroom(remote);
              await saveClassroomState(remote);
            } else {
              await performServerSync(localLoaded);
            }
          } else {
            await performServerSync(localLoaded);
          }
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [performServerSync]);

  // Save every local change immediately to IndexedDB + localStorage, and auto-sync when online
  useEffect(() => {
    if (!hydrated) return;

    if (skipNextLocalSaveRef.current) {
      skipNextLocalSaveRef.current = false;
      return;
    }

    const stamped: ClassroomState = {
      ...classroom,
      updatedAt: new Date().toISOString(),
    };
    const meta = getSyncMeta();
    setSyncMeta({pendingSync: true, lastSyncedAt: meta.lastSyncedAt});
    setSyncStatus(isBrowserOnline ? 'syncing' : 'pending');
    void saveClassroomState(stamped);

    if (!isBrowserOnline) return;

    const timer = window.setTimeout(() => {
      void performServerSync(stamped);
    }, 500);

    return () => window.clearTimeout(timer);
  }, [classroom, hydrated, isBrowserOnline, performServerSync]);

  // Automatically sync pending offline edits the moment browser comes back online
  useEffect(() => {
    if (!hydrated || !isBrowserOnline) return;
    const meta = getSyncMeta();
    if (meta.pendingSync || syncStatus === 'pending') {
      void performServerSync(latestClassroomRef.current);
    }
  }, [isBrowserOnline, hydrated, syncStatus, performServerSync]);

  const activeStudent: StudentProfile | undefined = classroom.students.find(
    (s) => s.id === activeStudentId,
  );

  const handleSelectStudent = (studentId: string) => {
    const target = classroom.students.find((s) => s.id === studentId);
    setActiveStudentId(studentId);
    setSessionRole(UserRole.STUDENT);
    setStudentTab('home');
    if (target?.diagnostic) {
      const remStrand = (Object.keys(target.diagnostic.strandScores) as MathStrandId[]).find(
        (id) => target.diagnostic?.strandScores[id].recommendedTrack === LearningTrack.REMEDIATION,
      );
      if (remStrand) setSelectedStrandId(remStrand);
    }
    setQuizMode('practice');
  };

  const handleCreateStudent = (name: string, gradeSection: string, pin: string) => {
    const newStudent: StudentProfile = {
      id: `student-${Date.now()}`,
      name,
      gradeSection,
      pin,
      xp: 0,
      streak: 0,
      bestStreak: 0,
      diagnostic: null,
      strandProgress: createInitialStrandProgress(),
      completedActivityIds: [],
    };
    setClassroom((prev) => ({
      ...prev,
      teacherSections: Array.from(new Set([...prev.teacherSections, gradeSection])),
      students: [...prev.students, newStudent],
    }));
    setActiveStudentId(newStudent.id);
    setSessionRole(UserRole.STUDENT);
    setStudentTab('home');
    setQuizMode('practice');
  };

  const handleSignInTeacher = () => {
    setSessionRole(UserRole.TEACHER);
    setActiveStudentId(null);
    setTeacherView('class');
  };

  const handleCreateTeacher = (
    name: string,
    department: string,
    pin: string,
    sections: string[],
  ) => {
    setClassroom((prev) => ({
      ...prev,
      teacher: {
        ...prev.teacher,
        name,
        department,
        pin,
      },
      teacherSections: Array.from(new Set([...sections, ...prev.teacherSections])),
      welcomeNote: {
        ...prev.welcomeNote,
        teacherName: name,
      },
    }));
    setSessionRole(UserRole.TEACHER);
    setActiveStudentId(null);
    setTeacherView('class');
  };

  const handleRegisterSection = (sectionName: string) => {
    const cleaned = sectionName.trim();
    if (!cleaned) return;
    setClassroom((prev) => ({
      ...prev,
      teacherSections: Array.from(new Set([...prev.teacherSections, cleaned])),
    }));
  };

  const handleRemoveSection = (sectionName: string) => {
    setClassroom((prev) => {
      const remainingSections = prev.teacherSections.filter((s) => s !== sectionName);
      const fallbackSection = remainingSections[0] ?? 'Grade 11 — General';
      return {
        ...prev,
        teacherSections: remainingSections.length > 0 ? remainingSections : [fallbackSection],
        students: prev.students.map((s) =>
          s.gradeSection === sectionName ? {...s, gradeSection: fallbackSection} : s,
        ),
        assignedActivities: prev.assignedActivities.filter(
          (a) => a.targetSection !== sectionName,
        ),
      };
    });
  };

  const handleSignOut = () => {
    soundFx.tap();
    setShowAskAiModal(false);
    setSessionRole(null);
    setActiveStudentId(null);
  };

  const handleCompleteDiagnostic = (result: DiagnosticResult) => {
    if (!activeStudentId) return;
    setClassroom((prev) => ({
      ...prev,
      students: prev.students.map((s) =>
        s.id === activeStudentId
          ? {
              ...s,
              xp: s.diagnostic ? s.xp : s.xp + 100,
              diagnostic: result,
            }
          : s,
      ),
    }));
    const firstRem = (Object.keys(result.strandScores) as MathStrandId[]).find(
      (id) => result.strandScores[id].recommendedTrack === LearningTrack.REMEDIATION,
    );
    if (firstRem) setSelectedStrandId(firstRem);
    setQuizMode('report');
  };

  const handleRecordPracticeAttempt = (
    strandId: MathStrandId,
    track: LearningTrack,
    isCorrect: boolean,
  ) => {
    if (!activeStudentId) return;
    setClassroom((prev) => ({
      ...prev,
      students: prev.students.map((s) => {
        if (s.id !== activeStudentId) return s;
        const currentProg = s.strandProgress[strandId];
        const nextAttempts = currentProg.attempts + 1;
        const nextCorrect = currentProg.correctAttempts + (isCorrect ? 1 : 0);
        const masteredRemediation =
          currentProg.masteredRemediation ||
          (track === LearningTrack.REMEDIATION && nextCorrect >= 2 && nextCorrect / nextAttempts >= 0.67);
        const masteredAdvancement =
          currentProg.masteredAdvancement ||
          (track === LearningTrack.ADVANCEMENT && nextCorrect >= 2 && nextCorrect / nextAttempts >= 0.75);

        const nextStreak = isCorrect ? s.streak + 1 : 0;
        const nextBest = Math.max(s.bestStreak, nextStreak);
        const nextXp = s.xp + (isCorrect ? 25 : 5);

        return {
          ...s,
          xp: nextXp,
          streak: nextStreak,
          bestStreak: nextBest,
          strandProgress: {
            ...s.strandProgress,
            [strandId]: {
              ...currentProg,
              attempts: nextAttempts,
              correctAttempts: nextCorrect,
              masteredRemediation,
              masteredAdvancement,
              lastPracticedAt: new Date().toISOString(),
            },
          },
        };
      }),
    }));
  };

  const handleAssignActivities = (activities: AssignedActivity[]) => {
    setClassroom((prev) => ({
      ...prev,
      assignedActivities: [...activities, ...prev.assignedActivities],
    }));
  };

  const handleRemoveActivity = (activityId: string) => {
    setClassroom((prev) => ({
      ...prev,
      assignedActivities: prev.assignedActivities.filter((a) => a.id !== activityId),
    }));
  };

  const handleCompleteActivity = (activityId: string) => {
    if (!activeStudentId) return;
    setClassroom((prev) => ({
      ...prev,
      students: prev.students.map((s) => {
        if (s.id !== activeStudentId) return s;
        const existing = s.completedActivityIds ?? [];
        if (existing.includes(activityId)) return s;
        return {
          ...s,
          xp: s.xp + 50,
          completedActivityIds: [...existing, activityId],
        };
      }),
    }));
  };

  const handleCacheTutorReply = (cacheKey: string, reply: CachedTutorReply) => {
    setClassroom((prev) => ({
      ...prev,
      tutorCache: {
        ...prev.tutorCache,
        [cacheKey]: reply,
      },
    }));
  };

  const handleUpdateWelcomeNote = (note: WelcomeNote) => {
    setClassroom((prev) => ({
      ...prev,
      welcomeNote: note,
    }));
  };

  const handleAddStudent = (name: string, gradeSection: string, pin: string) => {
    const created: StudentProfile = {
      id: `student-${Date.now()}`,
      name,
      gradeSection,
      pin,
      xp: 0,
      streak: 0,
      bestStreak: 0,
      diagnostic: null,
      strandProgress: createInitialStrandProgress(),
      completedActivityIds: [],
    };
    setClassroom((prev) => ({
      ...prev,
      teacherSections: Array.from(new Set([...prev.teacherSections, gradeSection])),
      students: [...prev.students, created],
    }));
  };

  const handleRemoveStudent = (studentId: string) => {
    setClassroom((prev) => ({
      ...prev,
      students: prev.students.filter((s) => s.id !== studentId),
    }));
  };

  const handleResetStudentDiagnostic = (studentId: string) => {
    setClassroom((prev) => ({
      ...prev,
      students: prev.students.map((s) =>
        s.id === studentId
          ? {
              ...s,
              diagnostic: null,
              strandProgress: createInitialStrandProgress(),
            }
          : s,
      ),
    }));
  };

  const handleOverrideTrack = (
    studentId: string,
    strandId: MathStrandId,
    track: LearningTrack,
  ) => {
    setClassroom((prev) => ({
      ...prev,
      students: prev.students.map((s) =>
        s.id === studentId
          ? {
              ...s,
              strandProgress: {
                ...s.strandProgress,
                [strandId]: {
                  ...s.strandProgress[strandId],
                  trackOverride: track,
                },
              },
            }
          : s,
      ),
    }));
  };

  const studentNavItems: Array<{id: Exclude<StudentTab, 'home'>; label: string; icon: typeof BookOpen}> = [
    {id: 'lessons', label: 'Lessons', icon: BookOpen},
    {id: 'quiz', label: 'Quiz', icon: ClipboardCheck},
    {id: 'rewards', label: 'Rewards', icon: Trophy},
    {id: 'profile', label: 'Profile', icon: User},
  ];

  return (
    <div className="min-h-screen bg-[#0e102c] text-slate-100 flex flex-col pb-16 md:pb-0">
      {/* Strict 3-Zone Top Bar */}
      <header className="border-b border-white/10 bg-[#14153b]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-6 py-4">
          <button
            type="button"
            onClick={() => {
              soundFx.tap();
              if (sessionRole === UserRole.STUDENT) setStudentTab('home');
              if (sessionRole === UserRole.TEACHER) setTeacherView('class');
            }}
            className="inline-flex items-center gap-2 text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Rocket className="h-4 w-4 text-amber-300" aria-hidden="true" />
            <span>LEAVIEN AI</span>
          </button>

          {sessionRole === UserRole.STUDENT && (
            <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-indigo-200/80">
              {studentNavItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    soundFx.tap();
                    if (item.id === 'quiz' && quizMode === 'report') {
                      setQuizMode('practice');
                    }
                    setStudentTab(item.id);
                  }}
                  className={`whitespace-nowrap shrink-0 hover:text-white cursor-pointer transition-colors ${
                    studentTab === item.id ? 'text-white underline decoration-amber-300 underline-offset-4' : ''
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          )}

          {sessionRole === UserRole.TEACHER && (
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-indigo-200/80">
              <button
                type="button"
                onClick={() => {
                  soundFx.tap();
                  setTeacherView('class');
                }}
                className={`whitespace-nowrap shrink-0 hover:text-white cursor-pointer transition-colors ${
                  teacherView === 'class' ? 'text-white underline decoration-amber-300 underline-offset-4' : ''
                }`}
              >
                Class Overview
              </button>
              <button
                type="button"
                onClick={() => {
                  soundFx.tap();
                  setTeacherView('welcome-plan');
                }}
                className={`whitespace-nowrap shrink-0 hover:text-white cursor-pointer transition-colors ${
                  teacherView === 'welcome-plan' ? 'text-white underline decoration-amber-300 underline-offset-4' : ''
                }`}
              >
                Welcome & Activities
              </button>
            </nav>
          )}

          {!sessionRole && (
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-indigo-200/70">
              <span className="whitespace-nowrap shrink-0">Lessons</span>
              <span className="whitespace-nowrap shrink-0">Quiz</span>
              <span className="whitespace-nowrap shrink-0">Rewards</span>
              <span className="whitespace-nowrap shrink-0">Profile</span>
            </nav>
          )}

          <div className="shrink-0">
            {sessionRole ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/15 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Switch Account
              </button>
            ) : (
              <span className="text-xs font-medium text-indigo-200/80 whitespace-nowrap shrink-0">
                Grade 11 General Math
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Quiet Sub-Toolbar with Local Offline Save + Automatic Cloud Sync Status */}
      <div className="border-b border-white/10 bg-[#0e102c]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-2 text-indigo-200/80">
            {sessionRole === UserRole.STUDENT && activeStudent && (
              <>
                <span className="font-semibold text-white">{activeStudent.name}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums text-amber-300">{activeStudent.xp} XP</span>
                <span aria-hidden="true">·</span>
                <span>Private Account</span>
              </>
            )}
            {sessionRole === UserRole.TEACHER && (
              <span className="font-semibold text-white">{classroom.teacher.name}</span>
            )}
            {!sessionRole && <span>LEAVIEN AI · Grade 11 General Mathematics</span>}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Offline Local Save & Online Auto-Sync Indicator */}
            <div className="flex items-center gap-1.5 text-xs">
              {syncStatus === 'syncing' ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-cyan-300" aria-hidden="true" />
                  <span className="text-cyan-200">Syncing...</span>
                </>
              ) : isBrowserOnline && syncStatus === 'synced' ? (
                <>
                  <Cloud className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                  <span className="text-emerald-300">Saved & Auto-Synced</span>
                </>
              ) : (
                <>
                  <CloudOff className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
                  <span className="text-amber-300">Saved Offline · Syncs When Online</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs font-medium">
              {isBrowserOnline ? (
                <>
                  <Wifi className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                  <span className="text-emerald-300">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
                  <span className="text-amber-300">Offline</span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSoundEnabled((s) => !s)}
              className="rounded-lg border border-white/15 bg-white/5 p-1.5 text-indigo-200 hover:bg-white/10 hover:text-white cursor-pointer"
              aria-label={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
              title={soundEnabled ? 'Sound On' : 'Sound Off'}
            >
              {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            </button>

            <PWAInstallButton />
          </div>
        </div>
      </div>

      {/* Teacher Mobile Nav */}
      {sessionRole === UserRole.TEACHER && (
        <div className="flex md:hidden items-center gap-2 border-b border-white/10 bg-[#14153b] px-4 py-2 text-xs font-medium">
          <button
            type="button"
            onClick={() => setTeacherView('class')}
            className={`px-3 py-1 rounded-md whitespace-nowrap ${
              teacherView === 'class' ? 'bg-[#4f6af0] text-white' : 'text-indigo-200'
            }`}
          >
            Class Overview
          </button>
          <button
            type="button"
            onClick={() => setTeacherView('welcome-plan')}
            className={`px-3 py-1 rounded-md whitespace-nowrap ${
              teacherView === 'welcome-plan' ? 'bg-[#4f6af0] text-white' : 'text-indigo-200'
            }`}
          >
            Welcome & Activities
          </button>
        </div>
      )}

      {/* Main App Stage */}
      <div className="flex-1">
        <AnimatePresence mode="wait">
          {!sessionRole && (
            <motion.div
              key="auth-portal"
              initial={{opacity: 0}}
              animate={{opacity: 1}}
              exit={{opacity: 0}}
              transition={{duration: 0.15}}
            >
              <AuthPortal
                students={classroom.students}
                teacher={classroom.teacher}
                teacherSections={classroom.teacherSections}
                onSelectStudent={handleSelectStudent}
                onCreateStudent={handleCreateStudent}
                onSignInTeacher={handleSignInTeacher}
                onCreateTeacher={handleCreateTeacher}
              />
            </motion.div>
          )}

          {sessionRole === UserRole.STUDENT && activeStudent && studentTab === 'home' && (
            <motion.div
              key="tab-home"
              initial={{opacity: 0}}
              animate={{opacity: 1}}
              exit={{opacity: 0}}
              transition={{duration: 0.15}}
            >
              <StudentHomeSpace
                student={activeStudent}
                welcomeNote={classroom.welcomeNote}
                onClickWelcomeNote={() => {
                  setQuizMode('diagnostic');
                  setStudentTab('quiz');
                }}
                onOpenLearn={() => setStudentTab('lessons')}
                onOpenPractice={() => {
                  setQuizMode('practice');
                  setStudentTab('quiz');
                }}
                onOpenAskAi={() => setShowAskAiModal(true)}
                onOpenRewards={() => setStudentTab('rewards')}
                onOpenProfile={() => setStudentTab('profile')}
              />
            </motion.div>
          )}

          {sessionRole === UserRole.STUDENT && activeStudent && studentTab === 'lessons' && (
            <motion.div
              key="tab-lessons"
              initial={{opacity: 0}}
              animate={{opacity: 1}}
              exit={{opacity: 0}}
              transition={{duration: 0.15}}
            >
              <StudentLessonsView
                student={activeStudent}
                selectedStrandId={selectedStrandId}
                onSelectStrand={setSelectedStrandId}
                onGoToQuiz={(strandId) => {
                  setSelectedStrandId(strandId);
                  setQuizMode('practice');
                  setStudentTab('quiz');
                }}
                onOpenAskAi={() => setShowAskAiModal(true)}
              />
            </motion.div>
          )}

          {sessionRole === UserRole.STUDENT && activeStudent && studentTab === 'quiz' && (
            <motion.div
              key="tab-quiz"
              initial={{opacity: 0}}
              animate={{opacity: 1}}
              exit={{opacity: 0}}
              transition={{duration: 0.15}}
            >
              <StudentQuizView
                student={activeStudent}
                assignedActivities={classroom.assignedActivities}
                selectedStrandId={selectedStrandId}
                onSelectStrand={setSelectedStrandId}
                effectiveOnline={isBrowserOnline}
                quizMode={quizMode}
                onSetQuizMode={setQuizMode}
                onCompleteDiagnostic={handleCompleteDiagnostic}
                onRecordPracticeAttempt={handleRecordPracticeAttempt}
                onSaveGeneratedActivity={(act) => handleAssignActivities([act])}
                onCompleteActivity={handleCompleteActivity}
                onGoToLessons={(strandId) => {
                  setSelectedStrandId(strandId);
                  setStudentTab('lessons');
                }}
                onOpenAskAi={() => setShowAskAiModal(true)}
              />
            </motion.div>
          )}

          {sessionRole === UserRole.STUDENT && activeStudent && studentTab === 'rewards' && (
            <motion.div
              key="tab-rewards"
              initial={{opacity: 0}}
              animate={{opacity: 1}}
              exit={{opacity: 0}}
              transition={{duration: 0.15}}
            >
              <StudentRewardsView student={activeStudent} />
            </motion.div>
          )}

          {sessionRole === UserRole.STUDENT && activeStudent && studentTab === 'profile' && (
            <motion.div
              key="tab-profile"
              initial={{opacity: 0}}
              animate={{opacity: 1}}
              exit={{opacity: 0}}
              transition={{duration: 0.15}}
            >
              <StudentProfileView
                student={activeStudent}
                welcomeNote={classroom.welcomeNote}
                assignedActivitiesCount={
                  classroom.assignedActivities.filter(
                    (a) => a.targetSection === 'ALL' || a.targetSection === activeStudent.gradeSection,
                  ).length
                }
                onStartDiagnosticFromNote={() => {
                  setQuizMode('diagnostic');
                  setStudentTab('quiz');
                }}
                onGoToStrand={(strandId) => {
                  setSelectedStrandId(strandId);
                  setStudentTab('lessons');
                }}
                onSwitchAccount={handleSignOut}
              />
            </motion.div>
          )}

          {sessionRole === UserRole.TEACHER && (
            <motion.div
              key={`teacher-${teacherView}`}
              initial={{opacity: 0}}
              animate={{opacity: 1}}
              exit={{opacity: 0}}
              transition={{duration: 0.15}}
            >
              <TeacherDashboard
                state={classroom}
                activeSection={teacherView}
                effectiveOnline={isBrowserOnline}
                onUpdateWelcomeNote={handleUpdateWelcomeNote}
                onAddStudent={handleAddStudent}
                onRemoveStudent={handleRemoveStudent}
                onResetStudentDiagnostic={handleResetStudentDiagnostic}
                onOverrideTrack={handleOverrideTrack}
                onRegisterSection={handleRegisterSection}
                onRemoveSection={handleRemoveSection}
                onAssignActivities={handleAssignActivities}
                onRemoveActivity={handleRemoveActivity}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Ask LA Chatbot Companion Modal */}
      {showAskAiModal && sessionRole === UserRole.STUDENT && activeStudent && (
        <AskLeavienModal
          student={activeStudent}
          effectiveOnline={isBrowserOnline}
          tutorCache={classroom.tutorCache}
          onCacheTutorReply={handleCacheTutorReply}
          onClose={() => setShowAskAiModal(false)}
        />
      )}

      {/* Mobile Bottom Navigation Bar for Student Learning App */}
      {sessionRole === UserRole.STUDENT && (
        <nav
          aria-label="Student Learning Navigation"
          className="fixed bottom-0 inset-x-0 z-40 grid h-14 grid-cols-4 border-t border-white/10 bg-[#14153b] md:hidden"
        >
          {studentNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = studentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  soundFx.tap();
                  if (item.id === 'quiz' && quizMode === 'report') {
                    setQuizMode('practice');
                  }
                  setStudentTab(item.id);
                }}
                className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors cursor-pointer ${
                  isActive ? 'text-amber-300 font-semibold' : 'text-indigo-200/75 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      <footer className="hidden md:block border-t border-white/10 bg-[#14153b]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-4 text-xs text-indigo-200/75">
          <span>
            LEAVIEN AI — Learning Enhancement through Artificial Intelligence, Visualization, Interaction, Engagement, and Numeracy
          </span>
          <span>Saves locally offline & syncs automatically online</span>
        </div>
      </footer>
    </div>
  );
}
