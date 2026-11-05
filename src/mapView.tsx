/*
 * Resource map integration: adds the relationships between ServiceChains, the
 * NetworkFunctions selected by each chain stage, and the source/destination
 * Applications to Headlamp's Map view.
 *
 * Headlamp already shows IML custom resources on the map as plain nodes (under
 * the "core.loom.io" custom resource group), but it cannot know that a
 * ServiceChain selects NetworkFunctions by label. This source supplies those
 * edges. Node IDs are object UIDs, so nodes listed both here and by the
 * built-in CRD source are merged into one.
 */

import { Icon } from '@iconify/react';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { matchesLabelSelector } from './labelSelector';
import { Application, NetworkFunction, ServiceChain } from './resources';

/** Minimal shape of the objects the edge builder needs, so it can be unit tested. */
interface ObjectLike {
  metadata: { uid: string; name: string; namespace?: string; labels?: Record<string, string> };
}
type ChainLike = ObjectLike & { spec: ServiceChain['spec'] };

export interface ImlEdge {
  id: string;
  source: string;
  target: string;
  data?: Record<string, unknown>;
}

/**
 * Edges for each ServiceChain:
 *   from-Application → ServiceChain → NetworkFunction (one edge per stage match)
 *   ServiceChain → to-Application
 *
 * NetworkFunctions are matched across all namespaces, as the IML daemon's
 * ServiceChain reconciler lists them without a namespace restriction.
 */
export function serviceChainEdges(
  chains: ChainLike[],
  networkFunctions: ObjectLike[],
  applications: ObjectLike[]
): ImlEdge[] {
  const edges: ImlEdge[] = [];
  const findApp = (ref?: { name?: string; namespace?: string }, fallbackNs?: string) =>
    ref?.name
      ? applications.find(
          app =>
            app.metadata.name === ref.name &&
            app.metadata.namespace === (ref.namespace || fallbackNs)
        )
      : undefined;

  for (const chain of chains) {
    const chainUid = chain.metadata.uid;
    const chainNs = chain.metadata.namespace;

    const from = findApp(chain.spec.from, chainNs);
    if (from) {
      edges.push({
        id: `${from.metadata.uid}-${chainUid}`,
        source: from.metadata.uid,
        target: chainUid,
        data: { relation: 'from' },
      });
    }

    (chain.spec.functions ?? []).forEach((selector, stage) => {
      for (const nf of networkFunctions) {
        if (matchesLabelSelector(selector, nf.metadata.labels)) {
          edges.push({
            // Stage is part of the ID: one NF can match several stages of the same chain.
            id: `${chainUid}-stage${stage}-${nf.metadata.uid}`,
            source: chainUid,
            target: nf.metadata.uid,
            data: { relation: 'function', stage },
          });
        }
      }
    });

    const to = findApp(chain.spec.to, chainNs);
    if (to) {
      edges.push({
        id: `${chainUid}-${to.metadata.uid}`,
        source: chainUid,
        target: to.metadata.uid,
        data: { relation: 'to' },
      });
    }
  }

  return edges;
}

/** Same selector as Headlamp's internal useNamespaces(): empty means all namespaces. */
function useSelectedNamespaces(): string[] {
  const namespaces = useSelector((state: any) => state.filter?.namespaces as Set<string>);
  return useMemo(() => [...(namespaces ?? [])], [namespaces]);
}

/**
 * Build map nodes the same way Headlamp's built-in CRD sources do, so the
 * details side panel renders the generic custom resource view either way.
 */
function makeNodes(items: (ServiceChain | NetworkFunction | Application)[] | null) {
  return items?.map(item => {
    const cls = item.constructor as typeof ServiceChain;
    return {
      id: item.metadata.uid,
      kubeObject: item,
      customResourceDefinition: `${cls.apiName}.${cls.apiGroupName}`,
    };
  });
}

const icon = (name: string) => (
  <Icon icon={name} width="100%" height="100%" color="rgb(50, 108, 229)" />
);

const serviceChainSource = {
  id: 'iml-servicechains',
  label: 'Service Chains',
  icon: icon('mdi:link-variant'),
  useData() {
    const namespace = useSelectedNamespaces();
    const [chains] = ServiceChain.useList({ namespace });
    // Unfiltered: chain stages may select NetworkFunctions in any namespace.
    const [networkFunctions] = NetworkFunction.useList();
    const [applications] = Application.useList();

    return useMemo(() => {
      if (!chains) {
        return null;
      }
      return {
        nodes: makeNodes(chains),
        edges: serviceChainEdges(chains, networkFunctions ?? [], applications ?? []),
      };
    }, [chains, networkFunctions, applications]);
  },
};

const networkFunctionSource = {
  id: 'iml-networkfunctions',
  label: 'Network Functions',
  icon: icon('mdi:router-network'),
  useData() {
    const namespace = useSelectedNamespaces();
    const [networkFunctions] = NetworkFunction.useList({ namespace });
    return useMemo(
      () => (networkFunctions ? { nodes: makeNodes(networkFunctions) } : null),
      [networkFunctions]
    );
  },
};

const applicationSource = {
  id: 'iml-applications',
  label: 'Applications',
  icon: icon('mdi:application-outline'),
  useData() {
    const namespace = useSelectedNamespaces();
    const [applications] = Application.useList({ namespace });
    return useMemo(
      () => (applications ? { nodes: makeNodes(applications) } : null),
      [applications]
    );
  },
};

export const imlMapSource = {
  id: 'iml',
  label: 'IML',
  icon: icon('mdi:lan'),
  sources: [serviceChainSource, networkFunctionSource, applicationSource],
};
