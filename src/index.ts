import { type Plugin } from '@cpn-console/hooks'
import { initGrafanaInstance, deleteGrafanaInstance, updatePermission } from './functions.js'
import infos from './infos.js'

export const plugin: Plugin = {
  infos,
  subscribedHooks: {
    initializeEnvironment: { steps: { main: initGrafanaInstance } },
    deleteEnvironment: { steps: { main: deleteGrafanaInstance } },
    setEnvPermission: { steps: { main: updatePermission } },
  },
}
