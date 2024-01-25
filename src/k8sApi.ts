import { KubeConfig } from '@kubernetes/client-node'
import * as k8s from '@kubernetes/client-node'
import { kubeconfigCtx, kubeconfigPath } from './utils.js'

export const createCustomObjectsApi = async () => {
  const kc = new KubeConfig()
  kc.loadFromCluster()
  return kc.makeApiClient(k8s.CustomObjectsApi)
}
