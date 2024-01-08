// @ts-nocheck

import type { RegisterFn } from '@dso-console/server/src/plugins/index.js'
import infos from './infos.js'
import { deleteGrafanaInstance, getDsoProjectSecrets, initGrafanaInstance } from './index.js'

export const init = (register: RegisterFn) => {
  register(
    infos.name,
    {
      initializeEnvironment: {
        post: initGrafanaInstance,
      },
      deleteEnvironment: { main: deleteGrafanaInstance },
      getProjectSecrets: { main: getDsoProjectSecrets },
    },
  )
}
