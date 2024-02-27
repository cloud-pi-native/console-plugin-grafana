import { KubeConfig } from '@kubernetes/client-node'
import * as k8s from '@kubernetes/client-node'
import { getConfig } from './utils.js'

export const createCustomObjectsApi = async () => {
  const kc = new KubeConfig()
  if (getConfig().kubeconfigPath) {
    kc.loadFromFile(getConfig().kubeconfigPath)
    if (getConfig().kubeconfigCtx) {
      kc.setCurrentContext(getConfig().kubeconfigCtx)
    }
    return kc.makeApiClient(k8s.CustomObjectsApi)
  } else {
    kc.loadFromCluster()
  }
  return kc.makeApiClient(k8s.CustomObjectsApi)
}
