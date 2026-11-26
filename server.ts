import dotenv from 'dotenv';
import express, {type Request, type Response} from 'express';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {GoogleGenAI, Type} from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;
const MODEL_NAME = 'gemini-4-hydrogen';
const DATA_DIR = path.resolve(__dirname, '.leavien-data');
const STATE_FILE = path.join(DATA_DIR, 'classroom-state.json');

interface PersistedStudent {
  id: string;
  xp?: number;
  diagnostic?: {completedAt?: string} | null;
  completedActivityIds?: string[];
  [key: string]: unknown;
}

interface PersistedClassroomState {
  welcomeNote?: {updatedAt?: string; [key: string]: unknown};
  teacher?: Record<string, unknown>;
  teacherSections?: string[];
  students?: PersistedStudent[];
  assignedActivities?: Array<{id: string; [key: string]: unknown}>;
  tutorCache?: Record<string, unknown>;
  updatedAt?: string;
}

function readPersistedState(): PersistedClassroomState | null {
  try {
    if (!fs.existsSync(STATE_FILE)) return null;
    const raw = fs.readFileSync(STATE_FILE, 'utf8');
    return JSON.parse(raw) as PersistedClassroomState;
  } catch {
    return null;
  }
}

function writePersistedState(state: PersistedClassroomState): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, {recursive: true});
  }
  const tmpFile = `${STATE_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tmpFile, STATE_FILE);
}

function mergeClassroomStates(
  serverState: PersistedClassroomState | null,
  clientState: PersistedClassroomState,
): PersistedClassroomState {
  if (!serverState) {
    return {
      ...clientState,
      updatedAt: clientState.updatedAt || new Date().toISOString(),
    };
  }

  const serverTime = Date.parse(serverState.updatedAt ?? '') || 0;
  const clientTime = Date.parse(clientState.updatedAt ?? '') || 0;
  const clientIsNewer = clientTime >= serverTime;

  const studentMap = new Map<string, PersistedStudent>();
  for (const s of serverState.students ?? []) {
    studentMap.set(s.id, s);
  }
  for (const s of clientState.students ?? []) {
    const existing = studentMap.get(s.id);
    if (!existing) {
      studentMap.set(s.id, s);
    } else {
      const mergedCompleted = Array.from(
        new Set([...(existing.completedActivityIds ?? []), ...(s.completedActivityIds ?? [])]),
      );
      const pickClient =
        clientIsNewer ||
        (s.xp ?? 0) >= (existing.xp ?? 0) ||
        Boolean(s.diagnostic && !existing.diagnostic);
      studentMap.set(s.id, {
        ...(pickClient ? existing : s),
        ...(pickClient ? s : existing),
        completedActivityIds: mergedCompleted,
      });
    }
  }

  const activityMap = new Map<string, {id: string; [key: string]: unknown}>();
  for (const act of serverState.assignedActivities ?? []) {
    activityMap.set(act.id, act);
  }
  for (const act of clientState.assignedActivities ?? []) {
    activityMap.set(act.id, act);
  }

  const mergedSections = Array.from(
    new Set([...(serverState.teacherSections ?? []), ...(clientState.teacherSections ?? [])]),
  );

  return {
    ...(clientIsNewer ? serverState : clientState),
    ...(clientIsNewer ? clientState : serverState),
    teacherSections: mergedSections,
    students: Array.from(studentMap.values()),
    assignedActivities: Array.from(activityMap.values()),
    tutorCache: {
      ...(serverState.tutorCache ?? {}),
      ...(clientState.tutorCache ?? {}),
    },
    updatedAt: new Date().toISOString(),
  };
}

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function handleAiError(res: Response, err: unknown): void {
  const message = err instanceof Error ? err.message : 'Unknown AI service error';
  const statusMatch = /\b(400|401|403|404|429|500|503)\b/.exec(message);
  const statusCode = statusMatch ? Number(statusMatch[1]) : 500;
  res.status(statusCode).json({
    error: message,
  });
}

async function createServer(): Promise<void> {
  const app = express();
  app.use(express.json({limit: '1mb'}));

  app.get('/api/health', (_req: Request, res: Response) => {
    const apiKey = process.env.GEMINI_API_KEY;
    res.json({
      ok: true,
      aiConfigured: Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY'),
      model: MODEL_NAME,
    });
  });

  app.get('/api/classroom/state', (_req: Request, res: Response) => {
    const state = readPersistedState();
    res.json({
      ok: true,
      state,
      serverUpdatedAt: state?.updatedAt ?? null,
    });
  });

  app.post('/api/classroom/sync', (req: Request, res: Response) => {
    try {
      const {state} = req.body as {state?: PersistedClassroomState};
      if (!state || !Array.isArray(state.students) || !state.welcomeNote || !state.teacher) {
        res.status(400).json({error: 'Invalid classroom state payload.'});
        return;
      }
      const existing = readPersistedState();
      const merged = mergeClassroomStates(existing, state);
      writePersistedState(merged);
      res.json({
        ok: true,
        state: merged,
        syncedAt: merged.updatedAt,
      });
    } catch (err) {
      handleAiError(res, err);
    }
  });

  app.post('/api/ai/tutor', async (req: Request, res: Response) => {
    try {
      const ai = getAiClient();
      if (!ai) {
        res.status(503).json({
          error: 'GEMINI_API_KEY is not configured in Settings > Secrets.',
        });
        return;
      }

      const {
        strandTitle,
        proficiencyLevel,
        track,
        problemPrompt,
        studentQuestion,
        mode,
      } = req.body as {
        strandTitle?: string;
        proficiencyLevel?: string;
        track?: string;
        problemPrompt?: string;
        studentQuestion?: string;
        mode?: string;
      };

      if (!problemPrompt) {
        res.status(400).json({error: 'Missing problemPrompt in request body.'});
        return;
      }

      const prompt = [
        `Subject: General Mathematics — ${strandTitle ?? 'Core Concepts'}`,
        `Student Proficiency Level: ${proficiencyLevel ?? 'Developing'}`,
        `Assigned Track: ${track ?? 'Remediation'}`,
        `Tutor Mode: ${mode ?? 'hint'}`,
        `Problem: ${problemPrompt}`,
        studentQuestion ? `Student Note/Question: ${studentQuestion}` : 'Student requested guided support.',
        '',
        'Provide clear, encouraging, mathematically accurate General Mathematics guidance tailored to this proficiency level.',
        'If mode is "hint", give a gentle conceptual nudge without giving away the final numeric answer.',
        'If mode is "step-by-step", break down the solution into clean numbered algebraic/logical steps.',
        'If mode is "challenge", explain a deeper connection or extension.',
      ].join('\n');

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          systemInstruction:
            'You are LA, a warm, encouraging, mathematically rigorous Grade 11 General Mathematics & foundational math chatbot. Answer immediately with clear explanations and step-by-step math notation.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              guidance: {type: Type.STRING},
              steps: {
                type: Type.ARRAY,
                items: {type: Type.STRING},
              },
              keyRule: {type: Type.STRING},
              checkQuestion: {type: Type.STRING},
            },
          },
        },
      });

      const raw = (response.text ?? '{}').trim();
      const parsed = JSON.parse(raw);
      res.json(parsed);
    } catch (err) {
      handleAiError(res, err);
    }
  });

  app.post('/api/ai/explain-mistake', async (req: Request, res: Response) => {
    try {
      const ai = getAiClient();
      if (!ai) {
        res.status(503).json({
          error: 'GEMINI_API_KEY is not configured in Settings > Secrets.',
        });
        return;
      }

      const {strandTitle, problemPrompt, chosenChoice, correctChoice, steps} = req.body as {
        strandTitle?: string;
        problemPrompt?: string;
        chosenChoice?: string;
        correctChoice?: string;
        steps?: string[];
      };

      if (!problemPrompt || !chosenChoice || !correctChoice) {
        res.status(400).json({error: 'Missing problemPrompt, chosenChoice, or correctChoice.'});
        return;
      }

      const prompt = [
        `You are LA, a friendly General Mathematics tutor.`,
        `Strand: ${strandTitle ?? 'General Mathematics'}`,
        `Problem: ${problemPrompt}`,
        `Student selected the WRONG answer: "${chosenChoice}"`,
        `Correct answer: "${correctChoice}"`,
        steps && steps.length > 0 ? `Solution steps: ${steps.join(' | ')}` : '',
        'Explain kindly and specifically WHY the student’s chosen answer is wrong (identifying the likely misconception or arithmetic/sign mistake) and how to arrive at the correct answer.',
      ]
        .filter(Boolean)
        .join('\n');

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          systemInstruction:
            'You are LA, a supportive Grade 11 General Mathematics tutor. Keep mistake explanations concise, specific to the wrong choice picked, and crystal clear.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              whyWrong: {type: Type.STRING},
              keyCorrection: {type: Type.STRING},
              encouragement: {type: Type.STRING},
            },
          },
        },
      });

      const raw = (response.text ?? '{}').trim();
      const parsed = JSON.parse(raw);
      res.json(parsed);
    } catch (err) {
      handleAiError(res, err);
    }
  });

  app.post('/api/ai/practice', async (req: Request, res: Response) => {
    try {
      const ai = getAiClient();
      if (!ai) {
        res.status(503).json({
          error: 'GEMINI_API_KEY is not configured in Settings > Secrets.',
        });
        return;
      }

      const {strandId, strandTitle, track, proficiencyLevel} = req.body as {
        strandId?: string;
        strandTitle?: string;
        track?: 'remediation' | 'advancement';
        proficiencyLevel?: string;
      };

      const prompt = [
        `Create 1 original General Mathematics multiple-choice practice question.`,
        `Strand: ${strandTitle ?? strandId ?? 'Functions & Rational Equations'}`,
        `Track: ${track === 'advancement' ? 'Advancement / Enrichment (multi-step reasoning)' : 'Remediation (clear foundational practice)'}`,
        `Student Proficiency: ${proficiencyLevel ?? 'Developing'}`,
        `Provide exactly 4 distinct answer choices, the 0-based correctIndex (0-3), a short hint, 3-4 step-by-step solution lines, and a 1-sentence conceptTip.`,
        `Double-check all arithmetic so the correctIndex matches the exact right choice.`,
      ].join('\n');

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          systemInstruction:
            'You are a General Mathematics curriculum author. Every mathematical calculation must be 100% verified and unambiguous.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              prompt: {type: Type.STRING},
              choices: {
                type: Type.ARRAY,
                items: {type: Type.STRING},
              },
              correctIndex: {type: Type.INTEGER},
              hint: {type: Type.STRING},
              steps: {
                type: Type.ARRAY,
                items: {type: Type.STRING},
              },
              conceptTip: {type: Type.STRING},
            },
          },
        },
      });

      const raw = (response.text ?? '{}').trim();
      const parsed = JSON.parse(raw);
      res.json(parsed);
    } catch (err) {
      handleAiError(res, err);
    }
  });

  app.post('/api/ai/teacher-plan', async (req: Request, res: Response) => {
    try {
      const ai = getAiClient();
      if (!ai) {
        res.status(503).json({
          error: 'GEMINI_API_KEY is not configured in Settings > Secrets.',
        });
        return;
      }

      const {strandTitle, remediationCount, advancementCount, averageScore} = req.body as {
        strandTitle?: string;
        remediationCount?: number;
        advancementCount?: number;
        averageScore?: number;
      };

      const prompt = [
        `Generate a focused General Mathematics classroom action plan for a teacher.`,
        `Topic Strand: ${strandTitle ?? 'General Mathematics'}`,
        `Students needing remediation in this strand: ${remediationCount ?? 0}`,
        `Students ready for advancement in this strand: ${advancementCount ?? 0}`,
        `Class average mastery in this strand: ${averageScore ?? 0}%`,
        `Provide an executive summary, 3 concrete remediation activities (works offline with paper/manipulatives too), 2 advancement extensions, and 1 quick exit-ticket check question.`,
      ].join('\n');

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          systemInstruction:
            'You are an experienced General Mathematics instructional coach helping teachers differentiate instruction for both remediation and advanced learners.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: {type: Type.STRING},
              remediationActivities: {
                type: Type.ARRAY,
                items: {type: Type.STRING},
              },
              advancementExtensions: {
                type: Type.ARRAY,
                items: {type: Type.STRING},
              },
              exitTicket: {type: Type.STRING},
            },
          },
        },
      });

      const raw = (response.text ?? '{}').trim();
      const parsed = JSON.parse(raw);
      res.json(parsed);
    } catch (err) {
      handleAiError(res, err);
    }
  });

  app.post('/api/ai/generate-activities', async (req: Request, res: Response) => {
    try {
      const ai = getAiClient();
      if (!ai) {
        res.status(503).json({
          error: 'GEMINI_API_KEY is not configured in Settings > Secrets.',
        });
        return;
      }

      const {strandId, strandTitle, track, targetSection} = req.body as {
        strandId?: string;
        strandTitle?: string;
        track?: 'remediation' | 'advancement';
        targetSection?: string;
      };

      const isAdv = track === 'advancement';
      const prompt = [
        `Generate a Grade 11 General Mathematics ${isAdv ? 'Advancement Enrichment' : 'Guided Remediation'} activity pack for section "${targetSection ?? 'ALL'}".`,
        `Strand: ${strandTitle ?? strandId ?? 'Functions & Rational Equations'}`,
        `Create a concise title, short student instructions, and exactly 3 multiple-choice math problems.`,
        `Format ALL math equations cleanly using inline LaTeX ($...$), e.g. $f(x) = \\frac{2x + 1}{x - 4}$, $2^{x + 1} = 32$, $\\log_{2}(16)$, $F = P\\left(1 + \\frac{r}{n}\\right)^{nt}$, $p \\rightarrow q$.`,
        `Each problem must have 4 distinct choices, 0-based correctIndex (0-3), a hint, 3 clear step-by-step solution lines, and a conceptTip.`,
      ].join('\n');

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          systemInstruction:
            'You are an expert Grade 11 General Mathematics curriculum designer. Always double-check arithmetic and format all equations in valid LaTeX enclosed in $...$.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: {type: Type.STRING},
              instructions: {type: Type.STRING},
              problems: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    prompt: {type: Type.STRING},
                    choices: {
                      type: Type.ARRAY,
                      items: {type: Type.STRING},
                    },
                    correctIndex: {type: Type.INTEGER},
                    hint: {type: Type.STRING},
                    steps: {
                      type: Type.ARRAY,
                      items: {type: Type.STRING},
                    },
                    conceptTip: {type: Type.STRING},
                  },
                },
              },
            },
          },
        },
      });

      const raw = (response.text ?? '{}').trim();
      const parsed = JSON.parse(raw);
      res.json(parsed);
    } catch (err) {
      handleAiError(res, err);
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const {createServer: createViteServer} = await import('vite');
    const vite = await createViteServer({
      server: {middlewareMode: true},
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MathBridge server listening on http://localhost:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
