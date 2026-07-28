import jwt from 'jsonwebtoken'
import { z } from 'zod'

import { JWT_SECRET } from '@/lib/constants'
import { ERROR_CODES, ServerError, ServerRequest, ServerResponse } from '@/lib/types'

import {
  getAccountBalanceById,
  getAccountDetailsById,
  getAccountMetadata,
  getAccountTransactionsById,
  getInstitutionById,
  getRequisitionById,
} from '@/services/gocardless/api'
import { gocardlessCurrency } from '@/services/gocardless/utils/currency'
import { transformTransactions } from '@/services/gocardless/utils/transform-transactions'
import prisma from '@/services/prisma'

export const CreateAccountSchema = z.object({
  body: z.object({
    secret: z.string(),
    accountId: z.string(),
    requisitionId: z.string(),
  }),
})

type Request = z.infer<typeof CreateAccountSchema>

export const createAccount = async (req: ServerRequest<Request['body']>, res: ServerResponse) => {
  const { secret, accountId, requisitionId } = req.body
  const { userId } = res.locals

  // Check that the secret is valid
  try {
    const decoded = jwt.verify(secret, JWT_SECRET) as jwt.JwtPayload

    if (decoded.userId !== userId) {
      throw new ServerError(403, ERROR_CODES.FORBIDDEN)
    }
  } catch {
    throw new ServerError(403, ERROR_CODES.FORBIDDEN)
  }

  // Check that accountId belongs to the requisitionId
  const { data: requisition } = await getRequisitionById(requisitionId)
  const belongsToRequisition = requisition.accounts?.some((account) => account === accountId)

  if (!belongsToRequisition) {
    throw new ServerError(403, ERROR_CODES.FORBIDDEN)
  }

  // Check that requisitionId belongs to the user
  const existingRequisition = await prisma.accounts.findFirst({
    where: {
      requisitionId: requisitionId,
    },
  })

  if (existingRequisition && existingRequisition.user_id !== userId) {
    throw new ServerError(403, ERROR_CODES.FORBIDDEN)
  }

  // Check if the account already exists and belongs to the user
  const existingAccount = await prisma.accounts.findFirst({
    where: {
      id: accountId,
    },
  })

  if (existingAccount && existingAccount.user_id !== userId) {
    throw new ServerError(403, ERROR_CODES.DUPLICATE_ACCOUNTS)
  }

  // TODO: Catch errors from gocardless and check if 429 rate limit is reached
  // RequisitionID should still be updated in that case, just not the account info.
  const { data: metadata } = await getAccountMetadata(accountId)
  const { data: details } = await getAccountDetailsById(accountId)
  const balance = await getAccountBalanceById(accountId)
  const { data: institution } = await getInstitutionById(String(metadata.institution_id))

  const totalBalance = gocardlessCurrency(balance).value

  const institutionData = {
    id: institution.id,
    name: institution.name,
    logo: institution.logo,
  }

  await prisma.accounts
    .upsert({
      where: {
        id: accountId,
        user_id: userId,
      },
      update: {
        name: metadata?.name,
        iban: metadata?.iban,
        status: requisition?.status,
        currency: details.account.currency,
        balance: totalBalance,
        requisitionId: requisitionId,
        last_synced: new Date(),

        institutions: {
          connectOrCreate: {
            where: {
              id: institutionData.id,
            },
            create: institutionData,
          },
        },
      },
      create: {
        id: accountId,
        name: metadata?.name,
        iban: metadata?.iban,
        status: requisition?.status,
        currency: details.account.currency,
        balance: totalBalance,
        requisitionId: requisitionId,
        last_synced: new Date(),

        users: {
          connect: {
            id: userId,
          },
        },

        institutions: {
          connectOrCreate: {
            create: institutionData,
            where: {
              id: institutionData.id,
            },
          },
        },
      },
    })
    .catch((error) => {
      if (error?.code === 'P2002') {
        throw new ServerError(400, ERROR_CODES.DUPLICATE_ACCOUNTS)
      }

      throw error
    })

  // Here we sync transactions
  const { data } = await getAccountTransactionsById(accountId)

  // Reversing is important because we want to insert the oldest transactions first
  // This way the database will have autoincremented IDs that we can use as the sorting weight
  const transformed = transformTransactions(data.transactions.booked, totalBalance).reverse()

  const result = await prisma.transactions.createMany({
    data: transformed.map((transaction) => ({
      id: transaction.transactionId,
      account_id: accountId,
      title: transaction.title,
      category: transaction.category,
      amount: transaction.amount,
      total_amount: transaction.totalAmount,
      date: new Date(transaction.valueDate),
    })),
    skipDuplicates: true,
  })

  console.info(`[INFO] Inserted ${result.count} transactions for account ${accountId}`)

  res.json({
    success: true,
  })
}
