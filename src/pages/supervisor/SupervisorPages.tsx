import { ClipboardCheck, FileSearch, ListChecks, Wrench } from 'lucide-react'
import { PlaceholderPage } from '../shared/PlaceholderPage'

export function SupervisorHomePage() {
  return (
    <PlaceholderPage
      title="Supervisor Overview"
      area="Operations workspace"
      description="The FieldSafe Supervisor experience will be implemented in a later increment."
      icon={ClipboardCheck}
    />
  )
}

export function SupervisorReviewsPage() {
  return (
    <PlaceholderPage
      title="Pending Reviews"
      area="Operations workspace"
      description="Supervisor review behavior is intentionally outside this foundation increment."
      icon={ListChecks}
    />
  )
}

export function SupervisorReviewDetailPage() {
  return (
    <PlaceholderPage
      title="Inspection Review"
      area="Operations workspace"
      description="Review decisions and inspection data will be implemented in a later increment."
      icon={FileSearch}
    />
  )
}

export function SupervisorActionsPage() {
  return (
    <PlaceholderPage
      title="Corrective Actions"
      area="Operations workspace"
      description="Corrective action workflows will be implemented in a later increment."
      icon={Wrench}
    />
  )
}

export function SupervisorActionDetailPage() {
  return (
    <PlaceholderPage
      title="Corrective Action Detail"
      area="Operations workspace"
      description="Corrective action assignments and status changes are not part of this foundation."
      icon={Wrench}
    />
  )
}
