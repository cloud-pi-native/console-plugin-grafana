// @ts-nocheck

import type { ServiceInfos } from '@dso-console/server/types/plugins/services.js'

const infos: ServiceInfos = {
  name: 'Metrique',
  to: ({project, organization, services, clusters, environments }) => 'https://grafana.apps.c7.numerique-interieur.com/project-demo',
  title: 'Métrique',
  imgSrc: 'https://static-www.elastic.co/v3/assets/bltefdd0b53724fa2ce/blt4466841eed0bf232/5d082a5e97f2babb5af907ee/logo-kibana-32-color.svg',
  description: 'Service de métrique',
}

export default infos
