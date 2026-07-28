import { AxiosResponse } from 'axios'

import { gocardlessApi } from './api-service'
import {
  AccountBalance,
  AccountDetails,
  AccountMetadata,
  AccountTransactions,
  EndUserAgreement,
  EndUserAgreementBody,
  Institution,
  Institutions,
  Requisition,
  RequisitionBody,
  RequisitionInfo,
} from './types'

export const createNordigenAgreement = (body: EndUserAgreementBody) =>
  gocardlessApi.post<EndUserAgreement, AxiosResponse<EndUserAgreement>, EndUserAgreementBody>(
    '/agreements/enduser/',
    body,
  )

export const createNordigenRequisition = (body: RequisitionBody) =>
  gocardlessApi.post<Requisition, AxiosResponse<Requisition>, RequisitionBody>('/requisitions/', body)

export const getAccountBalanceById = async (accountId: string) => {
  const {
    data: { balances },
  } = await gocardlessApi.get<AccountBalance>(`/accounts/${accountId}/balances/`)
  const finalBalanceTypes = ['closingBooked', 'expected', 'interimBooked']

  if (!balances || balances.length === 0) return '0'

  const balance = balances.find((balance) => finalBalanceTypes.includes(balance.balanceType))

  // If finalBalanceTypes is missing some other type, fallback to first in list
  // https://developer.gocardless.com/bank-account-data/balance/#balance_type
  if (!balance) {
    return balances[0]?.balanceAmount.amount || '0'
  }

  return balance.balanceAmount.amount
}

export const getAccountDetailsById = (accountId: string) =>
  gocardlessApi.get<AccountDetails>(`/accounts/${accountId}/details/`)

export const getAccountMetadata = (accountId: string) => gocardlessApi.get<AccountMetadata>(`/accounts/${accountId}/`)

/**
 * @param dateFrom YYYY-MM-DD
 */
export const getAccountTransactionsById = (accountId: string, dateFrom?: string) =>
  gocardlessApi.get<AccountTransactions>(
    `/accounts/${accountId}/transactions/${dateFrom ? `?date_from=${dateFrom}` : ''}`,
  )

export const getInstitutionById = (institutionId: string) =>
  gocardlessApi.get<Institution>(`/institutions/${institutionId}`)

export const getInstitutions = (country: string) => gocardlessApi.get<Institutions>(`/institutions/?country=${country}`)

export const getRequisitionById = (requisitionId: string) =>
  gocardlessApi.get<RequisitionInfo>(`/requisitions/${requisitionId}/`)
