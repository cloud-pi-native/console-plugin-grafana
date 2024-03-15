import type { EnvironmentCreateArgs } from '@cpn-console/hooks'

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
  config.grafanaHost = config.grafanaHost ?? process.env.GRAFANA_HOST
  config.grafanaUrl = config.grafanaUrl ?? process.env.GRAFANA_URL
  config.mimirUrl = config.mimirUrl ?? process.env.MIMIR_URL
  config.kubeconfigPath = config.kubeconfigPath ?? process.env.KUBECONFIG_PATH
  config.kubeconfigCtx = config.kubeconfigCtx ?? process.env.KUBECONFIG_CTX
  config.keycloakUrl = removeTrailingSlash(process.env.KEYCLOAK_URL)
  config.keycloakClientSecret = config.keycloakClientSecret ?? process.env.KEYCLOAK_CLIENT_SECRET_GRAFANA
  config.keycloakProtocol = config.keycloakProtocol ?? process.env.KEYCLOAK_PROTOCOL
  config.keycloakDomain = config.keycloakDomain ?? process.env.KEYCLOAK_DOMAIN
  config.keycloakRealm = config.keycloakRealm ?? process.env.KEYCLOAK_REALM
  config.keycloakToken = config.keycloakToken ?? process.env.KEYCLOAK_ADMIN_PASSWORD
  config.keycloakUser = config.keycloakUser ?? process.env.KEYCLOAK_ADMIN
  config.HTTP_PROXY = config.HTTP_PROXY ?? process.env.HTTP_PROXY
  config.HTTPS_PROXY = config.HTTPS_PROXY ?? process.env.HTTPS_PROXY
  config.NO_PROXY = config.NO_PROXY ?? process.env.NO_PROXY

  // @ts-ignore
  return config
}

export const containsProd = (environments: EnvironmentCreateArgs['environments']): boolean => {
  return !!environments && environments.some(env => env.stage === 'prod')
}

export const containsHorsProd = (environments: EnvironmentCreateArgs['environments']): boolean => {
  return !!environments && environments.some(env => env.stage !== 'prod')
}
