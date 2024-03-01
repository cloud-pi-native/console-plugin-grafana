import type { EnvironmentCreateArgs, EnvironmentDeleteArgs, PermissionManageUserArgs, StepCall } from '@cpn-console/hooks'
import { handleDelete, handleInit } from './kubernetes.js'
import { createKeycloakGroups, manageKeycloakPermission } from './keycloak.js'
import { containsProd, containsHorsProd } from './utils.js'

export const initGrafanaInstance: StepCall<EnvironmentCreateArgs> = async (payload) => {
  try {
    const { organization, project, environments, owner } = payload.args
    const projectName = `${organization}-${project}`

    console.log(`Grafana plugin initialized for project: ${project}`)

    await createKeycloakGroups(projectName, owner)

    const grafanaNameProd = `${project}-prod`
    const grafanaNameHorsProd = `${project}-hors-prod`
    const isProd = containsProd(environments)
    const isNotProd = containsHorsProd(environments)
    if (isProd) {
      await handleInit(grafanaNameProd, project, projectName, 'prod')
    }
    if (isNotProd) {
      await handleInit(grafanaNameHorsProd, project, projectName, 'hprod')
    }

    console.log(`Grafana plugin successfully initialized for project: ${project}`)
    return {
      status: {
        result: 'OK',
        message: 'Created',
      },
    }
  } catch (error) {
    return {
      status: {
        result: 'OK',
        message: 'An error happend while creating Grafana instance',
      },
      error: JSON.stringify(error),
    }
  }
}

export const deleteGrafanaInstance: StepCall<EnvironmentDeleteArgs> = async (payload) => {
  try {
    const { project, environments, stage } = payload.args
    const grafanaNameProd = `${project}-prod`
    const grafanaNameHorsProd = `${project}-hors-prod`

    if (stage === 'prod') {
      const isProd = containsProd(environments)
      await handleDelete(isProd, grafanaNameProd, 'prod')
    } else {
      const isNotProd = containsHorsProd(environments)
      await handleDelete(isNotProd, grafanaNameHorsProd, 'hprod')
    }

    return {
      status: {
        result: 'OK',
        message: 'Deleted',
      },
    }
  } catch (error) {
    return {
      status: {
        result: 'OK',
        message: 'An error happend while deleting Grafana instance',
      },
      error: JSON.stringify(error),
    }
  }
}

export const updatePermission: StepCall<PermissionManageUserArgs> = async (payload) => {
  try {
    // TODO : stage nécessaire (prod / hprod)
    const { organization, project, user, permissions, stage } = payload.args
    const projectName = `${organization}-${project}`

    await manageKeycloakPermission(projectName, user, permissions, stage)

    return {
      status: {
        result: 'OK',
        message: `Permission added to user ${user.id} on '${projectName}'`,
      },
    }
  } catch (error) {
    return {
      status: {
        result: 'OK',
        message: 'An error happend while adding user permission on Grafana instance',
      },
      error: JSON.stringify(error),
    }
  }
}
