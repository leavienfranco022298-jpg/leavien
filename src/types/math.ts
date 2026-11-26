export enum UserRole {
  STUDENT = 'student',
  TEACHER = 'teacher',
}

export enum MathStrandId {
  FUNCTIONS = 'functions',
  EXPONENTIAL = 'exponential',
  BUSINESS = 'business',
  LOGIC = 'logic',
}

export enum ProficiencyLevel {
  UNASSESSED = 'Unassessed',
  BEGINNING = 'Beginning (Needs Remediation)',
  DEVELOPING = 'Developing (Guided Remediation)',
  PROFICIENT = 'Proficient (Target Mastery)',
  ADVANCED = 'Advanced (Accelerated)',
}

export enum LearningTrack {
  REMEDIATION = 'remediation',
  ADVANCEMENT = 'advancement',
}

export interface DiagnosticQuestion {
  id: string;
  strandId: MathStrandId;
  prompt: string;
  choices: string[];
  correctIndex: number;
  hint: string;
  steps: string[];
  difficulty: 'foundation' | 'core' | 'stretch';
}

export interface PracticeProblem {
  id: string;
  strandId: MathStrandId;
  track: LearningTrack;
  prompt: string;
  choices: string[];
  correctIndex: number;
  hint: string;
  steps: string[];
  conceptTip: string;
  source: 'curated' | 'offline-generator' | 'ai-online';
}

export interface StrandModule {
  id: MathStrandId;
  title: string;
  shortTitle: string;
  summary: string;
  keyFormulas: string[];
  commonPitfalls: string[];
  remediationExample: {
    problem: string;
    steps: string[];
    answer: string;
  };
  advancementExample: {
    problem: string;
    steps: string[];
    answer: string;
  };
  curatedPractice: PracticeProblem[];
}

export interface DiagnosticResult {
  completedAt: string;
  totalCorrect: number;
  totalQuestions: number;
  overallPercent: number;
  proficiencyLevel: ProficiencyLevel;
  answers: Record<string, number>;
  strandScores: Record<
    MathStrandId,
    {
      correct: number;
      total: number;
      percent: number;
      recommendedTrack: LearningTrack;
    }
  >;
}

export interface StrandProgress {
  trackOverride?: LearningTrack;
  attempts: number;
  correctAttempts: number;
  masteredRemediation: boolean;
  masteredAdvancement: boolean;
  lastPracticedAt?: string;
}

export interface StudentProfile {
  id: string;
  name: string;
  gradeSection: string;
  pin: string;
  xp: number;
  streak: number;
  bestStreak: number;
  diagnostic: DiagnosticResult | null;
  strandProgress: Record<MathStrandId, StrandProgress>;
  completedActivityIds?: string[];
}

export interface RewardMilestone {
  id: string;
  title: string;
  description: string;
  xpBonus: number;
  isUnlocked: (student: StudentProfile) => boolean;
  progressLabel: (student: StudentProfile) => string;
}

export interface WelcomeNote {
  title: string;
  teacherName: string;
  greetingPrefix: string;
  message: string;
  diagnosticCue: string;
  updatedAt: string;
}

export interface TeacherProfile {
  id: string;
  name: string;
  department: string;
  pin: string;
}

export interface CachedTutorReply {
  id: string;
  problemPrompt: string;
  guidance: string;
  steps: string[];
  keyRule: string;
  checkQuestion: string;
  source: 'ai-online' | 'offline-engine';
  createdAt: string;
}

export interface AssignedActivity {
  id: string;
  title: string;
  strandId: MathStrandId;
  track: LearningTrack;
  targetSection: string;
  instructions: string;
  problems: PracticeProblem[];
  createdAt: string;
  source: 'offline-generator' | 'ai-online' | 'teacher-custom';
}

export interface ClassroomState {
  welcomeNote: WelcomeNote;
  teacher: TeacherProfile;
  teacherSections: string[];
  students: StudentProfile[];
  assignedActivities: AssignedActivity[];
  tutorCache: Record<string, CachedTutorReply>;
  updatedAt: string;
}
