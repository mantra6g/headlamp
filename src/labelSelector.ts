/*
 * Client-side evaluation of Kubernetes metav1.LabelSelector, mirroring
 * k8s.io/apimachinery LabelSelectorAsSelector semantics.
 */

export interface LabelSelectorRequirement {
  key: string;
  operator: 'In' | 'NotIn' | 'Exists' | 'DoesNotExist' | string;
  values?: string[];
}

export interface LabelSelector {
  matchLabels?: Record<string, string>;
  matchExpressions?: LabelSelectorRequirement[];
}

/**
 * Whether `labels` satisfy `selector`.
 *
 * An empty selector (`{}`) matches everything, as LabelSelectorAsSelector
 * returns labels.Everything() for it. A missing selector matches nothing. A
 * requirement with an unknown operator makes the selector invalid; the IML
 * daemon fails the reconcile in that case, so here it matches nothing.
 */
export function matchesLabelSelector(
  selector: LabelSelector | null | undefined,
  labels: Record<string, string> | undefined
): boolean {
  if (!selector) {
    return false;
  }
  const set = labels ?? {};

  for (const [key, value] of Object.entries(selector.matchLabels ?? {})) {
    if (set[key] !== value) {
      return false;
    }
  }

  for (const req of selector.matchExpressions ?? []) {
    const has = Object.prototype.hasOwnProperty.call(set, req.key);
    switch (req.operator) {
      case 'In':
        if (!has || !(req.values ?? []).includes(set[req.key])) {
          return false;
        }
        break;
      case 'NotIn':
        if (has && (req.values ?? []).includes(set[req.key])) {
          return false;
        }
        break;
      case 'Exists':
        if (!has) {
          return false;
        }
        break;
      case 'DoesNotExist':
        if (has) {
          return false;
        }
        break;
      default:
        return false;
    }
  }

  return true;
}
