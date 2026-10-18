export type World = {
  id: string
  title: string
  short: string
  description: string
  question: string
  formula: string
  accent: 'sun' | 'leaf' | 'paper'
}

export const worlds: World[] = [
  {
    id: 'elections',
    title: 'Elections and society',
    short: 'Elections',
    description:
      'Voting systems, representation and the mathematics of collective decisions. What does a fair result actually look like?',
    question: 'Can a voting system be fair to everyone at once?',
    formula: String.raw`\text{majority} = \left\lfloor \tfrac{n}{2} \right\rfloor + 1`,
    accent: 'sun',
  },
  {
    id: 'history',
    title: 'History and civilisations',
    short: 'History',
    description:
      'Dates, dynasties and the hidden patterns in the historical record. Mathematics is one of the sharpest tools we have for reading the past.',
    question: 'How old is this object, really?',
    formula: String.raw`N(t) = N_0 \, e^{-kt}`,
    accent: 'paper',
  },
  {
    id: 'economics',
    title: 'Economics and decisions',
    short: 'Economics',
    description:
      'Trade-offs, incentives and optimal choices under constraint. Every decision has a cost, and mathematics makes it visible.',
    question: 'What is the best choice when everything has a price?',
    formula: String.raw`\max_{x}\; U(x) \quad \text{s.t.} \quad p \cdot x \le m`,
    accent: 'leaf',
  },
  {
    id: 'games',
    title: 'Games and strategies',
    short: 'Games',
    description:
      'Strategy, equilibrium and the logic of competition. From board games to penalty shootouts, maths can tell you what to do next.',
    question: 'What should you play when your opponent is thinking too?',
    formula: String.raw`u_i(s_i^*, s_{-i}^*) \ge u_i(s_i, s_{-i}^*)\;\forall s_i`,
    accent: 'sun',
  },
  {
    id: 'science',
    title: 'Science and environment',
    short: 'Science',
    description:
      'Models of growth, decay and the systems that shape our planet. Equations let us ask what happens next before it does.',
    question: 'How do populations grow, and when do they stop?',
    formula: String.raw`\frac{dN}{dt} = rN\!\left(1-\frac{N}{K}\right)`,
    accent: 'leaf',
  },
  {
    id: 'systems',
    title: 'Everyday systems',
    short: 'Everyday systems',
    description:
      'Timetables, networks and the mathematics of daily life. The most ordinary systems are often the most surprising.',
    question: 'What is the fastest way through a network?',
    formula: String.raw`d(A,B) = \min_{p \in P} \sum_{e \in p} w(e)`,
    accent: 'paper',
  },
]
