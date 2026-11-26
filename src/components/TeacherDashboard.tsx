import {
  AlertTriangle,
  ArrowRight,
  BatteryCharging,
  BookMarked,
  CheckCircle2,
  FileSpreadsheet,
  FunctionSquare,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import {motion} from 'motion/react';
import React, {useMemo, useState} from 'react';
import {STRAND_MODULES} from '../data/mathCurriculum';
import {
  type AssignedActivity,
  type ClassroomState,
  LearningTrack,
  MathStrandId,
  type PracticeProblem,
  ProficiencyLevel,
  type StudentProfile,
  type WelcomeNote,
} from '../types/math';
import {
  generateActivityPackOffline,
  generateAutoDifferentiatedActivitiesOffline,
} from '../utils/offlineMathEngine';
import {soundFx} from '../utils/soundFx';
import {BatteryProgress} from './BatteryProgress';
import {MSEquationEditor} from './MSEquationEditor';
import {MathText} from './MathText';

interface TeacherDashboardProps {
  state: ClassroomState;
  activeSection: 'class' | 'welcome-plan';
  effectiveOnline: boolean;
  onUpdateWelcomeNote: (note: WelcomeNote) => void;
  onAddStudent: (name: string, gradeSection: string, pin: string) => void;
  onRemoveStudent: (studentId: string) => void;
  onResetStudentDiagnostic: (studentId: string) => void;
  onOverrideTrack: (studentId: string, strandId: MathStrandId, track: LearningTrack) => void;
  onRegisterSection: (sectionName: string) => void;
  onRemoveSection: (sectionName: string) => void;
  onAssignActivities: (activities: AssignedActivity[]) => void;
  onRemoveActivity: (activityId: string) => void;
}

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  state,
  activeSection,
  effectiveOnline,
  onUpdateWelcomeNote,
  onAddStudent,
  onRemoveStudent,
  onResetStudentDiagnostic,
  onOverrideTrack,
  onRegisterSection,
  onRemoveSection,
  onAssignActivities,
  onRemoveActivity,
}) => {
  const availableSections = useMemo(() => {
    const set = new Set<string>(state.teacherSections);
    state.students.forEach((s) => {
      if (s.gradeSection) set.add(s.gradeSection);
    });
    return Array.from(set);
  }, [state.teacherSections, state.students]);

  const [newSectionInput, setNewSectionInput] = useState('');
  const [sectionFilter, setSectionFilter] = useState<string>('ALL');

  const filteredStudents = useMemo(() => {
    if (sectionFilter === 'ALL') return state.students;
    return state.students.filter((s) => s.gradeSection === sectionFilter);
  }, [state.students, sectionFilter]);

  const [selectedStudentId, setSelectedStudentId] = useState<string>(state.students[0]?.id ?? '');
  const selectedStudent: StudentProfile | undefined =
    filteredStudents.find((s) => s.id === selectedStudentId) ?? filteredStudents[0];

  const [noteForm, setNoteForm] = useState<WelcomeNote>(state.welcomeNote);
  const [noteSavedToast, setNoteSavedToast] = useState(false);
  const [showNoteEqEditor, setShowNoteEqEditor] = useState(false);

  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentSection, setNewStudentSection] = useState<string>(
    availableSections[0] ?? 'Grade 11 — Curie',
  );
  const [newStudentPin, setNewStudentPin] = useState('');

  const [autoGenerating, setAutoGenerating] = useState(false);
  const [showCustomBuilder, setShowCustomBuilder] = useState(false);
  const [showCustomEqEditor, setShowCustomEqEditor] = useState(false);
  const [customStrandId, setCustomStrandId] = useState<MathStrandId>(MathStrandId.FUNCTIONS);
  const [customTrack, setCustomTrack] = useState<LearningTrack>(LearningTrack.REMEDIATION);
  const [customPrompt, setCustomPrompt] = useState('');
  const [customCorrectChoice, setCustomCorrectChoice] = useState('');
  const [customWrong1, setCustomWrong1] = useState('');
  const [customWrong2, setCustomWrong2] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const assessedStudents = filteredStudents.filter((s) => s.diagnostic !== null);
  const remediationStudents = assessedStudents.filter(
    (s) =>
      s.diagnostic?.proficiencyLevel === ProficiencyLevel.BEGINNING ||
      s.diagnostic?.proficiencyLevel === ProficiencyLevel.DEVELOPING,
  );
  const advancedStudents = assessedStudents.filter(
    (s) =>
      s.diagnostic?.proficiencyLevel === ProficiencyLevel.PROFICIENT ||
      s.diagnostic?.proficiencyLevel === ProficiencyLevel.ADVANCED,
  );

  const sectionAverage =
    assessedStudents.length > 0
      ? Math.round(
          assessedStudents.reduce((sum, s) => sum + (s.diagnostic?.overallPercent ?? 0), 0) /
            assessedStudents.length,
        )
      : null;

  const remediationAnalyticsList = useMemo(() => {
    return filteredStudents
      .map((student) => {
        const weakStrands = STRAND_MODULES.filter((strand) => {
          const prog = student.strandProgress[strand.id];
          const diagTrack = student.diagnostic?.strandScores[strand.id]?.recommendedTrack;
          const activeTrack =
            prog.trackOverride ??
            (prog.masteredRemediation ? LearningTrack.ADVANCEMENT : diagTrack);
          return !prog.masteredRemediation && activeTrack === LearningTrack.REMEDIATION;
        }).map((strand) => ({
          id: strand.id,
          shortTitle: strand.shortTitle,
          percent: student.diagnostic?.strandScores[strand.id]?.percent ?? null,
        }));

        const isLowProficiency =
          student.diagnostic?.proficiencyLevel === ProficiencyLevel.BEGINNING ||
          student.diagnostic?.proficiencyLevel === ProficiencyLevel.DEVELOPING;

        const needsRemediation =
          (student.diagnostic !== null && (isLowProficiency || weakStrands.length > 0)) ||
          weakStrands.some((w) => student.strandProgress[w.id].trackOverride === LearningTrack.REMEDIATION);

        return {student, weakStrands, needsRemediation};
      })
      .filter((entry) => entry.needsRemediation)
      .sort(
        (a, b) =>
          (a.student.diagnostic?.overallPercent ?? 100) -
          (b.student.diagnostic?.overallPercent ?? 100),
      );
  }, [filteredStudents]);

  const visibleActivities = useMemo(() => {
    if (sectionFilter === 'ALL') return state.assignedActivities;
    return state.assignedActivities.filter(
      (a) => a.targetSection === 'ALL' || a.targetSection === sectionFilter,
    );
  }, [state.assignedActivities, sectionFilter]);

  const handleRegisterSectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newSectionInput.trim();
    if (!cleaned) return;
    soundFx.correct();
    onRegisterSection(cleaned);
    setSectionFilter(cleaned);
    setNewSectionInput('');
    setStatusMessage(`Added section: ${cleaned}`);
  };

  const handleRemoveSectionClick = (sec: string) => {
    soundFx.tap();
    if (sectionFilter === sec) {
      setSectionFilter('ALL');
    }
    onRemoveSection(sec);
    setStatusMessage(`Removed section: ${sec}`);
  };

  const handleAutoGenerateActivities = async () => {
    soundFx.openNote();
    setAutoGenerating(true);

    const offlinePair = generateAutoDifferentiatedActivitiesOffline(filteredStudents, sectionFilter);
    if (!effectiveOnline) {
      onAssignActivities(offlinePair);
      setStatusMessage(
        `Generated Remediation & Advancement activities for ${sectionFilter === 'ALL' ? 'all sections' : sectionFilter}.`,
      );
      setAutoGenerating(false);
      return;
    }

    try {
      const results = await Promise.all(
        offlinePair.map(async (template) => {
          const strand = STRAND_MODULES.find((m) => m.id === template.strandId) ?? STRAND_MODULES[0];
          try {
            const res = await fetch('/api/ai/generate-activities', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({
                strandId: template.strandId,
                strandTitle: strand.title,
                track: template.track,
                targetSection: sectionFilter,
              }),
            });
            const data = await res.json();
            if (!res.ok || !Array.isArray(data.problems) || data.problems.length === 0) {
              return template;
            }
            return {
              id: `act-${template.track}-${template.strandId}-${Date.now()}-${Math.floor(Math.random() * 90)}`,
              title: data.title || template.title,
              strandId: template.strandId,
              track: template.track,
              targetSection: sectionFilter,
              instructions: data.instructions || template.instructions,
              problems: data.problems.slice(0, 3).map((p: Partial<PracticeProblem>, idx: number) => ({
                id: `actp-${Date.now()}-${idx}`,
                strandId: template.strandId,
                track: template.track,
                prompt: p.prompt || template.problems[0].prompt,
                choices: Array.isArray(p.choices) && p.choices.length === 4 ? p.choices : ['A', 'B', 'C', 'D'],
                correctIndex: typeof p.correctIndex === 'number' ? p.correctIndex : 0,
                hint: p.hint || 'Work step-by-step.',
                steps: Array.isArray(p.steps) ? p.steps : [],
                conceptTip: p.conceptTip || strand.keyFormulas[0],
                source: 'ai-online' as const,
              })),
              createdAt: new Date().toISOString(),
              source: 'ai-online' as const,
            };
          } catch {
            return template;
          }
        }),
      );
      soundFx.celebrate();
      onAssignActivities(results);
      setStatusMessage(
        `Generated & assigned Remediation and Advancement activities for ${sectionFilter === 'ALL' ? 'all sections' : sectionFilter}!`,
      );
    } finally {
      setAutoGenerating(false);
    }
  };

  const handleSaveCustomActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim() || !customCorrectChoice.trim()) return;
    soundFx.correct();

    const basePack = generateActivityPackOffline({
      strandId: customStrandId,
      track: customTrack,
      targetSection: sectionFilter,
      count: 2,
    });

    const strandShort = STRAND_MODULES.find((s) => s.id === customStrandId)?.shortTitle ?? 'Math';
    const customProblem: PracticeProblem = {
      id: `actp-custom-${Date.now()}`,
      strandId: customStrandId,
      track: customTrack,
      prompt: customPrompt.trim(),
      choices: [
        customCorrectChoice.trim(),
        customWrong1.trim() || 'None of the above',
        customWrong2.trim() || 'Cannot be determined',
        '0',
      ],
      correctIndex: 0,
      hint: 'Check each step carefully.',
      steps: [`Apply the ${strandShort} rule.`, `Correct answer: ${customCorrectChoice.trim()}`],
      conceptTip: 'Verify by substituting back into the equation.',
      source: 'curated',
    };

    const activity: AssignedActivity = {
      id: `act-custom-${Date.now()}`,
      title: `${strandShort}: ${customTrack === LearningTrack.REMEDIATION ? 'Remediation' : 'Advancement'} Set`,
      strandId: customStrandId,
      track: customTrack,
      targetSection: sectionFilter,
      instructions: 'Complete this teacher-authored math activity.',
      problems: [customProblem, ...basePack.problems],
      createdAt: new Date().toISOString(),
      source: 'teacher-custom',
    };

    onAssignActivities([activity]);
    setCustomPrompt('');
    setCustomCorrectChoice('');
    setCustomWrong1('');
    setCustomWrong2('');
    setShowCustomBuilder(false);
    setStatusMessage(`Assigned "${activity.title}" to students.`);
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    soundFx.correct();
    onUpdateWelcomeNote({
      ...noteForm,
      updatedAt: new Date().toISOString(),
    });
    setNoteSavedToast(true);
    setTimeout(() => setNoteSavedToast(false), 2500);
  };

  const handleAddStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;
    soundFx.tap();
    const targetSec =
      sectionFilter === 'ALL'
        ? newStudentSection.trim() || availableSections[0] || 'Grade 11 — Curie'
        : sectionFilter;
    const cleanPin = /^\d{4}$/.test(newStudentPin.trim())
      ? newStudentPin.trim()
      : String(1100 + state.students.length + 1);
    onAddStudent(newStudentName.trim(), targetSec, cleanPin);
    setNewStudentName('');
    setNewStudentPin('');
    setStatusMessage(`Added student to ${targetSec} (PIN: ${cleanPin}).`);
  };

  const handleDownloadSummaryCsv = () => {
    soundFx.correct();
    const headers = [
      'Student Name',
      'Section',
      'Proficiency Level',
      'Overall Score (%)',
      'Functions (%)',
      'Exp & Logs (%)',
      'Business Math (%)',
      'Logic (%)',
      'XP',
    ];

    const rows = filteredStudents.map((s) => {
      const d = s.diagnostic;
      return [
        s.name,
        s.gradeSection,
        d ? d.proficiencyLevel : 'Not tested',
        d ? `${d.overallPercent}%` : '—',
        d ? `${d.strandScores[MathStrandId.FUNCTIONS].percent}%` : '—',
        d ? `${d.strandScores[MathStrandId.EXPONENTIAL].percent}%` : '—',
        d ? `${d.strandScores[MathStrandId.BUSINESS].percent}%` : '—',
        d ? `${d.strandScores[MathStrandId.LOGIC].percent}%` : '—',
        s.xp,
      ];
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.map(escapeCsvCell).join(','))
      .join('\n');

    const blob = new Blob([csvContent], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeSec = sectionFilter === 'ALL' ? 'all-sections' : sectionFilter.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    a.href = url;
    a.download = `leavien-ai-results-${safeSec}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage(`Downloaded results summary CSV.`);
  };

  return (
    <section className="mx-auto max-w-6xl px-6 py-8 space-y-6">
      {/* Clean Section Manager Bar (Add / Remove Any Section + Download Summary) */}
      <div className="space-y-3 rounded-2xl border border-white/10 bg-[#14153b] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-200">
            <BookMarked className="h-4 w-4 text-cyan-300" aria-hidden="true" />
            <span>Your General Mathematics Sections</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <form onSubmit={handleRegisterSectionSubmit} className="flex items-center gap-2">
              <input
                type="text"
                value={newSectionInput}
                onChange={(e) => setNewSectionInput(e.target.value)}
                placeholder="Add section (e.g. STEM 11-A)"
                className="w-48 rounded-xl border border-white/15 bg-[#0e102c] px-3 py-1.5 text-xs text-white placeholder:text-slate-400 focus:border-[#4f6af0] focus:outline-none"
              />
              <motion.button
                type="submit"
                whileTap={{scale: 0.97}}
                className="inline-flex items-center gap-1 rounded-xl bg-[#4f6af0] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#5b75f5] cursor-pointer whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add Section
              </motion.button>
            </form>

            <motion.button
              type="button"
              whileTap={{scale: 0.97}}
              onClick={handleDownloadSummaryCsv}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0e9b88] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#12ad98] cursor-pointer whitespace-nowrap"
            >
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
              Download Summary (.csv)
            </motion.button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              soundFx.tap();
              setSectionFilter('ALL');
            }}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              sectionFilter === 'ALL'
                ? 'bg-[#4f6af0] text-white'
                : 'bg-[#1d2050] text-indigo-200 hover:bg-white/10'
            }`}
          >
            All Sections ({state.students.length})
          </button>

          {availableSections.map((sec) => {
            const count = state.students.filter((s) => s.gradeSection === sec).length;
            const canRemove = availableSections.length > 1;
            return (
              <div key={sec} className="inline-flex items-center">
                <button
                  type="button"
                  onClick={() => {
                    soundFx.tap();
                    setSectionFilter(sec);
                  }}
                  className={`px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    canRemove ? 'rounded-l-xl' : 'rounded-xl'
                  } ${
                    sectionFilter === sec
                      ? 'bg-[#4f6af0] text-white'
                      : 'bg-[#1d2050] text-indigo-200 hover:bg-white/10'
                  }`}
                >
                  {sec} ({count})
                </button>
                {canRemove && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSectionClick(sec)}
                    className={`rounded-r-xl border-l border-white/10 px-2 py-2 text-xs transition-colors cursor-pointer ${
                      sectionFilter === sec
                        ? 'bg-[#4f6af0] text-white/85 hover:text-white'
                        : 'bg-[#1d2050] text-indigo-300 hover:bg-rose-500/25 hover:text-rose-200'
                    }`}
                    aria-label={`Remove section ${sec}`}
                    title={`Remove section ${sec}`}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {statusMessage && (
        <div className="rounded-xl border border-indigo-400/25 bg-indigo-500/15 px-4 py-2.5 text-xs font-medium text-indigo-100 flex items-center justify-between">
          <span>{statusMessage}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-indigo-200 hover:text-white cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Simple 4-Card Section Battery KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-[#171942] p-5">
          <div className="text-xs text-indigo-200/80">Students</div>
          <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-white">
            {filteredStudents.length}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#171942] p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-indigo-200/80">
            <span className="inline-flex items-center gap-1">
              <BatteryCharging className="h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
              Section Battery
            </span>
            <span className="font-mono text-white tabular-nums">
              {assessedStudents.length}/{filteredStudents.length}
            </span>
          </div>
          <BatteryProgress percent={sectionAverage} size="md" showChargingIcon />
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#171942] p-5">
          <div className="text-xs text-indigo-200/80">Needs Remediation</div>
          <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-amber-300">
            {remediationStudents.length}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#171942] p-5">
          <div className="text-xs text-indigo-200/80">Advancement Ready</div>
          <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-emerald-300">
            {advancedStudents.length}
          </div>
        </div>
      </div>

      {activeSection === 'class' ? (
        <div className="space-y-6">
          {/* Remediation Battery Analytics + 1-Click Auto-Generate */}
          <div className="rounded-2xl border border-amber-400/25 bg-[#171942] overflow-hidden shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-amber-500/10 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="h-5 w-5 text-amber-300 shrink-0" aria-hidden="true" />
                <div>
                  <h2 className="text-base font-semibold text-white">
                    Students Needing Remediation — Battery Analytics ({remediationAnalyticsList.length})
                  </h2>
                  <p className="text-xs text-indigo-200/85">
                    Low battery students in {sectionFilter === 'ALL' ? 'all sections' : sectionFilter}.
                  </p>
                </div>
              </div>

              <motion.button
                type="button"
                whileTap={{scale: 0.97}}
                disabled={autoGenerating}
                onClick={() => void handleAutoGenerateActivities()}
                className="inline-flex items-center gap-2 rounded-xl bg-[#9453d2] px-4 py-2 text-xs font-semibold text-white hover:bg-[#a161de] disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
                {autoGenerating ? 'Generating...' : 'Auto-Generate Activities'}
              </motion.button>
            </div>

            {remediationAnalyticsList.length === 0 ? (
              <div className="px-6 py-5 text-xs text-emerald-200">
                All assessed students here have strong battery charge!
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {remediationAnalyticsList.map(({student, weakStrands}) => (
                  <div
                    key={student.id}
                    className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 hover:bg-white/5 transition-colors"
                  >
                    <div className="space-y-1.5 flex-1 min-w-[220px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-white">{student.name}</span>
                        <span className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] text-indigo-200">
                          {student.gradeSection}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="text-amber-300 font-medium">Needs help in:</span>
                        {weakStrands.map((w) => (
                          <span
                            key={w.id}
                            className="rounded-md border border-amber-400/30 bg-amber-500/15 px-2 py-0.5 text-amber-100 tabular-nums"
                          >
                            {w.shortTitle}
                            {w.percent !== null ? ` (${w.percent}%)` : ''}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-32">
                        <BatteryProgress percent={student.diagnostic?.overallPercent ?? 0} size="sm" />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          soundFx.tap();
                          setSelectedStudentId(student.id);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/35 bg-amber-500/15 px-3.5 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/25 cursor-pointer whitespace-nowrap"
                      >
                        Inspect
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section Roster + Selected Student Battery Detail */}
          <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr] items-start">
            <div className="rounded-2xl border border-white/10 bg-[#171942] overflow-hidden shadow-xl">
              <div className="border-b border-white/10 px-6 py-4">
                <h2 className="text-base font-semibold text-white">
                  {sectionFilter === 'ALL' ? 'All Students Roster' : `${sectionFilter} Roster`}
                </h2>
                <p className="text-xs text-indigo-200/80">
                  Click any student to inspect their strand batteries or change track.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/10 bg-[#0e102c] text-indigo-200">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Student</th>
                      <th className="px-4 py-3 font-semibold">Section</th>
                      <th className="px-4 py-3 font-semibold">Battery</th>
                      <th className="px-4 py-3 font-semibold text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-indigo-200/75">
                          No students in this section yet.
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((student) => {
                        const isSelected = student.id === selectedStudent?.id;
                        return (
                          <tr
                            key={student.id}
                            onClick={() => {
                              soundFx.tap();
                              setSelectedStudentId(student.id);
                            }}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-[#23265a]' : 'hover:bg-white/5'
                            }`}
                          >
                            <td className="px-4 py-3 font-semibold text-white">{student.name}</td>
                            <td className="px-4 py-3 text-indigo-200/80 whitespace-nowrap">
                              {student.gradeSection}
                            </td>
                            <td className="px-4 py-3 w-36">
                              <BatteryProgress
                                percent={student.diagnostic ? student.diagnostic.overallPercent : null}
                                size="sm"
                              />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  soundFx.tap();
                                  onRemoveStudent(student.id);
                                }}
                                className="rounded p-1 text-slate-400 hover:bg-rose-500/20 hover:text-rose-300 cursor-pointer"
                                aria-label={`Remove ${student.name}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <form onSubmit={handleAddStudentSubmit} className="grid gap-2 sm:grid-cols-[1.2fr_1fr_0.7fr_auto] border-t border-white/10 bg-[#0e102c] p-4">
                <input
                  type="text"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="Student name..."
                  className="rounded-lg border border-white/15 bg-[#171942] px-3 py-2 text-xs text-white placeholder:text-slate-400 focus:border-[#4f6af0] focus:outline-none"
                />
                <input
                  type="text"
                  list="teacher-sections-list"
                  value={sectionFilter === 'ALL' ? newStudentSection : sectionFilter}
                  disabled={sectionFilter !== 'ALL'}
                  onChange={(e) => setNewStudentSection(e.target.value)}
                  placeholder="Section..."
                  className="rounded-lg border border-white/15 bg-[#171942] px-2.5 py-2 text-xs text-white placeholder:text-slate-400 focus:border-[#4f6af0] focus:outline-none disabled:opacity-75"
                />
                <datalist id="teacher-sections-list">
                  {availableSections.map((sec) => (
                    <option key={sec} value={sec} />
                  ))}
                </datalist>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={newStudentPin}
                  onChange={(e) => setNewStudentPin(e.target.value)}
                  placeholder="PIN (4 digits)"
                  className="rounded-lg border border-white/15 bg-[#171942] px-3 py-2 font-mono text-xs text-white placeholder:text-slate-400 focus:border-[#4f6af0] focus:outline-none"
                />
                <motion.button
                  type="submit"
                  whileTap={{scale: 0.97}}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#4f6af0] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5b75f5] cursor-pointer whitespace-nowrap"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Add
                </motion.button>
              </form>
            </div>

            {selectedStudent && (
              <div className="rounded-2xl border border-white/10 bg-[#171942] p-6 space-y-4 shadow-xl">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs text-indigo-200/80">
                      {selectedStudent.gradeSection} · PIN <span className="font-mono text-amber-300">{selectedStudent.pin}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-white">{selectedStudent.name}</h3>
                  </div>
                  {selectedStudent.diagnostic && (
                    <button
                      type="button"
                      onClick={() => {
                        soundFx.tap();
                        onResetStudentDiagnostic(selectedStudent.id);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-medium text-white hover:bg-white/10 cursor-pointer"
                    >
                      <RotateCcw className="h-3 w-3" aria-hidden="true" />
                      Reset
                    </button>
                  )}
                </div>

                <div className="space-y-2.5">
                  {STRAND_MODULES.map((strand) => {
                    const score = selectedStudent.diagnostic?.strandScores[strand.id];
                    const prog = selectedStudent.strandProgress[strand.id];
                    const currentTrack =
                      prog.trackOverride ?? score?.recommendedTrack ?? LearningTrack.REMEDIATION;
                    return (
                      <div key={strand.id} className="rounded-xl border border-white/10 bg-[#0e102c] p-3 text-xs space-y-2">
                        <BatteryProgress
                          percent={score ? score.percent : null}
                          label={strand.shortTitle}
                          sublabel={`${prog.correctAttempts}/${prog.attempts} solved`}
                          size="sm"
                        />
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              soundFx.tap();
                              onOverrideTrack(selectedStudent.id, strand.id, LearningTrack.REMEDIATION);
                            }}
                            className={`rounded px-2 py-1 font-medium cursor-pointer ${
                              currentTrack === LearningTrack.REMEDIATION
                                ? 'bg-amber-500 text-slate-950 font-semibold'
                                : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
                            }`}
                          >
                            Remediation
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              soundFx.tap();
                              onOverrideTrack(selectedStudent.id, strand.id, LearningTrack.ADVANCEMENT);
                            }}
                            className={`rounded px-2 py-1 font-medium cursor-pointer ${
                              currentTrack === LearningTrack.ADVANCEMENT
                                ? 'bg-[#0e9b88] text-white font-semibold'
                                : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
                            }`}
                          >
                            Advancement
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 items-start">
          {/* Welcome Note Editor */}
          <form onSubmit={handleSaveNote} className="rounded-2xl border border-white/10 bg-[#171942] p-7 space-y-4 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-white">Student Welcome Note</h2>
                <p className="mt-1 text-xs text-indigo-200/80">
                  Students click this note to start their Diagnostic Exam.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundFx.tap();
                  setShowNoteEqEditor((v) => !v);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/35 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25 cursor-pointer"
              >
                <FunctionSquare className="h-3.5 w-3.5" aria-hidden="true" />
                Equation Editor
              </button>
            </div>

            {showNoteEqEditor && (
              <MSEquationEditor
                actionLabel="Insert into Welcome Note"
                onInsertEquation={(wrapped) => {
                  setNoteForm((prev) => ({
                    ...prev,
                    message: prev.message.trim() ? `${prev.message.trim()} ${wrapped}` : wrapped,
                  }));
                  setShowNoteEqEditor(false);
                }}
                onCancel={() => setShowNoteEqEditor(false)}
              />
            )}

            <div>
              <label className="block text-xs font-medium text-indigo-200 mb-1">Title</label>
              <input
                type="text"
                value={noteForm.title}
                onChange={(e) => setNoteForm({...noteForm, title: e.target.value})}
                className="w-full rounded-xl border border-white/15 bg-[#0e102c] px-3.5 py-2.5 text-sm text-white focus:border-[#4f6af0] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-indigo-200 mb-1">Welcome Message</label>
              <textarea
                rows={4}
                value={noteForm.message}
                onChange={(e) => setNoteForm({...noteForm, message: e.target.value})}
                className="w-full rounded-xl border border-white/15 bg-[#0e102c] px-3.5 py-2.5 text-sm text-white focus:border-[#4f6af0] focus:outline-none"
              />
              {noteForm.message.includes('$') && (
                <div className="mt-2 rounded-xl border border-white/10 bg-[#0e102c] px-3.5 py-2.5 text-xs text-slate-200">
                  <MathText text={noteForm.message} />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              {noteSavedToast ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Saved
                </span>
              ) : (
                <span className="text-xs text-indigo-200/60">Saves offline & auto-syncs online</span>
              )}
              <motion.button
                type="submit"
                whileTap={{scale: 0.97}}
                className="inline-flex items-center gap-2 rounded-xl bg-[#4f6af0] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#5b75f5] cursor-pointer"
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                Save Note
              </motion.button>
            </div>
          </form>

          {/* Unified Remediation & Advancement Activities Manager */}
          <div className="rounded-2xl border border-white/10 bg-[#171942] p-7 space-y-4 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-white">Remediation & Advancement Activities</h2>
                <p className="mt-1 text-xs text-indigo-200/80">
                  Auto-generate or write custom math activities for your students.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <motion.button
                type="button"
                whileTap={{scale: 0.97}}
                disabled={autoGenerating}
                onClick={() => void handleAutoGenerateActivities()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#9453d2] px-4 py-2 text-xs font-semibold text-white hover:bg-[#a161de] disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                {autoGenerating ? 'Generating...' : 'Auto-Generate Activities'}
              </motion.button>

              <button
                type="button"
                onClick={() => {
                  soundFx.tap();
                  setShowCustomBuilder((v) => !v);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/35 bg-cyan-500/15 px-3.5 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25 cursor-pointer"
              >
                <FunctionSquare className="h-3.5 w-3.5" aria-hidden="true" />
                {showCustomBuilder ? 'Close Editor' : 'Write with MS Equation Editor'}
              </button>
            </div>

            {showCustomBuilder && (
              <form onSubmit={handleSaveCustomActivity} className="rounded-xl border border-cyan-400/25 bg-[#0e102c] p-4 space-y-3">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.tap();
                      setShowCustomEqEditor((v) => !v);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#4f6af0] px-3 py-1 text-xs font-semibold text-white hover:bg-[#5b75f5] cursor-pointer"
                  >
                    <FunctionSquare className="h-3.5 w-3.5" aria-hidden="true" />
                    {showCustomEqEditor ? 'Hide MS Equation Editor' : 'Open MS Equation Editor'}
                  </button>
                </div>

                {showCustomEqEditor && (
                  <MSEquationEditor
                    actionLabel="Insert Equation"
                    onInsertEquation={(wrapped) => {
                      setCustomPrompt((prev) => (prev.trim() ? `${prev.trim()} ${wrapped}` : wrapped));
                      setShowCustomEqEditor(false);
                    }}
                    onCancel={() => setShowCustomEqEditor(false)}
                  />
                )}

                <div className="grid gap-2 sm:grid-cols-2">
                  <select
                    value={customStrandId}
                    onChange={(e) => setCustomStrandId(e.target.value as MathStrandId)}
                    className="rounded-lg border border-white/15 bg-[#171942] px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    {STRAND_MODULES.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.shortTitle}
                      </option>
                    ))}
                  </select>
                  <select
                    value={customTrack}
                    onChange={(e) => setCustomTrack(e.target.value as LearningTrack)}
                    className="rounded-lg border border-white/15 bg-[#171942] px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value={LearningTrack.REMEDIATION}>Remediation Track</option>
                    <option value={LearningTrack.ADVANCEMENT}>Advancement Track</option>
                  </select>
                </div>

                <textarea
                  rows={2}
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder='Write problem (e.g. Solve $\frac{2x+1}{x-3}=5$)'
                  className="w-full rounded-lg border border-white/15 bg-[#171942] px-3 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-none"
                />
                {customPrompt.trim() && (
                  <div className="rounded-lg border border-white/10 bg-[#141848] px-3 py-2 text-xs text-white">
                    <MathText text={customPrompt} />
                  </div>
                )}

                <div className="grid gap-2 sm:grid-cols-3">
                  <input
                    type="text"
                    value={customCorrectChoice}
                    onChange={(e) => setCustomCorrectChoice(e.target.value)}
                    placeholder="Correct Answer"
                    className="rounded-lg border border-emerald-400/35 bg-[#171942] px-3 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={customWrong1}
                    onChange={(e) => setCustomWrong1(e.target.value)}
                    placeholder="Wrong Option 1"
                    className="rounded-lg border border-white/15 bg-[#171942] px-3 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={customWrong2}
                    onChange={(e) => setCustomWrong2(e.target.value)}
                    placeholder="Wrong Option 2"
                    className="rounded-lg border border-white/15 bg-[#171942] px-3 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!customPrompt.trim() || !customCorrectChoice.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0e9b88] px-4 py-2 text-xs font-semibold text-white hover:bg-[#12ad98] disabled:opacity-40 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Assign Activity
                </button>
              </form>
            )}

            <div className="space-y-2.5">
              {visibleActivities.map((act) => {
                const isRem = act.track === LearningTrack.REMEDIATION;
                const completedCount = filteredStudents.filter((s) =>
                  s.completedActivityIds?.includes(act.id),
                ).length;
                return (
                  <div
                    key={act.id}
                    className="rounded-xl border border-white/10 bg-[#0e102c] p-3.5 space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px]">
                          <span className={isRem ? 'font-semibold text-amber-300' : 'font-semibold text-emerald-300'}>
                            {isRem ? 'Remediation' : 'Advancement'}
                          </span>
                          <span className="text-indigo-200">
                            · {act.targetSection === 'ALL' ? 'All Sections' : act.targetSection}
                          </span>
                          <span className="font-mono text-cyan-200 tabular-nums">
                            · {completedCount}/{filteredStudents.length} done
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-white mt-0.5">{act.title}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          soundFx.tap();
                          onRemoveActivity(act.id);
                        }}
                        className="rounded p-1 text-slate-400 hover:bg-rose-500/20 hover:text-rose-300 cursor-pointer"
                        aria-label={`Remove ${act.title}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {act.problems[0] && (
                      <div className="text-xs text-slate-300">
                        <MathText text={act.problems[0].prompt} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
