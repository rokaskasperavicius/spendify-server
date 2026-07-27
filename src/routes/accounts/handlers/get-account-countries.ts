import { z } from 'zod'

import { GOCARDLESS_ALLOWED_COUNTRIES } from '@/lib/constants'
import { ServerRequest, ServerResponse } from '@/lib/types'

export const GetAccountCountriesSchema = z.object({
  query: z.object({}),
})

type Request = z.infer<typeof GetAccountCountriesSchema>

export const getAccountCountries = async (
  req: ServerRequest<object, object, Request['query']>,
  res: ServerResponse,
) => {
  const result = GOCARDLESS_ALLOWED_COUNTRIES.map((country) => ({
    id: country.id,
    name: country.name,
    flagUrl: `https://flagcdn.com/${country.id.toLowerCase()}.svg`,
  }))

  res.json({
    success: true,
    data: result,
  })
}
