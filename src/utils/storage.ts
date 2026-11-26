import {GRADE_11_SECTIONS, INITIAL_CLASSROOM_STATE} from '../data/mathCurriculum';
import {type ClassroomState} from '../types/math';

const DB_NAME = 'MathBridgeOfflineDB';
const STORE_NAME = 'classroom';
const STATE_KEY = 'primary_state_v1';
const LS_BACKUP_KEY = 'mathbridge_offline_state_v1';
const LS_SYNC_META_KEY = 'leavien_sync_meta_v1';

export interface SyncMeta {
  pendingSync: boolean;
  lastSyncedAt: string | null;
}

export function getSyncMeta(): SyncMeta {
  try {
    const raw = localStorage.getItem(LS_SYNC_META_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SyncMeta>;
      return {
        pendingSync: Boolean(parsed.pendingSync),
        lastSyncedAt: typeof parsed.lastSyncedAt === 'string' ? parsed.lastSyncedAt : null,
      };
    }
  } catch {
    // Ignore storage access errors
  }
  return {pendingSync: false, lastSyncedAt: null};
}

export function setSyncMeta(meta: SyncMeta): void {
  try {
    localStorage.setItem(LS_SYNC_META_KEY, JSON.stringify(meta));
  } catch {
    // Ignore storage quota errors
  }
}

export function normalizeClassroomState(loaded: ClassroomState): ClassroomState {
  const sectionSet = new Set<string>(
    Array.isArray(loaded.teacherSections) && loaded.teacherSections.length > 0
      ? loaded.teacherSections
      : [...GRADE_11_SECTIONS],
  );
  loaded.students.forEach((s) => {
    if (s.gradeSection) sectionSet.add(s.gradeSection);
  });

  return {
    ...loaded,
    teacherSections: Array.from(sectionSet),
    assignedActivities: Array.isArray(loaded.assignedActivities)
      ? loaded.assignedActivities
      : INITIAL_CLASSROOM_STATE.assignedActivities,
    updatedAt:
      typeof loaded.updatedAt === 'string' && loaded.updatedAt
        ? loaded.updatedAt
        : new Date().toISOString(),
    students: loaded.students.map((s) => ({
      ...s,
      xp: typeof s.xp === 'number' ? s.xp : 0,
      streak: typeof s.streak === 'number' ? s.streak : 0,
      bestStreak: typeof s.bestStreak === 'number' ? s.bestStreak : 0,
      completedActivityIds: Array.isArray(s.completedActivityIds) ? s.completedActivityIds : [],
    })),
  };
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
  });
}

export async function loadClassroomState(): Promise<ClassroomState> {
  try {
    const db = await openDB();
    const loaded = await new Promise<ClassroomState | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(STATE_KEY);
      req.onsuccess = () => resolve(req.result as ClassroomState | undefined);
      req.onerror = () => reject(req.error);
    });
    if (loaded && Array.isArray(loaded.students) && loaded.welcomeNote) {
      return normalizeClassroomState(loaded);
    }
  } catch {
    // Fallback to localStorage below
  }

  try {
    const raw = localStorage.getItem(LS_BACKUP_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ClassroomState;
      if (parsed && Array.isArray(parsed.students) && parsed.welcomeNote) {
        return normalizeClassroomState(parsed);
      }
    }
  } catch {
    // Use initial seeded state
  }

  return INITIAL_CLASSROOM_STATE;
}

export async function saveClassroomState(state: ClassroomState): Promise<void> {
  try {
    localStorage.setItem(LS_BACKUP_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota issues
  }

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(state, STATE_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // localStorage backup already saved
  }
}

export async function fetchServerClassroomState(): Promise<ClassroomState | null> {
  try {
    const res = await fetch('/api/classroom/state');
    if (!res.ok) return null;
    const data = (await res.json()) as {state?: ClassroomState | null};
    if (data.state && Array.isArray(data.state.students) && data.state.welcomeNote) {
      return normalizeClassroomState(data.state);
    }
    return null;
  } catch {
    return null;
  }
}

export async function syncClassroomWithServer(
  localState: ClassroomState,
): Promise<{state: ClassroomState; syncedAt: string}> {
  const res = await fetch('/api/classroom/sync', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({state: localState}),
  });
  if (!res.ok) {
    throw new Error('Sync request failed');
  }
  const data = (await res.json()) as {state: ClassroomState; syncedAt: string};
  const normalized = normalizeClassroomState(data.state);
  await saveClassroomState(normalized);
  setSyncMeta({pendingSync: false, lastSyncedAt: data.syncedAt});
  return {state: normalized, syncedAt: data.syncedAt};
}

export function exportClassroomPacket(state: ClassroomState): string {
  return JSON.stringify(
    {
      format: 'mathbridge-offline-packet-v1',
      exportedAt: new Date().toISOString(),
      payload: state,
    },
    null,
    2,
  );
}

export function parseClassroomPacket(rawJson: string): ClassroomState {
  const parsed = JSON.parse(rawJson) as {format?: string; payload?: ClassroomState};
  const candidate = parsed?.payload ?? (parsed as unknown as ClassroomState);
  if (
    !candidate ||
    !candidate.welcomeNote ||
    !candidate.teacher ||
    !Array.isArray(candidate.students)
  ) {
    throw new Error('Invalid LEAVIEN AI classroom packet format.');
  }
  return normalizeClassroomState(candidate);
}
