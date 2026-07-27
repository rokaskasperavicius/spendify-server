import { endOfDay, startOfDay } from 'date-fns'
import fuzzysort from 'fuzzysort'
import { StatusCodes } from 'http-status-codes'
import { z } from 'zod'

import { TRANSACTION_CATEGORIES_AI } from '@/lib/constants'
import { ServerError, ServerRequest, ServerResponse } from '@/lib/types'

import { gocardlessCurrency } from '@/services/gocardless/utils/currency'
import prisma from '@/services/prisma'

export const GetAccountTransactionsSchema = z.object({
  params: z.object({
    accountId: z.string(),
  }),

  query: z.object({
    search: z.string().optional(),
    category: z.enum([...TRANSACTION_CATEGORIES_AI] as [string, ...string[]]).optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  }),
})

type Request = z.infer<typeof GetAccountTransactionsSchema>

export const getAccountTransactions = async (
  req: ServerRequest<object, Request['params'], Request['query']>,
  res: ServerResponse,
) => {
  const { accountId } = req.params
  const { search, category, from, to } = req.query

  const account = await prisma.accounts.findFirst({
    where: {
      id: accountId,
      user_id: res.locals.userId,
    },
  })

  if (!account) {
    throw new ServerError(StatusCodes.BAD_REQUEST)
  }

  let transactions = await prisma.transactions.findMany({
    where: {
      account_id: accountId,
    },
    orderBy: {
      weight: 'desc',
    },
  })

  // Apply fuzzysort
  transactions = search
    ? fuzzysort.go(search, transactions, { key: 'title', threshold: -400 }).map((search) => search.obj)
    : transactions

  // from
  transactions = transactions.filter((transaction) => {
    if (!from) return true

    const transactionDate = transaction.date.getTime()
    const fromDate = startOfDay(new Date(from)).getTime()

    return transactionDate >= fromDate
  })

  // to
  transactions = transactions.filter((transaction) => {
    if (!to) return true

    const transactionDate = transaction.date.getTime()
    const endDate = endOfDay(new Date(to)).getTime()

    return transactionDate <= endDate
  })

  transactions = transactions.filter((transaction) => !category || transaction.category_ai === category)

  // sort by weight in descending order
  transactions.sort((result, next) => result.weight - next.weight)

  res.json({
    success: true,
    data: transactions.map((transaction) => ({
      id: transaction.id,
      title: transaction.title,
      weight: transaction.weight,
      amount: `${gocardlessCurrency(transaction.amount).format()} ${account.currency}`,
      totalAmount: `${gocardlessCurrency(transaction.total_amount).format()} ${account.currency}`,
      amountInt: transaction.amount,
      totalAmountInt: transaction.total_amount,
      category: transaction.category_ai,
      date: transaction.date,
    })),
  })
}
