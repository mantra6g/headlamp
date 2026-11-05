/*
 * Copyright 2025 The Kubernetes Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Icon } from '@iconify/react';
import {
  registerKindIcon,
  registerMapSource,
  registerRoute,
  registerSidebarEntry,
} from '@kinvolk/headlamp-plugin/lib';
import { ResourceDetail } from './components/ResourceDetail';
import { ResourceList } from './components/ResourceList';
import { IML_RESOURCES } from './config';
import { imlMapSource } from './mapView';
import { detailsRouteName } from './resources';

const SIDEBAR_ROOT = 'iml';

registerSidebarEntry({
  parent: null,
  name: SIDEBAR_ROOT,
  label: 'IML',
  url: `/iml/${IML_RESOURCES[0].path}`,
  icon: 'mdi:lan',
});

for (const config of IML_RESOURCES) {
  const { resourceClass, path, label, icon } = config;
  const sidebarName = `iml-${path}`;

  registerSidebarEntry({
    parent: SIDEBAR_ROOT,
    name: sidebarName,
    label,
    url: `/iml/${path}`,
  });

  registerRoute({
    path: `/iml/${path}`,
    sidebar: sidebarName,
    name: `iml-${path}-list`,
    exact: true,
    component: () => <ResourceList config={config} />,
  });

  registerRoute({
    path: resourceClass.isNamespaced ? `/iml/${path}/:namespace/:name` : `/iml/${path}/:name`,
    sidebar: sidebarName,
    name: detailsRouteName(resourceClass.apiName),
    exact: true,
    component: () => <ResourceDetail config={config} />,
  });

  // Scoped to the API group so IML's "Service" kind doesn't change the core Service icon.
  registerKindIcon(
    resourceClass.kind,
    { icon: <Icon icon={icon} width="70%" height="70%" />, color: 'rgb(50, 108, 229)' },
    resourceClass.apiGroupName
  );
}

registerMapSource(imlMapSource);
