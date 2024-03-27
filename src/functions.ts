import { parseError, type Environment, type Project, type StepCall, type UserObject } from '@cpn-console/hooks'
import { deleteAllDataSources, deleteGrafanaInstance, ensureDataSource, ensureGrafanaInstance } from './kubernetes.js'
import type { BaseParams, Stage } from './utils.js'
import { KeycloakProjectApi } from '@cpn-console/keycloak-plugin/types/class.js'
import { deleteKeycloakGroup, ensureKeycloakGroups } from './keycloak.js'

const getBaseParams = (project: Project, stage: Stage): BaseParams => ({ organizationName: project.organization.name, projectName: project.name, stage })

export type ListPerms = Record<'prod' | 'hors-prod', Record<'view' | 'edit', UserObject['id'][]>>

const getListPrems = (environments: Environment[]): ListPerms => {
  const allProdPerms = environments
    .filter(env => env.stage === 'prod')
    .map(env => env.permissions)
    .flat()
  const allHProdPerms = environments
    .filter(env => env.stage !== 'prod')
    .map(env => env.permissions)
    .flat()

  const listPerms: ListPerms = {
    'hors-prod': {
      edit: [],
      view: [],
    },
    prod: {
      edit: [],
      view: [],
    },
  }
  for (const permission of allProdPerms) {
    if (permission.permissions.rw && !listPerms.prod.edit.includes(permission.userId)) {
      listPerms.prod.edit.push(permission.userId)
    }
    if (permission.permissions.ro && !listPerms.prod.view.includes(permission.userId)) {
      listPerms.prod.view.push(permission.userId)
    }
  }
  for (const permission of allHProdPerms) {
    if (permission.permissions.rw && !listPerms['hors-prod'].edit.includes(permission.userId)) {
      listPerms['hors-prod'].edit.push(permission.userId)
    }
    if (permission.permissions.ro && !listPerms['hors-prod'].view.includes(permission.userId)) {
      listPerms['hors-prod'].view.push(permission.userId)
    }
  }
  return listPerms
}

export const upsertProject: StepCall<Project> = async (payload) => {
  try {
    const project = payload.args
    const keycloakApi = payload.apis.keycloak

    const hasProd = project.environments.find(env => env.stage === 'prod')
    const hasNonProd = project.environments.find(env => env.stage !== 'prod')

    const hProdParams = getBaseParams(project, 'hprod')
    const prodParams = getBaseParams(project, 'prod')

    const listPerms = getListPrems(project.environments)
    await Promise.all([
      ensureKeycloakGroups(listPerms, keycloakApi),
      ...(hasProd ? upsertGrafanaConfig(prodParams, keycloakApi) : deleteGrafanaConfig(prodParams)),
      ...(hasNonProd ? upsertGrafanaConfig(hProdParams, keycloakApi) : deleteGrafanaConfig(hProdParams)),
    ])

    return {
      status: {
        result: 'OK',
        message: 'Created',
      },
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
        message: 'An error happend while creating Grafana instance',
      },
      error: parseError(error),
    }
  }
}

export const deleteProject: StepCall<Project> = async (payload) => {
  try {
    const project = payload.args

    const hProdParams = getBaseParams(project, 'hprod')
    const prodParams = getBaseParams(project, 'prod')

    await Promise.all([
      deleteKeycloakGroup(payload.apis.keycloak),
      deleteGrafanaConfig(prodParams),
      deleteGrafanaConfig(hProdParams),
    ])

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

export const upsertGrafanaConfig = (params: BaseParams, keycloakApi: KeycloakProjectApi) => [
  ensureDataSource(params, 'alert-manager'),
  ensureDataSource(params, 'prometheus'),
  ensureGrafanaInstance(params, keycloakApi),
]

export const deleteGrafanaConfig = (params: BaseParams) => [
  deleteGrafanaInstance(params),
  deleteAllDataSources(params),
]
