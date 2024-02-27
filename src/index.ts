import { type Plugin } from '@cpn-console/hooks'
import { initGrafanaInstance, deleteGrafanaInstance } from './functions.js'
import infos from './infos.js'

export const plugin: Plugin = {
  infos,
  subscribedHooks: {
    initializeEnvironment: { steps: { main: initGrafanaInstance } },
    deleteEnvironment: { steps: { main: deleteGrafanaInstance } },
  },
}
