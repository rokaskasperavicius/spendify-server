import express from 'express'

import { validateSchema, verifyUser } from '@/middlewares'

import { CreateAccountSchema, createAccount } from './handlers/create-account'
import { CreateAccountRequisitionSchema, createAccountRequisition } from './handlers/create-account-requisition'
import { DeleteAccountSchema, deleteAccount } from './handlers/delete-account'
import { GetAccountCountriesSchema, getAccountCountries } from './handlers/get-account-countries'
import { GetAccountInstitutionsSchema, getAccountInstitutions } from './handlers/get-account-institutions'
import { GetAccountTransactionsSchema, getAccountTransactions } from './handlers/get-account-transactions'
import {
  GetAccountTransactionsMonthlyOverview,
  getAccountTransactionsMonthlyOverview,
} from './handlers/get-account-transactions-monthly-overview'
import { getAccounts } from './handlers/get-accounts'
import { GetAvailableAccountsSchema, getAvailableAccounts } from './handlers/get-available-accounts'
import {
  RunAccountTransactionCategorizationSchema,
  runAccountTransactionCategorization,
} from './handlers/run-account-transaction-categorization'
import { SyncAccountStatusesSchema, syncAccountStatusesHandler } from './handlers/sync-account-statuses'
import { SyncAccountTransactionsSchema, syncAccountTransactions } from './handlers/sync-account-transactions'

const app = express.Router()

app.get('/countries', validateSchema(GetAccountCountriesSchema), getAccountCountries)
app.get('/institutions', validateSchema(GetAccountInstitutionsSchema), getAccountInstitutions)

app.post('/create-requisition', verifyUser, validateSchema(CreateAccountRequisitionSchema), createAccountRequisition)
app.get('/available/:requisitionId', verifyUser, validateSchema(GetAvailableAccountsSchema), getAvailableAccounts)
app.get('/', verifyUser, getAccounts)
app.post('/', verifyUser, validateSchema(CreateAccountSchema), createAccount)
app.get('/:accountId/transactions', verifyUser, validateSchema(GetAccountTransactionsSchema), getAccountTransactions)
app.get(
  '/:accountId/transactions/monthly-overview',
  verifyUser,
  validateSchema(GetAccountTransactionsMonthlyOverview),
  getAccountTransactionsMonthlyOverview,
)
app.delete('/:accountId', verifyUser, validateSchema(DeleteAccountSchema), deleteAccount)
app.get('/sync', validateSchema(SyncAccountStatusesSchema), syncAccountStatusesHandler)
app.get('/transactions/sync', validateSchema(SyncAccountTransactionsSchema), syncAccountTransactions)
app.get(
  '/transactions/categorize-batch',
  validateSchema(RunAccountTransactionCategorizationSchema),
  runAccountTransactionCategorization,
)

export default app
