import { formatISO, subDays } from 'date-fns'

import { REQUISITION_STATUS } from '@/lib/constants'

import { getAccountBalanceById, getAccountTransactionsById } from '@/services/gocardless/api'
import { gocardlessCurrency } from '@/services/gocardless/utils/currency'
import { transformTransactions } from '@/services/gocardless/utils/transform-transactions'
import prisma from '@/services/prisma'

export const syncTransactions = async (accountId?: string) => {
  const accounts = await prisma.accounts.findMany({
    where: {
      ...(accountId ? { id: accountId } : {}),
      status: REQUISITION_STATUS.LINKED,
    },
  })

  for (const account of accounts) {
    try {
      /**
       * GoCardless API requires the date in ISO 8601 e.g. YYYY-MM-DD
       * We subtract 2 days from the last_synced date to make sure we get all the new transactions
       **/
      const fromDate = formatISO(subDays(new Date(account.last_synced), 2), { representation: 'date' })
      const balance = await getAccountBalanceById(account.id)

      const {
        data: { transactions },
      } = await getAccountTransactionsById(account.id, fromDate)

      const totalBalance = gocardlessCurrency(balance).value
      const transformed = transformTransactions(transactions.booked, totalBalance).reverse()

      const results = await prisma.$transaction([
        // Update the account balance and last_synced date
        prisma.accounts.update({
          where: {
            id: account.id,
          },
          data: {
            balance: totalBalance,
            last_synced: new Date(),
          },
        }),

        // Insert new transactions
        prisma.transactions.createMany({
          data: transformed.map((transaction) => ({
            id: transaction.transactionId,
            account_id: account.id,
            title: transaction.title,
            category: transaction.category,
            amount: transaction.amount,
            total_amount: transaction.totalAmount,
            date: new Date(transaction.valueDate),
          })),
          skipDuplicates: true,
        }),
      ])

      console.info(`[INFO] Synced ${results[1].count} new transactions for account ${account.id}`)
    } catch (error) {
      console.error(`Error syncing transactions for account ${account.id} with error: ${error}`)
    }
  }
}
