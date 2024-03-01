import type { EnvironmentCreateArgs, EnvironmentDeleteArgs } from '@cpn-console/hooks'
import { createCustomObjectsApi } from './k8sApi.js'
import { getConfig } from './utils.js'

const getGrafanaObject = (instanceName: string, roleAttributePath: string, containersSpecArray: unknown[]) => {
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
          api_url: `${getConfig().keycloakUrl?.replace(/\/$/, '')}/realms/${getConfig().keycloakRealm}/protocol/openid-connect/userinfo`,
          auth_url: `${getConfig().keycloakUrl?.replace(/\/$/, '')}/realms/${getConfig().keycloakRealm}/protocol/openid-connect/auth`,
          client_id: 'grafana-projects',
          client_secret: getConfig().keycloakClientSecret,
          email_attribute_path: 'email',
          groups_attribute_path: 'group',
          enabled: 'true',
          role_attribute_path: roleAttributePath,
          role_attribute_strict: 'true',
          scopes: 'profile, group, email, openid',
          tls_skip_verify_insecure: 'true',
          token_url: `${getConfig().keycloakUrl?.replace(/\/$/, '')}/realms/${getConfig().keycloakRealm}/protocol/openid-connect/token`,
        },
        server: {
          root_url: `${getConfig().grafanaUrl}/${instanceName}/`,
          serve_from_sub_path: 'true',
        },
      },
      deployment: {
        spec: {
          template: {
            spec: {
              containers: containersSpecArray,
            },
          },
        },
      },
      route: {
        metadata: {},
        spec: {
          host: `${getConfig().grafanaHost}`,
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

export const getGrafanaPrometheusDataSourceObject = (
  project: EnvironmentCreateArgs['project'],
  grafanaName: string,
  datasourceName: string,
  stage: 'prod' | 'hprod',
) => {
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
        url: `${getConfig().mimirUrl}/prometheus`,
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

const getGrafanaAlertManagerDataSourceObject = (
  project: EnvironmentCreateArgs['project'],
  grafanaName: string,
  datasourceName: string,
  stage: 'prod' | 'hprod',
) => {
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
        url: `${getConfig().mimirUrl}`,
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
    const containersSpecArray = [
      {
        image: 'grafana/grafana:9.5.5',
        name: 'grafana',
        ...(getConfig().HTTP_PROXY && getConfig().HTTPS_PROXY) && {
          env: [
            {
              name: 'HTTP_PROXY',
              value: `${getConfig().HTTP_PROXY}`,
            },
            {
              name: 'HTTPS_PROXY',
              value: `${getConfig().HTTPS_PROXY}`,
            },
            {
              name: 'NO_PROXY',
              value: `${getConfig().NO_PROXY}`,
            },
          ],
        },
      }]
    const result = await customObjectsApi.createNamespacedCustomObject('grafana.integreatly.org', 'v1beta1', 'infra-grafana', 'grafanas', getGrafanaObject(instanceName, roleAttributePath, containersSpecArray))
    console.debug(JSON.stringify(result.body))
    console.log(`Grafana ${instanceName} created`)
  } catch {
    console.error('Something happend while creating grafana instance')
  }
}

export const createDataSourcePrometheus = async (
  project: EnvironmentCreateArgs['project'],
  grafanaName: string,
  datasourceName: string,
  stage: 'prod' | 'hprod',
) => {
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

export const createDataSourceAlertmanager = async (
  project: EnvironmentCreateArgs['project'],
  grafanaName: string,
  datasourceName: string,
  stage: 'prod' | 'hprod',
) => {
  const customObjectsApi = await createCustomObjectsApi()
  try {
    const result = await customObjectsApi.createNamespacedCustomObject('grafana.integreatly.org', 'v1beta1', 'infra-grafana', 'grafanadatasources', getGrafanaAlertManagerDataSourceObject(project, grafanaName, datasourceName, stage))
    console.log(`Grafana ${datasourceName} created`)
    console.debug(JSON.stringify(result.body))
  } catch {
    console.error('Something happend while creating prometheus datasource')
  }
}

export const grafanaExist = async (instanceName: string) => {
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

export const datasourceExist = async (datasource: string) => {
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

export const deleteGrafana = async (grafanaName: string) => {
  const customObjectsApi = await createCustomObjectsApi()
  try {
    const result = await customObjectsApi.deleteNamespacedCustomObject('grafana.integreatly.org', 'v1beta1', 'infra-grafana', 'grafanas', grafanaName)
    console.log(`instance ${grafanaName} deleted`)
    console.debug(JSON.stringify(result.body))
  } catch (e) {
    console.log(e)
  }
}

export const deleteDatasource = async (datasource: string) => {
  const customObjectsApi = await createCustomObjectsApi()
  try {
    const result = await customObjectsApi.deleteNamespacedCustomObject('grafana.integreatly.org', 'v1beta1', 'infra-grafana', 'grafanadatasources', datasource)
    console.log(`datasource: ${datasource} deleted`)
    console.debug(JSON.stringify(result.body))
  } catch (e) {
    console.log(e)
  }
}

export const handleInit = async (
  grafanaName: string,
  project: EnvironmentCreateArgs['project'],
  projectName: string,
  stage: 'prod' | 'hprod',
) => {
  const grafanaCrdExist = await grafanaExist(grafanaName)
  const datasourcePromExist = await datasourceExist(`datasource-prom-${grafanaName}`)
  const datasourceAlertExist = await datasourceExist(`datasource-am-${grafanaName}`)
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

export const handleDelete = async (
  stageStillPresent: boolean,
  grafanaName: string,
  stage: EnvironmentDeleteArgs['stage'],
) => {
  if (stageStillPresent) {
    console.log('Stage still present')
    return
  }
  console.log(`Stage ${stage} not present, process program, if instance exist, delete instance`)
  const grafanaCrdExist = await grafanaExist(grafanaName)
  const datasourcePromExist = await datasourceExist(`datasource-prom-${grafanaName}`)
  const datasourceAlertExist = await datasourceExist(`datasource-am-${grafanaName}`)
  if (datasourcePromExist) await deleteDatasource(`datasource-prom-${grafanaName}`)
  if (datasourceAlertExist) await deleteDatasource(`datasource-prom-${grafanaName}`)
  if (grafanaCrdExist) await deleteGrafana(grafanaName)
}
