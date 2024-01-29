import KeycloakAdminClient from '@keycloak/keycloak-admin-client'
import GroupRepresentation from '@keycloak/keycloak-admin-client/lib/defs/groupRepresentation.js'

export const keycloakUrl = process.env.KEYCLOAK_URL
export const keycloakClientSecret = process.env.KEYCLOAK_CLIENT_SECRET_GRAFANA
export const grafanaHost = process.env.GRAFANA_HOST
export const grafanaUrl = process.env.GRAFANA_URL
export const mimirUrl = process.env.MIMIR_URL
export const keycloakProtocol = process.env.KEYCLOAK_PROTOCOL
export const keycloakDomain = process.env.KEYCLOAK_DOMAIN
export const keycloakRealm = process.env.KEYCLOAK_REALM
export const keycloakToken = process.env.KEYCLOAK_ADMIN_PASSWORD
export const keycloakUser = process.env.KEYCLOAK_ADMIN
export const kubeconfigPath = process.env.KUBECONFIG_PATH
export const kubeconfigCtx = process.env.KUBECONFIG_CTX
export const HTTP_PROXY = process.env.HTTP_PROXY
export const HTTPS_PROXY = process.env.HTTPS_PROXY
export const NO_PROXY = process.env.NO_PROXY


export const getkcClient = async () => {
  const kcClient = new KeycloakAdminClient({
    baseUrl: `${keycloakProtocol}://${keycloakDomain}`,
  })

  await kcClient.auth({
    clientId: 'admin-cli',
    grantType: 'password',
    username: keycloakUser,
    password: keycloakToken,
  })
  kcClient.setConfig({ realmName: keycloakRealm })
  return kcClient
}

export const getKeycloakGroupByName = async (kcClient: KeycloakAdminClient, name: string): Promise<GroupRepresentation | void> => {
  const groupSearch = await kcClient.groups.find({ search: name })
  return groupSearch.find(grp => grp.name === name)
}

export const createKeycloakGroups = async (organization, project, owner) => {
  const kcClient = await getkcClient()
  console.log('create keycloak group')
  const projectName = `${organization}-${project}`
  const projectGroup = await getKeycloakGroupByName(kcClient, projectName)
  const subGroupName = 'metrics'
  if (!projectGroup) throw Error(`Unable to find parent group '/${projectGroup}'`)
  let group = projectGroup.subGroups.find(subGrp => subGrp.name === subGroupName)
  if (!group) {
    group = await kcClient.groups.createChildGroup({
      id: projectGroup.id,
    }, {
      name: subGroupName,
    })
    const roGroupProd = await kcClient.groups.createChildGroup({ id: group.id }, { name: 'grafana-prod-view' })
    const rwGroupProd = await kcClient.groups.createChildGroup({ id: group.id }, { name: 'grafana-prod-edit' })
    const roGroupHorsProd = await kcClient.groups.createChildGroup({ id: group.id }, { name: 'grafana-hprod-view' })
    const rwGroupHorsProd = await kcClient.groups.createChildGroup({ id: group.id }, { name: 'grafana-hprod-edit' })
    await kcClient.users.addToGroup({ id: owner.id, groupId: roGroupProd.id })
    await kcClient.users.addToGroup({ id: owner.id, groupId: rwGroupProd.id })
    await kcClient.users.addToGroup({ id: owner.id, groupId: roGroupHorsProd.id })
    await kcClient.users.addToGroup({ id: owner.id, groupId: rwGroupHorsProd.id })
  } else {
    console.log('group already exist')
  }
}
