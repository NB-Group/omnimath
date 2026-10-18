export type TeamMember = {
  name: string
  role: string
  bio?: string
  /** Drop a portrait into /public/team/ and reference it here, e.g. '/team/name.jpg'. */
  photo?: string
  accent: 'sun' | 'leaf' | 'navy'
}

/**
 * Placeholder roster — swap the names, roles and portraits in when the team
 * is ready to be announced. The layout is built for four people.
 */
export const team: TeamMember[] = [
  { name: 'Name to be announced', role: 'Founder & Director', accent: 'navy' },
  { name: 'Name to be announced', role: 'Competition Lead', accent: 'sun' },
  { name: 'Name to be announced', role: 'Schools & Partnerships', accent: 'leaf' },
  { name: 'Name to be announced', role: 'Design & Communications', accent: 'navy' },
]
