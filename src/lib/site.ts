export const site = {
  name: 'Omnimath',
  legal: 'Omnimath',
  tagline: 'Mathematics beyond the classroom',
  description:
    'A New Zealand mathematics competition where students in Years 5–8 solve six real-world challenges across six weeks.',
  url: 'https://omnimath.co.nz',
  year: 2027,
  country: 'Aotearoa New Zealand',
  emails: {
    general: 'hello@omnimath.co.nz',
    schools: 'schools@omnimath.co.nz',
  },
  social: {
    instagram: '',
    linkedin: '',
  },
} as const

export type NavItem = {
  label: string
  to: string
  children?: { label: string; to: string; description: string }[]
}

export const navigation: NavItem[] = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  {
    label: 'The Competition',
    to: '/competition',
    children: [
      {
        label: 'Challenges',
        to: '/competition/challenges',
        description: 'Fifteen challenges across six real-world worlds.',
      },
      {
        label: 'Submissions',
        to: '/competition/submissions',
        description: 'What to hand in, how it is marked, and when.',
      },
    ],
  },
  { label: 'For Schools', to: '/schools' },
  { label: 'Contact', to: '/contact' },
]

export const years = [5, 6, 7, 8] as const
export type YearLevel = (typeof years)[number]

/** Which challenges belong to each year level, from the competition brief. */
export const yearChallengeRanges: Record<YearLevel, { from: number; to: number; note?: string }> = {
  5: { from: 1, to: 7, note: 'Choose six of seven.' },
  6: { from: 4, to: 9 },
  7: { from: 8, to: 13 },
  8: { from: 10, to: 15 },
}
