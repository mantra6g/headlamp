import { describe, expect, it } from 'vitest';
import { matchesLabelSelector } from './labelSelector';

describe('matchesLabelSelector', () => {
  const labels = { nf: 'logger-1', tier: 'edge' };

  it('treats an empty selector as matching everything', () => {
    expect(matchesLabelSelector({}, labels)).toBe(true);
    expect(matchesLabelSelector({}, undefined)).toBe(true);
  });

  it('treats a missing selector as matching nothing', () => {
    expect(matchesLabelSelector(undefined, labels)).toBe(false);
    expect(matchesLabelSelector(null, labels)).toBe(false);
  });

  it('matches matchLabels exactly', () => {
    expect(matchesLabelSelector({ matchLabels: { nf: 'logger-1' } }, labels)).toBe(true);
    expect(matchesLabelSelector({ matchLabels: { nf: 'logger-2' } }, labels)).toBe(false);
    expect(matchesLabelSelector({ matchLabels: { missing: 'x' } }, labels)).toBe(false);
  });

  it('supports every matchExpressions operator', () => {
    const m = (operator: string, key: string, values?: string[]) =>
      matchesLabelSelector({ matchExpressions: [{ key, operator, values }] }, labels);

    expect(m('In', 'tier', ['edge', 'core'])).toBe(true);
    expect(m('In', 'tier', ['core'])).toBe(false);
    expect(m('In', 'missing', ['edge'])).toBe(false);
    expect(m('NotIn', 'tier', ['core'])).toBe(true);
    expect(m('NotIn', 'tier', ['edge'])).toBe(false);
    expect(m('NotIn', 'missing', ['edge'])).toBe(true);
    expect(m('Exists', 'nf')).toBe(true);
    expect(m('Exists', 'missing')).toBe(false);
    expect(m('DoesNotExist', 'missing')).toBe(true);
    expect(m('DoesNotExist', 'nf')).toBe(false);
    expect(m('Bogus', 'nf')).toBe(false);
  });

  it('ANDs matchLabels and matchExpressions', () => {
    const selector = {
      matchLabels: { nf: 'logger-1' },
      matchExpressions: [{ key: 'tier', operator: 'In', values: ['core'] }],
    };
    expect(matchesLabelSelector(selector, labels)).toBe(false);
    expect(matchesLabelSelector(selector, { ...labels, tier: 'core' })).toBe(true);
  });
});
