// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SignaturePad } from '../src/components/inspection/SignaturePad'
import type {
  ChecklistItem,
  InspectionDraft,
  SignatureData,
} from '../src/domain/models'
import { validateInspectionDraft } from '../src/services/inspectionService'

const bounds: DOMRect = {
  bottom: 120,
  height: 100,
  left: 10,
  right: 210,
  top: 20,
  width: 200,
  x: 10,
  y: 20,
  toJSON: () => ({}),
}

function renderSignaturePad(onChange = vi.fn()) {
  render(<SignaturePad value={null} onChange={onChange} />)
  const canvas = screen.getByLabelText('Inspector signature pad') as HTMLCanvasElement

  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(bounds)
  canvas.setPointerCapture = vi.fn()
  canvas.hasPointerCapture = vi.fn(() => true)
  canvas.releasePointerCapture = vi.fn()

  return { canvas, onChange }
}

function drawStroke(
  canvas: HTMLCanvasElement,
  pointerId: number,
  points: Array<{ clientX: number; clientY: number }>,
) {
  const [first, ...rest] = points
  fireEvent.pointerDown(canvas, { pointerId, ...first })
  rest.forEach((point) => {
    fireEvent.pointerMove(canvas, { pointerId, ...point })
  })
  fireEvent.pointerUp(canvas, { pointerId, ...points.at(-1) })
}

beforeEach(() => {
  const context = {
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    scale: vi.fn(),
    stroke: vi.fn(),
  }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    context as unknown as CanvasRenderingContext2D,
  )
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('SignaturePad', () => {
  it('renders and begins a pointer signature without throwing', () => {
    const { canvas } = renderSignaturePad()

    expect(() => {
      fireEvent.pointerDown(canvas, {
        pointerId: 1,
        clientX: 30,
        clientY: 40,
      })
    }).not.toThrow()
    expect(canvas.setPointerCapture).toHaveBeenCalledWith(1)
  })

  it('records normalized pointer movement as signature data accepted by validation', () => {
    const { canvas, onChange } = renderSignaturePad()
    drawStroke(canvas, 2, [
      { clientX: 30, clientY: 40 },
      { clientX: 110, clientY: 70 },
      { clientX: 190, clientY: 100 },
    ])

    const signature = onChange.mock.calls.at(-1)?.[0] as SignatureData
    expect(signature.strokes).toEqual([
      [
        { x: 0.1, y: 0.2 },
        { x: 0.5, y: 0.5 },
        { x: 0.9, y: 0.8 },
      ],
    ])

    const item: ChecklistItem = {
      id: 'ITEM-001',
      checklistId: 'CHECKLIST-001',
      sequence: 1,
      category: 'General',
      prompt: 'Condition acceptable?',
      isCritical: false,
    }
    const draft: InspectionDraft = {
      inspectionId: 'INSPECTION-001',
      responses: [
        { checklistItemId: item.id, result: 'Pass', defect: null },
      ],
      signature,
      updatedAt: '2026-08-14T10:00:00.000Z',
    }

    expect(validateInspectionDraft([item], draft, true).isSubmittable).toBe(true)
  })

  it('records multiple strokes and handles pointer cancellation', () => {
    const { canvas, onChange } = renderSignaturePad()
    drawStroke(canvas, 3, [
      { clientX: 30, clientY: 40 },
      { clientX: 70, clientY: 60 },
    ])

    fireEvent.pointerDown(canvas, {
      pointerId: 4,
      clientX: 110,
      clientY: 70,
    })
    fireEvent.pointerMove(canvas, {
      pointerId: 4,
      clientX: 190,
      clientY: 100,
    })
    fireEvent.pointerCancel(canvas, { pointerId: 4 })

    const signature = onChange.mock.calls.at(-1)?.[0] as SignatureData
    expect(signature.strokes).toHaveLength(2)
    expect(signature.strokes.every((stroke) => stroke.length >= 2)).toBe(true)
    expect(canvas.releasePointerCapture).toHaveBeenCalledWith(4)
  })

  it('clears the signature and supports drawing again', () => {
    const { canvas, onChange } = renderSignaturePad()
    drawStroke(canvas, 5, [
      { clientX: 30, clientY: 40 },
      { clientX: 70, clientY: 60 },
    ])

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(onChange).toHaveBeenLastCalledWith(null)

    drawStroke(canvas, 6, [
      { clientX: 110, clientY: 70 },
      { clientX: 190, clientY: 100 },
    ])

    const redrawnSignature = onChange.mock.calls.at(-1)?.[0] as SignatureData
    expect(redrawnSignature.strokes).toHaveLength(1)
    expect(redrawnSignature.strokes[0]).toHaveLength(2)
  })

  it('fails safely when the canvas has no measurable drawing area', () => {
    const { canvas, onChange } = renderSignaturePad()
    vi.mocked(canvas.getBoundingClientRect).mockReturnValue({
      ...bounds,
      bottom: 20,
      height: 0,
    })

    expect(() => {
      fireEvent.pointerDown(canvas, {
        pointerId: 7,
        clientX: 30,
        clientY: 40,
      })
    }).not.toThrow()
    fireEvent.pointerUp(canvas, { pointerId: 7, clientX: 30, clientY: 40 })

    expect(onChange).not.toHaveBeenCalled()
  })
})
