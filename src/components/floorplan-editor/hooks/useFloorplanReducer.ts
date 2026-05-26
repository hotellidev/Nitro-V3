import { Dispatch, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { FloorplanAction, FloorplanState, EntryDir, ThicknessLevel } from '../state/types';
import { initialState, reducer } from '../state/reducer';

export type ServerFloorSettings = {
    tilemap: string;
    entryPoint: [number, number];
    entryPointDir: number;
    thicknessWall: ThicknessLevel;
    thicknessFloor: ThicknessLevel;
    wallHeight: number;
};

type Api = {
    state: FloorplanState;
    dispatch: Dispatch<FloorplanAction>;
    loadFromServer: (s: ServerFloorSettings) => void;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
};

// Actions that DON'T change the room model — they only affect the
// editor's UI state (brush selection, drag-select rectangle, …) and
// should NOT push a new history snapshot. Brushing a tile, moving a
// door, changing thickness, etc. all DO push history.
const isNonHistoryAction = (action: FloorplanAction): boolean =>
{
    switch(action.type)
    {
        case 'BRUSH_SET':
        case 'SELECT_ALL':
        case 'CLEAR_SELECTION':
        case 'SELECT_RECT':
        case 'SQUARE_SELECT_TOGGLE':
            return true;
        default:
            return false;
    }
};

// Remote-driven actions also bypass history — they represent the
// "true" server state, not a user edit. Treating a server push as
// a history step would let the user "undo" a server snapshot, which
// makes no sense.
const isRemoteAction = (action: FloorplanAction): boolean =>
{
    if(action.type === 'APPLY_REMOTE_DIFF' || action.type === 'APPLY_REMOTE_SNAPSHOT') return true;
    return 'source' in action && action.source === 'remote';
};

const HISTORY_LIMIT = 100;

export const useFloorplanReducer = (): Api =>
{
    const [ state, dispatch ] = useReducer(reducer, initialState);

    // Past / future stacks — paired with `state` to form a linear
    // timeline (`past` ++ [state] ++ `future`). Refs because the
    // wrappedDispatch closure needs the latest value but we don't
    // want every push to trigger a re-render. canUndo / canRedo are
    // separately tracked as React state so the UI buttons disable
    // correctly.
    const pastRef = useRef<FloorplanState[]>([]);
    const futureRef = useRef<FloorplanState[]>([]);
    const [ canUndo, setCanUndo ] = useState(false);
    const [ canRedo, setCanRedo ] = useState(false);
    const stateRef = useRef<FloorplanState>(state);

    // Keep stateRef in sync with the latest committed render so the
    // history pushers (which run inside callbacks, not during
    // render) always see the up-to-date state. Writing the ref
    // inside an effect — not directly in the render body — is what
    // React's `refs-during-render` rule enforces.
    useEffect(() =>
    {
        stateRef.current = state;
    }, [ state ]);

    const refreshCanFlags = useCallback(() =>
    {
        setCanUndo(pastRef.current.length > 0);
        setCanRedo(futureRef.current.length > 0);
    }, []);

    const wrappedDispatch = useCallback<Dispatch<FloorplanAction>>((action) =>
    {
        if(isNonHistoryAction(action) || isRemoteAction(action))
        {
            dispatch(action);
            return;
        }

        // Local edit: push current state onto past, drop future
        // (any redo branch is invalidated by a new edit).
        pastRef.current.push(stateRef.current);

        if(pastRef.current.length > HISTORY_LIMIT) pastRef.current.shift();

        futureRef.current = [];

        dispatch(action);
        refreshCanFlags();
    }, [ refreshCanFlags ]);

    const loadFromServer = useCallback((s: ServerFloorSettings) =>
    {
        // Server load wipes history — the document is fresh.
        pastRef.current = [];
        futureRef.current = [];
        dispatch({
            type: 'IMPORT_STRING',
            raw: s.tilemap,
            door: { x: s.entryPoint[0], y: s.entryPoint[1], dir: ((s.entryPointDir | 0) & 7) as EntryDir },
            thickness: { wall: s.thicknessWall, floor: s.thicknessFloor },
            wallHeight: s.wallHeight,
            source: 'remote'
        });
        refreshCanFlags();
    }, [ refreshCanFlags ]);

    const undo = useCallback(() =>
    {
        const previous = pastRef.current.pop();

        if(!previous) return;

        futureRef.current.push(stateRef.current);
        dispatch({ type: 'APPLY_REMOTE_SNAPSHOT',
            raw: serializeTilesForSnapshot(previous.tiles),
            door: previous.door,
            thickness: previous.thickness,
            wallHeight: previous.wallHeight,
            seq: previous.seq });
        // The APPLY_REMOTE_SNAPSHOT action re-parses the tilemap;
        // but we also want to restore brush/selection state. Wrap
        // the dispatch in an effect-like immediate sync by writing
        // through stateRef AFTER React commits — handled by the
        // next render setting stateRef. The selection/brush carried
        // by `previous` is recovered on the next mutating dispatch
        // since the reducer's APPLY_REMOTE_SNAPSHOT path resets
        // selection (acceptable: undoing a paint clears the
        // selection rectangle, which matches user intuition).
        refreshCanFlags();
    }, [ refreshCanFlags ]);

    const redo = useCallback(() =>
    {
        const next = futureRef.current.pop();

        if(!next) return;

        pastRef.current.push(stateRef.current);
        dispatch({ type: 'APPLY_REMOTE_SNAPSHOT',
            raw: serializeTilesForSnapshot(next.tiles),
            door: next.door,
            thickness: next.thickness,
            wallHeight: next.wallHeight,
            seq: next.seq });
        refreshCanFlags();
    }, [ refreshCanFlags ]);

    return useMemo(() => ({
        state, dispatch: wrappedDispatch, loadFromServer, undo, redo, canUndo, canRedo
    }), [ state, wrappedDispatch, loadFromServer, undo, redo, canUndo, canRedo ]);
};

// Local serializer mirror — the reducer's APPLY_REMOTE_SNAPSHOT
// path takes a raw tilemap string, but our history entries are
// the live Tile[][] arrays. Re-emit `\r`-joined rows in the same
// shape the encoding module uses for SAVES (we keep this here to
// avoid a circular import: state/reducer already imports
// state/encoding).
const serializeTilesForSnapshot = (tiles: { h: number; blocked: boolean }[][]): string =>
{
    if(!tiles || tiles.length === 0) return '';
    const scheme = 'x0123456789abcdefghijklmnopq';
    return tiles.map(row => row.map(tile =>
    {
        if(tile.blocked) return 'x';
        const h = Number.isFinite(tile.h) ? Math.max(0, Math.min(scheme.length - 2, tile.h)) : 0;
        return scheme.charAt(h + 1);
    }).join('')).join('\r');
};
