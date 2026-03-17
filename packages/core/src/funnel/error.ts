import { z } from 'zod'
import { NamedError } from '../utils/error'

export const FunnelExperimentNotFoundError = NamedError.create('FunnelExperimentNotFoundError', z.void())

export const FunnelExperimentAlreadyStartedError = NamedError.create('FunnelExperimentAlreadyStartedError', z.void())

export const FunnelExperimentAlreadyActiveError = NamedError.create('FunnelExperimentAlreadyActiveError', z.void())

export const FunnelExperimentNoVariantsError = NamedError.create('FunnelExperimentNoVariantsError', z.void())

export const FunnelExperimentInvalidWeightsError = NamedError.create('FunnelExperimentInvalidWeightsError', z.void())

export const FunnelExperimentVariantNotPublishedError = NamedError.create(
  'FunnelExperimentVariantNotPublishedError',
  z.void(),
)

export const FunnelExperimentNotStartedError = NamedError.create('FunnelExperimentNotStartedError', z.void())

export const FunnelExperimentAlreadyEndedError = NamedError.create('FunnelExperimentAlreadyEndedError', z.void())

export const FunnelExperimentWinnerAlreadySelectedError = NamedError.create(
  'FunnelExperimentWinnerAlreadySelectedError',
  z.void(),
)

export const FunnelExperimentVariantInvalidError = NamedError.create('FunnelExperimentVariantInvalidError', z.void())
