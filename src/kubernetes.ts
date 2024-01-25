import { createCustomObjectsApi } from './k8sApi.js'
import { grafanaHost, keycloakClientSecret, keycloakUrl, mimirUrl } from './utils.js'

const getGrafanaObject = (instanceName: string, roleAttributePath) => {
  return {
    apiVersion: 'grafana.integreatly.org/v1beta1',
    kind: 'Grafana',
    metadata: {
      labels: {
        app: `${instanceName}`,
        dashboards: 'default',
        'app.kubernetes.io/managed-by': 'dso-console',
      },
      name: `${instanceName}`,
      namespace: 'infra-grafana',
    },
    spec: {
      config: {
        auth: {
          oauth_allow_insecure_email_lookup: 'true',
        },
        'auth.generic_oauth': {
          api_url: `${keycloakUrl.replace(/\/$/, '')}/realms/dso/protocol/openid-connect/userinfo`,
          auth_url: `${keycloakUrl.replace(/\/$/, '')}/realms/dso/protocol/openid-connect/auth`,
          client_id: 'grafana-projects',
          client_secret: keycloakClientSecret,
          email_attribute_path: 'email',
          groups_attribute_path: 'group',
          enabled: 'true',
          role_attribute_path: roleAttributePath,
          role_attribute_strict: 'true',
          scopes: 'profile, group, email, openid',
          tls_skip_verify_insecure: 'true',
          token_url: `${keycloakUrl.replace(/\/$/, '')}/realms/dso/protocol/openid-connect/token`,
        },
        server: {
          root_url: `https://${grafanaHost}/${instanceName}/`,
          serve_from_sub_path: 'true',
        },
      },
      deployment: {
        spec: {
          template: {
            spec: {
              containers: [
                {
                  image: 'grafana/grafana:9.5.5',
                  name: 'grafana',
                }],
            },
          },
        },
      },
      route: {
        metadata: {},
        spec: {
          host: `${grafanaHost}`,
          path: `/${instanceName}`,
          port: {
            targetPort: 3000,
          },
          tls: {
            termination: 'edge',
          },
          to: {
            kind: 'Service',
            name: `${instanceName}-service`,
            weight: 100,
          },
          wildcardPolicy: 'None',
        },
      },
    },
  }
}
export const getGrafanaPrometheusDataSourceObject = (project, grafanaName, datasourceName, stage) => {
  return {
    apiVersion: 'grafana.integreatly.org/v1beta1',
    kind: 'GrafanaDatasource',
    metadata: {
      name: `${datasourceName}`,
      namespace: 'infra-grafana',
      labels: {
        'app.kubernetes.io/managed-by': 'dso-console',
      },
    },
    spec: {
      datasource: {
        access: 'proxy',
        basicAuth: true,
        // eslint-disable-next-line no-template-curly-in-string
        basicAuthUser: '${PROMETHEUS_USERNAME}',
        isDefault: true,
        jsonData: {
          httpHeaderName1: 'X-Scope-OrgID',
        },
        name: 'Prometheus',
        secureJsonData: {
          // eslint-disable-next-line no-template-curly-in-string
          basicAuthPassword: '${PROMETHEUS_PASSWORD}',
          httpHeaderValue1: `${stage}-${project}`,
        },
        type: 'prometheus',
        uid: 'prometheus',
        url: `https://${mimirUrl}/prometheus`,
      },
      instanceSelector: {
        matchLabels: {
          app: `${grafanaName}`,
        },
      },
      valuesFrom: [
        {
          targetPath: 'basicAuthUser',
          valueFrom: {
            secretKeyRef: {
              key: 'PROMETHEUS_USERNAME',
              name: 'credentials',
            },
          },
        },
        {
          targetPath: 'secureJsonData.basicAuthPassword',
          valueFrom: {
            secretKeyRef: {
              key: 'PROMETHEUS_PASSWORD',
              name: 'credentials',
            },
          },
        },
      ],
    },
  }
}

const getGrafanaAlertManagerDataSourceObject = (project, grafanaName, datasourceName, stage) => {
  return {
    apiVersion: 'grafana.integreatly.org/v1beta1',
    kind: 'GrafanaDatasource',
    metadata: {
      name: `${datasourceName}`,
      namespace: 'infra-grafana',
      labels: {
        'app.kubernetes.io/managed-by': 'dso-console',
      },
    },
    spec: {
      datasource: {
        access: 'proxy',
        basicAuth: true,
        // eslint-disable-next-line no-template-curly-in-string
        basicAuthUser: '${PROMETHEUS_USERNAME}',
        isDefault: false,
        jsonData: {
          httpHeaderName1: 'X-Scope-OrgID',
        },
        name: 'Alertmanager',
        secureJsonData: {
          // eslint-disable-next-line no-template-curly-in-string
          basicAuthPassword: '${PROMETHEUS_PASSWORD}',
          httpHeaderValue1: `${stage}-${project}`,
        },
        type: 'alertmanager',
        uid: 'alertmanager',
        url: `https://${mimirUrl}`,
      },
      instanceSelector: {
        matchLabels: {
          app: `${grafanaName}`,
        },
      },
      valuesFrom: [
        {
          targetPath: 'basicAuthUser',
          valueFrom: {
            secretKeyRef: {
              key: 'PROMETHEUS_USERNAME',
              name: 'credentials',
            },
          },
        },
        {
          targetPath: 'secureJsonData.basicAuthPassword',
          valueFrom: {
            secretKeyRef: {
              key: 'PROMETHEUS_PASSWORD',
              name: 'credentials',
            },
          },
        },
      ],
    },
  }
}

export const createGrafanaInstance = async (instanceName: string, roleAttributePath: string) => {
  const customObjectsApi = await createCustomObjectsApi()
  try {
    const result = await customObjectsApi.createNamespacedCustomObject('grafana.integreatly.org', 'v1beta1', 'infra-grafana', 'grafanas', getGrafanaObject(instanceName, roleAttributePath))
    console.log(`Grafana ${instanceName} created`)
    console.debug(JSON.stringify(result.body))
  } catch {
    console.error('Something happend while creating grafana instance')
  }
}

export const createDataSourcePrometheus = async (project, grafanaName, datasourceName, stage) => {
  const customObjectsApi = await createCustomObjectsApi()
  try {
    const result = await customObjectsApi.createNamespacedCustomObject('grafana.integreatly.org', 'v1beta1', 'infra-grafana', 'grafanadatasources', getGrafanaPrometheusDataSourceObject(project, grafanaName, datasourceName, stage))
    console.log(`Grafana ${datasourceName} created`)
    console.debug(JSON.stringify(result.body))
  } catch (e) {
    console.error(e)
    console.error('Something happend while creating prometheus datasource')
  }
}

export const createDataSourceAlertmanager = async (project, grafanaName, datasourceName, stage) => {
  const customObjectsApi = await createCustomObjectsApi()
  try {
    const result = await customObjectsApi.createNamespacedCustomObject('grafana.integreatly.org', 'v1beta1', 'infra-grafana', 'grafanadatasources', getGrafanaAlertManagerDataSourceObject(project, grafanaName, datasourceName, stage))
    console.log(`Grafana ${datasourceName} created`)
    console.debug(JSON.stringify(result.body))
  } catch {
    console.error('Something happend while creating prometheus datasource')
  }
}

export const updateDataSource = async (cluster, datasourceObject) => {
  const customObjectsApi = await createCustomObjectsApi()
  try {
    const result = await customObjectsApi.replaceNamespacedCustomObject('grafana.integreatly.org', 'v1beta1', 'infra-grafana', 'grafanadatasources', datasourceObject.metadata.name, datasourceObject)
    console.log(`Grafana ${datasourceObject.metadata.name} updated`)
    console.debug(JSON.stringify(result.body))
  } catch {
    console.error('Something happend while creating prometheus datasource')
  }
}

export const grafanaExist = async (cluster, instanceName: string) => {
  const customObjectsApi = await createCustomObjectsApi()
  try {
    const result = await customObjectsApi.getNamespacedCustomObject('grafana.integreatly.org', 'v1beta1', 'infra-grafana', 'grafanas', instanceName)
    console.log(`Grafana ${instanceName} already exists`)
    console.debug(JSON.stringify(result.body))
    return true
  } catch {
    console.log('Grafana instance not exist')
    return false
  }
}

export const datasourceExist = async (cluster, datasource: string) => {
  const customObjectsApi = await createCustomObjectsApi()
  try {
    const result = await customObjectsApi.getNamespacedCustomObject('grafana.integreatly.org', 'v1beta1', 'infra-grafana', 'grafanadatasources', datasource)
    console.log(`Datasource ${datasource} already exists`)
    console.debug(JSON.stringify(result.body))
    return true
  } catch {
    console.log(`Datasource ${datasource} instance not exist`)
    return false
  }
}

export const getExistingDatasourceObject = async (cluster, datasource: string) => {
  const customObjectsApi = await createCustomObjectsApi()
  try {
    const result = await customObjectsApi.getNamespacedCustomObject('grafana.integreatly.org', 'v1beta1', 'infra-grafana', 'grafanadatasources', datasource)
    console.debug(JSON.stringify(result.body))
    return result.body
  } catch {
    console.log(`Datasource ${datasource} instance not exist`)
    return null
  }
}

export const deleteGrafana = async (cluster, grafanaName) => {
  const customObjectsApi = await createCustomObjectsApi()
  try {
    const result = await customObjectsApi.deleteNamespacedCustomObject('grafana.integreatly.org', 'v1beta1', 'infra-grafana', 'grafanas', grafanaName)
    console.log(`instance ${grafanaName} deleted`)
    console.debug(JSON.stringify(result.body))
  } catch (e) {
    console.log(e)
  }
}

export const deleteDatasource = async (cluster, datasource: string) => {
  const customObjectsApi = await createCustomObjectsApi()
  try {
    const result = await customObjectsApi.deleteNamespacedCustomObject('grafana.integreatly.org', 'v1beta1', 'infra-grafana', 'grafanadatasources', datasource)
    console.log(`datasource: ${datasource} deleted`)
    console.debug(JSON.stringify(result.body))
  } catch (e) {
    console.log(e)
  }
}

export const containsProd = (environments): boolean => {
  let tem = false
  environments.forEach(env => {
    if (env.stage === 'prod') {
      tem = true
    }
  })
  return tem
}

export const containsHorsProd = (environments): boolean => {
  let tem = false
  environments.forEach(env => {
    if (env.stage !== 'prod') {
      tem = true
    }
  })
  return tem
}

const getHttpHeaderName1 = (grafanaDatasource) => {
  return grafanaDatasource.spec.datasource.secureJsonData.httpHeaderValue1
}

export const getClustersHeader = (grafanaDatasource): Array<string> => {
  const header = getHttpHeaderName1(grafanaDatasource)
  console.log(JSON.stringify(header))
  const tenants = header.split('|')
  const clusters = []
  tenants.forEach(tenant => {
    const clusterName = tenant.split('-')[0]
    clusters.push(clusterName)
  })
  return clusters
}

export const formatAddDataSourceHeader = (grafanaDatasource, newTenant): string => {
  const existingHeader = getHttpHeaderName1(grafanaDatasource)
  const formatHeader = `${existingHeader}|${newTenant}`
  return formatHeader
}

export const formatRemoveDatasourceHeader = (grafanaDatasource, tenentToRemove): string => {
  const existingHeader = getHttpHeaderName1(grafanaDatasource)
  if (existingHeader !== tenentToRemove) {
    return supprimerElement(existingHeader, tenentToRemove)
  }
  return ''
}

const supprimerElement = (chaineOriginale, elementASupprimer) => {
  // Utilise une expression régulière pour trouver l'élément suivi de "|" ou se trouvant à la fin de la chaîne
  const regex = new RegExp(elementASupprimer + '(\\||$)', 'g')
  let resultat = chaineOriginale.replace(regex, '')

  // Enlève le "|" restant à la fin si nécessaire
  resultat = resultat.replace(/\|$/, '')

  return resultat
}

export const updateDatasourcewithHeader = async (cluster, datasourceName, headerValue) => {
  const datasourceObject = await getExistingDatasourceObject(cluster, `${datasourceName}`)
  if (datasourceObject) {
    const existingClusters = getClustersHeader(datasourceObject)
    if (!existingClusters.includes(cluster.label)) {
      const newHeader = formatAddDataSourceHeader(datasourceObject, headerValue)
      datasourceObject.spec.datasource.secureJsonData.httpHeaderValue1 = newHeader
      await updateDataSource(cluster, datasourceObject)
    }
  }
}

export const handleInit = async (cluster, grafanaName, project, projectName, stage) => {
  const grafanaCrdExist = await grafanaExist(cluster, grafanaName)
  const datasourcePromExist = await datasourceExist(cluster, `datasource-prom-${grafanaName}`)
  const datasourceAlertExist = await datasourceExist(cluster, `datasource-am-${grafanaName}`)
  if (grafanaCrdExist === false) {
    console.log(`Create grafana instance: ${grafanaName}, for project: ${project}`)
    await createGrafanaInstance(grafanaName, `contains(groups[*], '/${projectName}/metrics/grafana-${stage}-edit') && 'Editor' || contains(groups[*], '/${projectName}/metrics/grafana-${stage}-view') && 'Viewer'`)
  }
  if (datasourcePromExist === false) {
    console.log(`Create datasource ${stage} prometheus instance for project: ${project}`)
    await createDataSourcePrometheus(project, `${grafanaName}`, `datasource-prom-${grafanaName}`, `${stage}`)
  }
  if (datasourceAlertExist === false) {
    console.log(`Create datasource ${stage} alertmanager instance for project: ${project}`)
    await createDataSourceAlertmanager(project, `${grafanaName}`, `datasource-am-${grafanaName}`, `${stage}`)
  }
}

export const handleDelete = async (cluster, project, stageStillPresent: boolean, grafanaName, newList, stage) => {
  if (stageStillPresent === false) {
    console.log(`Stage ${stage} not present, process program, if instance existe, delete instance`)
    const grafanaCrdExist = await grafanaExist(cluster, grafanaName)
    const datasourcePromExist = await datasourceExist(cluster, `datasource-prom-${grafanaName}`)
    const datasourceAlertExist = await datasourceExist(cluster, `datasource-am-${grafanaName}`)
    if (datasourcePromExist) await deleteDatasource(cluster, `datasource-prom-${grafanaName}`)
    if (datasourceAlertExist) await deleteDatasource(cluster, `datasource-prom-${grafanaName}`)
    if (grafanaCrdExist) await deleteGrafana(cluster, grafanaName)
  }
}

export const containsCluster = (clusterList, envList) => {
  let containsTem = false
  envList.forEach(env => {
    if (clusterList.contains(env.clusterName)) {
      containsTem = true
    }
  })
  return containsTem
}
