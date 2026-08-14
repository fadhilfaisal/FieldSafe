import { ChartNoAxesCombined, ClipboardCheck, ShieldAlert, Truck, TriangleAlert } from 'lucide-react'
import { PlaceholderPage } from '../shared/PlaceholderPage'

export function ManagerHomePage() {
  return (
    <PlaceholderPage
      title="Manager Overview"
      area="Operations workspace"
      description="The FieldSafe Manager experience will be implemented in a later increment."
      icon={ChartNoAxesCombined}
    />
  )
}

export function ManagerCompliancePage() {
  return (
    <PlaceholderPage
      title="Compliance"
      area="Operations workspace"
      description="Compliance analytics and reporting are intentionally outside this foundation increment."
      icon={ClipboardCheck}
    />
  )
}

export function ManagerDefectsPage() {
  return (
    <PlaceholderPage
      title="Defects"
      area="Operations workspace"
      description="Defect records and risk analysis will be implemented in a later increment."
      icon={TriangleAlert}
    />
  )
}

export function ManagerEquipmentPage() {
  return (
    <PlaceholderPage
      title="Equipment Status"
      area="Operations workspace"
      description="Equipment inventory and operational state logic will be implemented in a later increment."
      icon={Truck}
    />
  )
}

export function ManagerEquipmentDetailPage() {
  return (
    <PlaceholderPage
      title="Equipment Detail"
      area="Operations workspace"
      description="Equipment history, issues, and state changes are not part of this foundation."
      icon={ShieldAlert}
    />
  )
}
