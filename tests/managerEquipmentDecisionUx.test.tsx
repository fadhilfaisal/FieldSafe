// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createMemoryRouter,
  MemoryRouter,
  RouterProvider,
} from 'react-router'
import { appRoutes } from '../src/app/router'
import { AuthProvider } from '../src/auth/AuthProvider'
import { authService } from '../src/auth/authService'
import { DEMO_PASSWORD } from '../src/auth/demoCredentials'
import { EquipmentStatusTable } from '../src/components/manager/EquipmentStatusTable'
import { DEMO_EVIDENCE } from '../src/domain/evidence'
import type { SignatureData } from '../src/domain/models'
import { fieldSafeRepository } from '../src/repositories'
import { inspectionService } from '../src/services/inspectionService'
import { managerService } from '../src/services/managerService'

const signature: SignatureData = {
  strokes: [[{ x: 0.1, y: 0.4 }, { x: 0.8, y: 0.6 }]],
}

async function renderManagerRoute(path: string) {
  await authService.login({
    email: 'varun.mehta@fieldsafe.demo',
    password: DEMO_PASSWORD,
  })
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] })
  render(
    <AuthProvider service={authService}>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
  return router
}

async function submitUnassignedCriticalDefects(
  descriptions = ['Critical defect awaiting corrective action assignment'],
) {
  const workspace = await inspectionService.getWorkspace(
    'ASG-001',
    'USR-INSP-001',
  )
  const failedItems = workspace.items.slice(0, descriptions.length)
  const passingItems = workspace.items.slice(descriptions.length)
  for (const [index, failedItem] of failedItems.entries()) {
    await inspectionService.recordResponse(
      workspace.inspection.id,
      'USR-INSP-001',
      failedItem.id,
      'Fail',
    )
    await inspectionService.updateDraftDefect(
      workspace.inspection.id,
      'USR-INSP-001',
      failedItem.id,
      {
        description: descriptions[index],
        severity: 'Critical',
        evidenceReference: structuredClone(DEMO_EVIDENCE),
      },
    )
  }
  for (const item of passingItems) {
    await inspectionService.recordResponse(
      workspace.inspection.id,
      'USR-INSP-001',
      item.id,
      'Pass',
    )
  }
  await inspectionService.saveSignature(
    workspace.inspection.id,
    'USR-INSP-001',
    signature,
  )
  return inspectionService.submitInspection(
    workspace.inspection.id,
    'USR-INSP-001',
  )
}

beforeEach(() => window.localStorage.clear())
afterEach(cleanup)

describe('TASK-030 Pass C Manager equipment decision UX', () => {
  it('uses a full-row native link target with visible focus and keyboard activation', async () => {
    const router = await renderManagerRoute('/manager/equipment')
    const rowLink = await screen.findByRole('link', { name: 'View TRK-001' })
    const row = rowLink.closest('li')!

    expect(rowLink.getAttribute('data-equipment-row-link')).toBe('EQ-001')
    expect(rowLink.className).toContain('fleet-status-row')
    expect(rowLink.className).toContain('focus-visible:outline')
    expect(within(row).getByRole('link', { name: 'View TRK-001' })).toBeTruthy()
    expect(within(row).queryAllByRole('link')).toHaveLength(1)

    rowLink.focus()
    expect(document.activeElement).toBe(rowLink)
    fireEvent.keyDown(rowLink, { key: ' ' })
    await screen.findByRole('heading', { name: 'Volvo FMX Dump Truck' })
    expect(router.state.location.pathname).toBe('/manager/equipment/EQ-001')
  })

  it('composes Type and Site into Equipment metadata without sacrificing the reserved affordance', async () => {
    await renderManagerRoute('/manager/equipment')
    const rowLink = await screen.findByRole('link', { name: 'View TRK-001' })
    const board = rowLink.closest('[data-responsive-layout]')!
    const context = rowLink.querySelector('[data-equipment-context="type-site"]')!
    const affordanceCell = rowLink.querySelector(
      '[data-affordance-cell="reserved"]',
    )!
    const arrow = rowLink.querySelector('[data-row-affordance="arrow"]')!
    const risk = rowLink.querySelector('[data-open-risk]')!

    expect(board.getAttribute('data-responsive-layout')).toBe(
      'equipment-context',
    )
    expect(board.className).toContain('fleet-status-board')
    expect(board.querySelector('table')).toBeNull()
    expect(context.textContent).toContain('Truck')
    expect(context.textContent).toContain('North Yard')
    expect(rowLink.querySelector('.fleet-status-type')?.textContent).toBe('Truck')
    expect(rowLink.querySelector('.fleet-status-site')?.textContent).toBe(
      'North Yard',
    )
    expect(affordanceCell.className).toContain('fleet-status-affordance')
    expect(arrow.className).toContain('size-8')
    expect(arrow.className).not.toContain('translate-x')
    expect(risk.className).toContain('whitespace-nowrap')
    expect(rowLink.className).not.toContain('break-all')
  })

  it('keeps equipment filters functional with row-wide navigation', async () => {
    await renderManagerRoute('/manager/equipment')
    const user = userEvent.setup()
    const board = await managerService.getEquipmentBoard()
    const craneCount = board.filter(
      (item) => item.equipment.type === 'Crane',
    ).length

    await user.selectOptions(
      await screen.findByLabelText('Equipment type'),
      'Crane',
    )
    await waitFor(() =>
      expect(document.querySelectorAll('[data-equipment-row-link]')).toHaveLength(
        craneCount,
      ),
    )
    expect(screen.queryByRole('link', { name: 'View TRK-001' })).toBeNull()
  })

  it('combines canonical Open Risk severity and count with plural-safe wording', async () => {
    const board = await managerService.getEquipmentBoard()
    const riskItem = board.find(
      (item) => item.highestUnresolvedSeverity && item.unresolvedDefects.length === 1,
    )!
    const noRiskItem = board.find((item) => item.unresolvedDefects.length === 0)!
    const twoDefectItem = {
      ...riskItem,
      equipment: {
        ...riskItem.equipment,
        id: 'EQ-TWO-RISKS',
        assetCode: 'TEST-002',
      },
      unresolvedDefects: [
        riskItem.unresolvedDefects[0],
        { ...riskItem.unresolvedDefects[0], id: 'DEF-SECOND' },
      ],
    }

    render(
      <MemoryRouter>
        <EquipmentStatusTable items={[riskItem, twoDefectItem, noRiskItem]} />
      </MemoryRouter>,
    )

    const risks = document.querySelectorAll('[data-open-risk]')
    expect(risks[0].getAttribute('data-open-risk')).toBe(
      riskItem.highestUnresolvedSeverity,
    )
    expect(within(risks[0]).getByText('1 defect')).toBeTruthy()
    expect(within(risks[1]).getByText('2 defects')).toBeTruthy()
    expect(screen.getByText('No open risk')).toBeTruthy()
  })

  it('places joined current risk and remediation before ordered inspection history', async () => {
    const detail = await managerService.getEquipmentDetail('EQ-001')
    const defectContext = detail.defectContexts[0]
    const action = defectContext.correctiveActions[0]
    const owner = detail.correctiveActionContexts.find(
      (context) => context.action.id === action.id,
    )!.owner
    await renderManagerRoute('/manager/equipment/EQ-001')

    const riskHeading = await screen.findByRole('heading', {
      name: 'Current Risk & Remediation',
    })
    const historyHeading = screen.getByRole('heading', {
      name: 'Recent Inspection History',
    })
    expect(
      riskHeading.compareDocumentPosition(historyHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()

    const riskSection = riskHeading.closest('section')!
    const defect = riskSection.querySelector(
      `[data-risk-defect-id="${defectContext.defect.id}"]`,
    )!
    expect(within(defect).getByText(defectContext.defect.description)).toBeTruthy()
    expect(within(defect).getByText(defectContext.defect.severity)).toBeTruthy()
    expect(
      within(defect).getAllByText(defectContext.defect.status).length,
    ).toBeGreaterThan(0)
    expect(
      within(defect).getByRole('img', {
        name: `Evidence for ${defectContext.category} defect on ${detail.equipment.assetCode}`,
      }),
    ).toBeTruthy()
    expect(within(defect).getByText(action.title)).toBeTruthy()
    expect(within(defect).getByText(owner!.name)).toBeTruthy()

    const firstHistoryRow = document.querySelector('[data-inspection-id]')!
    expect(firstHistoryRow.getAttribute('data-inspection-id')).toBe(
      detail.inspectionHistory[0].inspection.id,
    )
    expect(screen.queryByRole('button', { name: /save|create|update|resolve/i })).toBeNull()
    expect(screen.queryByRole('form')).toBeNull()
  })

  it('shows a concise no-action state for a newly submitted unresolved defect', async () => {
    const submission = await submitUnassignedCriticalDefects()
    await renderManagerRoute(`/manager/equipment/${submission.equipment.id}`)

    const riskHeading = await screen.findByRole('heading', {
      name: 'Current Risk & Remediation',
    })
    const riskSection = riskHeading.closest('section')!
    expect(
      within(riskSection).getByText(
        'Critical defect awaiting corrective action assignment',
      ),
    ).toBeTruthy()
    expect(
      within(riskSection).getByText('No corrective action assigned'),
    ).toBeTruthy()
    expect(screen.queryByRole('button', { name: /create|assign/i })).toBeNull()
  })

  it('does not omit multiple unresolved defects for the same equipment', async () => {
    const descriptions = [
      'Critical steering defect awaiting remediation',
      'Critical braking defect awaiting remediation',
    ]
    const submission = await submitUnassignedCriticalDefects(descriptions)
    await renderManagerRoute(`/manager/equipment/${submission.equipment.id}`)

    const riskSection = (
      await screen.findByRole('heading', {
        name: 'Current Risk & Remediation',
      })
    ).closest('section')!
    expect(riskSection.querySelectorAll('[data-risk-defect-id]')).toHaveLength(2)
    for (const description of descriptions) {
      expect(within(riskSection).getByText(description)).toBeTruthy()
    }
  })

  it('renders every corrective action associated with an unresolved defect', async () => {
    const original = (await fieldSafeRepository.getCorrectiveActions()).find(
      (action) => action.id === 'CA-001',
    )!
    await fieldSafeRepository.saveCorrectiveAction({
      ...original,
      id: 'CA-MULTI-1',
      title: 'Secondary tyre remediation',
    })
    await fieldSafeRepository.saveCorrectiveAction({
      ...original,
      id: 'CA-MULTI-2',
      title: 'Independent tyre verification',
    })
    await renderManagerRoute('/manager/equipment/EQ-001')

    const riskSection = (
      await screen.findByRole('heading', {
        name: 'Current Risk & Remediation',
      })
    ).closest('section')!
    expect(within(riskSection).getByText(original.title)).toBeTruthy()
    expect(within(riskSection).getByText('Secondary tyre remediation')).toBeTruthy()
    expect(within(riskSection).getByText('Independent tyre verification')).toBeTruthy()
    expect(
      riskSection.querySelectorAll('[data-remediation-action-id]'),
    ).toHaveLength(3)
  })

  it('uses a compact positive state when equipment has no unresolved defects', async () => {
    const board = await managerService.getEquipmentBoard()
    const noRisk = board.find((item) => item.unresolvedDefects.length === 0)!
    await renderManagerRoute(`/manager/equipment/${noRisk.equipment.id}`)

    expect(
      await screen.findByRole('heading', {
        name: 'No unresolved safety defects',
      }),
    ).toBeTruthy()
    const emptyState = document.querySelector('[data-risk-empty-state="compact"]')!
    expect(emptyState.className).toContain('p-4')
    expect(screen.getByRole('heading', { name: 'Recent Inspection History' })).toBeTruthy()
  })
})
