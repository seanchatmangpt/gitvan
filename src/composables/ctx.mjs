import { createContext } from 'unctx'

// Global gitvan context
const GV = createContext()

export function withGitVan(ctx, fn) {
  return GV.call(ctx, fn)
}

export function useGitVan() {
  return GV.use()
}