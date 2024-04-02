import * as React from 'react';

import EdgeServer from 'src/assets/icons/entityIcons/edge-server.svg';
import { Flag } from 'src/components/Flag';
import { Notice } from 'src/components/Notice/Notice';
import { PlacementGroupsSelect } from 'src/components/PlacementGroupsSelect/PlacementGroupsSelect';
import { RegionSelect } from 'src/components/RegionSelect/RegionSelect';
import { sxEdgeIcon } from 'src/components/RegionSelect/RegionSelect.styles';
import { TooltipIcon } from 'src/components/TooltipIcon';
import { Typography } from 'src/components/Typography';
import { useFlags } from 'src/hooks/useFlags';
import { useRegionsQuery } from 'src/queries/regions/regions';
import { useTypeQuery } from 'src/queries/types';
import { getRegionCountryGroup } from 'src/utilities/formatRegion';
import { getLinodeBackupPrice } from 'src/utilities/pricing/backups';
import { PRICES_RELOAD_ERROR_NOTICE_TEXT } from 'src/utilities/pricing/constants';
import {
  getLinodeRegionPrice,
  isLinodeTypeDifferentPriceInSelectedRegion,
} from 'src/utilities/pricing/linodes';

import {
  StyledDiv,
  StyledMigrationBox,
  StyledMigrationContainer,
  StyledPaper,
  StyledSpan,
} from './ConfigureForm.styles';
import { MigrationPricing } from './MigrationPricing';

import type { MigrationPricingProps } from './MigrationPricing';
import type { Linode, PlacementGroup, PriceObject } from '@linode/api-v4';

interface Props {
  backupEnabled: Linode['backups']['enabled'];
  currentRegion: string;
  errorText?: string;
  handlePlacementGroupChange: (selected: PlacementGroup) => void;
  handleSelectRegion: (id: string) => void;
  helperText?: string;
  linodeType: Linode['type'];
  selectedRegion: string;
}

export type MigratePricePanelType = 'current' | 'new';

export const ConfigureForm = React.memo((props: Props) => {
  const {
    backupEnabled,
    currentRegion,
    errorText,
    handlePlacementGroupChange,
    handleSelectRegion,
    helperText,
    linodeType,
    selectedRegion,
  } = props;

  const flags = useFlags();
  const { data: regions } = useRegionsQuery();

  const { data: currentLinodeType } = useTypeQuery(
    linodeType || '',
    Boolean(linodeType)
  );

  const [
    selectedPlacementGroup,
    setSelectedPlacementGroup,
  ] = React.useState<PlacementGroup | null>(null);

  const currentActualRegion = regions?.find((r) => r.id === currentRegion);

  const newRegion = regions?.find(
    (thisRegion) => thisRegion.id === selectedRegion
  );

  const placementGroupSelectLabel = selectedRegion
    ? `Placement Groups in ${newRegion?.label} (${newRegion?.id}) (optional)`
    : 'Placement Group';

  const hasRegionPlacementGroupCapability = Boolean(
    newRegion?.capabilities.includes('Placement Group')
  );

  const isPlacementGroupSelectDisabled =
    !newRegion || !hasRegionPlacementGroupCapability;

  const handlePlacementGroupSelection = (placementGroup: PlacementGroup) => {
    setSelectedPlacementGroup(placementGroup);
    handlePlacementGroupChange(placementGroup);
  };

  const country =
    regions?.find((thisRegion) => thisRegion.id == currentRegion)?.country ??
    'us';

  const shouldDisplayPriceComparison = Boolean(
    selectedRegion &&
      isLinodeTypeDifferentPriceInSelectedRegion({
        regionA: currentRegion,
        regionB: selectedRegion,
        type: currentLinodeType,
      })
  );

  const currentRegionPrice: PriceObject | undefined = getLinodeRegionPrice(
    currentLinodeType,
    currentRegion
  );

  const selectedRegionPrice: PriceObject | undefined = getLinodeRegionPrice(
    currentLinodeType,
    selectedRegion
  );

  const panelPrice = React.useCallback(
    (
      region: string,
      regionPrice: PriceObject | undefined,
      panelType: MigratePricePanelType
    ): MigrationPricingProps => {
      const backupPriceDisplay = (region: string) =>
        currentLinodeType && backupEnabled
          ? getLinodeBackupPrice(currentLinodeType, region)
          : 'disabled';

      return {
        backups: backupPriceDisplay(region),
        hourly: regionPrice?.hourly,
        monthly: regionPrice?.monthly,
        panelType,
      };
    },
    [backupEnabled, currentLinodeType]
  );

  const linodeIsInEdgeRegion = currentActualRegion?.site_type === 'edge';

  return (
    <StyledPaper>
      <Typography variant="h3">Configure Migration</Typography>
      <StyledMigrationContainer>
        <StyledMigrationBox>
          <StyledSpan>Current Region</StyledSpan>
          <StyledDiv>
            <Flag country={country} />
            <Typography>{`${getRegionCountryGroup(currentActualRegion)}: ${
              currentActualRegion?.label ?? currentRegion
            }`}</Typography>
            {linodeIsInEdgeRegion && (
              <TooltipIcon
                icon={<EdgeServer />}
                status="other"
                sxTooltipIcon={sxEdgeIcon}
                text="This region is an Edge server."
              />
            )}
          </StyledDiv>
          {shouldDisplayPriceComparison && (
            <MigrationPricing
              {...panelPrice(currentRegion, currentRegionPrice, 'current')}
            />
          )}
        </StyledMigrationBox>
        <StyledMigrationBox>
          <RegionSelect
            regions={
              regions?.filter(
                (eachRegion) => eachRegion.id !== currentRegion
              ) ?? []
            }
            textFieldProps={{
              helperText,
            }}
            currentCapability="Linodes"
            errorText={errorText}
            handleSelection={handleSelectRegion}
            label="New Region"
            regionFilter={flags.gecko && linodeIsInEdgeRegion ? 'edge' : 'core'}
            selectedId={selectedRegion}
          />
          {shouldDisplayPriceComparison && selectedRegion && (
            <MigrationPricing
              {...panelPrice(selectedRegion, selectedRegionPrice, 'new')}
            />
          )}
          <PlacementGroupsSelect
            handlePlacementGroupChange={(placementGroup) => {
              handlePlacementGroupSelection(placementGroup);
            }}
            disabled={isPlacementGroupSelectDisabled}
            label={placementGroupSelectLabel}
            noOptionsMessage="There are no Placement Groups in this region."
            selectedPlacementGroup={selectedPlacementGroup}
            selectedRegion={newRegion}
          />
        </StyledMigrationBox>
      </StyledMigrationContainer>
      {!currentRegionPrice && selectedRegion && (
        <Notice
          spacingBottom={16}
          spacingTop={8}
          text={PRICES_RELOAD_ERROR_NOTICE_TEXT}
          variant="error"
        />
      )}
    </StyledPaper>
  );
});
