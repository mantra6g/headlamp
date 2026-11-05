import {
  ConditionsTable,
  DetailsGrid,
  SectionBox,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { useParams } from 'react-router-dom';
import { ImlResourceConfig } from '../config';

export function ResourceDetail({ config }: { config: ImlResourceConfig }) {
  const { name, namespace } = useParams<{ name: string; namespace?: string }>();

  return (
    <DetailsGrid
      title={config.singular}
      resourceType={config.resourceClass}
      name={name}
      namespace={namespace}
      withEvents
      extraInfo={item => (item && config.extraInfo ? config.extraInfo(item) : [])}
      extraSections={item =>
        item && [
          {
            id: 'iml-conditions',
            section: item.jsonData?.status?.conditions?.length ? (
              <SectionBox title="Conditions">
                <ConditionsTable resource={item.jsonData} showLastUpdate={false} />
              </SectionBox>
            ) : null,
          },
        ]
      }
    />
  );
}
