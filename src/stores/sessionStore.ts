import { create } from 'zustand';
import type { Session } from '../types';

interface SessionState {
  activeSession: Session | null;
  activeProjectId: number | null;
  elapsedSeconds: number;
  intervalId: ReturnType<typeof setInterval> | null;

  setActiveSession: (session: Session, projectId: number) => void;
  clearSession: () => void;
  tick: () => void;
  startTicking: () => void;
  stopTicking: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  activeSession: null,
  activeProjectId: null,
  elapsedSeconds: 0,
  intervalId: null,

  setActiveSession: (session, projectId) => {
    set({ activeSession: session, activeProjectId: projectId, elapsedSeconds: 0 });
    get().startTicking();
  },

  clearSession: () => {
    get().stopTicking();
    set({ activeSession: null, activeProjectId: null, elapsedSeconds: 0 });
  },

  tick: () => set((state) => ({ elapsedSeconds: state.elapsedSeconds + 1 })),

  startTicking: () => {
    const existing = get().intervalId;
    if (existing) clearInterval(existing);
    const id = setInterval(() => get().tick(), 1000);
    set({ intervalId: id });
  },

  stopTicking: () => {
    const id = get().intervalId;
    if (id) clearInterval(id);
    set({ intervalId: null });
  },
}));
