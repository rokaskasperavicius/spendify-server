import jwt from 'jsonwebtoken'
import { z } from 'zod'

import { JWT_SECRET } from '@/lib/constants'
import { ERROR_CODES, ServerError, ServerRequest, ServerResponse } from '@/lib/types'

import {
  getAccountBalanceById,
  getAccountDetailsById,
  getAccountMetadata,
  getInstitutionById,
  getRequisitionById,
} from '@/services/gocardless/api'
import { gocardlessCurrency } from '@/services/gocardless/utils/currency'
import prisma from '@/services/prisma'

export const GetAvailableAccountsSchema = z.object({
  params: z.object({
    requisitionId: z.string(),
  }),
  query: z.object({
    secret: z.string(),
  }),
})

type Request = z.infer<typeof GetAvailableAccountsSchema>

export const getAvailableAccounts = async (
  req: ServerRequest<object, Request['params'], Request['query']>,
  res: ServerResponse,
) => {
  const { secret } = req.query
  const { requisitionId } = req.params
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

  // Check that requisitionId belongs to the user
  const existingRequisition = await prisma.accounts.findFirst({
    where: {
      requisitionId: requisitionId,
    },
  })

  if (existingRequisition && existingRequisition.user_id !== userId) {
    throw new ServerError(403, ERROR_CODES.FORBIDDEN)
  }

  const { data } = await getRequisitionById(requisitionId)

  if (!data.accounts || data.accounts?.length === 0) {
    res.json({
      success: true,
      data: [],
    })

    return
  }

  const accounts = data.accounts.map(async (accountId) => {
    const { data: metadata } = await getAccountMetadata(accountId)
    const { data: details } = await getAccountDetailsById(accountId)
    const { data: institution } = await getInstitutionById(String(metadata.institution_id))

    const {
      data: { balances },
    } = await getAccountBalanceById(accountId)

    return {
      accountId,
      accountName: metadata.name,
      accountIban: metadata.iban,
      accountBalance: `${gocardlessCurrency(balances && balances[0]?.balanceAmount.amount).format()} ${details.account.currency}`,
      institutionLogo: institution.logo,
    }
  })

  const resolved = await Promise.all(accounts)

  res.json({
    success: true,
    data: resolved,
  })
}
