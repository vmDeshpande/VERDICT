import type { TrialCaseType, TrialPhaseKey, TrialRole } from '@/lib/trialTypes';

export interface TrialPhaseDefinition {
  key: TrialPhaseKey;
  label: string;
  turns: readonly TrialRole[];
  allowsObjections: boolean;
}

export interface TrialTemplate {
  key: 'basic-hearing';
  version: 1;
  caseType: TrialCaseType;
  firstSideRole: TrialRole;
  opposingSideRole: TrialRole;
  phases: readonly TrialPhaseDefinition[];
}

function createTemplate(
  caseType: TrialCaseType,
  firstSideRole: TrialRole,
  opposingSideRole: TrialRole
): TrialTemplate {
  return {
    key: 'basic-hearing',
    version: 1,
    caseType,
    firstSideRole,
    opposingSideRole,
    phases: [
      {
        key: 'OPENING',
        label: 'Opening statements',
        turns: [firstSideRole, opposingSideRole],
        allowsObjections: false,
      },
      {
        key: 'FIRST_SIDE_ARGUMENT',
        label: 'First-side arguments',
        turns: [firstSideRole],
        allowsObjections: true,
      },
      {
        key: 'OPPOSING_SIDE_ARGUMENT',
        label: 'Opposing-side arguments',
        turns: [opposingSideRole],
        allowsObjections: true,
      },
      {
        key: 'REBUTTAL',
        label: 'Rebuttal',
        turns: [firstSideRole, opposingSideRole],
        allowsObjections: true,
      },
      {
        key: 'CLOSING',
        label: 'Closing statements',
        turns: [opposingSideRole, firstSideRole],
        allowsObjections: false,
      },
    ],
  };
}

export const TRIAL_TEMPLATES: Readonly<Record<TrialCaseType, TrialTemplate>> = {
  Civil: createTemplate('Civil', 'PLAINTIFF', 'DEFENDANT'),
  Criminal: createTemplate('Criminal', 'PROSECUTION', 'DEFENSE'),
};

export function getTrialTemplate(caseType: TrialCaseType): TrialTemplate {
  return TRIAL_TEMPLATES[caseType];
}

export function getTemplateTurns(template: TrialTemplate): Array<{
  phaseKey: TrialPhaseKey;
  role: TrialRole;
}> {
  return template.phases.flatMap((phase) =>
    phase.turns.map((role) => ({ phaseKey: phase.key, role }))
  );
}