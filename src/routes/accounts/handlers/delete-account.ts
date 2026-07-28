import { z } from 'zod'

import { ERROR_CODES, ServerError, ServerRequest, ServerResponse } from '@/lib/types'

import prisma from '@/services/prisma'

export const DeleteAccountSchema = z.object({
  params: z.object({
    accountId: z.string(),
  }),
})

type Request = z.infer<typeof DeleteAccountSchema>

/**
 * This removes connection between the user and account
 * and deletes the account if no other users are connected to it
 */
export const deleteAccount = async (req: ServerRequest<object, Request['params']>, res: ServerResponse) => {
  const { userId } = res.locals
  const { accountId } = req.params

  if (!userId) {
    throw new ServerError(401, ERROR_CODES.UNAUTHORIZED)
  }

  await prisma.accounts.delete({
    where: {
      id: accountId,
      user_id: userId,
    },
  })

  res.json({
    success: true,
  })
}
