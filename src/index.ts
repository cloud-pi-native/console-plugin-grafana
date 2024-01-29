// @ts-nocheck

import { EnvironmentCreateArgs, EnvironmentDeleteArgs } from '@dso-console/server/src/plugins/hooks/index.js'
import { StepCall } from '@dso-console/server/src/plugins/hooks/hook.js'
import { containsHorsProd, containsProd, handleDelete, handleInit } from './kubernetes.js'

import { createHmac } from 'crypto'
import { createKeycloakGroups } from './utils.js'

export const keycloakToken = process.env.KEYCLOAK_ADMIN_PASSWORD
export const keycloakUser = process.env.KEYCLOAK_ADMIN

export const initGrafanaInstance: StepCall<EnvironmentCreateArgs> = async (payload) => {
  try {
    const { organization, project, cluster, environments, owner } = payload.args
    console.log(`Metrics plugin initialized for project: ${project}`)
    console.log(JSON.stringify(payload.args))
    const grafanaNameProd = `${project}-prod`
    const grafanaNameHorsProd = `${project}-hors-prod`
    const prodIsPresent = await containsProd(environments)
    const projectName = `${organization}-${project}`
    const horsProdIsPresent = await containsHorsProd(environments)
    await createKeycloakGroups(organization, project, owner)
    if (prodIsPresent) {
      await handleInit(cluster, grafanaNameProd, project, projectName, 'prod')
    }
    if (horsProdIsPresent) {
      await handleInit(cluster, grafanaNameHorsProd, project, projectName, 'hprod')
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
  const { project, environments, cluster, stage } = payload.args
  console.log(JSON.stringify(payload.args))
  const grafanaNameProd = `${project}-prod`
  const grafanaNameHorsProd = `${project}-hors-prod`
  console.log(JSON.stringify(payload.args))

  try {
    if (stage === 'prod') {
      const prodIsPresent = containsProd(environments)
      if (prodIsPresent) {
        console.log('prod is still present')
      } else {
        await handleDelete(cluster, project, prodStillPresent, grafanaNameProd, newList, 'prod')
      }
    } else {
      const horsProdIsPresent = containsHorsProd(environments)
      if (horsProdIsPresent) {
        console.log('hors prod is still prsent')
      } else {
        await handleDelete(cluster, project, horsProdStillPresent, grafanaNameHorsProd, newList, 'hprod')
      }
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

export const generateNamespaceName = (org: Organization, proj: Project, env: Environment) => {
  const envHash = createHmac('sha256', '')
    .update(env)
    .digest('hex')
    .slice(0, 4)
  return `${org}-${proj}-${env}-${envHash}`
}

export const containsCluster = (clusterList, envList) => {
  let containsTem = false
  envList.forEach(env => {
    if (clusterList.contains(env.clusterName)) {
      containsTem = true
    }
  })
  return containsTem
}
