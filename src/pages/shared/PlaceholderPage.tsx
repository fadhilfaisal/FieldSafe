import { type LucideIcon } from 'lucide-react'
import { Card } from '../../components/common/Card'
import { EmptyState } from '../../components/common/EmptyState'
import { PageHeader } from '../../components/common/PageHeader'

interface PlaceholderPageProps {
  title: string
  area: string
  description: string
  icon: LucideIcon
}

export function PlaceholderPage({
  title,
  area,
  description,
  icon,
}: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} eyebrow={area} description={description} />
      <Card>
        <EmptyState
          icon={icon}
          title="Foundation ready"
          description="This workspace is intentionally reserved for a later product increment. No workflow, records, or simulated actions have been added."
        />
      </Card>
    </div>
  )
}
