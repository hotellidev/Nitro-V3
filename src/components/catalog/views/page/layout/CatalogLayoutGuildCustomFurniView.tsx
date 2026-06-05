import { FC } from 'react';
import { SanitizeHtml } from '../../../../../api';
import { Column, Grid, Text } from '../../../../../common';
import { useCatalogData } from '../../../../../hooks';
import { CatalogGuildBadgeWidgetView } from '../widgets/CatalogGuildBadgeWidgetView';
import { CatalogGuildSelectorWidgetView } from '../widgets/CatalogGuildSelectorWidgetView';
import { CatalogItemGridWidgetView } from '../widgets/CatalogItemGridWidgetView';
import { CatalogPurchaseWidgetView } from '../widgets/CatalogPurchaseWidgetView';
import { CatalogTotalPriceWidget } from '../widgets/CatalogTotalPriceWidget';
import { CatalogViewProductWidgetView } from '../widgets/CatalogViewProductWidgetView';
import { CatalogLayoutProps } from './CatalogLayout.types';

export const CatalogLayouGuildCustomFurniView: FC<CatalogLayoutProps> = props =>
{
    const { page = null } = props;
    const { currentOffer = null } = useCatalogData();

    return (
        <Grid>
            <Column overflow="hidden" size={ 8 }>
                <CatalogItemGridWidgetView columnMinWidth={ 36 } />
            </Column>
            <Column center={ !currentOffer } overflow="hidden" size={ 4 }>
                { !currentOffer &&
                    <>
                        { !!page.localization.getImage(1) && <img alt="" className="max-w-full object-contain" src={ page.localization.getImage(1) } /> }
                        <Text center bold dangerouslySetInnerHTML={ { __html: SanitizeHtml(page.localization.getText(0)) } } />
                    </> }
                { currentOffer &&
                    <>
                        <div className="relative overflow-hidden">
                            <CatalogViewProductWidgetView />
                            <CatalogGuildBadgeWidgetView className="bottom-1 inset-e-1" position="absolute" />
                        </div>
                        <Column grow gap={ 1 }>
                            <Text bold className="leading-tight">{ currentOffer.localizationName }</Text>
                            <div className="grow!">
                                <CatalogGuildSelectorWidgetView />
                            </div>
                            <div className="flex justify-end">
                                <CatalogTotalPriceWidget alignItems="end" />
                            </div>
                            <CatalogPurchaseWidgetView />
                        </Column>
                    </> }
            </Column>
        </Grid>
    );
};
