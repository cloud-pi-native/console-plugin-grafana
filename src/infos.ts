import { type ServiceInfos } from '@cpn-console/hooks'
import { getConfig } from './utils.js'

const infos: ServiceInfos = {
  name: 'grafana',
  to: ({ project }) => [
    {
      to: `https://${getConfig().grafanaHost}/${project}-hors-prod`,
      title: 'Grafana hors prod',
    },
    {
      to: `https:///${getConfig().grafanaHost}/${project}-prod`,
      title: 'Grafana de prod',
    },
  ],
  title: 'Grafana',
  imgSrc: 'https://upload.wikimedia.org/wikipedia/commons/a/a1/Grafana_logo.svg',
  description: 'Grafana est un outil de métrique',
}

export default infos
