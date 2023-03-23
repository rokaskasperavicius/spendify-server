import { validationResult } from 'express-validator'
import currency from 'currency.js'
import fuzzysort from 'fuzzysort'
import { BayesClassifier } from 'natural'
import { startOfDay, endOfDay } from 'date-fns'
import { v4 as uuid } from 'uuid'
import { faker } from '@faker-js/faker'

// Helpers
import {
  getNordigenInstitutions,
  getNordigenAccountTransactions,
  getNordigenAccountMeta,
  getNordigenInstitution,
  getNordigenAccountBalances,
  getNordigenAccountDetails,
  getNordigenRequisitions,
  createNordigenAgreement,
  createNordigenRequisition,
} from '@layers/nordigen/nordigen.utils'

import { getUserAccountWithAccountId, getUserAccounts, createUserAccount } from '@layers/database/database.utils'

// Types
import { ServerError, ServerRequest, ServerResponse } from '@global/types'
import {
  CreateAccountRequisitionBody,
  GetAvailableAccountsParams,
  GetAccountTransactionsParams,
  GetAccountTransactionsQuery,
  CreateAccountBody,
} from '@layers/api/accounts/accounts.types'

// Constants
import { MOCKED_USER_ID, NORDIGEN_CURRENCY, FORMATTED_CURRENCY } from '@global/constants'

// Mocks
import { mockedTransactions } from '@mocks/mockedTransactions'

const nordigenCurrency = (value: string) => currency(value, NORDIGEN_CURRENCY)

export const getAccountInstitutions = async (req: ServerRequest, res: ServerResponse) => {
  const { data: institutions } = await getNordigenInstitutions()

  res.json({
    success: true,

    data: institutions.map(({ id, name, logo }) => ({
      id: id,
      bankName: name,
      bankLogo: logo,
    })),
  })
}

export const createAccountRequisition = async (
  req: ServerRequest<CreateAccountRequisitionBody>,
  res: ServerResponse
) => {
  validationResult(req).throw()

  const { institutionId, redirect } = req.body

  // MOCKED

  if (res.locals.userId === MOCKED_USER_ID) {
    res.json({
      success: true,

      data: {
        url: `${redirect}?ref=${uuid()}`,
      },
    })

    return
  }

  // MOCKED

  const { data: agreement } = await createNordigenAgreement({ institutionId })

  const { data: requisition } = await createNordigenRequisition({
    redirect,
    institutionId,
    agreementId: agreement.id,
  })

  res.json({
    success: true,

    data: {
      url: requisition.link,
    },
  })
}

export const getAvailableAccounts = async (
  req: ServerRequest<object, GetAvailableAccountsParams>,
  res: ServerResponse
) => {
  validationResult(req).throw()

  const { requisitionId } = req.params

  // MOCKED

  if (res.locals.userId === MOCKED_USER_ID) {
    res.json({
      success: true,

      data: [
        {
          requisitionId,
          accountId: uuid(),
          accountName: 'Fake Account',
          accountIban: 'DK7050516477944871',
          accountBalance: '20.000,00',
        },
      ],
    })

    return
  }

  // MOCKED

  const { data } = await getNordigenRequisitions({ requisitionId })

  const accounts = []

  for (const accountId of data.accounts) {
    const { data: details } = await getNordigenAccountDetails({ accountId })
    const { data: balances } = await getNordigenAccountBalances({ accountId })

    accounts.push({
      requisitionId,
      accountId,
      accountName: details.account.name,
      accountIban: details.account.iban,
      accountBalance: nordigenCurrency(balances.balances[0].balanceAmount.amount).format(FORMATTED_CURRENCY),
    })
  }

  res.json({
    success: true,
    data: accounts,
  })
}

export const getAccounts = async (req: ServerRequest, res: ServerResponse) => {
  const data = await getUserAccounts({ userId: res.locals.userId })

  // MOCKED
  if (res.locals.userId === MOCKED_USER_ID) {
    const mockedAccounts = []

    for (const account of data) {
      mockedAccounts.push({
        id: account.id,
        requisitionId: account.requisition_id,
        accountId: account.account_id,
        accountBalance: '20.000,00',
        accountName: account.account_name,
        accountIban: account.account_iban,
        bankName: account.bank_name,
        bankLogo: account.bank_logo,
      })
    }

    res.json({
      success: true,

      data: mockedAccounts,
    })

    return
  }
  // MOCKED

  const accounts = []

  for (const account of data) {
    const { data: balances } = await getNordigenAccountBalances({ accountId: account.account_id })

    accounts.push({
      id: account.id,
      requisitionId: account.requisition_id,
      accountId: account.account_id,
      accountBalance: nordigenCurrency(balances.balances[0].balanceAmount.amount).format(FORMATTED_CURRENCY),
      accountName: account.account_name,
      accountIban: account.account_iban,
      bankName: account.bank_name,
      bankLogo: account.bank_logo,
    })
  }

  res.json({
    success: true,
    data: accounts,
  })
}

export const createAccount = async (req: ServerRequest<CreateAccountBody>, res: ServerResponse) => {
  validationResult(req).throw()

  const { requisitionId, accountId } = req.body

  const { userId } = res.locals

  // MOCKED

  if (userId === MOCKED_USER_ID) {
    await createUserAccount({
      userId,
      requisitionId,
      accountId,
      accountName: faker.finance.accountName(),
      accountIban: faker.finance.iban(true, 'DK'),
      bankName: 'Fake Bank',
      bankLogo:
        'https://w7.pngwing.com/pngs/42/185/png-transparent-fake-news-bank-account-money-balance-others-text-trademark-logo.png',
    })

    res.json({
      success: true,
    })

    return
  }

  // MOCKED

  const { data: accountDetails } = await getNordigenAccountDetails({ accountId })
  const { data: accountMeta } = await getNordigenAccountMeta({ accountId })
  const { data: bankInfo } = await getNordigenInstitution({ institutionId: accountMeta.institution_id })

  await createUserAccount({
    userId,
    requisitionId,
    accountId,
    accountName: accountDetails.account.name,
    accountIban: accountDetails.account.iban,
    bankName: bankInfo.name,
    bankLogo: bankInfo.logo,
  })

  res.json({
    success: true,
  })
}

export const getAccountTransactions = async (
  req: ServerRequest<object, GetAccountTransactionsParams, GetAccountTransactionsQuery>,
  res: ServerResponse
) => {
  validationResult(req).throw()

  const { accountId } = req.params
  const { search, category, from, to } = req.query

  // MOCKED
  const isMock = res.locals.userId === MOCKED_USER_ID
  const mockedTransactionsObject = {
    data: {
      transactions: {
        booked: mockedTransactions,
      },
    },
  }

  const mockedCurrentBalance = '20000.00'
  const mokedBalanceObject = {
    data: {
      balances: [
        {
          balanceAmount: {
            amount: mockedCurrentBalance,
          },
        },
      ],
    },
  }
  // MOCKED

  const accounts = await getUserAccountWithAccountId({ userId: res.locals.userId, accountId })
  const account = accounts[0]

  if (!account) {
    throw new ServerError(403)
  }

  const { data: transactionsInfo } = !isMock
    ? await getNordigenAccountTransactions({
        accountId: account.account_id,
      })
    : mockedTransactionsObject

  const { data: balances } = !isMock
    ? await getNordigenAccountBalances({ accountId: account.account_id })
    : mokedBalanceObject

  const transactions = transactionsInfo.transactions.booked
  let currentBalance = balances.balances[0].balanceAmount.amount

  // Map cumulative balance
  let mappedTransactions = transactions.map((transaction, index) => {
    // Skip first transaction
    if (index !== 0) {
      const prevTransactionAmount = transactions[index - 1].transactionAmount.amount

      currentBalance = nordigenCurrency(currentBalance).subtract(prevTransactionAmount).format()
    }

    return {
      id: transaction.transactionId,
      weight: index,
      title: transaction.remittanceInformationUnstructuredArray[0],
      date: new Date(transaction.bookingDate),

      amount: nordigenCurrency(transaction.transactionAmount.amount).format(FORMATTED_CURRENCY),
      totalAmount: nordigenCurrency(currentBalance).format(FORMATTED_CURRENCY),
      totalAmountInt: nordigenCurrency(currentBalance).value,
    }
  })

  // Apply fuzzysort
  mappedTransactions = search
    ? fuzzysort.go(search, mappedTransactions, { key: 'title', threshold: -400 }).map((search) => search.obj)
    : mappedTransactions

  // Apply interval filtering
  mappedTransactions =
    from && to
      ? mappedTransactions.filter((transaction) => {
          const transactionDate = new Date(transaction.date)
          const fromDate = startOfDay(new Date(from))
          const endDate = endOfDay(new Date(to))

          return transactionDate >= fromDate && transactionDate <= endDate
        })
      : mappedTransactions

  // Apply categorization
  BayesClassifier.load('./src/config/model.json', null, (err, classifier) => {
    const categorizedTransactions = []

    for (const transaction of mappedTransactions) {
      const classifiedCategory = classifier.getClassifications(transaction.title)[0].label

      if (!category || category === classifiedCategory) {
        categorizedTransactions.push({
          ...transaction,
          category: classifiedCategory,
        })
      }
    }

    res.json({
      success: true,
      data: categorizedTransactions.sort((prev, next) => prev.weight - next.weight),
    })
  })
}