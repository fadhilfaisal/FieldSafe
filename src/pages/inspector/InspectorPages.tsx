import { ClipboardCheck, FileSearch, History, QrCode, Truck } from 'lucide-react'
import { PlaceholderPage } from '../shared/PlaceholderPage'

export function InspectorHomePage() {
  return (
    <PlaceholderPage
      title="Inspector Home"
      area="Field workspace"
      description="The FieldSafe Inspector experience will be implemented in a later increment."
      icon={ClipboardCheck}
    />
  )
}

export function InspectorScanPage() {
  return (
    <PlaceholderPage
      title="Scan Equipment"
      area="Field workspace"
      description="QR scanning and equipment lookup are intentionally outside this foundation increment."
      icon={QrCode}
    />
  )
}

export function InspectorEquipmentPage() {
  return (
    <PlaceholderPage
      title="Equipment Detail"
      area="Field workspace"
      description="Equipment records and safety-state logic will be implemented in a later increment."
      icon={Truck}
    />
  )
}

export function InspectorInspectionPage() {
  return (
    <PlaceholderPage
      title="Inspection Detail"
      area="Field workspace"
      description="Inspection checklists and review flows will be implemented in a later increment."
      icon={FileSearch}
    />
  )
}

export function InspectorHistoryPage() {
  return (
    <PlaceholderPage
      title="Inspection History"
      area="Field workspace"
      description="Inspection history will be implemented after the persistence and domain layers are introduced."
      icon={History}
    />
  )
}
