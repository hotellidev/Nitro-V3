import { GetTargetedOfferComposer, TargetedOfferData, TargetedOfferEvent } from '@nitrots/nitro-renderer';
import { useEffect, useState } from 'react';
import { SendMessageComposer } from '../../../../api';
import { useMessageEventState } from '../../../../hooks';
import { OfferBubbleView } from './OfferBubbleView';
import { OfferWindowView } from './OfferWindowView';

export const OfferView = () =>
{
    const offer = useMessageEventState<TargetedOfferEvent, TargetedOfferData>(
        TargetedOfferEvent,
        evt => evt.getParser()?.data ?? null,
        null
    );
    const [ opened, setOpened ] = useState<boolean>(false);

    useEffect(() =>
    {
        SendMessageComposer(new GetTargetedOfferComposer());
    }, []);

    if(!offer) return;

    return <>
        { opened ? <OfferWindowView offer={ offer } setOpen={ setOpened } /> : <OfferBubbleView offer={ offer } setOpen={ setOpened } /> }
    </>;
};
