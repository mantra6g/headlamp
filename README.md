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

## Layout

- `src/resources.ts`: a `KubeObject` class for each IML CRD.
- `src/config.tsx`: sidebar label, URL path, list columns and detail rows for each resource.
- `src/components/`: the shared list and detail pages.
- `src/index.tsx`: registers the sidebar entries, routes and kind icons from `config.tsx`.

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
