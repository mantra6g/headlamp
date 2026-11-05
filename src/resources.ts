/*
 * Kubernetes resource classes for the IML (Infrastructure Management Layer) CRDs.
 *
 * Source of truth: https://github.com/mantra6g/iml (operator/config/crd/bases and api/).
 */

import { KubeObject, KubeObjectInterface } from '@kinvolk/headlamp-plugin/lib/k8s/cluster';

export const CORE_API_VERSION = 'core.loom.io/v1alpha1';
export const SCHEDULING_API_VERSION = 'scheduling.loom.io/v1alpha1';
export const INFRA_API_VERSION = 'infra.loom.io/v1alpha1';

export interface ImlCondition {
  type: string;
  status: string;
  reason?: string;
  message?: string;
  lastTransitionTime?: string;
}

export interface ImlObjectInterface<Spec = Record<string, any>, Status = Record<string, any>>
  extends KubeObjectInterface {
  spec?: Spec;
  status?: Status & { conditions?: ImlCondition[] };
}

/** Name of the plugin route that renders the detail page for a given plural. */
export function detailsRouteName(apiName: string) {
  return `iml-${apiName}`;
}

/** Shared helpers for all IML resources. */
class ImlObject<T extends ImlObjectInterface = ImlObjectInterface> extends KubeObject<T> {
  get spec(): NonNullable<T['spec']> {
    return (this.jsonData.spec ?? {}) as NonNullable<T['spec']>;
  }

  get status(): NonNullable<T['status']> {
    return (this.jsonData.status ?? {}) as NonNullable<T['status']>;
  }

  /** Status of the given condition type ("True", "False", "Unknown"), if present. */
  conditionStatus(type: string): string | undefined {
    return this.status.conditions?.find(c => c.type === type)?.status;
  }
}

// ---------------------------------------------------------------------------
// core.loom.io
// ---------------------------------------------------------------------------

export interface DualStackNetwork {
  inet4?: string;
  inet6?: string;
}

export class Application extends ImlObject<
  ImlObjectInterface<{}, { subnets?: Record<string, DualStackNetwork[]> }>
> {
  static kind = 'Application';
  static apiName = 'applications';
  static apiVersion = CORE_API_VERSION;
  static isNamespaced = true;

  static get detailsRoute() {
    return detailsRouteName(this.apiName);
  }
}

export class ImlService extends ImlObject<
  ImlObjectInterface<
    {
      type?: string;
      selector?: Record<string, string>;
      ports?: { name?: string; port?: number; protocol?: string; targetPort?: number | string }[];
    },
    { clusterIPs?: string[]; hostname?: string; serviceName?: string }
  >
> {
  static kind = 'Service';
  static apiName = 'services';
  static apiVersion = CORE_API_VERSION;
  static isNamespaced = true;

  static get detailsRoute() {
    return detailsRouteName(this.apiName);
  }
}

export interface ApplicationReference {
  name: string;
  namespace: string;
}

export class ServiceChain extends ImlObject<
  ImlObjectInterface<{
    from?: ApplicationReference;
    to?: ApplicationReference;
    functions?: { matchLabels?: Record<string, string>; matchExpressions?: any[] }[];
  }>
> {
  static kind = 'ServiceChain';
  static apiName = 'servicechains';
  static apiVersion = CORE_API_VERSION;
  static isNamespaced = true;

  static get detailsRoute() {
    return detailsRouteName(this.apiName);
  }
}

export interface NetworkFunctionSpec {
  targetName?: string;
  targetSelector?: Record<string, string>;
  configRef?: { name?: string };
  controlPlane?: Record<string, any>;
  p4File?: string;
}

export interface NetworkFunctionStatus {
  phase?: string;
  reason?: string;
  assignedIP?: string;
  observedGeneration?: number;
}

export class NetworkFunction extends ImlObject<
  ImlObjectInterface<NetworkFunctionSpec, NetworkFunctionStatus>
> {
  static kind = 'NetworkFunction';
  static apiName = 'networkfunctions';
  static apiVersion = CORE_API_VERSION;
  static isNamespaced = true;

  static get detailsRoute() {
    return detailsRouteName(this.apiName);
  }
}

export class NetworkFunctionConfig extends ImlObject<ImlObjectInterface<{ tables?: any[] }>> {
  static kind = 'NetworkFunctionConfig';
  static apiName = 'networkfunctionconfigs';
  static apiVersion = CORE_API_VERSION;
  static isNamespaced = true;

  static get detailsRoute() {
    return detailsRouteName(this.apiName);
  }
}

export class P4Target extends ImlObject<
  ImlObjectInterface<
    {
      attachment?: { type?: string } & Record<string, any>;
      nfCIDR?: string;
      unschedulable?: boolean;
      taints?: { key: string; value?: string; effect: string }[];
    },
    {
      nodeName?: string;
      targetIPs?: string[];
      driverIPs?: string[];
      capacity?: Record<string, string>;
      allocatable?: Record<string, string>;
      hostVRF?: Record<string, any>;
    }
  >
> {
  static kind = 'P4Target';
  static apiName = 'p4targets';
  static apiVersion = CORE_API_VERSION;
  static isNamespaced = false;

  static get detailsRoute() {
    return detailsRouteName(this.apiName);
  }
}

// ---------------------------------------------------------------------------
// scheduling.loom.io
// ---------------------------------------------------------------------------

export interface ReplicaSpec {
  replicas?: number;
  minReadySeconds?: number;
  selector?: Record<string, any>;
  template?: Record<string, any>;
  strategy?: Record<string, any>;
}

export interface ReplicaStatus {
  replicas?: number;
  readyReplicas?: number;
  availableReplicas?: number;
  updatedReplicas?: number;
  unavailableReplicas?: number;
  fullyLabeledReplicas?: number;
  observedGeneration?: number;
}

export class NetworkFunctionDeployment extends ImlObject<
  ImlObjectInterface<ReplicaSpec, ReplicaStatus>
> {
  static kind = 'NetworkFunctionDeployment';
  static apiName = 'networkfunctiondeployments';
  static apiVersion = SCHEDULING_API_VERSION;
  static isNamespaced = true;

  static get detailsRoute() {
    return detailsRouteName(this.apiName);
  }
}

export class NetworkFunctionReplicaSet extends ImlObject<
  ImlObjectInterface<ReplicaSpec, ReplicaStatus>
> {
  static kind = 'NetworkFunctionReplicaSet';
  static apiName = 'networkfunctionreplicasets';
  static apiVersion = SCHEDULING_API_VERSION;
  static isNamespaced = true;

  static get detailsRoute() {
    return detailsRouteName(this.apiName);
  }
}

// ---------------------------------------------------------------------------
// infra.loom.io
// ---------------------------------------------------------------------------

export class BMv2Target extends ImlObject<
  ImlObjectInterface<{
    initCmd?: string;
    additionalInterfaces?: string[];
    resources?: Record<string, any>;
    affinity?: Record<string, any>;
  }>
> {
  static kind = 'BMv2Target';
  static apiName = 'bmv2targets';
  static apiVersion = INFRA_API_VERSION;
  static isNamespaced = false;

  static get detailsRoute() {
    return detailsRouteName(this.apiName);
  }
}

export class LoomNode extends ImlObject<
  ImlObjectInterface<{
    addresses?: { ip: string; type: string }[];
    nodeCIDRs?: string[];
    tunnelCIDRs?: string[];
  }>
> {
  static kind = 'LoomNode';
  static apiName = 'loomnodes';
  static apiVersion = INFRA_API_VERSION;
  static isNamespaced = false;

  static get detailsRoute() {
    return detailsRouteName(this.apiName);
  }
}
