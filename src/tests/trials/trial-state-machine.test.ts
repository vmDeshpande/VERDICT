import { describe, expect, it } from 'vitest';
import { getTemplateTurns, getTrialTemplate } from '@/lib/trialTemplates';
import {
  canRaiseObjection,
  createInitialTrialState,
  startTrial,
  submitArgumentTurn,
} from '@/lib/trialStateMachine';
import type { TrialCaseType, TrialRole, TrialState } from '@/lib/trialTypes';

const expectedTurns: Record<TrialCaseType, TrialRole[]> = {
  Civil: [
    'PLAINTIFF',
    'DEFENDANT',
    'PLAINTIFF',
    'DEFENDANT',
    'PLAINTIFF',
    'DEFENDANT',
    'DEFENDANT',
    'PLAINTIFF',
  ],
  Criminal: [
    'PROSECUTION',
    'DEFENSE',
    'PROSECUTION',
    'DEFENSE',
    'PROSECUTION',
    'DEFENSE',
    'DEFENSE',
    'PROSECUTION',
  ],
};

function expectState(result: ReturnType<typeof startTrial | typeof submitArgumentTurn>): TrialState {
  if (!result.ok) throw new Error(`Unexpected transition error: ${result.error}`);
  return result.state;
}

describe('basic hearing template', () => {
  it.each(['Civil', 'Criminal'] as const)('defines the exact eight-turn %s order', (caseType) => {
    const turns = getTemplateTurns(getTrialTemplate(caseType));

    expect(turns).toHaveLength(8);
    expect(turns.map((turn) => turn.role)).toEqual(expectedTurns[caseType]);
    expect(turns.slice(6).map((turn) => turn.phaseKey)).toEqual(['CLOSING', 'CLOSING']);
  });
});

describe('trial state machine', () => {
  it.each(['Civil', 'Criminal'] as const)('stays unstarted until explicitly started for %s', (caseType) => {
    const initial = createInitialTrialState(caseType);

    expect(initial.status).toBe('NOT_STARTED');
    expect(initial.currentPhaseKey).toBeNull();
    expect(initial.currentTurnRole).toBeNull();
    expect(startTrial(initial)).toEqual({
      ok: true,
      state: {
        ...initial,
        status: 'IN_PROGRESS',
        currentPhaseKey: 'OPENING',
        currentTurnRole: getTrialTemplate(caseType).firstSideRole,
      },
    });
  });

  it.each(['Civil', 'Criminal'] as const)('advances all eight %s turns and completes only at the end', (caseType) => {
    let state = expectState(startTrial(createInitialTrialState(caseType)));

    for (const role of expectedTurns[caseType]) {
      const result = submitArgumentTurn(state, role);
      expect(result.ok).toBe(true);
      state = expectState(result);
    }

    expect(state.status).toBe('COMPLETED');
    expect(state.currentPhaseKey).toBeNull();
    expect(state.currentTurnRole).toBeNull();
  });

  it('rejects an out-of-turn argument without changing the state', () => {
    const state = expectState(startTrial(createInitialTrialState('Civil')));

    expect(submitArgumentTurn(state, 'DEFENDANT')).toEqual({ ok: false, error: 'NOT_YOUR_TURN' });
    expect(state.currentTurnRole).toBe('PLAINTIFF');
    expect(state.phaseTurnIndex).toBe(0);
  });

  it.each([
    ['OPENING', 'PLAINTIFF', false],
    ['FIRST_SIDE_ARGUMENT', 'PLAINTIFF', true],
    ['OPPOSING_SIDE_ARGUMENT', 'DEFENDANT', true],
    ['REBUTTAL', 'PLAINTIFF', true],
    ['CLOSING', 'DEFENDANT', false],
  ] as const)('objection eligibility in %s', (phaseKey, role, allowed) => {
    let state = expectState(startTrial(createInitialTrialState('Civil')));
    while (state.currentPhaseKey !== phaseKey || state.currentTurnRole !== role) {
      state = expectState(submitArgumentTurn(state, state.currentTurnRole!));
    }

    expect(canRaiseObjection(state, role)).toBe(allowed);
  });

  it('rejects arguments before start and after completion', () => {
    const initial = createInitialTrialState('Criminal');
    expect(submitArgumentTurn(initial, 'PROSECUTION')).toEqual({
      ok: false,
      error: 'TRIAL_NOT_IN_PROGRESS',
    });

    let state = expectState(startTrial(initial));
    for (const role of expectedTurns.Criminal) {
      state = expectState(submitArgumentTurn(state, role));
    }

    expect(submitArgumentTurn(state, 'PROSECUTION')).toEqual({
      ok: false,
      error: 'TRIAL_NOT_IN_PROGRESS',
    });
  });
});