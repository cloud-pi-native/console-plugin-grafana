import type { Plugin } from '@cpn-console/hooks'
import { deleteProject, upsertProject } from './functions.js'
import infos from './infos.js'

export const plugin: Plugin = {
  infos,
  subscribedHooks: {
    upsertProject: {
      steps: {
        main: upsertProject,
      },
    },
    deleteProject: {
      steps: {
        main: deleteProject,
      },
    },
  },
}
