import { FC } from 'react';
import { useCatalogClassicStyle } from '../../hooks';
import { PurseClassicView } from './PurseClassicView';
import { PurseModernView } from './PurseModernView';

export const PurseView: FC<{}> = props =>
{
    const [ classicStyle ] = useCatalogClassicStyle();

    return classicStyle ? <PurseClassicView /> : <PurseModernView />;
};
