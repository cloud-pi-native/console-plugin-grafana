import { KubeConfig } from '@kubernetes/client-node'
import { ClusterModel } from '@dso-console/shared/src/resources/cluster/index.js'
import * as k8s from '@kubernetes/client-node'

export const createCustomObjectsApi = async (cluster: ClusterModel) => {
  const kc = new KubeConfig()
  const clusterConfig = {
    ...cluster.cluster,
    skipTLSVerify: cluster.cluster.skipTLSVerify ?? false,
  }
  const userConfig = {
    ...cluster.user,
    name: cluster.id,
  }
  if (cluster.cluster.skipTLSVerify) delete clusterConfig.caData
  kc.loadFromClusterAndUser(clusterConfig, userConfig)
  return kc.makeApiClient(k8s.CustomObjectsApi)
}
