import { type ServiceInfos } from '@cpn-console/hooks'
import { getConfig } from './utils.js'

const infos: ServiceInfos = {
  name: 'grafana',
  to: ({ project, organization }) => [
    {
      to: `https://${getConfig().grafanaHost}/hprod-${organization}-${project}`,
      title: 'Hors production',
    },
    {
      to: `https:///${getConfig().grafanaHost}/prod-${organization}-${project}`,
      title: 'Production',
    },
  ],
  title: 'Grafana',
  imgSrc: 'https://upload.wikimedia.org/wikipedia/commons/a/a1/Grafana_logo.svg',
  description: 'Grafana est un outil de métrique',
}

export default infos
