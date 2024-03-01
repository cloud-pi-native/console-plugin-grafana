import type KeycloakAdminClient from '@keycloak/keycloak-admin-client'
import type GroupRepresentation from '@keycloak/keycloak-admin-client/lib/defs/groupRepresentation.js'
import type { PermissionManageUserArgs, EnvironmentCreateArgs } from '@cpn-console/hooks'
import KcAdminClient from '@keycloak/keycloak-admin-client'
import { getConfig } from './utils.js'

export const getkcClient = async () => {
  const kcClient = new KcAdminClient({
    baseUrl: `${getConfig().keycloakProtocol}://${getConfig().keycloakDomain}`,
  })

  await kcClient.auth({
    clientId: 'admin-cli',
    grantType: 'password',
    username: getConfig().keycloakUser,
    password: getConfig().keycloakToken,
  })
  kcClient.setConfig({ realmName: getConfig().keycloakRealm })
  return kcClient
}

export const getProjectGroupByName = async (kcClient: KeycloakAdminClient, name: string): Promise<GroupRepresentation | void> => {
  const groupSearch = await kcClient.groups.find({ search: name })
  return groupSearch.find(grp => grp.name === name)
}

export const getOrCreateChildGroup = async (kcClient: KeycloakAdminClient, parentId: string, name: string, subGroups: GroupRepresentation[] | undefined = []): Promise<Required<Pick<GroupRepresentation, 'id' | 'name' | 'subGroups' | 'subGroupCount'>>> => {
  if (Array.isArray(subGroups) && subGroups.length > 0) {
    const matchingGroup = subGroups.find(({ name: groupName }) => groupName === name) as Required<GroupRepresentation> | undefined
    if (matchingGroup) {
      return {
        id: matchingGroup.id,
        subGroups: matchingGroup.subGroups || [],
        subGroupCount: matchingGroup.subGroups?.length || 0,
        name,
      }
    }
  }

  const existingGroup = await kcClient.groups.findOne({ id: parentId })
  const matchingGroup = existingGroup?.subGroups?.find(({ name: groupName }) => groupName === name) as Required<GroupRepresentation> | undefined
  if (!matchingGroup) {
    const newGroup = await kcClient.groups.createChildGroup({ id: parentId }, { name })
    return {
      id: newGroup.id,
      subGroups: [],
      subGroupCount: 0,
      name,
    }
  }
  return {
    id: matchingGroup.id,
    subGroups: matchingGroup.subGroups || [],
    subGroupCount: matchingGroup.subGroups?.length || 0,
    name,
  }
}

export const manageKeycloakPermission = async (
  projectName: string,
  user: PermissionManageUserArgs['user'],
  permissions: PermissionManageUserArgs['permissions'],
  stage: PermissionManageUserArgs['stage'],
) => {
  try {
    const kcClient = await getkcClient()

    const projectGroup = await getProjectGroupByName(kcClient, projectName)
    if (!projectGroup?.id) throw Error(`Unable to find parent group for ${projectName}`)

    const grafanaGroup = await getOrCreateChildGroup(kcClient, projectGroup.id, 'grafana')
    if (!grafanaGroup?.id) throw Error(`Unable to find grafana group for '/${projectGroup.name}'`)

    const roGroupProd = await getOrCreateChildGroup(kcClient, grafanaGroup.id, 'prod-RO')
    const rwGroupProd = await getOrCreateChildGroup(kcClient, grafanaGroup.id, 'prod-RW')
    const roGroupHorsProd = await getOrCreateChildGroup(kcClient, grafanaGroup.id, 'hprod-RO')
    const rwGroupHorsProd = await getOrCreateChildGroup(kcClient, grafanaGroup.id, 'hprod-RW')

    if (stage === 'prod') {
      if (permissions.rw) {
        await kcClient.users.addToGroup({ id: user.id, groupId: rwGroupProd.id })
      } else {
        await kcClient.users.delFromGroup({ id: user.id, groupId: rwGroupProd.id })
      }
      if (permissions.ro) {
        await kcClient.users.addToGroup({ id: user.id, groupId: roGroupProd.id })
      } else {
        await kcClient.users.delFromGroup({ id: user.id, groupId: roGroupProd.id })
      }
    } else {
      if (permissions.rw) {
        await kcClient.users.addToGroup({ id: user.id, groupId: rwGroupHorsProd.id })
      } else {
        await kcClient.users.delFromGroup({ id: user.id, groupId: rwGroupHorsProd.id })
      }
      if (permissions.ro) {
        await kcClient.users.addToGroup({ id: user.id, groupId: roGroupHorsProd.id })
      } else {
        await kcClient.users.delFromGroup({ id: user.id, groupId: roGroupHorsProd.id })
      }
    }

    return {
      status: {
        result: 'OK',
      },
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
        message: 'Failed',
      },
      error: JSON.stringify(error),
    }
  }
}

export const createKeycloakGroups = async (
  projectName: string,
  owner: EnvironmentCreateArgs['owner'],
) => {
  const kcClient = await getkcClient()

  const projectGroup = await getProjectGroupByName(kcClient, projectName)
  if (!projectGroup?.id) throw Error(`Unable to find parent group for ${projectName}`)

  const subGroup = await getOrCreateChildGroup(kcClient, projectGroup.id, 'grafana')
  if (!subGroup?.id) throw Error(`Unable to find grafana subGroup of '/${projectGroup.name}'`)

  const roGroupProd = await kcClient.groups.createChildGroup({ id: subGroup.id }, { name: 'prod-RO' })
  const rwGroupProd = await kcClient.groups.createChildGroup({ id: subGroup.id }, { name: 'prod-RW' })
  const roGroupHorsProd = await kcClient.groups.createChildGroup({ id: subGroup.id }, { name: 'hprod-RO' })
  const rwGroupHorsProd = await kcClient.groups.createChildGroup({ id: subGroup.id }, { name: 'hprod-RW' })

  await kcClient.users.addToGroup({ id: owner.id, groupId: roGroupProd.id })
  await kcClient.users.addToGroup({ id: owner.id, groupId: rwGroupProd.id })
  await kcClient.users.addToGroup({ id: owner.id, groupId: roGroupHorsProd.id })
  await kcClient.users.addToGroup({ id: owner.id, groupId: rwGroupHorsProd.id })
}
