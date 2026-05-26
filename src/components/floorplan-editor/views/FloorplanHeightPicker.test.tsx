/* @vitest-environment jsdom */

import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { FloorplanHeightPicker } from './FloorplanHeightPicker';

// Force a fixed track size into getBoundingClientRect so the
// pointer-y -> height math is reproducible regardless of jsdom's
// layout (which would otherwise hand back zeroes).
const TRACK_HEIGHT = 260;

const stubTrackGeometry = (top = 0) =>
{
    const original = HTMLDivElement.prototype.getBoundingClientRect;

    HTMLDivElement.prototype.getBoundingClientRect = function ()
    {
        if(this.getAttribute('data-testid') === 'height-track')
        {
            return {
                top,
                left: 0,
                right: 14,
                bottom: top + TRACK_HEIGHT,
                width: 14,
                height: TRACK_HEIGHT,
                x: 0,
                y: top,
                toJSON: () => ''
            } as DOMRect;
        }

        return original.call(this);
    };

    return () =>
    {
        HTMLDivElement.prototype.getBoundingClientRect = original;
    };
};

describe('FloorplanHeightPicker', () =>
{
    afterEach(() =>
    {
        cleanup();
    });

    it('renders the track + thumb with the current value', () =>
    {
        render(<FloorplanHeightPicker selectedH={ 12 } onSelect={ () => undefined } />);

        const thumb = screen.getByTestId('height-thumb');

        expect(thumb).toBeInTheDocument();
        expect(thumb.textContent).toBe('12');
    });

    it('clicking near the top of the track picks HEIGHT_BRUSH_MAX', () =>
    {
        const restore = stubTrackGeometry();
        const onSelect = vi.fn();

        render(<FloorplanHeightPicker selectedH={ 0 } onSelect={ onSelect } />);

        const track = screen.getByTestId('height-track');

        fireEvent.pointerDown(track, { clientY: 0, button: 0 });

        expect(onSelect).toHaveBeenCalledWith(26);

        restore();
    });

    it('clicking near the bottom of the track picks HEIGHT_BRUSH_MIN', () =>
    {
        const restore = stubTrackGeometry();
        const onSelect = vi.fn();

        render(<FloorplanHeightPicker selectedH={ 26 } onSelect={ onSelect } />);

        const track = screen.getByTestId('height-track');

        fireEvent.pointerDown(track, { clientY: TRACK_HEIGHT, button: 0 });

        expect(onSelect).toHaveBeenCalledWith(0);

        restore();
    });

    it('clicking at the middle picks roughly the middle height', () =>
    {
        const restore = stubTrackGeometry();
        const onSelect = vi.fn();

        render(<FloorplanHeightPicker selectedH={ 0 } onSelect={ onSelect } />);

        const track = screen.getByTestId('height-track');

        fireEvent.pointerDown(track, { clientY: TRACK_HEIGHT / 2, button: 0 });

        // (1 - 0.5) * 26 = 13. The exact value depends on Math.round,
        // which here lands on 13 for a half-track click.
        expect(onSelect).toHaveBeenCalledWith(13);

        restore();
    });

    it('does not fire onSelect when the picked height equals the current selection', () =>
    {
        const restore = stubTrackGeometry();
        const onSelect = vi.fn();

        render(<FloorplanHeightPicker selectedH={ 26 } onSelect={ onSelect } />);

        const track = screen.getByTestId('height-track');

        fireEvent.pointerDown(track, { clientY: 0, button: 0 });

        expect(onSelect).not.toHaveBeenCalled();

        restore();
    });

    it('thumb fill matches the tile colour at the picked height', () =>
    {
        // h=0 is solid blue (#0065ff in COLORMAP). Re-render at a
        // different height and assert the recorded thumb colour
        // changes — i.e., the thumb tracks the band underneath.
        const { rerender } = render(<FloorplanHeightPicker selectedH={ 0 } onSelect={ () => undefined } />);

        const colourAtZero = screen.getByTestId('height-thumb').getAttribute('data-thumb-color');

        rerender(<FloorplanHeightPicker selectedH={ 13 } onSelect={ () => undefined } />);

        const colourAtThirteen = screen.getByTestId('height-thumb').getAttribute('data-thumb-color');

        expect(colourAtZero).toBeTruthy();
        expect(colourAtThirteen).toBeTruthy();
        expect(colourAtZero).not.toBe(colourAtThirteen);
    });
});
