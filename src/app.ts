import { isAxiosError } from 'axios'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import 'dotenv/config'
import express, { NextFunction, Request, Response } from 'express'
import helmet from 'helmet'
import { StatusCodes } from 'http-status-codes'
import swaggerUi from 'swagger-ui-express'
import YAML from 'yamljs'

import { COOKIE_SECRET } from '@/lib/constants'
import { ERROR_CODES, ServerError } from '@/lib/types'

import apiRoutes from '@/routes'

import { corsOptions } from './lib/configs/cors'
import { rateLimiterOptions } from './lib/configs/limiter'

// Create the express app
const app = express()

// To avoid ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
app.set('trust proxy', 1 /* number of proxies between user and server */)

// Security Setup
app.use(helmet())
app.use(cors(corsOptions))
app.use(rateLimiterOptions)

// Parsing
app.use(express.json())
app.use(cookieParser(COOKIE_SECRET))

// Routes
app.get('/', async (req, res) => {
  res.send('Spendify API')
})

const swaggerDocument = YAML.load('./src/openapi/openapi.yaml')
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Swagger',
    customfavIcon: '/favicon.ico',
  }),
)

app.use('/favicon.ico', express.static('public/favicon.png'))

app.use('/openapi.yaml', (req, res) => {
  res.sendFile('./openapi/openapi.yaml', { root: __dirname })
})

app.get('/version', (req, res) => {
  res.json({ sha: process.env.GIT_REV || 'unknown' })
})

app.use('/api/v1', apiRoutes)

// custom 404
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((req, res, next) => {
  res.status(404).send("Sorry can't find that!")
})

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  let status = StatusCodes.INTERNAL_SERVER_ERROR
  let code = ERROR_CODES.UNKNOWN

  if (error instanceof ServerError) {
    status = error.status
    code = error.code || ERROR_CODES.UNKNOWN
  } else if (isAxiosError(error)) {
    console.error('Axios error:', error.message, error.response?.data)
  } else {
    console.error('Unhandled error:', error)
  }

  res.status(status).json({
    success: false,
    code,
  })
})

export default app
