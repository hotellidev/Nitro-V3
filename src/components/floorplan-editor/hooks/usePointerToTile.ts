import { RefObject, useCallback, useMemo } from 'react';
import { TILE_SIZE } from '../state/constants';

const X_OFFSET = 1024;

export const tileToScreen = (row: number, col: number): [number, number] =>
{
    const x = (col * TILE_SIZE / 2) - (row * TILE_SIZE / 2) + X_OFFSET;
    const y = (col * TILE_SIZE / 4) + (row * TILE_SIZE / 4);
    return [ x, y ];
};

export const screenToTile = (x: number, y: number): [number, number] =>
{
    const tx = x - X_OFFSET;
    const col = ((tx / (TILE_SIZE / 2)) + (y / (TILE_SIZE / 4))) / 2;
    const row = ((y / (TILE_SIZE / 4)) - (tx / (TILE_SIZE / 2))) / 2;
    return [ row, col ];
};

type ViewBox = { width: number; height: number; x?: number; y?: number };

export type PointerProjection = {
    fromClient: (clientX: number, clientY: number) => { row: number; col: number } | null;
};

export const usePointerToTile = (
    svgRef: RefObject<SVGSVGElement | null>,
    viewBox: ViewBox
): PointerProjection =>
{
    const { width, height, x: viewX = 0, y: viewY = 0 } = viewBox;

    const fromClient = useCallback((clientX: number, clientY: number) =>
    {
        const svg = svgRef.current;
        if(!svg) return null;
        const rect = svg.getBoundingClientRect();
        if(rect.width === 0 || rect.height === 0) return null;
        // Map screen-space pointer onto the viewBox interior, then
        // shift by the viewBox origin — when zoomed in the viewBox
        // starts at (viewX, viewY) instead of (0, 0), so a pointer
        // at the left edge of the SVG corresponds to viewX in
        // local SVG units, not 0.
        const localX = viewX + ((clientX - rect.left) / rect.width) * width;
        const localY = viewY + ((clientY - rect.top) / rect.height) * height;
        const [ row, col ] = screenToTile(localX, localY);
        return { row: Math.round(row), col: Math.round(col) };
    }, [ svgRef, width, height, viewX, viewY ]);

    return useMemo(() => ({ fromClient }), [ fromClient ]);
};
