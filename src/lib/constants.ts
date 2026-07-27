import { components } from '@/services/gocardless/generated'

// Global
export const NODE_ENV = process.env.NODE_ENV as string
export const MOCKS_ENABLED = process.env.MOCKS_ENABLED as string
export const DATABASE_URL = process.env.DATABASE_URL as string
export const COOKIE_SECRET = process.env.COOKIE_SECRET as string
export const JWT_SECRET = process.env.JWT_SECRET as string
export const SYNC_ADMIN_KEY = process.env.SYNC_ADMIN_KEY as string
export const GENAI_CATEGORIZATION_ENABLED = process.env.GENAI_CATEGORIZATION_ENABLED === 'true'
export const SYNC_TRANSACTIONS_ENABLED = process.env.SYNC_TRANSACTIONS_ENABLED === 'true'
export const SYNC_ACCOUNT_STATUSES_ENABLED = process.env.SYNC_ACCOUNT_STATUSES_ENABLED === 'true'

// GoCardless
export const GOCARDLESS_BASE_URL = process.env.GOCARDLESS_BASE_URL as string
export const GOCARDLESS_SECRET_ID = process.env.GOCARDLESS_SECRET_ID as string
export const GOCARDLESS_SECRET_KEY = process.env.GOCARDLESS_SECRET_KEY as string
export const GOCARDLESS_ALLOWED_COUNTRIES = [
  {
    id: 'DK',
    name: 'Denmark',
  },
  {
    id: 'LT',
    name: 'Lithuania',
  },
]

export const GOCARDLESS_ACCESS_SCOPE = ['balances', 'details', 'transactions']
export const GOCARDLESS_SANDBOX_INSTITUTION_ID = 'SANDBOXFINANCE_SFIN0000'

// https://developer.gocardless.com/bank-account-data/statuses/
type REQUISITION_STATUS_TYPES = components['schemas']['StatusEnum']
export const REQUISITION_STATUS = {
  CREATED: 'CR',
  GIVING_CONSENT: 'GC',
  UNDERGOING_AUTHENTICATION: 'UA',
  REJECTED: 'RJ',
  SELECTING_ACCOUNTS: 'SA',
  GRANTING_ACCESS: 'GA',
  LINKED: 'LN',
  EXPIRED: 'EX',
  ID: 'ID',
  ER: 'ER',
  SU: 'SU',
} as const satisfies Record<string, REQUISITION_STATUS_TYPES>

// Google AI
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY as string

// Other
export const GOCARDLESS_CURRENCY = { symbol: '', separator: '', decimal: '.' }
export const FORMATTED_CURRENCY = { symbol: '', decimal: ',', separator: '.' }
export const PASSWORD_SALT_ROUNDS = 12
export const TRANSACTION_CATEGORIES_AI = [
  'Food & Groceries',
  'Shopping',
  'Transfers',
  'Income',
  'Utilities',
  'Transportation',
  'Other',
]
