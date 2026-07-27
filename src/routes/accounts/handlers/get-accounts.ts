import { ServerRequest, ServerResponse } from '@/lib/types'

import { gocardlessCurrency } from '@/services/gocardless/utils/currency'
import prisma from '@/services/prisma'

export const getAccounts = async (req: ServerRequest, res: ServerResponse) => {
  const accounts = await prisma.accounts.findMany({
    where: {
      user_id: res.locals.userId,
    },
    orderBy: {
      weight: 'desc',
    },
    include: {
      institutions: {
        select: {
          id: true,
          name: true,
          logo: true,
        },
      },
    },
  })

  res.json({
    success: true,
    data: {
      accounts: accounts.map((account) => ({
        id: account.id,
        name: account.name,
        iban: account.iban,
        status: account.status,
        balance: `${gocardlessCurrency(account.balance).format()} ${account.currency}`,
        institutionId: account.institutions.id,
        institutionName: account.institutions?.name,
        institutionLogo: account.institutions?.logo,
        lastSyncedAt: account.last_synced,
      })),
    },
  })
}
