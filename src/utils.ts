import { EnvironmentCreateArgs } from '@cpn-console/hooks'
import { requiredEnv } from '@cpn-console/shared'

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

export const containsProd = (environments: EnvironmentCreateArgs['environments']): boolean => {
  return !!environments && environments.some(env => env.stage === 'prod')
}

export const containsHorsProd = (environments: EnvironmentCreateArgs['environments']): boolean => {
  return !!environments && environments.some(env => env.stage !== 'prod')
}
