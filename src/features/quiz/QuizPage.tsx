import { useCallback, useReducer, useState } from 'react'
import { useToast } from '@/components/toast-context'
import { addAttempt } from '@/db'
import { usePageTitle } from '@/lib/usePageTitle'
import type { Attempt, AttemptResult, Problem } from '@/models/types'
import { QuizSession } from './QuizSession'
import { QuizSetup } from './QuizSetup'
import { QuizSummary } from './QuizSummary'
import { DEFAULT_SETUP, initialState, pickProblems, reduce, type QuizSetup as Setup } from './session'

function Runner({ problems, onReset }: { problems: Problem[]; onReset: () => void }) {
  const [state, dispatch] = useReducer(reduce, problems, initialState)
  const toast = useToast()
  const current = state.problems[state.index]

  const onReveal = useCallback((answer: string) => dispatch({ type: 'reveal', answer }), [])
  const onGrade = useCallback(
    (result: AttemptResult) => {
      if (!current) return
      const answer = state.answers[current.id]?.answer ?? ''
      dispatch({ type: 'grade', result })
      addAttempt(current.id, { answer, result }).catch(() => toast.show('복습 기록을 저장하지 못했어요'))
    },
    [current, state.answers, toast],
  )

  if (state.phase === 'summary') {
    return <QuizSummary state={state} onRetryWrong={() => dispatch({ type: 'retryWrong' })} onReset={onReset} />
  }
  return <QuizSession state={state} onReveal={onReveal} onGrade={onGrade} onQuit={() => dispatch({ type: 'quit' })} />
}

export function QuizPage() {
  usePageTitle('복습')
  const [setup, setSetup] = useState<Setup>(DEFAULT_SETUP)
  const [problems, setProblems] = useState<Problem[]>()
  const [run, setRun] = useState(0)

  function start(candidates: Problem[], latest: Map<string, Attempt>) {
    setProblems(pickProblems(candidates, latest, setup))
    setRun((n) => n + 1)
  }

  if (!problems) {
    return <QuizSetup setup={setup} onChange={(patch) => setSetup((s) => ({ ...s, ...patch }))} onStart={start} />
  }
  return <Runner key={run} problems={problems} onReset={() => setProblems(undefined)} />
}
