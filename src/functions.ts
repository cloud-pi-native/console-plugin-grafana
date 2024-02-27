import type { EnvironmentCreateArgs, EnvironmentDeleteArgs, StepCall } from '@cpn-console/hooks'
import { containsProd, containsHorsProd, handleDelete, handleInit } from './kubernetes.js'
import { createKeycloakGroups } from './utils.js'

export const initGrafanaInstance: StepCall<EnvironmentCreateArgs> = async (payload) => {
  try {
    const { organization, project, environments, owner } = payload.args
    console.log(`Metrics plugin initialized for project: ${project}`)
    const grafanaNameProd = `${project}-prod`
    const grafanaNameHorsProd = `${project}-hors-prod`
    const isProd = containsProd(environments)
    const projectName = `${organization}-${project}`
    const isNotProd = containsHorsProd(environments)
    await createKeycloakGroups(organization, project, owner)
    if (isProd) {
      await handleInit(grafanaNameProd, project, projectName, 'prod')
    }
    if (isNotProd) {
      await handleInit(grafanaNameHorsProd, project, projectName, 'hprod')
    }
    console.log(`Metrics plugin initialized SUCCESS for project: ${project}`)
    return {
      status: {
        result: 'OK',
        message: 'Created',
      },
    }
  } catch (error) {
    console.error(error)
    return {
      status: {
        result: 'OK',
        message: 'Something happend while creating gafana instance',
      },
      error: JSON.stringify(error),
    }
  }
}

export const deleteGrafanaInstance: StepCall<EnvironmentDeleteArgs> = async (payload) => {
  const { project, environments, stage } = payload.args
  const grafanaNameProd = `${project}-prod`
  const grafanaNameHorsProd = `${project}-hors-prod`

  try {
    if (stage === 'prod') {
      const isProd = containsProd(environments)
      await handleDelete(isProd, grafanaNameProd, 'prod')
    } else {
      const isNotProd = containsHorsProd(environments)
      await handleDelete(isNotProd, grafanaNameHorsProd, 'hprod')
    }
  } catch (e) {
    console.error(e)
  }
  return {
    status: {
      result: 'OK',
      message: 'OK',
    },
  }
}
