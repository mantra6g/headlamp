/*
 * Declarative description of every IML resource shown in Headlamp: its sidebar
 * label, URL path, list columns and the extra rows shown on its detail page.
 */

import {
  Link,
  NameValueTableRow,
  ResourceTableColumn,
  StatusLabel,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { KubeObjectClass } from '@kinvolk/headlamp-plugin/lib/k8s/cluster';
import {
  Application,
  ApplicationReference,
  BMv2Target,
  detailsRouteName,
  ImlService,
  LoomNode,
  NetworkFunction,
  NetworkFunctionConfig,
  NetworkFunctionDeployment,
  NetworkFunctionReplicaSet,
  P4Target,
  ServiceChain,
} from './resources';

type ColumnType = 'age' | 'name' | 'namespace' | 'type' | 'kind' | 'cluster' | 'labels';

export interface ImlResourceConfig<C extends KubeObjectClass = KubeObjectClass> {
  /** Sidebar label and list title (plural). */
  label: string;
  /** Detail page title (singular). */
  singular: string;
  /** URL segment under /iml/. */
  path: string;
  /** Iconify icon name used for the kind in the resource map. */
  icon: string;
  resourceClass: C;
  columns: (ResourceTableColumn<InstanceType<C>> | ColumnType)[];
  extraInfo?: (item: InstanceType<C>) => NameValueTableRow[];
}

/** Helper that keeps the column/extraInfo callbacks typed against the specific class. */
function resource<C extends KubeObjectClass>(config: ImlResourceConfig<C>) {
  return config as unknown as ImlResourceConfig;
}

const join = (values?: (string | undefined)[]) => values?.filter(Boolean).join(', ') || '';

const formatLabels = (labels?: Record<string, string>) =>
  Object.entries(labels ?? {})
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');

function conditionLabel(status?: string) {
  if (!status) {
    return <StatusLabel status="">Unknown</StatusLabel>;
  }
  const s = status === 'True' ? 'success' : status === 'False' ? 'error' : 'warning';
  return <StatusLabel status={s}>{status === 'True' ? 'Ready' : 'Not Ready'}</StatusLabel>;
}

function phaseLabel(phase?: string) {
  if (!phase) {
    return '';
  }
  const s = phase === 'Running' ? 'success' : phase === 'Failed' ? 'error' : 'warning';
  return <StatusLabel status={s}>{phase}</StatusLabel>;
}

function AppRef({ app }: { app?: ApplicationReference }) {
  if (!app?.name) {
    return null;
  }
  return (
    <Link
      routeName={detailsRouteName(Application.apiName)}
      params={{ name: app.name, namespace: app.namespace }}
    >
      {app.namespace ? `${app.namespace}/${app.name}` : app.name}
    </Link>
  );
}

const appRefText = (app?: ApplicationReference) =>
  app?.name ? (app.namespace ? `${app.namespace}/${app.name}` : app.name) : '';

function readyColumn<
  T extends { conditionStatus(type: string): string | undefined }
>(): ResourceTableColumn<T> {
  return {
    id: 'ready',
    label: 'Ready',
    getValue: item => item.conditionStatus('Ready') ?? 'Unknown',
    render: item => conditionLabel(item.conditionStatus('Ready')),
  };
}

const replicaColumns = <
  T extends {
    spec: { replicas?: number };
    status: { readyReplicas?: number; availableReplicas?: number };
  }
>(): ResourceTableColumn<T>[] => [
  {
    id: 'ready',
    label: 'Ready',
    getValue: item => `${item.status.readyReplicas ?? 0}/${item.spec.replicas ?? 0}`,
  },
  {
    id: 'available',
    label: 'Available',
    getValue: item => item.status.availableReplicas ?? 0,
  },
];

const replicaInfo = (item: NetworkFunctionDeployment | NetworkFunctionReplicaSet) => [
  { name: 'Desired Replicas', value: item.spec.replicas ?? 0 },
  { name: 'Current Replicas', value: item.status.replicas ?? 0 },
  { name: 'Ready Replicas', value: item.status.readyReplicas ?? 0 },
  { name: 'Available Replicas', value: item.status.availableReplicas ?? 0 },
  {
    name: 'Min Ready Seconds',
    value: item.spec.minReadySeconds,
    hide: item.spec.minReadySeconds === undefined,
  },
  {
    name: 'Selector',
    value: formatLabels(item.spec.selector?.matchLabels),
    hide: !item.spec.selector?.matchLabels,
  },
];

export const IML_RESOURCES: ImlResourceConfig[] = [
  // ---------------------------------------------------------------- core.loom.io
  resource({
    label: 'Applications',
    singular: 'Application',
    path: 'applications',
    icon: 'mdi:application-outline',
    resourceClass: Application,
    columns: ['name', 'namespace', 'age'],
    extraInfo: item => [
      {
        name: 'Subnets',
        value: Object.entries(item.status.subnets ?? {})
          .map(([node, nets]) => `${node}: ${join(nets.flatMap(n => [n.inet4, n.inet6]))}`)
          .join('; '),
        hide: !item.status.subnets,
      },
    ],
  }),
  resource({
    label: 'Services',
    singular: 'Service',
    path: 'services',
    icon: 'mdi:lan-connect',
    resourceClass: ImlService,
    columns: [
      'name',
      'namespace',
      { id: 'type', label: 'Type', getValue: item => item.spec.type ?? '' },
      { id: 'clusterIP', label: 'Cluster-IP', getValue: item => item.status.clusterIPs?.[0] ?? '' },
      { id: 'hostname', label: 'Hostname', getValue: item => item.status.hostname ?? '' },
      'age',
    ],
    extraInfo: item => [
      { name: 'Type', value: item.spec.type },
      { name: 'Selector', value: formatLabels(item.spec.selector) },
      {
        name: 'Ports',
        value: (item.spec.ports ?? [])
          .map(
            p =>
              `${p.name ? p.name + ' ' : ''}${p.port}${p.targetPort ? '→' + p.targetPort : ''}/${
                p.protocol ?? 'TCP'
              }`
          )
          .join(', '),
      },
      { name: 'Cluster IPs', value: join(item.status.clusterIPs) },
      { name: 'Hostname', value: item.status.hostname },
      { name: 'Backing Service', value: item.status.serviceName, hide: !item.status.serviceName },
    ],
  }),
  resource({
    label: 'Service Chains',
    singular: 'Service Chain',
    path: 'servicechains',
    icon: 'mdi:link-variant',
    resourceClass: ServiceChain,
    columns: [
      'name',
      'namespace',
      {
        id: 'from',
        label: 'From',
        getValue: item => appRefText(item.spec.from),
        render: item => <AppRef app={item.spec.from} />,
      },
      {
        id: 'to',
        label: 'To',
        getValue: item => appRefText(item.spec.to),
        render: item => <AppRef app={item.spec.to} />,
      },
      { id: 'functions', label: 'Functions', getValue: item => item.spec.functions?.length ?? 0 },
      'age',
    ],
    extraInfo: item => [
      { name: 'From', value: <AppRef app={item.spec.from} /> },
      { name: 'To', value: <AppRef app={item.spec.to} /> },
      {
        name: 'Functions',
        value: (item.spec.functions ?? []).map((f, i) => (
          <div key={i}>
            {i + 1}. {formatLabels(f.matchLabels) || JSON.stringify(f.matchExpressions ?? {})}
          </div>
        )),
        hide: !item.spec.functions?.length,
      },
    ],
  }),
  resource({
    label: 'Network Functions',
    singular: 'Network Function',
    path: 'networkfunctions',
    icon: 'mdi:router-network',
    resourceClass: NetworkFunction,
    columns: [
      'name',
      'namespace',
      {
        id: 'phase',
        label: 'Phase',
        getValue: item => item.status.phase ?? '',
        render: item => phaseLabel(item.status.phase),
      },
      { id: 'target', label: 'Target', getValue: item => item.spec.targetName ?? '' },
      { id: 'ip', label: 'Assigned IP', getValue: item => item.status.assignedIP ?? '' },
      'age',
    ],
    extraInfo: item => [
      { name: 'Phase', value: phaseLabel(item.status.phase) },
      { name: 'Reason', value: item.status.reason, hide: !item.status.reason },
      { name: 'P4 File', value: item.spec.p4File },
      {
        name: 'Target',
        value: item.spec.targetName && (
          <Link
            routeName={detailsRouteName(P4Target.apiName)}
            params={{ name: item.spec.targetName }}
          >
            {item.spec.targetName}
          </Link>
        ),
        hide: !item.spec.targetName,
      },
      {
        name: 'Target Selector',
        value: formatLabels(item.spec.targetSelector),
        hide: !item.spec.targetSelector,
      },
      {
        name: 'Config',
        value: item.spec.configRef?.name && (
          <Link
            routeName={detailsRouteName(NetworkFunctionConfig.apiName)}
            params={{ name: item.spec.configRef.name, namespace: item.getNamespace() }}
          >
            {item.spec.configRef.name}
          </Link>
        ),
        hide: !item.spec.configRef?.name,
      },
      { name: 'Assigned IP', value: item.status.assignedIP, hide: !item.status.assignedIP },
    ],
  }),
  resource({
    label: 'Network Function Configs',
    singular: 'Network Function Config',
    path: 'networkfunctionconfigs',
    icon: 'mdi:table-cog',
    resourceClass: NetworkFunctionConfig,
    columns: [
      'name',
      'namespace',
      { id: 'tables', label: 'Tables', getValue: item => item.spec.tables?.length ?? 0 },
      'age',
    ],
    extraInfo: item => [{ name: 'Tables', value: item.spec.tables?.length ?? 0 }],
  }),
  resource({
    label: 'P4 Targets',
    singular: 'P4 Target',
    path: 'p4targets',
    icon: 'mdi:chip',
    resourceClass: P4Target,
    columns: [
      'name',
      readyColumn<P4Target>(),
      { id: 'node', label: 'Node', getValue: item => item.status.nodeName ?? '' },
      { id: 'attachment', label: 'Attachment', getValue: item => item.spec.attachment?.type ?? '' },
      { id: 'targetIPs', label: 'Target IPs', getValue: item => join(item.status.targetIPs) },
      'age',
    ],
    extraInfo: item => [
      { name: 'Ready', value: conditionLabel(item.conditionStatus('Ready')) },
      { name: 'Node', value: item.status.nodeName },
      { name: 'NF CIDR', value: item.spec.nfCIDR, hide: !item.spec.nfCIDR },
      { name: 'Attachment', value: item.spec.attachment?.type, hide: !item.spec.attachment?.type },
      { name: 'Unschedulable', value: String(!!item.spec.unschedulable) },
      { name: 'Target IPs', value: join(item.status.targetIPs) },
      { name: 'Driver IPs', value: join(item.status.driverIPs) },
      {
        name: 'Capacity',
        value: formatLabels(item.status.capacity),
        hide: !item.status.capacity,
      },
      {
        name: 'Allocatable',
        value: formatLabels(item.status.allocatable),
        hide: !item.status.allocatable,
      },
      {
        name: 'Taints',
        value: (item.spec.taints ?? [])
          .map(t => `${t.key}${t.value ? '=' + t.value : ''}:${t.effect}`)
          .join(', '),
        hide: !item.spec.taints?.length,
      },
    ],
  }),
  // ---------------------------------------------------------------- scheduling.loom.io
  resource({
    label: 'NF Deployments',
    singular: 'Network Function Deployment',
    path: 'networkfunctiondeployments',
    icon: 'mdi:rocket-launch-outline',
    resourceClass: NetworkFunctionDeployment,
    columns: [
      'name',
      'namespace',
      ...replicaColumns<NetworkFunctionDeployment>(),
      {
        id: 'upToDate',
        label: 'Up-to-date',
        getValue: item => item.status.updatedReplicas ?? 0,
      },
      'age',
    ],
    extraInfo: item => [
      ...replicaInfo(item),
      { name: 'Updated Replicas', value: item.status.updatedReplicas ?? 0 },
      { name: 'Strategy', value: item.spec.strategy?.type, hide: !item.spec.strategy?.type },
    ],
  }),
  resource({
    label: 'NF ReplicaSets',
    singular: 'Network Function ReplicaSet',
    path: 'networkfunctionreplicasets',
    icon: 'mdi:content-copy',
    resourceClass: NetworkFunctionReplicaSet,
    columns: ['name', 'namespace', ...replicaColumns<NetworkFunctionReplicaSet>(), 'age'],
    extraInfo: item => replicaInfo(item),
  }),
  // ---------------------------------------------------------------- infra.loom.io
  resource({
    label: 'BMv2 Targets',
    singular: 'BMv2 Target',
    path: 'bmv2targets',
    icon: 'mdi:switch',
    resourceClass: BMv2Target,
    columns: ['name', readyColumn<BMv2Target>(), 'age'],
    extraInfo: item => [
      { name: 'Ready', value: conditionLabel(item.conditionStatus('Ready')) },
      {
        name: 'Init Command',
        value: item.spec.initCmd,
        hide: !item.spec.initCmd,
      },
      {
        name: 'Additional Interfaces',
        value: join(item.spec.additionalInterfaces),
        hide: !item.spec.additionalInterfaces?.length,
      },
    ],
  }),
  resource({
    label: 'Loom Nodes',
    singular: 'Loom Node',
    path: 'loomnodes',
    icon: 'mdi:server-network',
    resourceClass: LoomNode,
    columns: [
      'name',
      { id: 'nodeCIDRs', label: 'Node CIDRs', getValue: item => join(item.spec.nodeCIDRs) },
      { id: 'tunnelCIDRs', label: 'Tunnel CIDRs', getValue: item => join(item.spec.tunnelCIDRs) },
      'age',
    ],
    extraInfo: item => [
      {
        name: 'Addresses',
        value: (item.spec.addresses ?? []).map(a => `${a.ip} (${a.type})`).join(', '),
      },
      { name: 'Node CIDRs', value: join(item.spec.nodeCIDRs) },
      { name: 'Tunnel CIDRs', value: join(item.spec.tunnelCIDRs) },
    ],
  }),
];
