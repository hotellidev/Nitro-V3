import { describe, it, expect } from 'vitest';
import { reducer, initialState } from './reducer';
import { FloorplanState } from './types';
import { defaultEmptyTilemap } from './selectors';

const stateWith = (tiles: FloorplanState['tiles']): FloorplanState => ({
    ...initialState,
    tiles
});

describe('reducer — PAINT_TILE', () =>
{
    it('sets tile to {h, blocked: false}', () =>
    {
        const start = stateWith(defaultEmptyTilemap(2, 2));
        const next = reducer(start, { type: 'PAINT_TILE', row: 0, col: 1, h: 5, source: 'local' });
        expect(next.tiles[0][1]).toEqual({ h: 5, blocked: false });
        expect(next.tiles[0][0]).toEqual({ h: 0, blocked: true });
    });

    it('clamps h to 0..26', () =>
    {
        const start = stateWith(defaultEmptyTilemap(1, 1));
        const next = reducer(start, { type: 'PAINT_TILE', row: 0, col: 0, h: 99, source: 'local' });
        expect(next.tiles[0][0].h).toBe(26);
    });

    it('grows the grid to fit out-of-bounds rows/cols', () =>
    {
        const start = stateWith(defaultEmptyTilemap(1, 1));
        const next = reducer(start, { type: 'PAINT_TILE', row: 2, col: 3, h: 0, source: 'local' });
        expect(next.tiles).toHaveLength(3);
        expect(next.tiles[2]).toHaveLength(4);
        expect(next.tiles[2][3]).toEqual({ h: 0, blocked: false });
        expect(next.tiles[0][0]).toEqual({ h: 0, blocked: true });
    });

    it('caps growth at MAX_NUM_TILE_PER_AXIS', () =>
    {
        const start = stateWith(defaultEmptyTilemap(1, 1));
        const next = reducer(start, { type: 'PAINT_TILE', row: 99, col: 99, h: 0, source: 'local' });
        expect(next.tiles).toHaveLength(64);
        expect(next.tiles[0]).toHaveLength(64);
    });

    it('returns the same reference if no change (idempotent painting)', () =>
    {
        const tile = { h: 5, blocked: false };
        const start = stateWith([[tile]]);
        const next = reducer(start, { type: 'PAINT_TILE', row: 0, col: 0, h: 5, source: 'local' });
        expect(next).toBe(start);
    });
});

describe('reducer — ERASE_TILE', () =>
{
    it('marks tile as blocked', () =>
    {
        const start = stateWith([[{ h: 5, blocked: false }]]);
        const next = reducer(start, { type: 'ERASE_TILE', row: 0, col: 0, source: 'local' });
        expect(next.tiles[0][0]).toEqual({ h: 5, blocked: true });
    });

    it('is a no-op outside the grid', () =>
    {
        const start = stateWith(defaultEmptyTilemap(1, 1));
        const next = reducer(start, { type: 'ERASE_TILE', row: 5, col: 5, source: 'local' });
        expect(next).toBe(start);
    });
});

describe('reducer — ADJUST_HEIGHT', () =>
{
    it('increments height by 1', () =>
    {
        const start = stateWith([[{ h: 5, blocked: false }]]);
        const next = reducer(start, { type: 'ADJUST_HEIGHT', row: 0, col: 0, delta: 1, source: 'local' });
        expect(next.tiles[0][0]).toEqual({ h: 6, blocked: false });
    });

    it('decrements height by 1', () =>
    {
        const start = stateWith([[{ h: 5, blocked: false }]]);
        const next = reducer(start, { type: 'ADJUST_HEIGHT', row: 0, col: 0, delta: -1, source: 'local' });
        expect(next.tiles[0][0]).toEqual({ h: 4, blocked: false });
    });

    it('clamps at 26 going up', () =>
    {
        const start = stateWith([[{ h: 26, blocked: false }]]);
        const next = reducer(start, { type: 'ADJUST_HEIGHT', row: 0, col: 0, delta: 1, source: 'local' });
        expect(next.tiles[0][0].h).toBe(26);
    });

    it('clamps at 0 going down', () =>
    {
        const start = stateWith([[{ h: 0, blocked: false }]]);
        const next = reducer(start, { type: 'ADJUST_HEIGHT', row: 0, col: 0, delta: -1, source: 'local' });
        expect(next.tiles[0][0].h).toBe(0);
    });

    it('is a no-op on blocked tiles', () =>
    {
        const start = stateWith([[{ h: 5, blocked: true }]]);
        const next = reducer(start, { type: 'ADJUST_HEIGHT', row: 0, col: 0, delta: 1, source: 'local' });
        expect(next).toBe(start);
    });
});

describe('reducer — SET_DOOR', () =>
{
    it('updates door position', () =>
    {
        const next = reducer(initialState, { type: 'SET_DOOR', x: 3, y: 4, source: 'local' });
        expect(next.door).toEqual({ x: 3, y: 4, dir: 2 });
    });

    it('preserves door direction', () =>
    {
        const start = { ...initialState, door: { x: 0, y: 0, dir: 5 as const } };
        const next = reducer(start, { type: 'SET_DOOR', x: 1, y: 1, source: 'local' });
        expect(next.door).toEqual({ x: 1, y: 1, dir: 5 });
    });
});

describe('reducer — SET_DOOR_DIR', () =>
{
    it('updates direction', () =>
    {
        const next = reducer(initialState, { type: 'SET_DOOR_DIR', dir: 7, source: 'local' });
        expect(next.door.dir).toBe(7);
    });
});

describe('reducer — SET_THICKNESS', () =>
{
    it('updates wall only', () =>
    {
        const next = reducer(initialState, { type: 'SET_THICKNESS', wall: 3, source: 'local' });
        expect(next.thickness).toEqual({ wall: 3, floor: 1 });
    });

    it('updates floor only', () =>
    {
        const next = reducer(initialState, { type: 'SET_THICKNESS', floor: 0, source: 'local' });
        expect(next.thickness).toEqual({ wall: 1, floor: 0 });
    });

    it('updates both', () =>
    {
        const next = reducer(initialState, { type: 'SET_THICKNESS', wall: 2, floor: 3, source: 'local' });
        expect(next.thickness).toEqual({ wall: 2, floor: 3 });
    });
});

describe('reducer — SET_WALL_HEIGHT', () =>
{
    it('updates wallHeight clamped to 0..16', () =>
    {
        expect(reducer(initialState, { type: 'SET_WALL_HEIGHT', value: 5, source: 'local' }).wallHeight).toBe(5);
        expect(reducer(initialState, { type: 'SET_WALL_HEIGHT', value: 99, source: 'local' }).wallHeight).toBe(16);
        expect(reducer(initialState, { type: 'SET_WALL_HEIGHT', value: -3, source: 'local' }).wallHeight).toBe(0);
    });
});

describe('reducer — BRUSH_SET', () =>
{
    it('updates h only', () =>
    {
        const next = reducer(initialState, { type: 'BRUSH_SET', h: 10 });
        expect(next.brush).toEqual({ h: 10, action: 'SET' });
    });

    it('updates action only', () =>
    {
        const next = reducer(initialState, { type: 'BRUSH_SET', action: 'DOOR' });
        expect(next.brush).toEqual({ h: 0, action: 'DOOR' });
    });
});

describe('reducer — selection', () =>
{
    it('SELECT_ALL marks every non-blocked tile', () =>
    {
        const start = stateWith([
            [{ h: 0, blocked: false }, { h: 0, blocked: true }],
            [{ h: 0, blocked: false }, { h: 0, blocked: false }]
        ]);
        const next = reducer(start, { type: 'SELECT_ALL' });
        expect(next.selection.size).toBe(3);
        expect(next.selection.has('0,0')).toBe(true);
        expect(next.selection.has('0,1')).toBe(false);
        expect(next.selection.has('1,1')).toBe(true);
    });

    it('CLEAR_SELECTION empties it', () =>
    {
        const start = { ...initialState, selection: new Set(['0,0', '1,1']) as ReadonlySet<`${number},${number}`> };
        const next = reducer(start, { type: 'CLEAR_SELECTION' });
        expect(next.selection.size).toBe(0);
    });

    it('SELECT_RECT marks the rectangle inclusive', () =>
    {
        const start = stateWith(defaultEmptyTilemap(4, 4));
        // First populate non-blocked tiles so SELECT_RECT picks them up
        const populated = {
            ...start,
            tiles: start.tiles.map(row => row.map(() => ({ h: 0, blocked: false })))
        } as FloorplanState;
        const next = reducer(populated, { type: 'SELECT_RECT', from: [ 1, 1 ], to: [ 2, 3 ] });
        const keys = Array.from(next.selection).sort();
        expect(keys).toEqual([ '1,1', '1,2', '1,3', '2,1', '2,2', '2,3' ].sort());
    });

    it('SQUARE_SELECT_TOGGLE flips the flag', () =>
    {
        const a = reducer(initialState, { type: 'SQUARE_SELECT_TOGGLE' });
        expect(a.squareSelect).toBe(true);
        const b = reducer(a, { type: 'SQUARE_SELECT_TOGGLE' });
        expect(b.squareSelect).toBe(false);
    });
});

describe('reducer — IMPORT_STRING', () =>
{
    it('replaces tilemap with parsed string', () =>
    {
        const start = stateWith(defaultEmptyTilemap(1, 1));
        const next = reducer(start, { type: 'IMPORT_STRING', raw: '01\rxq', source: 'local' });
        expect(next.tiles).toHaveLength(2);
        expect(next.tiles[0]).toEqual([
            { h: 0, blocked: false },
            { h: 1, blocked: false }
        ]);
        expect(next.tiles[1]).toEqual([
            { h: 0, blocked: true },
            { h: 26, blocked: false }
        ]);
    });

    it('optionally updates door, thickness, wallHeight', () =>
    {
        const next = reducer(initialState, {
            type: 'IMPORT_STRING',
            raw: '00',
            door: { x: 5, y: 6, dir: 4 },
            thickness: { wall: 3, floor: 2 },
            wallHeight: 8,
            source: 'local'
        });
        expect(next.door).toEqual({ x: 5, y: 6, dir: 4 });
        expect(next.thickness).toEqual({ wall: 3, floor: 2 });
        expect(next.wallHeight).toBe(8);
    });
});

describe('reducer — APPLY_REMOTE_DIFF', () =>
{
    it('applies tile edits without re-broadcasting (source agnostic)', () =>
    {
        const start = stateWith([[{ h: 0, blocked: false }]]);
        const next = reducer(start, {
            type: 'APPLY_REMOTE_DIFF',
            diff: { tiles: [{ row: 0, col: 0, h: 7, blocked: false }] },
            seq: 1,
            editorUserId: 42
        });
        expect(next.tiles[0][0]).toEqual({ h: 7, blocked: false });
        expect(next.seq).toBe(1);
    });

    it('records last seq', () =>
    {
        const start = stateWith([[{ h: 0, blocked: false }]]);
        const a = reducer(start, { type: 'APPLY_REMOTE_DIFF', diff: { tiles: [{ row: 0, col: 0, h: 1, blocked: false }] }, seq: 5, editorUserId: 1 });
        expect(a.seq).toBe(5);
    });

    it('applies door/thickness/wallHeight from diff', () =>
    {
        const next = reducer(initialState, {
            type: 'APPLY_REMOTE_DIFF',
            diff: { door: { x: 2, y: 3, dir: 0 }, thickness: { wall: 0, floor: 0 }, wallHeight: 4 },
            seq: 1,
            editorUserId: 99
        });
        expect(next.door).toEqual({ x: 2, y: 3, dir: 0 });
        expect(next.thickness).toEqual({ wall: 0, floor: 0 });
        expect(next.wallHeight).toBe(4);
    });
});

describe('reducer — APPLY_REMOTE_SNAPSHOT', () =>
{
    it('replaces full state from snapshot', () =>
    {
        const next = reducer(initialState, {
            type: 'APPLY_REMOTE_SNAPSHOT',
            raw: '01\rxq',
            door: { x: 1, y: 1, dir: 3 },
            thickness: { wall: 2, floor: 3 },
            wallHeight: 9,
            seq: 100
        });
        expect(next.tiles).toHaveLength(2);
        expect(next.door).toEqual({ x: 1, y: 1, dir: 3 });
        expect(next.thickness).toEqual({ wall: 2, floor: 3 });
        expect(next.wallHeight).toBe(9);
        expect(next.seq).toBe(100);
    });

    it('clears selection on snapshot apply', () =>
    {
        const start = { ...initialState, selection: new Set([ '0,0' ]) as ReadonlySet<`${number},${number}`> };
        const next = reducer(start, {
            type: 'APPLY_REMOTE_SNAPSHOT',
            raw: '0',
            door: initialState.door,
            thickness: initialState.thickness,
            wallHeight: 0,
            seq: 1
        });
        expect(next.selection.size).toBe(0);
    });
});
