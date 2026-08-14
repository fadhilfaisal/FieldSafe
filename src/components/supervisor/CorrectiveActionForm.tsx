import { Save } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import type { User } from '../../domain/models'
import { Button } from '../common/Button'

interface CorrectiveActionFormProps {
  idPrefix: string
  technicians: User[]
  submitting?: boolean
  error?: string
  onSubmit(input: {
    description: string
    assignedToUserId: string
    dueDate: string
  }): void
}

function defaultDueDate() {
  const due = new Date()
  due.setDate(due.getDate() + 7)
  return due.toISOString().slice(0, 10)
}

export function CorrectiveActionForm({
  idPrefix,
  technicians,
  submitting = false,
  error = '',
  onSubmit,
}: CorrectiveActionFormProps) {
  const [description, setDescription] = useState('')
  const [assignedToUserId, setAssignedToUserId] = useState('')
  const [dueDate, setDueDate] = useState(defaultDueDate)

  useEffect(() => {
    if (!assignedToUserId && technicians[0]) {
      setAssignedToUserId(technicians[0].id)
    }
  }, [assignedToUserId, technicians])

  function submit(event: FormEvent) {
    event.preventDefault()
    onSubmit({ description, assignedToUserId, dueDate })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor={`${idPrefix}-description`} className="text-sm font-bold text-slate-800">
          Action description
        </label>
        <textarea
          id={`${idPrefix}-description`}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          required
          placeholder="Describe the repair or control required"
          className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${idPrefix}-owner`} className="text-sm font-bold text-slate-800">
            Owner
          </label>
          <select
            id={`${idPrefix}-owner`}
            value={assignedToUserId}
            onChange={(event) => setAssignedToUserId(event.target.value)}
            required
            className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900"
          >
            <option value="" disabled>Select Technician</option>
            {technicians.map((technician) => (
              <option key={technician.id} value={technician.id}>
                {technician.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${idPrefix}-due-date`} className="text-sm font-bold text-slate-800">
            Due date
          </label>
          <input
            id={`${idPrefix}-due-date`}
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            required
            className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900"
          />
        </div>
      </div>
      {error ? (
        <p className="rounded-lg bg-danger-50 p-3 text-sm font-semibold text-danger-700" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={submitting || technicians.length === 0}>
        <Save aria-hidden="true" className="size-4" />
        {submitting ? 'Creating action…' : 'Create Corrective Action'}
      </Button>
    </form>
  )
}
