import { createContext, useContext } from 'react'

export const FieldInspectionContextHostContext =
  createContext<HTMLDivElement | null>(null)

export function useFieldInspectionContextHost() {
  return useContext(FieldInspectionContextHostContext)
}
