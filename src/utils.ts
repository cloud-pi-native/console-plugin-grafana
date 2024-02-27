import type { EnvironmentCreateArgs } from '@cpn-console/hooks'
import { requiredEnv } from '@cpn-console/shared'
import KeycloakAdminClient from '@keycloak/keycloak-admin-client'
import GroupRepresentation from '@keycloak/keycloak-admin-client/lib/defs/groupRepresentation.js'

export const removeTrailingSlash = (url: string | undefined) => url?.endsWith('/')
  ? url?.slice(0, -1)
  : url

const config: {
  grafanaHost?: string
  grafanaUrl?: string
  mimirUrl?: string
  kubeconfigPath?: string
  kubeconfigCtx?: string
  keycloakUrl?: string
  keycloakClientSecret?: string
  keycloakProtocol?: string
  keycloakDomain?: string
  keycloakRealm?: string
  keycloakToken?: string
  keycloakUser?: string
  HTTP_PROXY?: string
  HTTPS_PROXY?: string
  NO_PROXY?: string
} = {
  grafanaHost: undefined,
  grafanaUrl: undefined,
  mimirUrl: undefined,
  kubeconfigPath: undefined,
  kubeconfigCtx: undefined,
  keycloakUrl: undefined,
  keycloakClientSecret: undefined,
  keycloakProtocol: undefined,
  keycloakDomain: undefined,
  keycloakRealm: undefined,
  keycloakToken: undefined,
  keycloakUser: undefined,
  HTTP_PROXY: undefined,
  HTTPS_PROXY: undefined,
  NO_PROXY: undefined,
}

export const getConfig = (): Required<typeof config> => {
  config.grafanaHost = config.grafanaHost ?? requiredEnv('GRAFANA_HOST')
  config.grafanaUrl = config.grafanaUrl ?? requiredEnv('GRAFANA_URL')
  config.mimirUrl = config.mimirUrl ?? requiredEnv('MIMIR_URL')
  config.kubeconfigPath = config.kubeconfigPath ?? requiredEnv('KUBECONFIG_PATH')
  config.kubeconfigCtx = config.kubeconfigCtx ?? requiredEnv('KUBECONFIG_CTX')
  config.keycloakUrl = removeTrailingSlash(requiredEnv('KEYCLOAK_URL'))
  config.keycloakClientSecret = config.keycloakClientSecret ?? requiredEnv('KEYCLOAK_CLIENT_SECRET_GRAFANA')
  config.keycloakProtocol = config.keycloakProtocol ?? requiredEnv('KEYCLOAK_PROTOCOL')
  config.keycloakDomain = config.keycloakDomain ?? requiredEnv('KEYCLOAK_DOMAIN')
  config.keycloakRealm = config.keycloakRealm ?? requiredEnv('KEYCLOAK_REALM')
  config.keycloakToken = config.keycloakToken ?? requiredEnv('KEYCLOAK_ADMIN_PASSWORD')
  config.keycloakUser = config.keycloakUser ?? requiredEnv('KEYCLOAK_ADMIN')
  config.HTTP_PROXY = config.HTTP_PROXY ?? process.env.HTTP_PROXY
  config.HTTPS_PROXY = config.HTTPS_PROXY ?? process.env.HTTPS_PROXY
  config.NO_PROXY = config.NO_PROXY ?? process.env.NO_PROXY

  // @ts-ignore
  return config
}

export const getkcClient = async () => {
  const kcClient = new KeycloakAdminClient({
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

export const getKeycloakGroupByName = async (kcClient: KeycloakAdminClient, name: string): Promise<GroupRepresentation | void> => {
  const groupSearch = await kcClient.groups.find({ search: name })
  return groupSearch.find(grp => grp.name === name)
}

export const createKeycloakGroups = async (
  organization: EnvironmentCreateArgs['organization'],
  project: EnvironmentCreateArgs['project'],
  owner: EnvironmentCreateArgs['owner'],
) => {
  const kcClient = await getkcClient()
  console.log('create keycloak group')
  const projectName = `${organization}-${project}`
  const projectGroup = await getKeycloakGroupByName(kcClient, projectName)
  const subGroupName = 'metrics'
  if (!projectGroup) throw Error(`Unable to find parent group '/${projectGroup}'`)
  let group = projectGroup.subGroups?.find(subGrp => subGrp.name === subGroupName)
  if (!group && projectGroup.id) {
    group = await kcClient.groups.createChildGroup({
      id: projectGroup.id,
    }, {
      name: subGroupName,
    })
    if (group.id) {
      const roGroupProd = await kcClient.groups.createChildGroup({ id: group.id }, { name: 'grafana-prod-view' })
      const rwGroupProd = await kcClient.groups.createChildGroup({ id: group.id }, { name: 'grafana-prod-edit' })
      const roGroupHorsProd = await kcClient.groups.createChildGroup({ id: group.id }, { name: 'grafana-hprod-view' })
      const rwGroupHorsProd = await kcClient.groups.createChildGroup({ id: group.id }, { name: 'grafana-hprod-edit' })
      await kcClient.users.addToGroup({ id: owner.id, groupId: roGroupProd.id })
      await kcClient.users.addToGroup({ id: owner.id, groupId: rwGroupProd.id })
      await kcClient.users.addToGroup({ id: owner.id, groupId: roGroupHorsProd.id })
      await kcClient.users.addToGroup({ id: owner.id, groupId: rwGroupHorsProd.id })
    }
  } else {
    console.log('group already exist')
  }
}
