import {
  ClipboardCheck,
  LayoutDashboard,
  ListChecks,
  ShieldAlert,
  Truck,
  Wrench,
} from 'lucide-react'
import { createBrowserRouter, Navigate } from 'react-router'
import { FieldShell } from '../components/layout/FieldShell'
import { GateShell } from '../components/layout/GateShell'
import {
  OperationsShell,
  type OperationsNavItem,
} from '../components/layout/OperationsShell'
import { LoginPage } from '../pages/auth/LoginPage'
import { GatePage } from '../pages/gate/GatePage'
import {
  InspectorEquipmentPage,
  InspectorHistoryPage,
  InspectorHomePage,
  InspectorInspectionPage,
  InspectorScanPage,
} from '../pages/inspector/InspectorPages'
import {
  ManagerCompliancePage,
  ManagerDefectsPage,
  ManagerEquipmentDetailPage,
  ManagerEquipmentPage,
  ManagerHomePage,
} from '../pages/manager/ManagerPages'
import { NotFoundPage } from '../pages/shared/NotFoundPage'
import {
  SupervisorActionDetailPage,
  SupervisorActionsPage,
  SupervisorHomePage,
  SupervisorReviewDetailPage,
  SupervisorReviewsPage,
} from '../pages/supervisor/SupervisorPages'

const supervisorNavigation: OperationsNavItem[] = [
  { label: 'Overview', to: '/supervisor', icon: LayoutDashboard, end: true },
  { label: 'Pending Reviews', to: '/supervisor/reviews', icon: ListChecks },
  { label: 'Corrective Actions', to: '/supervisor/actions', icon: Wrench },
]

const managerNavigation: OperationsNavItem[] = [
  { label: 'Overview', to: '/manager', icon: LayoutDashboard, end: true },
  { label: 'Compliance', to: '/manager/compliance', icon: ClipboardCheck },
  { label: 'Defects', to: '/manager/defects', icon: ShieldAlert },
  { label: 'Equipment', to: '/manager/equipment', icon: Truck },
]

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <LoginPage /> },
  {
    path: '/inspector',
    element: <FieldShell />,
    children: [
      { index: true, element: <InspectorHomePage /> },
      { path: 'scan', element: <InspectorScanPage /> },
      { path: 'equipment/:id', element: <InspectorEquipmentPage /> },
      { path: 'inspection/:id', element: <InspectorInspectionPage /> },
      { path: 'history', element: <InspectorHistoryPage /> },
    ],
  },
  {
    path: '/supervisor',
    element: <OperationsShell role="Supervisor" navigation={supervisorNavigation} />,
    children: [
      { index: true, element: <SupervisorHomePage /> },
      { path: 'reviews', element: <SupervisorReviewsPage /> },
      { path: 'reviews/:id', element: <SupervisorReviewDetailPage /> },
      { path: 'actions', element: <SupervisorActionsPage /> },
      { path: 'actions/:id', element: <SupervisorActionDetailPage /> },
    ],
  },
  {
    path: '/manager',
    element: <OperationsShell role="Manager" navigation={managerNavigation} />,
    children: [
      { index: true, element: <ManagerHomePage /> },
      { path: 'compliance', element: <ManagerCompliancePage /> },
      { path: 'defects', element: <ManagerDefectsPage /> },
      { path: 'equipment', element: <ManagerEquipmentPage /> },
      { path: 'equipment/:id', element: <ManagerEquipmentDetailPage /> },
    ],
  },
  {
    path: '/gate',
    element: <GateShell />,
    children: [{ index: true, element: <GatePage /> }],
  },
  { path: '*', element: <NotFoundPage /> },
])
