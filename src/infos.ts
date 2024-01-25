// @ts-nocheck

import type { ServiceInfos } from '@dso-console/server/src/plugins/services.js'

const infos: ServiceInfos = {
  name: 'Metrique',
  to: ({ project }) => {
    return [
      {
        to: `https://grafana.apps.c7.numerique-interieur.com/${project}-hors-prod`,
        title: 'Metrics hors Prod',
      },
      {
        to: `https://grafana.apps.c7.numerique-interieur.com/${project}-prod`,
        title: 'Metrics Prod',
      },
    ]
  },
  title: 'Métrique',
  imgSrc: 'https://upload.wikimedia.org/wikipedia/commons/a/a1/Grafana_logo.svg',
  description: 'Service de métrique',
}

export default infos
