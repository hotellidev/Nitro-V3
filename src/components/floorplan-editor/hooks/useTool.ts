import { Dispatch, PointerEvent, useCallback, useRef } from 'react';
import { FloorplanAction, FloorplanState } from '../state/types';
import { PointerProjection } from './usePointerToTile';

type Handlers = {
    onPointerDown: (e: PointerEvent<SVGSVGElement>) => void;
    onPointerMove: (e: PointerEvent<SVGSVGElement>) => void;
    onPointerUp: (e: PointerEvent<SVGSVGElement>) => void;
};

const tileKey = (row: number, col: number) => `${ row },${ col }` as const;

const dispatchForBrush = (
    action: FloorplanState['brush']['action'],
    h: number,
    row: number,
    col: number,
    dispatch: Dispatch<FloorplanAction>
): void =>
{
    switch(action)
    {
        case 'SET':   dispatch({ type: 'PAINT_TILE', row, col, h, source: 'local' }); return;
        case 'UNSET': dispatch({ type: 'ERASE_TILE', row, col, source: 'local' }); return;
        case 'UP':    dispatch({ type: 'ADJUST_HEIGHT', row, col, delta: 1, source: 'local' }); return;
        case 'DOWN':  dispatch({ type: 'ADJUST_HEIGHT', row, col, delta: -1, source: 'local' }); return;
        case 'DOOR':  dispatch({ type: 'SET_DOOR', x: col, y: row, source: 'local' }); return;
    }
};

export const useTool = (
    state: FloorplanState,
    dispatch: Dispatch<FloorplanAction>,
    projection: PointerProjection
): Handlers =>
{
    const isDownRef = useRef(false);
    const lastTileRef = useRef<string | null>(null);

    const apply = useCallback((e: PointerEvent<SVGSVGElement>) =>
    {
        const hit = projection.fromClient(e.clientX, e.clientY);
        if(!hit) return;
        const key = tileKey(hit.row, hit.col);
        if(key === lastTileRef.current) return;
        lastTileRef.current = key;
        dispatchForBrush(state.brush.action, state.brush.h, hit.row, hit.col, dispatch);
    }, [ projection, state.brush.action, state.brush.h, dispatch ]);

    const onPointerDown = useCallback((e: PointerEvent<SVGSVGElement>) =>
    {
        isDownRef.current = true;
        lastTileRef.current = null;
        try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch {}
        apply(e);
    }, [ apply ]);

    const onPointerMove = useCallback((e: PointerEvent<SVGSVGElement>) =>
    {
        if(!isDownRef.current) return;
        if(state.brush.action === 'DOOR') return; // door is a single-click placement
        apply(e);
    }, [ apply, state.brush.action ]);

    const onPointerUp = useCallback((e: PointerEvent<SVGSVGElement>) =>
    {
        isDownRef.current = false;
        lastTileRef.current = null;
        try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch {}
    }, []);

    return { onPointerDown, onPointerMove, onPointerUp };
};
