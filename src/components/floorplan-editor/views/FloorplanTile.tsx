import { FC, memo } from 'react';
import { Tile } from '../state/types';
import { tileFill } from '../state/selectors';
import { TILE_SIZE } from '../state/constants';
import { tileToScreen } from '../hooks/usePointerToTile';

type Props = {
    row: number;
    col: number;
    tile: Tile;
    selected: boolean;
    isDoor: boolean;
};

const diamondPoints = (row: number, col: number, h: number): string =>
{
    const [ cx, cyBase ] = tileToScreen(row, col);
    const cy = cyBase - h * (TILE_SIZE / 8);
    const half = TILE_SIZE / 2;
    const quarter = TILE_SIZE / 4;
    // Diamond corners: top, right, bottom, left
    return `${ cx },${ cy - quarter } ${ cx + half },${ cy } ${ cx },${ cy + quarter } ${ cx - half },${ cy }`;
};

const FloorplanTileImpl: FC<Props> = ({ row, col, tile, selected, isDoor }) =>
{
    if(tile.blocked) return null;
    const points = diamondPoints(row, col, tile.h);
    const fill = tileFill(tile);
    return (
        <g>
            <polygon points={ points } fill={ fill } stroke="#222" strokeWidth={ 0.5 } />
            { selected && (
                <polygon
                    data-testid="selection-ring"
                    points={ points }
                    fill="none"
                    stroke="#fff"
                    strokeWidth={ 2 }
                    strokeDasharray="3 2"
                />
            ) }
            { isDoor && (
                <polygon
                    data-testid="door-marker"
                    points={ points }
                    fill="rgba(255,255,255,0.85)"
                    stroke="#000"
                    strokeWidth={ 1 }
                />
            ) }
        </g>
    );
};

export const FloorplanTile = memo(FloorplanTileImpl);
