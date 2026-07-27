import { format } from 'date-fns'
import { StatusCodes } from 'http-status-codes'
import groupBy from 'lodash/groupBy'
import { z } from 'zod'

import { ServerError, ServerRequest, ServerResponse } from '@/lib/types'

import { gocardlessCurrency } from '@/services/gocardless/utils/currency'
import prisma from '@/services/prisma'

export const GetAccountTransactionsMonthlyOverview = z.object({
  params: z.object({
    accountId: z.string(),
  }),
})

type Request = z.infer<typeof GetAccountTransactionsMonthlyOverview>

type ReducedTransactionMonthlyOverview = {
  date: string
  expenses: string
  income: string
  expensesInt: number
  incomeInt: number
}

export const getAccountTransactionsMonthlyOverview = async (
  req: ServerRequest<unknown, Request['params']>,
  res: ServerResponse,
) => {
  const { accountId } = req.params

  const account = await prisma.accounts.findFirst({
    where: {
      id: accountId,
      user_id: res.locals.userId,
    },
  })

  if (!account) {
    throw new ServerError(StatusCodes.BAD_REQUEST)
  }

  const transactions = await prisma.transactions.findMany({
    where: {
      account_id: accountId,
    },
    orderBy: {
      weight: 'desc',
    },
  })

  const groupedTransactionsByMonth = groupBy(transactions, (transaction) =>
    format(new Date(transaction.date), 'MMMM, yyyy'),
  )

  const reducedTransactions = Object.keys(groupedTransactionsByMonth).reduce(
    (acc: Array<ReducedTransactionMonthlyOverview>, value) => {
      let expenses = 0
      let income = 0

      groupedTransactionsByMonth[value]?.forEach((transaction) => {
        const amount = gocardlessCurrency(transaction.amount).value

        if (amount < 0) {
          expenses += amount * -1
        } else {
          income += amount
        }
      })

      acc.push({
        date: value,
        expenses: `${gocardlessCurrency(expenses).format()} ${account.currency}`,
        expensesInt: expenses,

        income: `${gocardlessCurrency(income).format()} ${account.currency}`,
        incomeInt: income,
      })

      return acc
    },
    [],
  )

  res.json({
    success: true,
    data: reducedTransactions,
  })
}
