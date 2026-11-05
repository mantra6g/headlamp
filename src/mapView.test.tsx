import { describe, expect, it, vi } from 'vitest';
import { serviceChainEdges } from './mapView';

// The map source module imports the resource classes; only the pure edge
// builder is under test, so stub them out (vi.mock is hoisted above imports).
vi.mock('./resources', () => ({ Application: {}, NetworkFunction: {}, ServiceChain: {} }));

const obj = (
  uid: string,
  name: string,
  namespace = 'default',
  labels?: Record<string, string>
) => ({
  metadata: { uid, name, namespace, labels },
});

const apps = [obj('app-client', 'web-client'), obj('app-server', 'web-server')];
const nfs = [
  obj('nf-1', 'logger-1', 'default', { nf: 'logger-1' }),
  obj('nf-2', 'logger-2', 'default', { nf: 'logger-2' }),
  obj('nf-3', 'logger-3', 'other', { nf: 'logger-2' }),
];

const chain = (spec: any) => ({ ...obj('sc', 'client-server-with-firewall'), spec });

describe('serviceChainEdges', () => {
  it('links from-app → chain → stage NFs and chain → to-app', () => {
    const edges = serviceChainEdges(
      [
        chain({
          from: { name: 'web-client', namespace: 'default' },
          to: { name: 'web-server', namespace: 'default' },
          functions: [{ matchLabels: { nf: 'logger-1' } }, { matchLabels: { nf: 'logger-2' } }],
        }),
      ],
      nfs,
      apps
    );

    expect(edges.map(e => [e.source, e.target, e.data?.stage])).toEqual([
      ['app-client', 'sc', undefined],
      ['sc', 'nf-1', 0],
      // NFs are matched cluster-wide, like the IML daemon does.
      ['sc', 'nf-2', 1],
      ['sc', 'nf-3', 1],
      ['sc', 'app-server', undefined],
    ]);
  });

  it('gives unique IDs when one NF matches several stages', () => {
    const edges = serviceChainEdges(
      [chain({ functions: [{ matchLabels: { nf: 'logger-1' } }, {}] })],
      [nfs[0]],
      []
    );
    expect(edges).toHaveLength(2);
    expect(new Set(edges.map(e => e.id)).size).toBe(2);
  });

  it('skips references to applications that do not exist', () => {
    const edges = serviceChainEdges(
      [chain({ from: { name: 'missing', namespace: 'default' }, to: { name: 'web-server' } })],
      [],
      apps
    );
    // `to` has no namespace, so it falls back to the chain's namespace.
    expect(edges.map(e => e.target)).toEqual(['app-server']);
  });
});
