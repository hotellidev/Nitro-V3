/* @vitest-environment jsdom */

import { act, cleanup, render, renderHook } from '@testing-library/react';
import { Component, ReactNode, useSyncExternalStore } from 'react';
import { useBetween } from 'use-between';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GetEventDispatcher, GetSessionDataManager } from '../../nitro-renderer.mock';
import { useHasSecurityLevel, useIsAdmin, useIsCommunity, useIsModerator, useUserSecurityLevel } from './useSessionSnapshots';

// Regression guard for the rolled-back snapshot-consumer migration.
//
// `use-between` (v1.x) ships its own dispatcher that proxies a subset of
// React hooks (useState, useReducer, useEffect, useLayoutEffect,
// useCallback, useMemo, useRef, useImperativeHandle). It does NOT
// implement `useSyncExternalStore`. When a state function runs inside
// `useBetween(stateFn)` and that state function calls
// `useSyncExternalStore` (directly or via a wrapper like
// `useExternalSnapshot` / `useUserDataSnapshot`), React resolves the
// dispatcher to use-between's proxy, finds `useSyncExternalStore`
// missing, and throws "(intermediate value)() is undefined" on the
// first render — that's the exact production error reported at
// ToolbarView.tsx:46 last session.
//
// The fix is structural: snapshot hooks must run OUTSIDE the useBetween
// scope (i.e. in the exported wrapper, not in the inner state
// function). These tests pin the constraint so a future migration
// doesn't reintroduce the broken pattern.

class CaptureBoundary extends Component<{ children: ReactNode }, { error: Error | null }>
{
    state = { error: null as Error | null };

    static getDerivedStateFromError(error: Error)
    {
        return { error };
    }

    componentDidCatch()
    {
    }

    render()
    {
        return this.state.error ? null : this.props.children;
    }
}

describe('use-between + useSyncExternalStore incompatibility', () =>
{
    afterEach(() =>
    {
        cleanup();
    });

    it('crashes when useSyncExternalStore is called inside a useBetween scope', () =>
    {
        // React 19 logs every render-time error to console.error before
        // forwarding to the error boundary. Suppress the noise to keep
        // the test output readable, then assert the error fingerprint.
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

        const Broken = () =>
        {
            // eslint-disable-next-line react-hooks/rules-of-hooks -- intentional: this test asserts the runtime crash
            useBetween(() => useSyncExternalStore(() => () => undefined, () => 'v', () => 'v'));
            return null;
        };

        let captured: Error | null = null;
        const boundaryRef = (instance: CaptureBoundary | null) =>
        {
            if(instance) captured = instance.state.error;
        };

        render(
            <CaptureBoundary ref={boundaryRef as any}>
                <Broken />
            </CaptureBoundary>
        );

        expect(captured).not.toBeNull();
        expect(captured!.message).toMatch(/useSyncExternalStore is not a function|intermediate value/);

        consoleError.mockRestore();
    });

    it('works when useSyncExternalStore is called OUTSIDE the useBetween scope', () =>
    {
        const sharedState = () => ({ count: 0 });

        // Lowercase intentionally — this is a custom hook named like a
        // regular function so the test reproduces the exact call shape
        // a refactor might land on. The eslint disable below silences
        // the "hooks must start with use" lint that flags the body.
        const safeHook = () =>
        {
            // eslint-disable-next-line react-hooks/rules-of-hooks -- intentional: function named like a hook to mirror real call sites
            const shared = useBetween(sharedState);
            // eslint-disable-next-line react-hooks/rules-of-hooks -- intentional: same reason as above
            const external = useSyncExternalStore(() => () => undefined, () => 'value', () => 'value');

            return { ...shared, external };
        };

        const { result } = renderHook(() => safeHook());

        expect(result.current.external).toBe('value');
        expect(result.current.count).toBe(0);
    });
});

// ============================================================================
// useHasSecurityLevel + named wrappers — reactive flip on snapshot invalidation
// ============================================================================
//
// The family hangs off useUserDataSnapshot() which is a useSyncExternalStore
// wrapper. The renderer's real SessionDataManager pushes a frozen snapshot
// out of getUserDataSnapshot() and dispatches a SESSION_DATA_UPDATED event
// whenever a mutator invalidates the cache. These tests fake both sides:
// a mock dispatcher with a real .subscribe(), and a mock SessionDataManager
// whose snapshot can be mutated between dispatches.

const makeFakeDispatcher = () =>
{
    const listeners = new Map<string, Set<() => void>>();

    return {
        subscribe(type: string, cb: () => void): () => void
        {
            let bucket = listeners.get(type);
            if(!bucket)
            {
                bucket = new Set();
                listeners.set(type, bucket);
            }
            bucket.add(cb);
            return () => bucket!.delete(cb);
        },
        dispatch(type: string): void
        {
            listeners.get(type)?.forEach(cb => cb());
        }
    };
};

describe('useHasSecurityLevel + named wrappers', () =>
{
    let snapshot: { securityLevel: number };
    let fakeDispatcher: ReturnType<typeof makeFakeDispatcher>;

    beforeEach(() =>
    {
        snapshot = { securityLevel: 0 };
        fakeDispatcher = makeFakeDispatcher();

        vi.mocked(GetSessionDataManager).mockReturnValue({
            // useSessionSnapshots reads getUserDataSnapshot() and guards on
            // `typeof manager.getUserDataSnapshot !== 'function'`, so we
            // expose it as a real function returning the mutable test snapshot.
            getUserDataSnapshot: () => snapshot
        } as any);

        vi.mocked(GetEventDispatcher).mockReturnValue(fakeDispatcher as any);
    });

    afterEach(() =>
    {
        cleanup();
        vi.mocked(GetSessionDataManager).mockReset();
        vi.mocked(GetEventDispatcher).mockReset();
    });

    it('useUserSecurityLevel reads the raw level', () =>
    {
        snapshot = { securityLevel: 7 };
        const { result } = renderHook(() => useUserSecurityLevel());
        expect(result.current).toBe(7);
    });

    it('useHasSecurityLevel compares >= the threshold', () =>
    {
        snapshot = { securityLevel: 5 };
        const { result } = renderHook(() => useHasSecurityLevel(5));
        expect(result.current).toBe(true);

        const { result: lowResult } = renderHook(() => useHasSecurityLevel(8));
        expect(lowResult.current).toBe(false);
    });

    it('named wrappers map to the right thresholds (MODERATOR=5, COMMUNITY=7, ADMINISTRATOR=8)', () =>
    {
        snapshot = { securityLevel: 7 }; // COMMUNITY

        expect(renderHook(() => useIsModerator()).result.current).toBe(true);   // 7 >= 5
        expect(renderHook(() => useIsCommunity()).result.current).toBe(true);   // 7 >= 7
        expect(renderHook(() => useIsAdmin()).result.current).toBe(false);      // 7 < 8
    });

    it('re-renders when SESSION_DATA_UPDATED fires after the snapshot mutates', () =>
    {
        snapshot = { securityLevel: 0 };
        const { result } = renderHook(() => useIsModerator());
        expect(result.current).toBe(false);

        // Mutate the snapshot reference (renderer invariant: every
        // invalidation produces a NEW frozen object) and dispatch the
        // event. The hook's getSnapshot closure reads `snapshot`, so a
        // fresh object reference flips React's bailout.
        act(() =>
        {
            snapshot = { securityLevel: 5 };
            // The mock's NitroEventType proxy resolves any property to
            // `mock:NitroEventType:<PROP>`, so that's the wire string
            // useSessionSnapshots subscribes against.
            fakeDispatcher.dispatch('mock:NitroEventType:SESSION_DATA_UPDATED');
        });

        expect(result.current).toBe(true);
    });
});
