// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EvidenceAttachment } from '../src/components/inspection/EvidenceAttachment'
import { EvidencePreview } from '../src/components/inspection/EvidencePreview'
import {
  DEMO_EVIDENCE,
  DEMO_EVIDENCE_PUBLIC_URL,
  normalizeEvidenceReference,
  resolveEvidenceAssetPath,
} from '../src/domain/evidence'

afterEach(() => cleanup())

describe('demo evidence references', () => {
  it('resolves to the bundled Vite public asset', () => {
    const image = readFileSync(
      resolve('public', DEMO_EVIDENCE_PUBLIC_URL.slice(1)),
    )

    expect(DEMO_EVIDENCE.assetPath).toBe(
      '/evidence/hydraulic-hose-damage.png',
    )
    expect([...image.subarray(0, 8)]).toEqual([
      137, 80, 78, 71, 13, 10, 26, 10,
    ])
  })

  it.each([
    'evidence/hydraulic-hose-damage.png',
    './evidence/hydraulic-hose-damage.png',
    'public/evidence/hydraulic-hose-damage.png',
    '/public/evidence/hydraulic-hose-damage.png',
  ])('normalizes the supported stale path %s', (assetPath) => {
    const stale = { ...DEMO_EVIDENCE, assetPath }

    expect(resolveEvidenceAssetPath(stale)).toBe(DEMO_EVIDENCE_PUBLIC_URL)
    expect(normalizeEvidenceReference(stale)).toEqual(DEMO_EVIDENCE)
  })

  it('attaches only the lightweight demo reference', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<EvidenceAttachment value={null} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Add Photo' }))

    expect(onChange).toHaveBeenCalledWith(DEMO_EVIDENCE)
    expect(JSON.stringify(onChange.mock.calls[0][0])).not.toContain('data:image')
  })

  it('uses the stable source and replaces a failed image with a graceful fallback', () => {
    render(
      <EvidenceAttachment
        value={{
          ...DEMO_EVIDENCE,
          assetPath: '/public/evidence/hydraulic-hose-damage.png',
        }}
        onChange={vi.fn()}
      />,
    )

    const preview = screen.getByRole('img', {
      name: 'Attached defect evidence',
    })
    expect(preview.getAttribute('src')).toBe(DEMO_EVIDENCE_PUBLIC_URL)

    fireEvent.error(preview)

    expect(
      screen.getByRole('img', {
        name: 'Hydraulic hose damage preview unavailable',
      }),
    ).toBeTruthy()
    expect(screen.getByText('Preview unavailable')).toBeTruthy()
    expect(screen.getByText('Hydraulic hose damage')).toBeTruthy()
    expect(screen.getByText('Photo attached')).toBeTruthy()
  })
})

describe('EvidencePreview', () => {
  it('keeps unknown relative local assets independent of the current route', () => {
    render(
      <EvidencePreview
        evidence={{
          id: 'other-evidence',
          label: 'Other evidence',
          assetPath: 'evidence/other-image.png',
        }}
        alt="Other attached evidence"
      />,
    )

    expect(
      screen
        .getByRole('img', { name: 'Other attached evidence' })
        .getAttribute('src'),
    ).toBe('/evidence/other-image.png')
  })
})
