import { z } from 'zod'
import { NamedError } from '../utils/error'

export const ExperimentAlreadyStartedError = NamedError.create('ExperimentAlreadyStartedError', z.void())

export const ExperimentAlreadyActiveError = NamedError.create('ExperimentAlreadyActiveError', z.void())

export const ExperimentNoVariantsError = NamedError.create('ExperimentNoVariantsError', z.void())

export const ExperimentInvalidWeightsError = NamedError.create('ExperimentInvalidWeightsError', z.void())

export const ExperimentVariantNotPublishedError = NamedError.create('ExperimentVariantNotPublishedError', z.void())

export const ExperimentNotStartedError = NamedError.create('ExperimentNotStartedError', z.void())

export const ExperimentAlreadyEndedError = NamedError.create('ExperimentAlreadyEndedError', z.void())

export const ExperimentWinnerAlreadySelectedError = NamedError.create('ExperimentWinnerAlreadySelectedError', z.void())

export const ExperimentVariantInvalidError = NamedError.create('ExperimentVariantInvalidError', z.void())
