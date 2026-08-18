import {
  ClipboardCheck,
  LayoutDashboard,
  ListChecks,
  ShieldAlert,
  Truck,
  Wrench,
} from 'lucide-react'
import { createBrowserRouter, Navigate } from 'react-router'
import type { RouteObject } from 'react-router'
import { LoginRoute, RequireRole } from '../auth/RouteGuards'
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
  CompletedInspectionDetailPage,
  InspectorHistoryPage,
  InspectorHomePage,
  InspectorInspectionPage,
  InspectorProfilePage,
  InspectionReviewPage,
  InspectionResultPage,
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
import { RouteErrorPage } from '../pages/shared/RouteErrorPage'
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

const fieldSafeRoutes: RouteObject[] = [
  { path: '/', element: <Navigate to="/login" replace /> },
  {
    element: <LoginRoute />,
    children: [{ path: '/login', element: <LoginPage /> }],
  },
  {
    element: <RequireRole allowedRoles={['Inspector']} />,
    children: [
      {
        path: '/inspector',
        element: <FieldShell />,
        children: [
          { index: true, element: <InspectorHomePage /> },
          { path: 'scan', element: <InspectorScanPage /> },
          { path: 'equipment/:id', element: <InspectorEquipmentPage /> },
          { path: 'inspection/:id', element: <InspectorInspectionPage /> },
          { path: 'inspection/:id/review', element: <InspectionReviewPage /> },
          { path: 'inspection/:id/result', element: <InspectionResultPage /> },
          { path: 'history', element: <InspectorHistoryPage /> },
          { path: 'history/:id', element: <CompletedInspectionDetailPage /> },
          { path: 'profile', element: <InspectorProfilePage /> },
        ],
      },
    ],
  },
  {
    element: <RequireRole allowedRoles={['Supervisor']} />,
    children: [
      {
        path: '/supervisor',
        element: (
          <OperationsShell
            role="Supervisor"
            navigation={supervisorNavigation}
          />
        ),
        children: [
          { index: true, element: <SupervisorHomePage /> },
          { path: 'reviews', element: <SupervisorReviewsPage /> },
          { path: 'reviews/:id', element: <SupervisorReviewDetailPage /> },
          { path: 'actions', element: <SupervisorActionsPage /> },
          { path: 'actions/:id', element: <SupervisorActionDetailPage /> },
        ],
      },
    ],
  },
  {
    element: <RequireRole allowedRoles={['Manager']} />,
    children: [
      {
        path: '/manager',
        element: (
          <OperationsShell role="Manager" navigation={managerNavigation} />
        ),
        children: [
          { index: true, element: <ManagerHomePage /> },
          { path: 'compliance', element: <ManagerCompliancePage /> },
          { path: 'defects', element: <ManagerDefectsPage /> },
          { path: 'equipment', element: <ManagerEquipmentPage /> },
          { path: 'equipment/:id', element: <ManagerEquipmentDetailPage /> },
        ],
      },
    ],
  },
  {
    path: '/gate',
    element: <GateShell />,
    children: [{ index: true, element: <GatePage /> }],
  },
  { path: '*', element: <NotFoundPage /> },
]

export const appRoutes: RouteObject[] = fieldSafeRoutes.map((route) => ({
  ...route,
  errorElement: <RouteErrorPage />,
}))

export const router = createBrowserRouter(appRoutes)
