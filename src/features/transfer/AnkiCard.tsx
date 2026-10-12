import { Layers } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, SectionTitle } from '@/components/ui'

export function AnkiCard() {
  const navigate = useNavigate()
  return (
    <Card as="section" className="p-5 sm:p-6">
      <SectionTitle>Anki 내보내기</SectionTitle>
      <p className="mt-1.5 text-sm text-muted">
        풀이의 핵심 개념에서 용어를 가린 빈칸 카드를 만들어요. Anki 앱(PC·폰)에서 간격 반복으로 복습할 때 쓰세요.
      </p>
      <div className="mt-4">
        <Button variant="secondary" icon={<Layers className="size-4" aria-hidden />} onClick={() => navigate('/anki')}>
          빈칸 카드 만들기
        </Button>
      </div>
    </Card>
  )
}
