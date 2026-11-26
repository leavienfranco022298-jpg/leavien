import {Bot, FunctionSquare, Send, Sparkles, WifiOff, X} from 'lucide-react';
import {motion} from 'motion/react';
import React, {useState} from 'react';
import {STRAND_MODULES} from '../data/mathCurriculum';
import {
  type CachedTutorReply,
  LearningTrack,
  MathStrandId,
  ProficiencyLevel,
  type StudentProfile,
} from '../types/math';
import {solveMathQuestionOffline} from '../utils/offlineMathEngine';
import {soundFx} from '../utils/soundFx';
import {MSEquationEditor} from './MSEquationEditor';
import {MathText} from './MathText';

interface AskLeavienModalProps {
  student: StudentProfile;
  effectiveOnline: boolean;
  tutorCache: Record<string, CachedTutorReply>;
  onCacheTutorReply: (cacheKey: string, reply: CachedTutorReply) => void;
  onClose: () => void;
}

interface ChatTurn {
  id: string;
  sender: 'student' | 'la';
  text?: string;
  reply?: CachedTutorReply;
}

export const AskLeavienModal: React.FC<AskLeavienModalProps> = ({
  student,
  effectiveOnline,
  tutorCache,
  onCacheTutorReply,
  onClose,
}) => {
  const [strandId, setStrandId] = useState<MathStrandId>(MathStrandId.FUNCTIONS);
  const [question, setQuestion] = useState('');
  const [showEquationEditor, setShowEquationEditor] = useState(false);
  const [messages, setMessages] = useState<ChatTurn[]>([
    {
      id: 'la-welcome',
      sender: 'la',
      text: `Hi ${student.name}! I’m LA, your Math Chatbot. Type any math question or click the Equation button to use the MS Equation Editor (e.g., $\\frac{24}{6} + 3 \\times 2$, $15\\%$ of $200$, $2x + 6 = 14$, or $\\log_{2}(16)$). I answer right away offline and online!`,
    },
  ]);
  const [loading, setLoading] = useState(false);

  const activeStrand = STRAND_MODULES.find((m) => m.id === strandId) ?? STRAND_MODULES[0];
  const quickPrompts = [
    '24 / 6 + 3 * 2',
    '2x + 6 = 14',
    '15% of 200',
    'log2(16)',
    'domain of 1/(x - 3)',
    'When is p -> q false?',
  ];

  const submitQuestion = async (promptText: string) => {
    const clean = promptText.trim();
    if (!clean || loading) return;
    soundFx.tap();
    setQuestion('');
    setShowEquationEditor(false);

    const studentMsg: ChatTurn = {
      id: `user-${Date.now()}`,
      sender: 'student',
      text: clean,
    };

    const cacheKey = `la-${strandId}-${clean.toLowerCase()}`;
    const instantOffline = tutorCache[cacheKey] ?? solveMathQuestionOffline(clean, strandId);

    if (!effectiveOnline) {
      soundFx.exploreDiscovery();
      onCacheTutorReply(cacheKey, instantOffline);
      setMessages((prev) => [
        ...prev,
        studentMsg,
        {id: `la-${Date.now() + 1}`, sender: 'la', reply: instantOffline},
      ]);
      return;
    }

    setMessages((prev) => [...prev, studentMsg]);
    setLoading(true);
    try {
      const res = await fetch('/api/ai/tutor', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          strandTitle: `Grade 11 General Mathematics — ${activeStrand.title}`,
          proficiencyLevel: student.diagnostic?.proficiencyLevel ?? ProficiencyLevel.DEVELOPING,
          track: LearningTrack.REMEDIATION,
          problemPrompt: clean,
          studentQuestion: clean,
          mode: 'step-by-step',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Online AI unavailable');
      }
      const onlineReply: CachedTutorReply = {
        id: `la-ai-${Date.now()}`,
        problemPrompt: clean,
        guidance: data.guidance || instantOffline.guidance,
        steps: Array.isArray(data.steps) && data.steps.length > 0 ? data.steps : instantOffline.steps,
        keyRule: data.keyRule || instantOffline.keyRule,
        checkQuestion: data.checkQuestion || instantOffline.checkQuestion,
        source: 'ai-online',
        createdAt: new Date().toISOString(),
      };
      soundFx.correct();
      onCacheTutorReply(cacheKey, onlineReply);
      setMessages((prev) => [
        ...prev,
        {id: `la-${Date.now() + 2}`, sender: 'la', reply: onlineReply},
      ]);
    } catch {
      soundFx.exploreDiscovery();
      onCacheTutorReply(cacheKey, instantOffline);
      setMessages((prev) => [
        ...prev,
        {id: `la-${Date.now() + 2}`, sender: 'la', reply: instantOffline},
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="la-chatbot-title"
    >
      <motion.div
        initial={{opacity: 0, scale: 0.96, y: 10}}
        animate={{opacity: 1, scale: 1, y: 0}}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-white/15 bg-[#171942] p-5 sm:p-6 text-slate-100 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 text-xs font-extrabold text-white shadow">
              LA
            </div>
            <div>
              <h2 id="la-chatbot-title" className="text-base font-bold text-white flex items-center gap-1.5">
                <span>LA Chatbot</span>
                {effectiveOnline ? (
                  <Bot className="h-4 w-4 text-cyan-300" aria-hidden="true" />
                ) : (
                  <WifiOff className="h-4 w-4 text-amber-300" aria-hidden="true" />
                )}
              </h2>
              <p className="text-xs text-indigo-200/80">
                Basic & Grade 11 Math Helper · {effectiveOnline ? 'Online + Offline Ready' : 'Instant Offline Solver'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              soundFx.tap();
              onClose();
            }}
            className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer"
            aria-label="Close LA Chatbot"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Topic Context Tabs */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {STRAND_MODULES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                soundFx.tap();
                setStrandId(m.id);
              }}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                strandId === m.id
                  ? 'bg-[#9453d2] text-white'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {m.shortTitle}
            </button>
          ))}
        </div>

        {/* Quick Math Prompts */}
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {quickPrompts.map((qp) => (
            <button
              key={qp}
              type="button"
              onClick={() => void submitQuestion(qp)}
              className="rounded-lg border border-white/10 bg-[#0e102c] px-2.5 py-1 text-left text-[11px] text-cyan-200 hover:border-purple-400/50 hover:text-white cursor-pointer"
            >
              <MathText text={qp} />
            </button>
          ))}
        </div>

        {/* Conversation Thread */}
        <div className="mt-3.5 flex-1 overflow-y-auto space-y-3 rounded-xl border border-white/10 bg-[#0e102c] p-3.5 min-h-[180px]">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{opacity: 0, y: 6}}
              animate={{opacity: 1, y: 0}}
              className={`flex ${msg.sender === 'student' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'student' ? (
                <div className="max-w-[82%] rounded-2xl rounded-br-xs bg-[#4f6af0] px-3.5 py-2 text-xs font-medium text-white">
                  <MathText text={msg.text ?? ''} />
                </div>
              ) : msg.reply ? (
                <div className="max-w-[92%] space-y-2 rounded-2xl rounded-bl-xs border border-white/10 bg-[#1a1d4d] p-3.5 text-xs text-slate-200">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-cyan-300">LA</span>
                    <span className="text-[10px] text-indigo-300">
                      {msg.reply.source === 'ai-online' ? 'Online AI' : 'Offline Math Engine'}
                    </span>
                  </div>
                  <p className="font-semibold text-white">
                    <MathText text={msg.reply.guidance} />
                  </p>
                  <ol className="space-y-1.5 pl-4 list-decimal text-slate-300">
                    {msg.reply.steps.map((s) => (
                      <li key={s}>
                        <MathText text={s} />
                      </li>
                    ))}
                  </ol>
                  <div className="border-t border-white/10 pt-1.5 text-[11px] text-amber-200">
                    Rule: <MathText text={msg.reply.keyRule} />
                  </div>
                  <div className="text-[11px] text-purple-300 font-medium">
                    <MathText text={msg.reply.checkQuestion} />
                  </div>
                </div>
              ) : (
                <div className="max-w-[90%] rounded-2xl rounded-bl-xs border border-white/10 bg-[#1a1d4d] px-3.5 py-2.5 text-xs text-slate-100">
                  <span className="font-bold text-cyan-300 mr-1.5">LA:</span>
                  <MathText text={msg.text ?? ''} />
                </div>
              )}
            </motion.div>
          ))}

          {loading && (
            <div className="text-xs text-cyan-300 animate-pulse">LA is solving step-by-step...</div>
          )}
        </div>

        {/* Toggleable MS Equation Editor */}
        {showEquationEditor && (
          <div className="mt-3">
            <MSEquationEditor
              actionLabel="Insert into Question"
              onInsertEquation={(wrapped) => {
                setQuestion((prev) => (prev.trim() ? `${prev.trim()} ${wrapped}` : wrapped));
                setShowEquationEditor(false);
              }}
              onCancel={() => setShowEquationEditor(false)}
            />
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submitQuestion(question);
          }}
          className="mt-3 flex flex-wrap sm:flex-nowrap gap-2 pt-1"
        >
          <button
            type="button"
            onClick={() => {
              soundFx.tap();
              setShowEquationEditor((v) => !v);
            }}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              showEquationEditor
                ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                : 'border-white/15 bg-[#0e102c] text-cyan-200 hover:border-cyan-400/50'
            }`}
            title="Open MS Equation Editor"
          >
            <FunctionSquare className="h-3.5 w-3.5" aria-hidden="true" />
            Equation
          </button>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder='Ask LA any math problem or insert an equation...'
            className="flex-1 min-w-0 rounded-xl border border-white/15 bg-[#0e102c] px-3.5 py-2.5 text-xs text-white placeholder:text-slate-400 focus:border-purple-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#9453d2] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#a161de] disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            {effectiveOnline ? <Sparkles className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
            Ask LA
          </button>
        </form>
      </motion.div>
    </div>
  );
};
