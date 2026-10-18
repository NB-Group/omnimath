import type { YearLevel } from '../lib/site'
import { years, yearChallengeRanges } from '../lib/site'
import { worlds } from './worlds'

export type Challenge = {
  id: number
  title: string
  world: string
  accent: 'sun' | 'leaf' | 'paper'
  /** Add a PDF link here when the challenge pack is ready. */
  pdf: string | null
  status: 'preview' | 'released'
}

export const challenges: Challenge[] = Array.from({ length: 15 }, (_, index) => {
  const id = index + 1
  const world = worlds[index % worlds.length]
  return {
    id,
    title: `Challenge ${String(id).padStart(2, '0')}`,
    world: world.title,
    accent: world.accent,
    pdf: null,
    status: 'preview' as const,
  }
})

export function yearsForChallenge(id: number): YearLevel[] {
  return years.filter((year) => {
    const range = yearChallengeRanges[year]
    return id >= range.from && id <= range.to
  })
}
