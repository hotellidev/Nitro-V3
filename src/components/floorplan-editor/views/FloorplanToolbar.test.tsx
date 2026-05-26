import { describe, it, expect, vi, afterEach } from 'vitest';
import { fireEvent, render, cleanup } from '@testing-library/react';
import { FloorplanToolbar } from './FloorplanToolbar';
import { initialState } from '../state/reducer';

describe('FloorplanToolbar', () =>
{
    afterEach(() => cleanup());

    it('clicking SET button dispatches BRUSH_SET action=SET', () =>
    {
        const dispatch = vi.fn();
        const { getByTestId } = render(<FloorplanToolbar state={ initialState } dispatch={ dispatch } />);
        fireEvent.click(getByTestId('tool-set'));
        expect(dispatch).toHaveBeenCalledWith({ type: 'BRUSH_SET', action: 'SET' });
    });

    it('all 5 brush actions are reachable', () =>
    {
        const dispatch = vi.fn();
        const { getByTestId } = render(<FloorplanToolbar state={ initialState } dispatch={ dispatch } />);
        fireEvent.click(getByTestId('tool-unset'));
        fireEvent.click(getByTestId('tool-up'));
        fireEvent.click(getByTestId('tool-down'));
        fireEvent.click(getByTestId('tool-door'));
        const types = dispatch.mock.calls.map(c => c[0].action);
        expect(types).toEqual([ 'UNSET', 'UP', 'DOWN', 'DOOR' ]);
    });

    it('select-all and square-select dispatch their actions', () =>
    {
        const dispatch = vi.fn();
        const { getByTestId } = render(<FloorplanToolbar state={ initialState } dispatch={ dispatch } />);
        fireEvent.click(getByTestId('tool-select-all'));
        fireEvent.click(getByTestId('tool-square-select'));
        expect(dispatch).toHaveBeenNthCalledWith(1, { type: 'SELECT_ALL' });
        expect(dispatch).toHaveBeenNthCalledWith(2, { type: 'SQUARE_SELECT_TOGGLE' });
    });

    it('marks active brush button with data-active', () =>
    {
        const state = { ...initialState, brush: { h: 0, action: 'UP' as const } };
        const { getByTestId } = render(<FloorplanToolbar state={ state } dispatch={ () => {} } />);
        expect(getByTestId('tool-up').getAttribute('data-active')).toBe('true');
        expect(getByTestId('tool-set').getAttribute('data-active')).toBe('false');
    });
});
