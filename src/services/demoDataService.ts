import { fieldSafeRepository } from '../repositories'

export async function initializeFieldSafeData() {
  await fieldSafeRepository.initialize()
}

export async function resetDemoData() {
  await fieldSafeRepository.resetDemoData()
}
