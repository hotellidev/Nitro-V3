import { GetRoomEngine, RoomPreviewer } from '@nitrots/nitro-renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { LayoutRoomPreviewerView } from '../../../common/layout/LayoutRoomPreviewerView';
import { serializeTilemap } from '../state/encoding';
import { FloorplanState } from '../state/types';

type Props = {
    state: FloorplanState;
    /** Outer container height; the previewer fills the parent width. */
    height?: number;
};

/**
 * Textured isometric room preview driven by the renderer's
 * RoomPreviewer (the same engine the catalog uses for furniture
 * thumbnails). Whenever the editor's tilemap / wallHeight changes,
 * `RoomPreviewer.updatePreviewModel` re-renders the floor with
 * actual sand/plaster textures — far closer to what the room will
 * look like in-game than the previous SVG-on-black preview.
 *
 * IMPORTANT — construction lives INSIDE the lifecycle effect, not
 * in a lazy `useState` initializer. RoomPreviewer.dispose() nulls
 * out internal fields (`_planeParser`, `_backgroundSprite`, …), so
 * once we've disposed an instance any subsequent
 * `updatePreviewModel` call on it crashes with "this._planeParser
 * is null". React 19 StrictMode runs each effect setup → cleanup →
 * setup again on first mount in dev: a lazy useState would hand
 * the same disposed instance to the second setup. By creating the
 * previewer inside the effect and writing it to state, the
 * StrictMode re-run gets a fresh instance — matching the pattern
 * useCatalog already uses for the same renderer object.
 */
export const FloorplanRoomPreview: FC<Props> = ({ state, height = 320 }) =>
{
    const [ previewer, setPreviewer ] = useState<RoomPreviewer | null>(null);

    useEffect(() =>
    {
        const instance = new RoomPreviewer(GetRoomEngine(), ++RoomPreviewer.PREVIEW_COUNTER);

        setPreviewer(instance);

        return () =>
        {
            instance.dispose();
            setPreviewer(prev => (prev === instance ? null : prev));
        };
    }, []);

    const tilemap = useMemo(() => serializeTilemap(state.tiles), [ state.tiles ]);

    // Push the current editor model into the previewer whenever it
    // changes. updatePreviewModel re-runs the same plane-parser +
    // ObjectRoomMapUpdateMessage pipeline as the in-room
    // applyFloorModelLocally, so the textured preview matches the
    // live in-room preview pixel-for-pixel.
    useEffect(() =>
    {
        if(!previewer) return;
        if(!tilemap) return;
        // server-space wall height: editor stores 1+, wire is 0-based
        previewer.updatePreviewModel(tilemap, Math.max(0, state.wallHeight - 1), true);
    }, [ previewer, tilemap, state.wallHeight ]);

    if(!previewer) return <div className="w-full" style={ { height } } />;

    return <LayoutRoomPreviewerView roomPreviewer={ previewer } height={ height } />;
};
