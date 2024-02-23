import { type ServiceInfos } from '@cpn-console/hooks'
import { getConfig } from './utils.js'

const infos: ServiceInfos = {
  name: 'grafana',
  to: ({ project }) => [
    {
      to: `https://${getConfig().grafanaHost}/${project}-hors-prod`,
      title: 'Metrics hors Prod',
    },
    {
      to: `https:///${getConfig().grafanaHost}/${project}-prod`,
      title: 'Metrics Prod',
    },
  ],
  title: 'Grafana',
  imgSrc: 'https://upload.wikimedia.org/wikipedia/commons/a/a1/Grafana_logo.svg',
  description: 'Grafana est un outil de métrique',
}

export default infos
