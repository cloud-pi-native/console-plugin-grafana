// @ts-nocheck

import { EnvironmentCreateArgs, EnvironmentDeleteArgs } from '@dso-console/server/src/plugins/hooks/index.js'
import { StepCall } from '@dso-console/server/src/plugins/hooks/hook.js'
import { createDataSourceAlertmanager, createDataSourcePrometheus, createGrafanaInstance, datasourceExist, deleteDatasource, deleteGrafana, grafanaExist, grafanaExist } from './kubernetes.js'
import { createHmac } from 'crypto'
export const initGrafanaInstance: StepCall<EnvironmentCreateArgs> = async (payload) => {
  try {
    const { organization, project, environment, cluster } = payload.args
    console.log(`Metrics plugin initialized for project: ${project}`)
    const namespace = generateNamespaceName(organization, project, environment)
    const grafanaCrdExist = await grafanaExist(project, cluster)
    const datasourcePromExist = await datasourceExist(project, cluster, `datasource-${project}`)
    const datasourceAlertExist = await datasourceExist(project, cluster, `alertmanager-${project}`)
    if (grafanaCrdExist === false) {
      console.log(`Create grafana instance for project: ${project}`)
      await createGrafanaInstance(cluster, project)
    }
    if (!datasourcePromExist === false) {
      console.log(`Create datasource prometheus instance for project: ${project}`)
      await createDataSourcePrometheus(cluster, project, namespace)
    }
    if (!datasourceAlertExist === false) {
      console.log(`Create datasource alertmanager instance for project: ${project}`)
      await createDataSourceAlertmanager(cluster, project, namespace)
    }
    console.log(`Metrics plugin initialized success for project: ${project}`)
    return {
      status: {
        result: 'OK',
        message: 'Created',
      },
    }
  } catch (error) {
    console.error(error)
    return {
      status: {
        result: 'KO',
        message: 'Something happend while creating gafana instance',
      },
      error: JSON.stringify(error),
    }
  }
}

export const deleteGrafanaInstance: StepCall<EnvironmentDeleteArgs> = async (payload) => {
  const { project, cluster } = payload.args
  try {
    const grafanaCrdExist = await grafanaExist(project, cluster)
    const datasourcePromExist = await datasourceExist(project, cluster, `datasource-${project}`)
    const datasourceAlertExist = await datasourceExist(project, cluster, `alertmanager-${project}`)
    if (grafanaCrdExist === true) {
      console.log(`Delete grafana instance for project: ${project}`)
      await deleteGrafana(project, cluster)
    }
    if (datasourceAlertExist === true) {
      console.log(`Delete datasourcealertmanager for project: ${project}`)
      await deleteDatasource(project, `alertmanager-${project}`, cluster)
    }
    if (datasourcePromExist === true) {
      console.log(`Delete datasource prometheus for project: ${project}`)
      await deleteDatasource(project, `datasource-${project}`, cluster)
    }
  } catch (e) {
    console.error(e)
  }
  return {
    status: {
      result: 'OK',
      message: 'OK',
    },
  }
}

export const generateNamespaceName = (org: Organization, proj: Project, env: Environment) => {
  const envHash = createHmac('sha256', '')
    .update(env)
    .digest('hex')
    .slice(0, 4)
  return `${org}-${proj}-${env}-${envHash}`
}
