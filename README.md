# iml-headlamp

A [Headlamp](https://github.com/kubernetes-sigs/headlamp) plugin for
[IML (Infrastructure Management Layer)](https://github.com/mantra6g/iml). It adds an **IML**
section to the Headlamp sidebar with list and detail pages for every IML custom resource.

| Sidebar entry            | Kind                        | API group            | Scope      |
| ------------------------ | --------------------------- | -------------------- | ---------- |
| Applications             | `Application`               | `core.loom.io`       | Namespaced |
| Services                 | `Service`                   | `core.loom.io`       | Namespaced |
| Service Chains           | `ServiceChain`              | `core.loom.io`       | Namespaced |
| Network Functions        | `NetworkFunction`           | `core.loom.io`       | Namespaced |
| Network Function Configs | `NetworkFunctionConfig`     | `core.loom.io`       | Namespaced |
| P4 Targets               | `P4Target`                  | `core.loom.io`       | Cluster    |
| NF Deployments           | `NetworkFunctionDeployment` | `scheduling.loom.io` | Namespaced |
| NF ReplicaSets           | `NetworkFunctionReplicaSet` | `scheduling.loom.io` | Namespaced |
| BMv2 Targets             | `BMv2Target`                | `infra.loom.io`      | Cluster    |
| Loom Nodes               | `LoomNode`                  | `infra.loom.io`      | Cluster    |

Detail pages show the standard Headlamp metadata, edit, delete and YAML actions, plus
resource-specific fields, a conditions table (when the resource reports conditions) and events.

## Resource map

The plugin adds an **IML** source to Headlamp's Map view. It links each `ServiceChain` to:

- the `Application` in `spec.from` (edge from the application to the chain),
- every `NetworkFunction` selected by each `spec.functions[i]` label selector,
- the `Application` in `spec.to` (edge from the chain to the application).

Selectors are evaluated like Kubernetes `metav1.LabelSelector` (`matchLabels` and all
`matchExpressions` operators; an empty selector matches every NetworkFunction). As in the IML
daemon, NetworkFunctions are matched in every namespace, not only the chain's.

Headlamp already lists IML resources on the map under the `core.loom.io` custom resource group.
The IML source uses the same node IDs (object UIDs), so its nodes merge with those and it
contributes the edges. The map renders edges without labels, so stage order isn't shown.

## Layout

- `src/resources.ts`: a `KubeObject` class for each IML CRD.
- `src/config.tsx`: sidebar label, URL path, list columns and detail rows for each resource.
- `src/components/`: the shared list and detail pages.
- `src/mapView.tsx`: the Map view source with the ServiceChain edges.
- `src/labelSelector.ts`: client-side `LabelSelector` matching.
- `src/index.tsx`: registers the sidebar entries, routes, kind icons and map source.

To add a new IML CRD, add its class to `resources.ts` and an entry to `IML_RESOURCES` in
`config.tsx`.

## Development

Use the Node version in `.nvmrc` (22). The plugin tooling doesn't run on newer Node releases.

```sh
npm install
npm start        # watch and load into a running Headlamp
npm run tsc      # type-check
npm run lint
npm run build
```

See the [Headlamp plugin docs](https://headlamp.dev/docs/latest/development/plugins/) for
how to load a development plugin into Headlamp.
