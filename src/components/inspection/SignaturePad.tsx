import { Eraser } from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { SignatureData, SignaturePoint } from '../../domain/models'

interface SignaturePadProps {
  value: SignatureData | null
  onChange(value: SignatureData | null): void
}

function drawSignature(canvas: HTMLCanvasElement, signature: SignatureData | null) {
  const context = canvas.getContext('2d')
  if (!context) return
  const ratio = window.devicePixelRatio || 1
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  canvas.width = width * ratio
  canvas.height = height * ratio
  context.scale(ratio, ratio)
  context.clearRect(0, 0, width, height)
  context.strokeStyle = '#082c52'
  context.lineWidth = 2.5
  context.lineCap = 'round'
  context.lineJoin = 'round'

  for (const stroke of signature?.strokes ?? []) {
    if (stroke.length === 0) continue
    context.beginPath()
    stroke.forEach((point, index) => {
      const x = point.x * width
      const y = point.y * height
      if (index === 0) context.moveTo(x, y)
      else context.lineTo(x, y)
    })
    context.stroke()
  }
}

function pointFromPointer(
  canvas: HTMLCanvasElement | null,
  clientX: number,
  clientY: number,
): SignaturePoint | null {
  if (!canvas) return null

  const bounds = canvas.getBoundingClientRect()
  if (bounds.width <= 0 || bounds.height <= 0) return null

  return {
    x: Math.min(1, Math.max(0, (clientX - bounds.left) / bounds.width)),
    y: Math.min(1, Math.max(0, (clientY - bounds.top) / bounds.height)),
  }
}

export function SignaturePad({ value, onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [strokes, setStrokes] = useState<SignaturePoint[][]>(
    value?.strokes ?? [],
  )
  const strokesRef = useRef<SignaturePoint[][]>(value?.strokes ?? [])
  const drawing = useRef(false)

  useEffect(() => {
    const nextStrokes = value?.strokes ?? []
    strokesRef.current = nextStrokes
    setStrokes(nextStrokes)
  }, [value])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const redraw = () => drawSignature(canvas, { strokes })
    redraw()
    window.addEventListener('resize', redraw)
    return () => window.removeEventListener('resize', redraw)
  }, [strokes])

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget
    const point = pointFromPointer(canvas, event.clientX, event.clientY)
    if (!point) return

    drawing.current = true
    if (typeof canvas.setPointerCapture === 'function') {
      canvas.setPointerCapture(event.pointerId)
    }

    setStrokes((current) => {
      const next = current.concat([[point]])
      strokesRef.current = next
      return next
    })
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return

    const point = pointFromPointer(
      event.currentTarget,
      event.clientX,
      event.clientY,
    )
    if (!point) return

    setStrokes((current) => {
      const next = current.map((stroke, index) =>
        index === current.length - 1 ? stroke.concat(point) : stroke,
      )
      strokesRef.current = next
      return next
    })
  }

  function finishStroke(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget
    if (
      typeof canvas.hasPointerCapture === 'function' &&
      typeof canvas.releasePointerCapture === 'function' &&
      canvas.hasPointerCapture(event.pointerId)
    ) {
      canvas.releasePointerCapture(event.pointerId)
    }

    if (!drawing.current) return
    drawing.current = false
    onChange({ strokes: strokesRef.current })
  }

  function clear() {
    setStrokes([])
    strokesRef.current = []
    onChange(null)
  }

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-slate-300 bg-white">
        <canvas
          ref={canvasRef}
          className="h-40 w-full touch-none cursor-crosshair"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          onPointerCancel={finishStroke}
          aria-label="Inspector signature pad"
        />
        <div className="flex items-center justify-between border-t border-slate-200 px-3 py-2">
          <span className="text-xs text-slate-500">Draw your signature above</span>
          <button
            type="button"
            onClick={clear}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-bold text-brand-700 hover:bg-brand-50"
          >
            <Eraser aria-hidden="true" className="size-4" />
            Clear
          </button>
        </div>
      </div>
    </div>
  )
}
