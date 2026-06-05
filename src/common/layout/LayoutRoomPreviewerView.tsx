import { GetRenderer, GetTicker, NitroLogger, NitroTicker, RoomPreviewer, TextureUtils } from '@nitrots/nitro-renderer';
import { FC, MouseEvent, useEffect, useRef } from 'react';

export const LayoutRoomPreviewerView: FC<{
    roomPreviewer: RoomPreviewer;
    height?: number;
}> = props =>
{
    const { roomPreviewer = null, height = 0 } = props;
    const elementRef = useRef<HTMLDivElement>(null);
    // Latch that disables further renders once Pixi throws inside this
    // previewer. The crash (e.g. blackhole furni's filter chain that
    // accesses .alphaMode on a null texture) repeats every animation
    // frame as long as the ticker keeps firing, flooding the console
    // and locking the catalog. One catch and we stop trying for the
    // lifetime of this previewer instance.
    const renderFailedRef = useRef(false);

    const onClick = (event: MouseEvent<HTMLDivElement>) =>
    {
        if(!roomPreviewer) return;

        if(event.shiftKey) roomPreviewer.changeRoomObjectDirection();
        else roomPreviewer.changeRoomObjectState();
    };

    useEffect(() =>
    {
        if(!elementRef) return;

        renderFailedRef.current = false;

        const width = elementRef.current.parentElement.clientWidth;
        const texture = TextureUtils.createRenderTexture(width, height);

        const paintToDOM = () =>
        {
            if(renderFailedRef.current) return;
            if(!roomPreviewer || !elementRef.current) return;

            const renderingCanvas = roomPreviewer.getRenderingCanvas();

            if(!renderingCanvas) return;

            try
            {
                GetRenderer().render({
                    target: texture,
                    container: renderingCanvas.master,
                    clear: true
                });

                const canvas = GetRenderer().texture.generateCanvas(texture);
                const base64 = canvas.toDataURL('image/png');

                canvas.width = 0;
                canvas.height = 0;

                elementRef.current.style.backgroundImage = `url(${ base64 })`;
            }
            catch(error)
            {
                renderFailedRef.current = true;
                NitroLogger.error('LayoutRoomPreviewerView paint failed; disabling further renders for this preview', error);
            }
        };

        const update = (ticker: NitroTicker) =>
        {
            if(renderFailedRef.current) return;
            if(!roomPreviewer || !elementRef.current) return;

            try
            {
                roomPreviewer.updatePreviewRoomView();
            }
            catch(error)
            {
                renderFailedRef.current = true;
                NitroLogger.error('LayoutRoomPreviewerView update failed; disabling further renders for this preview', error);
                return;
            }

            const renderingCanvas = roomPreviewer.getRenderingCanvas();

            if(renderingCanvas && renderingCanvas.canvasUpdated)
            {
                paintToDOM();
            }
        };

        GetTicker().add(update);

        const resizeObserver = new ResizeObserver(() =>
        {
            if(!roomPreviewer || !elementRef.current) return;

            const width = elementRef.current.parentElement.offsetWidth;

            roomPreviewer.modifyRoomCanvas(width, height);

            paintToDOM();
        });

        roomPreviewer.getRoomCanvas(width, height);

        resizeObserver.observe(elementRef.current);

        return () =>
        {
            GetTicker().remove(update);

            resizeObserver.disconnect();

            texture.destroy(true);
        };
    }, [ roomPreviewer, elementRef, height ]);

    return (
        <div
            ref={ elementRef }
            className="relative w-full rounded-md shadow-room-previewer"
            style={ {
                height,
                minHeight: height,
                maxHeight: height
            } }
            onClick={ onClick } />
    );
};
