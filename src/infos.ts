// @ts-nocheck

import type { ServiceInfos } from '@dso-console/server/src/plugins/services.js'
import { grafanaHost } from './utils.js'

const infos: ServiceInfos = {
  name: 'Metrique',
  to: ({ project }) => {
    return [
      {
        to: `https://${grafanaHost}/${project}-hors-prod`,
        title: 'Metrics hors Prod',
      },
      {
        to: `https:///${grafanaHost}/${project}-prod`,
        title: 'Metrics Prod',
      },
    ]
  },
  title: 'Métrique',
  imgSrc: 'https://upload.wikimedia.org/wikipedia/commons/a/a1/Grafana_logo.svg',
  description: 'Service de métrique',
}

export default infos
