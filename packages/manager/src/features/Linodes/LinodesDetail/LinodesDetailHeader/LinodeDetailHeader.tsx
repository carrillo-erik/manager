import * as React from 'react';
import { useHistory, useLocation, useRouteMatch } from 'react-router-dom';

import { CircleProgress } from 'src/components/CircleProgress';
import { ErrorState } from 'src/components/ErrorState/ErrorState';
import { LandingHeader } from 'src/components/LandingHeader';
import { ProductInformationBanner } from 'src/components/ProductInformationBanner/ProductInformationBanner';
import { TagDrawer } from 'src/components/TagCell/TagDrawer';
import { LinodeEntityDetail } from 'src/features/Linodes/LinodeEntityDetail';
import { MigrateLinode } from 'src/features/Linodes/MigrateLinode/MigrateLinode';
import { PowerActionsDialog } from 'src/features/Linodes/PowerActionsDialogOrDrawer';
import { useEditableLabelState } from 'src/hooks/useEditableLabelState';
import { useIsResourceRestricted } from 'src/hooks/useIsResourceRestricted';
import {
  useLinodeQuery,
  useLinodeUpdateMutation,
} from 'src/queries/linodes/linodes';
import {
  sendEditBreadcrumbEvent,
  sendLinodeCreateFlowDocsClickEvent,
  sendUpdateLinodeLabelEvent,
} from 'src/utilities/analytics/customEventAnalytics';
import { getAPIErrorOrDefault } from 'src/utilities/errorUtils';
import { getQueryParamsFromQueryString } from 'src/utilities/queryParams';
import { scrollErrorIntoView } from 'src/utilities/scrollErrorIntoView';

import { DeleteLinodeDialog } from '../../LinodesLanding/DeleteLinodeDialog';
import { EnableBackupsDialog } from '../LinodeBackup/EnableBackupsDialog';
import { LinodeRebuildDialog } from '../LinodeRebuild/LinodeRebuildDialog';
import { RescueDialog } from '../LinodeRescue/RescueDialog';
import { LinodeResize } from '../LinodeResize/LinodeResize';
import { VolumesUpgradeBanner } from '../VolumesUpgradeBanner';
import { HostMaintenance } from './HostMaintenance';
import { MutationNotification } from './MutationNotification';
import Notifications from './Notifications';
import { UpgradeVolumesDialog } from './UpgradeVolumesDialog';

import type { APIError } from '@linode/api-v4/lib/types';
import type { Action } from 'src/features/Linodes/PowerActionsDialogOrDrawer';

export const LinodeDetailHeader = () => {
  // Several routes that used to have dedicated pages (e.g. /resize, /rescue)
  // now show their content in modals instead. The logic below facilitates handling
  // modal-related query params (and the older /:subpath routes before the redirect
  // logic changes the URL) to determine if a modal should be open when this component
  // is first rendered.
  const location = useLocation();
  const queryParams = getQueryParamsFromQueryString(location.search);

  const match = useRouteMatch<{ linodeId: string; subpath: string }>({
    path: '/linodes/:linodeId/:subpath?',
  });

  const matchedLinodeId = Number(match?.params?.linodeId ?? 0);

  const { data: linode, error, isLoading } = useLinodeQuery(matchedLinodeId);

  const { mutateAsync: updateLinode } = useLinodeUpdateMutation(
    matchedLinodeId
  );

  const isLinodesGrantReadOnly = useIsResourceRestricted({
    grantLevel: 'read_only',
    grantType: 'linode',
    id: matchedLinodeId,
  });

  const [powerAction, setPowerAction] = React.useState<Action>('Reboot');
  const [powerDialogOpen, setPowerDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(
    queryParams.delete === 'true'
  );
  const [rebuildDialogOpen, setRebuildDialogOpen] = React.useState(
    queryParams.rebuild === 'true'
  );
  const [rescueDialogOpen, setRescueDialogOpen] = React.useState(
    queryParams.rescue === 'true'
  );
  const [resizeDialogOpen, setResizeDialogOpen] = React.useState(
    queryParams.resize === 'true'
  );
  const [migrateDialogOpen, setMigrateDialogOpen] = React.useState(
    queryParams.migrate === 'true'
  );
  const [enableBackupsDialogOpen, setEnableBackupsDialogOpen] = React.useState(
    false
  );
  const isUpgradeVolumesDialogOpen = queryParams.upgrade === 'true';

  const [tagDrawerOpen, setTagDrawerOpen] = React.useState<boolean>(false);

  const history = useHistory();

  const closeDialogs = () => {
    // If the user is on a Linode detail tab with the modal open and they then close it,
    // change the URL to reflect just the tab they are on.
    if (
      queryParams.resize ||
      queryParams.rescue ||
      queryParams.rebuild ||
      queryParams.migrate ||
      queryParams.upgrade
    ) {
      history.replace({ search: undefined });
    }

    setPowerDialogOpen(false);
    setDeleteDialogOpen(false);
    setResizeDialogOpen(false);
    setMigrateDialogOpen(false);
    setRescueDialogOpen(false);
    setRebuildDialogOpen(false);
    setEnableBackupsDialogOpen(false);
  };

  const closeTagDrawer = () => {
    setTagDrawerOpen(false);
  };

  const openTagDrawer = () => {
    setTagDrawerOpen(true);
  };

  const updateTags = (tags: string[]) => {
    return updateLinode({ tags });
  };

  const {
    editableLabelError,
    resetEditableLabel,
    setEditableLabelError,
  } = useEditableLabelState();

  const updateLinodeLabel = async (label: string) => {
    try {
      await updateLinode({ label });
    } catch (updateError) {
      const errors: APIError[] = getAPIErrorOrDefault(
        updateError,
        'An error occurred while updating label',
        'label'
      );
      const errorReasons: string[] = errors.map((error) => error.reason);
      throw new Error(errorReasons[0]);
    }
  };

  const handleLinodeLabelUpdate = (label: string) => {
    return updateLinodeLabel(label)
      .then(() => {
        resetEditableLabel();
        sendUpdateLinodeLabelEvent('Breadcrumb');
      })
      .catch((updateError) => {
        const errorReasons: string[] = [updateError.message];
        setEditableLabelError(errorReasons[0]);
        scrollErrorIntoView();
        return Promise.reject(errorReasons[0]);
      });
  };

  const onOpenPowerDialog = (action: Action) => {
    setPowerDialogOpen(true);
    setPowerAction(action);
  };

  const onOpenDeleteDialog = () => {
    setDeleteDialogOpen(true);
  };

  const onOpenResizeDialog = () => {
    setResizeDialogOpen(true);
  };

  const onOpenRebuildDialog = () => {
    setRebuildDialogOpen(true);
  };

  const onOpenRescueDialog = () => {
    setRescueDialogOpen(true);
  };

  const onOpenMigrateDialog = () => {
    setMigrateDialogOpen(true);
  };

  const handlers = {
    onOpenDeleteDialog,
    onOpenMigrateDialog,
    onOpenPowerDialog,
    onOpenRebuildDialog,
    onOpenRescueDialog,
    onOpenResizeDialog,
  };

  if (isLoading) {
    return <CircleProgress />;
  }

  if (error) {
    return <ErrorState errorText={error?.[0]?.reason} />;
  }

  if (!linode) {
    return null;
  }

  return (
    <>
      <HostMaintenance linodeStatus={linode.status} />
      <MutationNotification linodeId={matchedLinodeId} />
      <Notifications />
      <VolumesUpgradeBanner linodeId={linode.id} />
      <ProductInformationBanner bannerLocation="Linodes" />
      <LandingHeader
        breadcrumbProps={{
          onEditHandlers: {
            editableTextTitle: linode.label,
            errorText: editableLabelError,
            handleAnalyticsEvent: () => sendEditBreadcrumbEvent(),
            onCancel: resetEditableLabel,
            onEdit: handleLinodeLabelUpdate,
          },
          pathname: `/linodes/${linode.label}`,
        }}
        onDocsClick={() => {
          sendLinodeCreateFlowDocsClickEvent('Getting Started');
        }}
        docsLabel="Docs"
        docsLink="https://www.linode.com/docs/guides/platform/get-started/"
        title="Create"
      />
      <LinodeEntityDetail
        handlers={handlers}
        id={matchedLinodeId}
        linode={linode}
        openTagDrawer={openTagDrawer}
      />
      <PowerActionsDialog
        action={powerAction}
        isOpen={powerDialogOpen}
        linodeId={matchedLinodeId}
        linodeLabel={linode.label}
        onClose={closeDialogs}
      />
      <DeleteLinodeDialog
        linodeId={matchedLinodeId}
        linodeLabel={linode.label}
        onClose={closeDialogs}
        onSuccess={() => history.replace('/linodes')}
        open={deleteDialogOpen}
      />
      <LinodeResize
        linodeId={matchedLinodeId}
        linodeLabel={linode.label}
        onClose={closeDialogs}
        open={resizeDialogOpen}
      />
      <LinodeRebuildDialog
        linodeId={matchedLinodeId}
        linodeLabel={linode.label}
        onClose={closeDialogs}
        open={rebuildDialogOpen}
      />
      <RescueDialog
        linodeId={matchedLinodeId}
        linodeLabel={linode.label}
        onClose={closeDialogs}
        open={rescueDialogOpen}
      />
      <MigrateLinode
        linodeId={matchedLinodeId}
        onClose={closeDialogs}
        open={migrateDialogOpen}
      />
      <UpgradeVolumesDialog
        linode={linode}
        onClose={closeDialogs}
        open={isUpgradeVolumesDialogOpen}
      />
      <TagDrawer
        disabled={isLinodesGrantReadOnly}
        entityLabel={linode.label}
        onClose={closeTagDrawer}
        open={tagDrawerOpen}
        tags={linode.tags}
        updateTags={updateTags}
      />
      <EnableBackupsDialog
        linodeId={matchedLinodeId}
        onClose={closeDialogs}
        open={enableBackupsDialogOpen}
      />
    </>
  );
};
