import { ResourceListView } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { ImlResourceConfig } from '../config';

export function ResourceList({ config }: { config: ImlResourceConfig }) {
  return (
    <ResourceListView
      id={`iml-${config.path}`}
      title={config.label}
      resourceClass={config.resourceClass}
      columns={config.columns}
    />
  );
}
