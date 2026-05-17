import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ALL_PERSONALITY_IDS,
  clearSimulationData,
  createReplay,
  exportRunJson,
  getAnalytics,
  getConversationsForRun,
  listRuns,
  runSimulationBatch,
  type AnalyticsSnapshot,
  type BatchProgress,
  type SimulatedConversation,
  type SimulationRun,
  DEFAULT_SIM_CONFIG,
} from '@/simulation'
import { PERSONALITY_TEMPLATES } from '@/simulation/config/personalityTemplates'

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100)
  return (
    <div className="mb-2">
      <div className="mb-1 flex justify-between text-xs text-nozomi-muted">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-nozomi-surface">
        <div
          className="h-full rounded-full bg-gradient-to-r from-nozomi-purple to-nozomi-cyan"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function Panel({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-nozomi-border/40 bg-nozomi-surface/50 p-4 backdrop-blur">
      <h2 className="mb-3 font-display text-sm font-semibold tracking-wider text-nozomi-cyan">
        {title}
      </h2>
      {children}
    </section>
  )
}

export function SimulationDashboardPage() {
  const [runs, setRuns] = useState<SimulationRun[]>([])
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsSnapshot | null>(null)
  const [conversations, setConversations] = useState<SimulatedConversation[]>([])
  const [progress, setProgress] = useState<BatchProgress | null>(null)
  const [running, setRunning] = useState(false)
  const [count, setCount] = useState(20)
  const [replayTurn, setReplayTurn] = useState(0)
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null)

  const refreshRuns = useCallback(async () => {
    const list = await listRuns(30)
    setRuns(list)
    if (!selectedRunId && list[0]) setSelectedRunId(list[0].id)
  }, [selectedRunId])

  useEffect(() => {
    void refreshRuns()
  }, [refreshRuns])

  useEffect(() => {
    if (!selectedRunId) return
    void (async () => {
      const [a, c] = await Promise.all([
        getAnalytics(selectedRunId),
        getConversationsForRun(selectedRunId),
      ])
      setAnalytics(a ?? null)
      setConversations(c)
    })()
  }, [selectedRunId])

  const startBatch = async () => {
    setRunning(true)
    setProgress(null)
    try {
      const run = await runSimulationBatch(
        {
          ...DEFAULT_SIM_CONFIG,
          conversationCount: count,
          personalities: ALL_PERSONALITY_IDS.slice(0, 6),
        },
        setProgress,
      )
      setSelectedRunId(run.id)
      await refreshRuns()
    } finally {
      setRunning(false)
    }
  }

  const handleExport = async () => {
    if (!selectedRunId) return
    const json = await exportRunJson(selectedRunId)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nozomi-sim-${selectedRunId}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const startReplay = async (convId: string) => {
    setSelectedConvId(convId)
    setReplayTurn(0)
    const replay = await createReplay(convId)
    replay.seek(0)
    const interval = setInterval(() => {
      const t = replay.step()
      if (!t) {
        clearInterval(interval)
        return
      }
      setReplayTurn(replay.state.currentTurn)
    }, 600)
  }

  const selectedConv = conversations.find((c) => c.id === selectedConvId)

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-nozomi-border/30 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <Link
              to="/"
              className="text-xs text-nozomi-muted hover:text-nozomi-cyan"
            >
              ← Home
            </Link>
            <h1 className="font-display text-lg font-semibold text-nozomi-text">
              Simulation Lab
            </h1>
            <p className="text-xs text-nozomi-muted">
              Automated conversational testing & evaluation
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-nozomi-muted">
              Conversations
              <input
                type="number"
                min={1}
                max={500}
                value={count}
                onChange={(e) => setCount(Number(e.target.value) || 20)}
                className="w-16 rounded-lg border border-nozomi-border/50 bg-nozomi-bg px-2 py-1 text-nozomi-text"
              />
            </label>
            <button
              type="button"
              disabled={running}
              onClick={() => void startBatch()}
              className="rounded-xl bg-nozomi-purple/80 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {running ? 'Running…' : 'Run batch'}
            </button>
            <button
              type="button"
              onClick={() => void handleExport()}
              disabled={!selectedRunId}
              className="rounded-xl border border-nozomi-border/50 px-3 py-2 text-sm text-nozomi-text"
            >
              Export JSON
            </button>
            <button
              type="button"
              onClick={() => void clearSimulationData().then(refreshRuns)}
              className="rounded-xl border border-red-900/50 px-3 py-2 text-sm text-red-300"
            >
              Clear data
            </button>
          </div>
        </div>
        {progress && (
          <p className="mt-2 text-xs text-nozomi-cyan">
            Progress: {progress.completed} / {progress.total}
          </p>
        )}
      </header>

      <div className="grid min-h-0 flex-1 gap-3 overflow-auto p-4 lg:grid-cols-3">
        <Panel title="Runs">
          <ul className="max-h-48 space-y-1 overflow-auto text-sm">
            {runs.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setSelectedRunId(r.id)}
                  className={`w-full rounded-lg px-2 py-1.5 text-left ${
                    selectedRunId === r.id
                      ? 'bg-purple-950/60 text-nozomi-text'
                      : 'text-nozomi-muted hover:bg-nozomi-surface'
                  }`}
                >
                  {r.id.slice(0, 12)}… · {r.status} · {r.conversationIds.length}{' '}
                  conv
                </button>
              </li>
            ))}
            {!runs.length && (
              <p className="text-xs text-nozomi-muted">No runs yet. Start a batch.</p>
            )}
          </ul>
        </Panel>

        <div className="space-y-3 lg:col-span-2">
          {analytics && (
            <>
              <Panel title="Average scores">
                <ScoreBar label="Overall" value={analytics.avgScores.overall} />
                <ScoreBar label="Immersion" value={analytics.avgScores.immersion} />
                <ScoreBar label="Engagement" value={analytics.avgScores.engagement} />
                <ScoreBar
                  label="Japanese correctness"
                  value={analytics.avgScores.japaneseCorrectness}
                />
                <ScoreBar
                  label="Continuation"
                  value={analytics.avgScores.continuationQuality}
                />
                <ScoreBar
                  label="Suggestions"
                  value={analytics.avgScores.suggestionQuality}
                />
                <ScoreBar
                  label="Tutoring"
                  value={analytics.tutoringQuality.score}
                />
              </Panel>

              <div className="grid gap-3 md:grid-cols-2">
                <Panel title="Failure clusters">
                  <ul className="space-y-2 text-xs">
                    {analytics.failureClusters.map((f) => (
                      <li
                        key={f.kind}
                        className="flex justify-between rounded-lg bg-nozomi-bg/60 px-2 py-1"
                      >
                        <span className="text-nozomi-text">{f.kind}</span>
                        <span className="text-nozomi-muted">
                          {f.count} · {(f.avgSeverity * 100).toFixed(0)}%
                        </span>
                      </li>
                    ))}
                    {!analytics.failureClusters.length && (
                      <li className="text-nozomi-muted">No failures recorded</li>
                    )}
                  </ul>
                </Panel>

                <Panel title="Tutoring quality">
                  <dl className="grid grid-cols-2 gap-2 text-xs">
                    <dt className="text-nozomi-muted">Help requests</dt>
                    <dd>{analytics.tutoringQuality.helpRequests}</dd>
                    <dt className="text-nozomi-muted">Help addressed</dt>
                    <dd>{analytics.tutoringQuality.helpAddressed}</dd>
                    <dt className="text-nozomi-muted">Grammar tags</dt>
                    <dd>{analytics.tutoringQuality.grammarTagsInReplies ?? analytics.tutoringQuality.correctionsOffered}</dd>
                    <dt className="text-nozomi-muted">Teacher sessions</dt>
                    <dd>{analytics.tutoringQuality.teacherModeSessions}</dd>
                  </dl>
                </Panel>

                <Panel title="Repetitive responses">
                  <ul className="max-h-40 space-y-1 overflow-auto text-xs">
                    {analytics.repetitiveResponses.map((r) => (
                      <li key={r.phrase} className="text-nozomi-muted">
                        <span className="text-nozomi-text">{r.phrase.slice(0, 24)}</span>{' '}
                        ×{r.count}
                      </li>
                    ))}
                  </ul>
                </Panel>

                <Panel title="Weak paths">
                  <ul className="max-h-40 space-y-1 overflow-auto text-xs">
                    {analytics.weakPaths.map((w) => (
                      <li key={`${w.topic}-${w.intent}`}>
                        {w.topic}/{w.intent} — cont{' '}
                        {(w.avgContinuation * 100).toFixed(0)}%
                      </li>
                    ))}
                  </ul>
                </Panel>

                <Panel title="Emotional drop-off">
                  <ul className="max-h-32 space-y-1 text-xs text-nozomi-muted">
                    {analytics.emotionalDropOffs.map((d) => (
                      <li key={d.turnIndex}>
                        Turn {d.turnIndex}:{' '}
                        {(d.avgEngagementBefore * 100).toFixed(0)}% →{' '}
                        {(d.avgEngagementAfter * 100).toFixed(0)}% (n={d.count})
                      </li>
                    ))}
                  </ul>
                </Panel>

                <Panel title="Retention risks">
                  <ul className="max-h-32 space-y-1 text-xs text-nozomi-muted">
                    {analytics.retentionRisks.map((r) => (
                      <li key={r.turnIndex}>
                        Turn {r.turnIndex}: risk {(r.riskScore * 100).toFixed(0)}% (
                        {r.count})
                      </li>
                    ))}
                  </ul>
                </Panel>
              </div>
            </>
          )}

          <Panel title="Conversations & replay">
            <ul className="mb-3 max-h-32 space-y-1 overflow-auto text-xs">
              {conversations.slice(0, 30).map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2">
                  <span className="truncate text-nozomi-muted">
                    {c.user.displayName} · {c.user.goal} · score{' '}
                    {(c.scores.overall * 100).toFixed(0)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => void startReplay(c.id)}
                    className="shrink-0 text-nozomi-cyan hover:underline"
                  >
                    Replay
                  </button>
                </li>
              ))}
            </ul>
            {selectedConv && (
              <div className="rounded-xl bg-nozomi-bg/80 p-3 text-xs">
                <p className="mb-2 text-nozomi-cyan">
                  Replay · turn {replayTurn + 1}/{selectedConv.turns.length}
                </p>
                <div className="max-h-48 space-y-2 overflow-auto">
                  {selectedConv.turns.slice(0, replayTurn + 1).map((t) => (
                    <div
                      key={t.turnIndex}
                      className={
                        t.role === 'user' ? 'text-nozomi-muted' : 'text-nozomi-text'
                      }
                    >
                      <strong>{t.role}:</strong> {t.text}
                      {t.responseMs > 0 && (
                        <span className="ml-2 text-nozomi-muted">
                          {t.responseMs.toFixed(0)}ms
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Panel>

          <Panel title="Personalities">
            <ul className="grid gap-2 text-xs sm:grid-cols-2">
              {ALL_PERSONALITY_IDS.map((id) => {
                const p = PERSONALITY_TEMPLATES[id]
                return (
                  <li
                    key={id}
                    className="rounded-lg border border-nozomi-border/30 px-2 py-1.5"
                  >
                    <span className="font-medium text-nozomi-text">{p?.label}</span>
                    <span className="text-nozomi-muted"> · {p?.personalityMode}</span>
                  </li>
                )
              })}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  )
}
