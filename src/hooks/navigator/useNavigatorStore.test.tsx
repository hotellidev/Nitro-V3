import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useNavigatorActions, useNavigatorData, useNavigatorUiState } from './index';

describe('navigator filter shapes (smoke)', () =>
{
    it('useNavigatorData returns the documented keys', () =>
    {
        const { result } = renderHook(() => useNavigatorData());
        expect(Object.keys(result.current).sort()).toEqual([
            'categories', 'eventCategories', 'favouriteRoomIds',
            'navigatorData', 'navigatorSearches',
            'searchResult', 'topLevelContext', 'topLevelContexts'
        ].sort());
    });

    it('useNavigatorUiState returns the 9 documented flags', () =>
    {
        const { result } = renderHook(() => useNavigatorUiState());
        expect(Object.keys(result.current).sort()).toEqual([
            'isCreatorOpen', 'isLoading', 'isOpenSavesSearches',
            'isReady', 'isRoomInfoOpen', 'isRoomLinkOpen', 'isVisible',
            'needsInit', 'needsSearch'
        ].sort());
    });

    it('useNavigatorActions returns sendSearch + reloadCurrentSearch', () =>
    {
        const { result } = renderHook(() => useNavigatorActions());
        expect(typeof result.current.sendSearch).toBe('function');
        expect(typeof result.current.reloadCurrentSearch).toBe('function');
    });
});
