'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, LoaderCircle, RotateCcw, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  MAX_ARGUMENT_CHARACTERS,
  MAX_OBJECTION_REASON_CHARACTERS,
  MAX_OBJECTION_RESPONSE_CHARACTERS,
  type TrialPhaseKey,
  type TrialRole,
  type TrialStatus,
} from '@/lib/trialTypes';
import { trialCommandSchema, type TrialCommand } from '@/lib/validations/trial';

type Participant = {
  id: string;
  role: string;
  user: { id: string; name: string };
};

type TrialSnapshot = {
  id: string;
  status: TrialStatus;
  currentPhaseKey: TrialPhaseKey | null;
  currentTurnRole: TrialRole | null;
  phaseTurnIndex: number;
  eventSequence: number;
  version: number;
  pendingObjection: {
    objectionEventId: string;
    targetEventId: string;
    objectorUserId: string;
    respondentUserId: string;
  } | null;
  myRole: TrialRole;
  myUserId: string;
  isHost: boolean;
  canStart: boolean;
};

type TrialEvent = {
  id: string;
  sequence: number;
  actorUserId: string;
  type: string;
  payload: Record<string, unknown>;
  occurredAt: string;
};

const PHASE_LABELS: Record<TrialPhaseKey, string> = {
  OPENING: 'Opening statements',
  FIRST_SIDE_ARGUMENT: 'First-side arguments',
  OPPOSING_SIDE_ARGUMENT: 'Opposing-side arguments',
  REBUTTAL: 'Rebuttal',
  CLOSING: 'Closing statements',
};

const ROLE_LABELS: Record<TrialRole, string> = {
  PLAINTIFF: 'Plaintiff',
  DEFENDANT: 'Defendant',
  PROSECUTION: 'Prosecution',
  DEFENSE: 'Defense',
};

const OBJECTION_LABELS = {
  OUT_OF_SCOPE: 'Outside the stated case scope',
  REPETITIVE: 'Repetitive submission',
  PERSONAL_ATTACK: 'Personal attack',
};

export function CourtroomTrialPanel({
  courtroomId,
  members,
}: {
  courtroomId: string;
  members: Participant[];
}) {
  const [trial, setTrial] = useState<TrialSnapshot | null>(null);
  const [events, setEvents] = useState<TrialEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState('');
  const [commandError, setCommandError] = useState('');
  const [sending, setSending] = useState(false);
  const [argumentText, setArgumentText] = useState('');
  const [objectionCategory, setObjectionCategory] = useState('OUT_OF_SCOPE');
  const [objectionReason, setObjectionReason] = useState('');
  const [objectionDecision, setObjectionDecision] = useState<'ACKNOWLEDGE' | 'DISPUTE'>('ACKNOWLEDGE');
  const [objectionResponse, setObjectionResponse] = useState('');
  const [pendingRetry, setPendingRetry] = useState(false);
  const [replayEvents, setReplayEvents] = useState<TrialEvent[] | null>(null);
  const [replayIndex, setReplayIndex] = useState(0);
  const eventCursor = useRef(0);
  const eventCache = useRef<TrialEvent[]>([]);
  const pendingCommand = useRef<TrialCommand | null>(null);
  const refreshRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    let active = true;
    let inFlight = false;

    async function refresh() {
      if (inFlight) return;
      inFlight = true;
      try {
        const trialResponse = await fetch(`/api/courtrooms/${encodeURIComponent(courtroomId)}/trial`, {
          cache: 'no-store',
        });
        const trialData = await trialResponse.json();
        if (!trialResponse.ok) throw new Error(trialData.message || 'Unable to load hearing state');

        const eventsResponse = await fetch(
          `/api/courtrooms/${encodeURIComponent(courtroomId)}/trial/events?afterSequence=${eventCursor.current}&limit=100`,
          { cache: 'no-store' }
        );
        const eventsData = await eventsResponse.json();
        if (!eventsResponse.ok) throw new Error(eventsData.message || 'Unable to load hearing events');
        if (!active) return;

        const eventMap = new Map(eventCache.current.map((event) => [event.sequence, event]));
        for (const event of eventsData.events as TrialEvent[]) eventMap.set(event.sequence, event);
        const nextEvents = [...eventMap.values()].sort((left, right) => left.sequence - right.sequence);
        eventCache.current = nextEvents;
        eventCursor.current = nextEvents.at(-1)?.sequence || 0;
        setEvents(nextEvents);
        setTrial(trialData.trial);
        setSyncError('');
      } catch (error) {
        if (active) setSyncError(error instanceof Error ? error.message : 'Connection interrupted');
      } finally {
        inFlight = false;
        if (active) setLoading(false);
      }
    }

    refreshRef.current = refresh;
    void refresh();
    const intervalId = window.setInterval(() => {
      if (!document.hidden) void refresh();
    }, 1_500);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [courtroomId]);

  async function dispatchCommand(command: TrialCommand) {
    setSending(true);
    setCommandError('');
    pendingCommand.current = command;
    setPendingRetry(true);
    try {
      const response = await fetch(`/api/courtrooms/${encodeURIComponent(courtroomId)}/trial/commands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command),
      });
      const data = await response.json();
      if (!response.ok) {
        setCommandError(data.message || data.error || 'The command was not accepted');
        if (response.status < 500) {
          pendingCommand.current = null;
          setPendingRetry(false);
        }
        if (response.status === 409) await refreshRef.current();
        return;
      }

      pendingCommand.current = null;
      setPendingRetry(false);
      setArgumentText('');
      setObjectionReason('');
      setObjectionResponse('');
      await refreshRef.current();
    } catch {
      setCommandError('Connection interrupted. Retry the same command to safely check its result.');
    } finally {
      setSending(false);
    }
  }

  function submitCommand(fields: Record<string, unknown>) {
    if (!trial || pendingCommand.current) return;
    const command = trialCommandSchema.parse({
      ...fields,
      commandId: crypto.randomUUID(),
      expectedVersion: trial.version,
    });
    void dispatchCommand(command);
  }

  async function startReplay() {
    setCommandError('');
    try {
      const response = await fetch(`/api/courtrooms/${encodeURIComponent(courtroomId)}/trial/replay`, {
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || 'Unable to load replay');
      setReplayEvents(data.events);
      setReplayIndex(0);
    } catch (error) {
      setCommandError(error instanceof Error ? error.message : 'Unable to load replay');
    }
  }

  const currentParticipant = trial
    ? members.find((member) => member.role === trial.currentTurnRole)
    : undefined;
  const latestArgument = [...events].reverse().find((event) => event.type === 'ARGUMENT_SUBMITTED');
  const latestArgumentWasObjectedTo = Boolean(
    latestArgument &&
      events.some(
        (event) =>
          event.type === 'OBJECTION_RAISED' &&
          event.payload.targetEventId === latestArgument.id
      )
  );
  const canRaiseObjection = Boolean(
    trial?.status === 'IN_PROGRESS' &&
      trial.currentTurnRole === trial.myRole &&
      ['FIRST_SIDE_ARGUMENT', 'OPPOSING_SIDE_ARGUMENT', 'REBUTTAL'].includes(trial.currentPhaseKey || '') &&
      latestArgument &&
      latestArgument.actorUserId !== trial.myUserId &&
      !latestArgumentWasObjectedTo &&
      !trial.pendingObjection
  );
  const pendingObjectionEvent = trial?.pendingObjection
    ? events.find((event) => event.id === trial.pendingObjection?.objectionEventId)
    : undefined;
  const visibleEvents = replayEvents ? replayEvents.slice(0, replayIndex) : events;
  const blocked = sending || pendingRetry;

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>Hearing</CardTitle>
            <CardDescription>Educational simulation. No AI judge or legal rulings are involved.</CardDescription>
          </div>
          {trial && <span className="rounded-sm border px-3 py-1.5 text-sm font-medium">{trial.status.replace('_', ' ')}</span>}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading && !trial ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <LoaderCircle className="size-4 animate-spin" />
            Loading hearing
          </div>
        ) : syncError && !trial ? (
          <p role="alert" className="text-sm text-destructive">{syncError}</p>
        ) : trial ? (
          <>
            {syncError && <p role="status" className="text-sm text-muted-foreground">Reconnecting: {syncError}</p>}

            {trial.status === 'NOT_STARTED' ? (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border p-4">
                <p className="text-sm text-muted-foreground">
                  The room is ready. The host can start the hearing when both sides are present.
                </p>
                {trial.canStart ? (
                  <Button type="button" disabled={blocked} onClick={() => submitCommand({ type: 'START_TRIAL' })}>
                    {sending ? <LoaderCircle className="animate-spin" /> : <Check />}
                    Start hearing
                  </Button>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {trial.isHost ? 'Waiting for the opposing participant' : 'Waiting for the host to start'}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border p-4">
                <div>
                  <p className="font-medium">
                    {trial.status === 'COMPLETED'
                      ? 'Hearing completed'
                      : PHASE_LABELS[trial.currentPhaseKey!]}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {trial.status === 'IN_PROGRESS' && currentParticipant
                      ? `${ROLE_LABELS[trial.currentTurnRole!]} to speak`
                      : `Your side: ${ROLE_LABELS[trial.myRole]}`}
                  </p>
                </div>
                {trial.status === 'COMPLETED' ? (
                  <Button type="button" variant="outline" onClick={startReplay}>
                    <RotateCcw aria-hidden="true" />
                    {replayEvents ? 'Restart replay' : 'Replay hearing'}
                  </Button>
                ) : trial.currentTurnRole === trial.myRole ? (
                  <span className="rounded-sm bg-secondary px-3 py-1.5 text-sm">Your turn</span>
                ) : null}
              </div>
            )}

            {trial.status === 'IN_PROGRESS' && trial.currentTurnRole === trial.myRole && !trial.pendingObjection && (
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitCommand({ type: 'SUBMIT_ARGUMENT', text: argumentText });
                }}
              >
                <Label htmlFor="trial-argument">Your written argument</Label>
                <textarea
                  id="trial-argument"
                  className="min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={argumentText}
                  maxLength={MAX_ARGUMENT_CHARACTERS}
                  onChange={(event) => setArgumentText(event.target.value)}
                  required
                  disabled={blocked}
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    {argumentText.length}/{MAX_ARGUMENT_CHARACTERS}
                  </span>
                  <Button type="submit" disabled={blocked || !argumentText.trim()}>
                    {sending ? <LoaderCircle className="animate-spin" /> : <Send aria-hidden="true" />}
                    Submit argument
                  </Button>
                </div>
              </form>
            )}

            {canRaiseObjection && latestArgument && (
              <form
                className="space-y-3 rounded-md border p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitCommand({
                    type: 'RAISE_OBJECTION',
                    targetEventId: latestArgument.id,
                    category: objectionCategory,
                    reason: objectionReason,
                  });
                }}
              >
                <div>
                  <h3 className="font-medium">Raise a practice objection</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Objections are participant-reported learning mechanics, not legal determinations.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="objection-category">Category</Label>
                  <select
                    id="objection-category"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={objectionCategory}
                    onChange={(event) => setObjectionCategory(event.target.value)}
                    disabled={blocked}
                  >
                    {Object.entries(OBJECTION_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="objection-reason">Reason</Label>
                  <textarea
                    id="objection-reason"
                    className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={objectionReason}
                    maxLength={MAX_OBJECTION_REASON_CHARACTERS}
                    onChange={(event) => setObjectionReason(event.target.value)}
                    required
                    disabled={blocked}
                  />
                </div>
                <Button type="submit" variant="outline" disabled={blocked || !objectionReason.trim()}>
                  Raise objection
                </Button>
              </form>
            )}

            {trial.pendingObjection && (
              <section className="space-y-3 rounded-md border p-4" aria-labelledby="pending-objection-title">
                <div>
                  <h3 id="pending-objection-title" className="font-medium">Practice objection awaiting response</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    This workflow records participant responses and does not determine legal validity.
                  </p>
                </div>
                <p className="text-sm">
                  {typeof pendingObjectionEvent?.payload.category === 'string'
                    ? OBJECTION_LABELS[pendingObjectionEvent.payload.category as keyof typeof OBJECTION_LABELS]
                    : 'Objection'}
                  {typeof pendingObjectionEvent?.payload.reason === 'string'
                    ? `: ${pendingObjectionEvent.payload.reason}`
                    : ''}
                </p>
                {trial.pendingObjection.respondentUserId === trial.myUserId ? (
                  <form
                    className="space-y-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      submitCommand({
                        type: 'RESPOND_TO_OBJECTION',
                        objectionEventId: trial.pendingObjection!.objectionEventId,
                        decision: objectionDecision,
                        response: objectionResponse,
                      });
                    }}
                  >
                    <div className="space-y-2">
                      <Label htmlFor="objection-decision">Your response</Label>
                      <select
                        id="objection-decision"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={objectionDecision}
                        onChange={(event) => setObjectionDecision(event.target.value as 'ACKNOWLEDGE' | 'DISPUTE')}
                        disabled={blocked}
                      >
                        <option value="ACKNOWLEDGE">Acknowledge the objection</option>
                        <option value="DISPUTE">Dispute the objection</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="objection-response">Response note</Label>
                      <textarea
                        id="objection-response"
                        className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={objectionResponse}
                        maxLength={MAX_OBJECTION_RESPONSE_CHARACTERS}
                        onChange={(event) => setObjectionResponse(event.target.value)}
                        required
                        disabled={blocked}
                      />
                    </div>
                    <Button type="submit" disabled={blocked || !objectionResponse.trim()}>
                      Record response
                    </Button>
                  </form>
                ) : (
                  <p className="text-sm text-muted-foreground">Waiting for the targeted participant to respond.</p>
                )}
              </section>
            )}

            {pendingRetry && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-500/40 p-3">
                <p className="text-sm">The connection interrupted before confirmation. Retry the same command safely.</p>
                <Button
                  type="button"
                  variant="outline"
                  disabled={sending}
                  onClick={() => pendingCommand.current && void dispatchCommand(pendingCommand.current)}
                >
                  {sending ? <LoaderCircle className="animate-spin" /> : <RotateCcw aria-hidden="true" />}
                  Retry command
                </Button>
              </div>
            )}

            {commandError && <p className="text-sm text-destructive" role="alert">{commandError}</p>}

            {replayEvents && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-y py-3">
                <p className="text-sm text-muted-foreground">
                  Replay event {replayIndex} of {replayEvents.length}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Previous replay event"
                    title="Previous replay event"
                    onClick={() => setReplayIndex((index) => Math.max(0, index - 1))}
                    disabled={replayIndex === 0}
                  >
                    <ChevronLeft aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Next replay event"
                    title="Next replay event"
                    onClick={() => setReplayIndex((index) => Math.min(replayEvents.length, index + 1))}
                    disabled={replayIndex === replayEvents.length}
                  >
                    <ChevronRight aria-hidden="true" />
                  </Button>
                </div>
              </div>
            )}

            <section aria-labelledby="trial-transcript-title">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 id="trial-transcript-title" className="font-medium">Hearing transcript</h3>
                  <p className="text-xs text-muted-foreground">Accepted events are permanent and displayed in sequence order.</p>
                </div>
                <span className="text-xs text-muted-foreground">{trial.eventSequence} events</span>
              </div>
              {visibleEvents.length === 0 ? (
                <p className="rounded-md border p-4 text-sm text-muted-foreground">
                  {replayEvents ? 'Advance the replay to view the hearing.' : 'The transcript will appear here when the hearing begins.'}
                </p>
              ) : (
                <ol className="space-y-3">
                  {visibleEvents.map((event) => (
                    <TranscriptEntry key={event.id} event={event} members={members} />
                  ))}
                </ol>
              )}
            </section>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function TranscriptEntry({ event, members }: { event: TrialEvent; members: Participant[] }) {
  const participant = members.find((member) => member.user.id === event.actorUserId);
  const payload = event.payload;
  const speakerRole = typeof payload.speakerRole === 'string' ? payload.speakerRole as TrialRole : participant?.role;
  const phaseKey = typeof payload.phaseKey === 'string' ? payload.phaseKey as TrialPhaseKey : null;

  return (
    <li className="rounded-md border p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-medium">#{event.sequence} {event.type.replaceAll('_', ' ').toLowerCase()}</span>
          <span className="ml-2 text-sm text-muted-foreground">
            {participant?.user.name || 'Participant'}
            {speakerRole && ` · ${ROLE_LABELS[speakerRole as TrialRole] || speakerRole}`}
          </span>
        </div>
        <time className="text-xs text-muted-foreground" dateTime={event.occurredAt}>
          {new Date(event.occurredAt).toLocaleString()}
        </time>
      </div>
      {phaseKey && <p className="mb-2 text-xs text-muted-foreground">Phase: {PHASE_LABELS[phaseKey]}</p>}
      {event.type === 'ARGUMENT_SUBMITTED' && typeof payload.text === 'string' && (
        <p className="whitespace-pre-wrap text-sm leading-6">{payload.text}</p>
      )}
      {event.type === 'OBJECTION_RAISED' && (
        <p className="text-sm text-muted-foreground">
          {typeof payload.category === 'string'
            ? OBJECTION_LABELS[payload.category as keyof typeof OBJECTION_LABELS]
            : 'Practice objection'}
          {typeof payload.reason === 'string' ? `: ${payload.reason}` : ''}
        </p>
      )}
      {event.type === 'OBJECTION_RESPONSE_RECORDED' && typeof payload.response === 'string' && (
        <p className="text-sm">Response recorded: {payload.response}</p>
      )}
      {event.type === 'OBJECTION_DISPOSITION_RECORDED' && typeof payload.disposition === 'string' && (
        <p className="text-sm text-muted-foreground">
          Participant disposition: {payload.disposition.replaceAll('_', ' ').toLowerCase()}. Not a legal ruling.
        </p>
      )}
      {event.type === 'TRIAL_STARTED' && (
        <p className="text-sm text-muted-foreground">The host started the educational hearing.</p>
      )}
    </li>
  );
}