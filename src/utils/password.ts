const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const lowercase = 'abcdefghijklmnopqrstuvwxyz'
const numbers = '0123456789'
const symbols = '!@#$%^&*()-_=+[]{}:,.?'

export type PasswordGeneratorOptions = { length: number; uppercase: boolean; lowercase: boolean; numbers: boolean; symbols: boolean }

function randomIndex(maximum: number) {
  if (maximum < 1) throw new Error('No password characters available.')
  const limit = 0x100000000 - (0x100000000 % maximum)
  const value = new Uint32Array(1)
  do crypto.getRandomValues(value); while (value[0] >= limit)
  return value[0] % maximum
}

function randomCharacter(characters: string) {
  return characters[randomIndex(characters.length)]
}

export function generateSecurePassword(options: PasswordGeneratorOptions) {
  const groups = [options.uppercase ? uppercase : '', options.lowercase ? lowercase : '', options.numbers ? numbers : '', options.symbols ? symbols : ''].filter(Boolean)
  if (!groups.length) throw new Error('Choose at least one character group.')
  if (options.length < groups.length) throw new Error('Length must include every selected character group.')
  const pool = groups.join('')
  const characters = groups.map(randomCharacter)
  while (characters.length < options.length) characters.push(randomCharacter(pool))
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1)
    const current = characters[index]
    characters[index] = characters[swapIndex]
    characters[swapIndex] = current
  }
  return characters.join('')
}

export function passwordStrength(value: string) {
  const groups = [/[A-Z]/.test(value), /[a-z]/.test(value), /\d/.test(value), /[^A-Za-z\d]/.test(value)].filter(Boolean).length
  if (value.length < 8 || groups < 2) return 'Weak'
  if (value.length < 12 || groups < 3) return 'Fair'
  return 'Strong'
}

export function validateMasterPassword(value: string) {
  if (value.length < 12) return 'Use at least 12 characters for your vault master password.'
  return ''
}
