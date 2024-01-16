// @ts-nocheck

import { EnvironmentCreateArgs, EnvironmentDeleteArgs } from '@dso-console/server/src/plugins/hooks/index.js'
import { StepCall } from '@dso-console/server/src/plugins/hooks/hook.js'
import { containsHorsProd, containsProd, createDataSourceAlertmanager, createDataSourcePrometheus, createGrafanaInstance, datasourceExist, deleteDatasource, deleteGrafana, grafanaExist, grafanaExist } from './kubernetes.js'

import { createHmac } from 'crypto'
import { createKeycloakGroups } from './utils.js'

export const keycloakToken = process.env.KEYCLOAK_ADMIN_PASSWORD
export const keycloakUser = process.env.KEYCLOAK_ADMIN
export const initGrafanaInstance: StepCall<EnvironmentCreateArgs> = async (payload) => {
  try {
    const { organization, project, environment, cluster, environments, owner } = payload.args
    console.log(`Metrics plugin initialized for project: ${project}`)
    const grafanaNameProd = `${project}-prod`
    const grafanaNameHorsProd = `${project}-hors-prod`
    const prodIsPresent = await containsProd(environments)
    const projectName = `${organization}-${project}`
    const horsProdIsPresent = await containsHorsProd(environments)
    await createKeycloakGroups(organization, project, owner)
    if (prodIsPresent) {
      const grafanaCrdProdExist = await grafanaExist(cluster, grafanaNameProd)
      const datasourcePromProdExist = await datasourceExist(cluster, `datasource-prom-${grafanaNameProd}`)
      const datasourceAlertProdExist = await datasourceExist(cluster, `datasource-am-${grafanaNameProd}`)
      if (grafanaCrdProdExist === false) {
        console.log(`Create grafana instance: ${grafanaNameProd}, for project: ${project}`)
        // `contains(groups[*], '/${groupBase}/grafana-prod-edit') && 'Editor' || contains(groups[*], '/grafana-ro') && 'Viewer'`

        await createGrafanaInstance(cluster, grafanaNameProd, `contains(groups[*], '/${projectName}/metrics/grafana-prod-edit') && 'Editor' || contains(groups[*], '/${projectName}/metrics/grafana-prod-view') && 'Viewer'`)
      }
      if (datasourcePromProdExist === false) {
        console.log(`Create datasource prod prometheus instance for project: ${project}`)
        await createDataSourcePrometheus(cluster, project, `${grafanaNameProd}`, `datasource-prom-${grafanaNameProd}`, 'prod')
      }
      if (datasourceAlertProdExist === false) {
        console.log(`Create datasource prod alertmanager instance for project: ${project}`)
        await createDataSourceAlertmanager(cluster, project, `${grafanaNameProd}`, `datasource-am-${grafanaNameProd}`, 'prod')
      }
    }
    if (horsProdIsPresent) {
      const grafanaCrdHorsProdExist = await grafanaExist(cluster, grafanaNameHorsProd)
      const datasourcePromHorsProdExist = await datasourceExist(cluster, `datasource-prom-${grafanaNameHorsProd}`)
      const datasourceAlertHorsProdExist = await datasourceExist(cluster, `datasource-am-${grafanaNameHorsProd}`)
      if (grafanaCrdHorsProdExist === false) {
        console.log(`Create grafana instance: ${grafanaNameHorsProd}, for project: ${project}`)
        await createGrafanaInstance(cluster, grafanaNameHorsProd, `contains(groups[*], '/${projectName}/metrics/grafana-hors-prod-edit') && 'Editor' || contains(groups[*], ''/${projectName}/metrics/grafana-hors-prod-view') && 'Viewer'`)
      }
      if (datasourcePromHorsProdExist === false) {
        console.log(`Create datasource hors prod prometheus instance for project: ${project}`)
        await createDataSourcePrometheus(cluster, project, `${grafanaNameHorsProd}`, `datasource-prom-${grafanaNameHorsProd}`, 'hors-prod')
      }
      if (datasourceAlertHorsProdExist === false) {
        console.log(`Create datasource hors prod alertmanager instance for project: ${project}`)
        await createDataSourceAlertmanager(cluster, project, `${grafanaNameHorsProd}`, `datasource-am-${grafanaNameHorsProd}`, 'hors-prod')
      }
    }
    console.log(`Metrics plugin initialized SUCCESS for project: ${project}`)
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
        result: 'OK',
        message: 'Something happend while creating gafana instance',
      },
      error: JSON.stringify(error),
    }
  }
}

export const deleteGrafanaInstance: StepCall<EnvironmentDeleteArgs> = async (payload) => {
  const { organization, project, environment, environments, cluster } = payload.args
  let newList = environments
  let idx = newList.findIndex(objet => objet.environment === environment);
  if (idx !== -1) {
    // Utilise la méthode splice pour supprimer l'objet à l'index trouvé
    newList.splice(idx, 1);
  }
  const grafanaNameProd = `${project}-prod`
  const grafanaNameHorsProd = `${project}-hors-prod`

  try {
    console.log('env', environment)
    console.log('envs', JSON.stringify(environments))
    const prodIsPresent = await containsProd(environments)
    const horsProdIsPresent = await containsHorsProd(environments)
    if (!prodIsPresent) {
      console.log('Prod is present check if prod still present in existing environments')
      const prodStillPresent = await containsProd(newList)
      if (!prodStillPresent) {
        console.log('delete prod instances')
        const grafanaCrdProdExist = await grafanaExist(cluster, grafanaNameProd)
        const datasourcePromProdExist = await datasourceExist(cluster, `datasource-prom-${grafanaNameProd}`)
        const datasourceAlertProdExist = await datasourceExist(cluster, `datasource-am-${grafanaNameProd}`)
        if (datasourcePromProdExist) await deleteDatasource(cluster, `datasource-prom-${grafanaNameProd}`)
        if (datasourceAlertProdExist) await deleteDatasource(cluster, `datasource-prom-${grafanaNameProd}`)
        if (grafanaCrdProdExist) await deleteGrafana(cluster, grafanaNameProd)
      }
    }
    if (!horsProdIsPresent) {
      console.log('Hors Prod is present check if prod still present in existing environments')
      const horsProdStillPresent = await containsHorsProd(newList)
      if (!horsProdStillPresent) {
        console.log('delete hors prod instances')
        const grafanaCrdHorsProdExist = await grafanaExist(cluster, grafanaNameHorsProd)
        const datasourcePromHorsProdExist = await datasourceExist(cluster, `datasource-prom-${grafanaNameHorsProd}`)
        const datasourceAlertHorsProdExist = await datasourceExist(cluster, `datasource-am-${grafanaNameHorsProd}`)
        if (datasourcePromHorsProdExist) await deleteDatasource(cluster, `datasource-prom-${grafanaNameHorsProd}`)
        if (datasourceAlertHorsProdExist) await deleteDatasource(cluster, `datasource-prom-${grafanaNameHorsProd}`)
        if (grafanaCrdHorsProdExist) await deleteGrafana(cluster, grafanaNameHorsProd)
      }
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