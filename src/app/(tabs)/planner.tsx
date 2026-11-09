import React from 'react';
import { useTranslation } from 'react-i18next';

import { ComingSoonCard, TabScreen } from '@/components/tab-screen';

export default function PlannerScreen() {
  const { t } = useTranslation();

  return (
    <TabScreen title={t('tabs.planner.title')}>
      <ComingSoonCard icon="sparkles-outline" description={t('tabs.planner.description')} />
    </TabScreen>
  );
}