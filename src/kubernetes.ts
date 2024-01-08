import { createCustomObjectsApi } from './k8sApi.js'
import { grafanaHost, keycloakClientSecret, keycloakUrl, mimirUrl } from './utils.js'

const getGrafanaObject = (project: string) => {
  return {
    apiVersion: 'grafana.integreatly.org/v1beta1',
    kind: 'Grafana',
    metadata: {
      labels: {
        app: `${project}`,
        dashboards: 'default',
        'app.kubernetes.io/managed-by': 'dso-console',
      },
      name: `${project}`,
      namespace: 'infra-grafana',
    },
    spec: {
      config: {
        auth: {
          oauth_allow_insecure_email_lookup: 'true',
        },
        'auth.generic_oauth': {
          api_url: `${keycloakUrl}/realms/dso/protocol/openid-connect/userinfo`,
          auth_url: `${keycloakUrl}/realms/dso/protocol/openid-connect/auth`,
          client_id: 'grafana-projects',
          client_secret: keycloakClientSecret,
          email_attribute_path: 'email',
          groups_attribute_path: 'group',
          enabled: 'true',
          role_attribute_path: "contains(groups[*], '/grafana-rw') && 'Editor' || contains(groups[*], '/grafana-ro') && 'Viewer'",
          role_attribute_strict: 'true',
          scopes: 'profile, group, email, openid',
          tls_skip_verify_insecure: 'true',
          token_url: `${keycloakUrl}/realms/dso/protocol/openid-connect/token`,
        },
        server: {
          root_url: `https://${grafanaHost}/${project}/`,
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
          path: `/${project}`,
          port: {
            targetPort: 3000,
          },
          tls: {
            termination: 'edge',
          },
          to: {
            kind: 'Service',
            name: `${project}-service`,
            weight: 100,
          },
          wildcardPolicy: 'None',
        },
      },
    },
  }
}

const getGrafanaPrometheusDataSourceObject = (env: string, project: string) => {
  return {
    apiVersion: 'grafana.integreatly.org/v1beta1',
    kind: 'GrafanaDatasource',
    metadata: {
      name: `datasource-${project}`,
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
          httpHeaderValue1: `c7-${env}`,
        },
        type: 'prometheus',
        uid: 'prometheus',
        url: `https://${mimirUrl}/prometheus`,
      },
      instanceSelector: {
        matchLabels: {
          app: project,
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

const getGrafanaAlertManagerDataSourceObject = (env: string, project: string) => {
  return {
    apiVersion: 'grafana.integreatly.org/v1beta1',
    kind: 'GrafanaDatasource',
    metadata: {
      name: `alertmanager-${project}`,
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
          httpHeaderValue1: `c7-${env}`,
        },
        type: 'alertmanager',
        uid: 'alertmanager',
        url: `https://${mimirUrl}`,
      },
      instanceSelector: {
        matchLabels: {
          app: `${project}`,
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

export const createGrafanaInstance = async (cluster, project: string) => {
  const customObjectsApi = await createCustomObjectsApi(cluster)
  try {
    customObjectsApi.createNamespacedCustomObject('grafana.integreatly.org', 'v1beta1', 'infra-grafana', 'grafanas', getGrafanaObject(project))
  } catch {
    console.error('Something happend while creating grafana instance')
  }
}

export const createDataSourcePrometheus = async (cluster, project: string, env: string) => {
  const customObjectsApi = await createCustomObjectsApi(cluster)
  try {
    customObjectsApi.createNamespacedCustomObject('grafana.integreatly.org', 'v1beta1', 'infra-grafana', 'grafanadatasources', getGrafanaPrometheusDataSourceObject(env, project))
  } catch {
    console.error('Something happend while creating prometheus datasource')
  }
}

export const createDataSourceAlertmanager = async (cluster, project: string, env: string) => {
  const customObjectsApi = await createCustomObjectsApi(cluster)
  try {
    customObjectsApi.createNamespacedCustomObject('grafana.integreatly.org', 'v1beta1', 'infra-grafana', 'grafanadatasources', getGrafanaAlertManagerDataSourceObject(env, project))
  } catch {
    console.error('Something happend while creating prometheus datasource')
  }
}

export const instanceExist = async (project: string): Promise<boolean> => {
  const result = await fetch(`https://${grafanaHost}/${project}`).then(response => {
    if (response.status === 200) {
      return true
    } else return false
  }).catch(() => {
    return false
  })
  return result
}

export const grafanaExist = async (project: string, cluster) => {
  const customObjectsApi = await createCustomObjectsApi(cluster)
  try {
    const result = await customObjectsApi.getNamespacedCustomObject('grafana.integreatly.org', 'v1beta1', 'infra-grafana', 'grafanas', project)
    console.log(JSON.stringify(result.body))
    return true
  } catch {
    console.log('Grafana instance not exist')
    return false
  }
}

export const datasourceExist = async (project: string, cluster, datasource: string) => {
  const customObjectsApi = await createCustomObjectsApi(cluster)
  try {
    const result = await customObjectsApi.getNamespacedCustomObject('grafana.integreatly.org', 'v1beta1', 'infra-grafana', 'grafanadatasources', datasource)
    console.log(JSON.stringify(result.body))
    return true
  } catch {
    console.log(`Datasource ${datasource} instance not exist`)
    return false
  }
}

export const deleteGrafana = async (project: string, cluster) => {
  const customObjectsApi = await createCustomObjectsApi(cluster)
  try {
    const result = await customObjectsApi.deleteNamespacedCustomObject('grafana.integreatly.org', 'v1beta1', 'infra-grafana', 'grafanas', project)
    console.log(JSON.stringify(result.body))
  } catch (e) {
    console.log(e)
  }
}

export const deleteDatasource = async (project: string, datasource: string, cluster) => {
  const customObjectsApi = await createCustomObjectsApi(cluster)
  try {
    const result = await customObjectsApi.deleteNamespacedCustomObject('grafana.integreatly.org', 'v1beta1', 'infra-grafana', 'grafanadatasources', datasource)
    console.log(JSON.stringify(result.body))
  } catch (e) {
    console.log(e)
  }
}