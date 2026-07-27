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

export const getAccountBalanceById = (accountId: string) =>
  gocardlessApi.get<AccountBalance>(`/accounts/${accountId}/balances/`)

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
