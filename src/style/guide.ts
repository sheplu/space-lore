export const STYLE_GUIDE = {
  language: 'en',
  tone: [
    'evocative but concrete: anchor every flourish in a physical detail',
    'confident canon: write facts about the world, not options or suggestions',
    'grounded science flavor with room for the impossible',
  ],
  naming: {
    pattern: 'invented proper nouns; avoid real-world mythology and trademarked names',
    starExamples: ['Cinderveil', 'Halcyon Reach', 'Ashen Meridian'],
    planetExamples: ['Meridian Deep', 'Rustfall', 'The Pale Shallows'],
    anomalyExamples: ['The Wound in Cassiopeia', 'Vireth Echo', 'The Slow Door'],
  },
  lengths: {
    nameChars: [3, 60],
    descriptionWordsHint: '60–200 words (hard limit 80–2000 chars)',
  },
  descriptionRecipe: [
    'one sentence of physical appearance',
    'one sentence of notable behavior or history',
    'one sentence of hook or danger for players',
  ],
  tagsGuidance: '2–6 lowercase tags capturing type, mood and danger for engine filtering',
  donts: [
    'no Earth place names or living-person references',
    'no numbers outside taxonomy ranges — validation will reject them',
    'no meta commentary in lore text ("this planet is great for...")',
    'never edit schemas or taxonomy to make invalid output pass',
  ],
} as const
