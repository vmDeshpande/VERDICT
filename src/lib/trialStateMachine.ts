import type {
  TrialCaseType,
  TrialEventType,
  TrialPhaseKey,
  TrialRole,
  TrialState,
} from '@/lib/trialTypes';
import { getTrialTemplate } from '@/lib/trialTemplates';

export type TrialTransitionError =
  | 'TRIAL_ALREADY_STARTED'
  | 'TRIAL_NOT_IN_PROGRESS'
  | 'INVALID_TRIAL_STATE'
  | 'NOT_YOUR_TURN';

export type TrialTransitionResult =
  | { ok: true; state: TrialState }
  | { ok: false; error: TrialTransitionError };

export function createInitialTrialState(caseTypeSnapshot: TrialCaseType): TrialState {
  return {
    caseTypeSnapshot,
    status: 'NOT_STARTED',
    currentPhaseKey: null,
    currentTurnRole: null,
    phaseTurnIndex: 0,
  };
}

export function startTrial(state: TrialState): TrialTransitionResult {
  if (state.status !== 'NOT_STARTED') {
    return { ok: false, error: 'TRIAL_ALREADY_STARTED' };
  }

  const firstPhase = getTrialTemplate(state.caseTypeSnapshot).phases[0];
  return {
    ok: true,
    state: {
      ...state,
      status: 'IN_PROGRESS',
      currentPhaseKey: firstPhase.key,
      currentTurnRole: firstPhase.turns[0],
      phaseTurnIndex: 0,
    },
  };
}

export function submitArgumentTurn(state: TrialState, actorRole: TrialRole): TrialTransitionResult {
  if (state.status !== 'IN_PROGRESS') {
    return { ok: false, error: 'TRIAL_NOT_IN_PROGRESS' };
  }

  const phases = getTrialTemplate(state.caseTypeSnapshot).phases;
  const phaseIndex = phases.findIndex((phase) => phase.key === state.currentPhaseKey);
  const phase = phases[phaseIndex];
  if (
    !phase ||
    phase.turns[state.phaseTurnIndex] !== state.currentTurnRole ||
    state.currentTurnRole === null
  ) {
    return { ok: false, error: 'INVALID_TRIAL_STATE' };
  }

  if (actorRole !== state.currentTurnRole) {
    return { ok: false, error: 'NOT_YOUR_TURN' };
  }

  const nextTurnIndex = state.phaseTurnIndex + 1;
  if (nextTurnIndex < phase.turns.length) {
    return {
      ok: true,
      state: {
        ...state,
        phaseTurnIndex: nextTurnIndex,
        currentTurnRole: phase.turns[nextTurnIndex],
      },
    };
  }

  const nextPhase = phases[phaseIndex + 1];
  if (!nextPhase) {
    return {
      ok: true,
      state: {
        ...state,
        status: 'COMPLETED',
        currentPhaseKey: null,
        currentTurnRole: null,
        phaseTurnIndex: 0,
      },
    };
  }

  return {
    ok: true,
    state: {
      ...state,
      currentPhaseKey: nextPhase.key,
      currentTurnRole: nextPhase.turns[0],
      phaseTurnIndex: 0,
    },
  };
}

export function canRaiseObjection(state: TrialState, actorRole: TrialRole): boolean {
  if (
    state.status !== 'IN_PROGRESS' ||
    actorRole !== state.currentTurnRole ||
    state.currentPhaseKey === null
  ) {
    return false;
  }

  const phase = getTrialTemplate(state.caseTypeSnapshot).phases.find(
    (candidate) => candidate.key === state.currentPhaseKey
  );
  return phase?.allowsObjections === true;
}

export interface ReplayTrialEvent {
  sequence: number;
  type: TrialEventType;
  payload: Record<string, unknown>;
}

export function replayTrialEvents(caseType: TrialCaseType, events: ReplayTrialEvent[]): TrialState {
  let state = createInitialTrialState(caseType);
  let previousSequence = 0;

  for (const event of events) {
    if (event.sequence !== previousSequence + 1) {
      throw new Error('Trial event sequence is not contiguous.');
    }

    if (event.type === 'TRIAL_STARTED') {
      const started = startTrial(state);
      if (!started.ok) throw new Error('Trial start event is invalid for the current state.');
      state = started.state;
    } else if (event.type === 'ARGUMENT_SUBMITTED') {
      if (
        event.payload.phaseKey !== state.currentPhaseKey ||
        event.payload.speakerRole !== state.currentTurnRole ||
        state.currentTurnRole === null
      ) {
        throw new Error('Argument event does not match the current phase and turn.');
      }

      const advanced = submitArgumentTurn(state, state.currentTurnRole);
      if (!advanced.ok) throw new Error('Argument event is invalid for the current state.');
      state = advanced.state;
    }

    previousSequence = event.sequence;
  }

  return state;
}

export function isTrialPhaseKey(value: string): value is TrialPhaseKey {
  return getTrialTemplate('Civil').phases.some((phase) => phase.key === value);
}