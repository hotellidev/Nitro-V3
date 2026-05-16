import { beforeEach, describe, expect, it } from 'vitest';
import { createEmptyMonitorSnapshot } from './WiredCreatorTools.helpers';
import { useWiredCreatorToolsUiStore } from './wiredCreatorToolsUiStore';

const INITIAL = {
    isVisible: false,
    activeTab: 'monitor' as const,
    inspectionType: 'furni' as const,
    variablesType: 'furni' as const,
    isMonitorHistoryOpen: false,
    isMonitorInfoOpen: false,
    isInspectionGiveOpen: false,
    isVariableManageOpen: false,
    isManagedGiveOpen: false,
    monitorHistorySeverityFilter: 'ALL' as const,
    monitorHistoryTypeFilter: 'ALL',
    variableManageTypeFilter: 'ALL',
    variableManageSort: 'highest_value',
    variableManagePage: 1,
    monitorSnapshot: createEmptyMonitorSnapshot(),
    selectedFurni: null,
    selectedFurniLiveState: null,
    selectedUser: null,
    selectedUserLiveState: null,
    selectedUserActionVersion: 0
};

describe('useWiredCreatorToolsUiStore', () =>
{
    beforeEach(() =>
    {
        useWiredCreatorToolsUiStore.setState(INITIAL);
    });

    it('exposes the documented defaults', () =>
    {
        const state = useWiredCreatorToolsUiStore.getState();

        expect(state.isVisible).toBe(false);
        expect(state.activeTab).toBe('monitor');
        expect(state.inspectionType).toBe('furni');
        expect(state.variablesType).toBe('furni');
        expect(state.isMonitorHistoryOpen).toBe(false);
        expect(state.isMonitorInfoOpen).toBe(false);
        expect(state.isInspectionGiveOpen).toBe(false);
        expect(state.isVariableManageOpen).toBe(false);
        expect(state.isManagedGiveOpen).toBe(false);
        expect(state.monitorHistorySeverityFilter).toBe('ALL');
        expect(state.monitorHistoryTypeFilter).toBe('ALL');
        expect(state.variableManageTypeFilter).toBe('ALL');
        expect(state.variableManageSort).toBe('highest_value');
        expect(state.variableManagePage).toBe(1);
        expect(state.monitorSnapshot).toEqual(createEmptyMonitorSnapshot());
        expect(state.selectedFurni).toBeNull();
        expect(state.selectedFurniLiveState).toBeNull();
        expect(state.selectedUser).toBeNull();
        expect(state.selectedUserLiveState).toBeNull();
        expect(state.selectedUserActionVersion).toBe(0);
    });

    describe('setIsVisible', () =>
    {
        it('accepts a direct boolean', () =>
        {
            useWiredCreatorToolsUiStore.getState().setIsVisible(true);
            expect(useWiredCreatorToolsUiStore.getState().isVisible).toBe(true);
        });

        it('accepts a functional updater (toggle pattern)', () =>
        {
            useWiredCreatorToolsUiStore.getState().setIsVisible(prev => !prev);
            expect(useWiredCreatorToolsUiStore.getState().isVisible).toBe(true);

            useWiredCreatorToolsUiStore.getState().setIsVisible(prev => !prev);
            expect(useWiredCreatorToolsUiStore.getState().isVisible).toBe(false);
        });
    });

    describe('setActiveTab', () =>
    {
        it('switches the active tab', () =>
        {
            useWiredCreatorToolsUiStore.getState().setActiveTab('variables');
            expect(useWiredCreatorToolsUiStore.getState().activeTab).toBe('variables');

            useWiredCreatorToolsUiStore.getState().setActiveTab('inspection');
            expect(useWiredCreatorToolsUiStore.getState().activeTab).toBe('inspection');
        });
    });

    describe('setInspectionType / setVariablesType', () =>
    {
        it('updates the inspection element type', () =>
        {
            useWiredCreatorToolsUiStore.getState().setInspectionType('user');
            expect(useWiredCreatorToolsUiStore.getState().inspectionType).toBe('user');
        });

        it('updates the variables element type (including context)', () =>
        {
            useWiredCreatorToolsUiStore.getState().setVariablesType('context');
            expect(useWiredCreatorToolsUiStore.getState().variablesType).toBe('context');
        });
    });

    describe('modal/popover flags', () =>
    {
        it('setIsMonitorHistoryOpen toggles the history modal flag', () =>
        {
            useWiredCreatorToolsUiStore.getState().setIsMonitorHistoryOpen(true);
            expect(useWiredCreatorToolsUiStore.getState().isMonitorHistoryOpen).toBe(true);

            useWiredCreatorToolsUiStore.getState().setIsMonitorHistoryOpen(false);
            expect(useWiredCreatorToolsUiStore.getState().isMonitorHistoryOpen).toBe(false);
        });

        it('setIsMonitorInfoOpen toggles the info modal flag', () =>
        {
            useWiredCreatorToolsUiStore.getState().setIsMonitorInfoOpen(true);
            expect(useWiredCreatorToolsUiStore.getState().isMonitorInfoOpen).toBe(true);
        });

        it('setIsInspectionGiveOpen accepts a functional updater', () =>
        {
            useWiredCreatorToolsUiStore.getState().setIsInspectionGiveOpen(prev => !prev);
            expect(useWiredCreatorToolsUiStore.getState().isInspectionGiveOpen).toBe(true);

            useWiredCreatorToolsUiStore.getState().setIsInspectionGiveOpen(prev => !prev);
            expect(useWiredCreatorToolsUiStore.getState().isInspectionGiveOpen).toBe(false);
        });

        it('setIsVariableManageOpen takes a direct boolean', () =>
        {
            useWiredCreatorToolsUiStore.getState().setIsVariableManageOpen(true);
            expect(useWiredCreatorToolsUiStore.getState().isVariableManageOpen).toBe(true);
        });

        it('setIsManagedGiveOpen accepts a functional updater', () =>
        {
            useWiredCreatorToolsUiStore.getState().setIsManagedGiveOpen(prev => !prev);
            expect(useWiredCreatorToolsUiStore.getState().isManagedGiveOpen).toBe(true);
        });
    });

    describe('monitor history filters', () =>
    {
        it('setMonitorHistorySeverityFilter narrows to ERROR / WARNING / ALL', () =>
        {
            useWiredCreatorToolsUiStore.getState().setMonitorHistorySeverityFilter('ERROR');
            expect(useWiredCreatorToolsUiStore.getState().monitorHistorySeverityFilter).toBe('ERROR');

            useWiredCreatorToolsUiStore.getState().setMonitorHistorySeverityFilter('WARNING');
            expect(useWiredCreatorToolsUiStore.getState().monitorHistorySeverityFilter).toBe('WARNING');

            useWiredCreatorToolsUiStore.getState().setMonitorHistorySeverityFilter('ALL');
            expect(useWiredCreatorToolsUiStore.getState().monitorHistorySeverityFilter).toBe('ALL');
        });

        it('setMonitorHistoryTypeFilter stores an arbitrary type label', () =>
        {
            useWiredCreatorToolsUiStore.getState().setMonitorHistoryTypeFilter('FurnitureRuntime');
            expect(useWiredCreatorToolsUiStore.getState().monitorHistoryTypeFilter).toBe('FurnitureRuntime');
        });
    });

    describe('variable manage UI', () =>
    {
        it('setVariableManageTypeFilter / setVariableManageSort store string filters', () =>
        {
            useWiredCreatorToolsUiStore.getState().setVariableManageTypeFilter('Number');
            useWiredCreatorToolsUiStore.getState().setVariableManageSort('lowest_value');

            expect(useWiredCreatorToolsUiStore.getState().variableManageTypeFilter).toBe('Number');
            expect(useWiredCreatorToolsUiStore.getState().variableManageSort).toBe('lowest_value');
        });

        it('setVariableManagePage accepts a direct value', () =>
        {
            useWiredCreatorToolsUiStore.getState().setVariableManagePage(4);
            expect(useWiredCreatorToolsUiStore.getState().variableManagePage).toBe(4);
        });

        it('setVariableManagePage accepts a functional updater (next/prev pagination)', () =>
        {
            useWiredCreatorToolsUiStore.getState().setVariableManagePage(2);
            useWiredCreatorToolsUiStore.getState().setVariableManagePage(prev => prev + 1);
            expect(useWiredCreatorToolsUiStore.getState().variableManagePage).toBe(3);

            useWiredCreatorToolsUiStore.getState().setVariableManagePage(prev => Math.max(1, prev - 1));
            expect(useWiredCreatorToolsUiStore.getState().variableManagePage).toBe(2);
        });
    });

    describe('monitorSnapshot', () =>
    {
        it('setMonitorSnapshot replaces the snapshot with the server payload shape', () =>
        {
            const next = {
                ...createEmptyMonitorSnapshot(),
                usageCurrentWindow: 7,
                usageLimitPerWindow: 10,
                isHeavy: true,
                averageExecutionMs: 42
            };

            useWiredCreatorToolsUiStore.getState().setMonitorSnapshot(next);

            expect(useWiredCreatorToolsUiStore.getState().monitorSnapshot).toEqual(next);
            expect(useWiredCreatorToolsUiStore.getState().monitorSnapshot.isHeavy).toBe(true);
        });

        it('resetMonitorSnapshot returns a fresh empty snapshot (new reference)', () =>
        {
            const populated = {
                ...createEmptyMonitorSnapshot(),
                usageCurrentWindow: 5,
                logs: [ { amount: 1, latestOccurrenceSeconds: 0, latestReason: '', latestSourceId: 0, latestSourceLabel: '', severity: 'ERROR', type: 'foo' } ],
                history: [ { occurredAtSeconds: 0, reason: '', sourceId: 0, sourceLabel: '', severity: 'ERROR', type: 'foo' } ]
            };
            useWiredCreatorToolsUiStore.getState().setMonitorSnapshot(populated);

            useWiredCreatorToolsUiStore.getState().resetMonitorSnapshot();

            const cleared = useWiredCreatorToolsUiStore.getState().monitorSnapshot;
            expect(cleared).toEqual(createEmptyMonitorSnapshot());
            expect(cleared).not.toBe(populated);
            expect(cleared.logs).toEqual([]);
            expect(cleared.history).toEqual([]);
        });

        it('the snapshot persists across the panel close/reopen lifecycle (UI flag flip)', () =>
        {
            // Server pushed a non-empty snapshot while the panel was open.
            const payload = { ...createEmptyMonitorSnapshot(), usageCurrentWindow: 3 };
            useWiredCreatorToolsUiStore.getState().setMonitorSnapshot(payload);

            // User closes the panel — UI flag flips, snapshot should NOT reset.
            useWiredCreatorToolsUiStore.getState().setIsVisible(false);

            // User reopens — the last-known stats are still there.
            useWiredCreatorToolsUiStore.getState().setIsVisible(true);

            expect(useWiredCreatorToolsUiStore.getState().monitorSnapshot.usageCurrentWindow).toBe(3);
        });
    });

    describe('inspection selection', () =>
    {
        const furniSelection = {
            objectId: 42,
            category: 10,
            info: { id: 42, name: 'sofa', description: '', image: null } as never
        };
        const userSelection = {
            kind: 'user' as const,
            roomIndex: 7,
            name: 'simoleo',
            figure: 'hd-180-1.lg-3023-110',
            gender: 'M',
            userId: 99,
            level: 12,
            posture: 'std'
        } as never;

        it('setSelectedFurni stores the picked furni selection', () =>
        {
            useWiredCreatorToolsUiStore.getState().setSelectedFurni(furniSelection);

            expect(useWiredCreatorToolsUiStore.getState().selectedFurni).toEqual(furniSelection);
        });

        it('setSelectedFurni(null) clears the selection (deselect path)', () =>
        {
            useWiredCreatorToolsUiStore.getState().setSelectedFurni(furniSelection);
            useWiredCreatorToolsUiStore.getState().setSelectedFurni(null);

            expect(useWiredCreatorToolsUiStore.getState().selectedFurni).toBeNull();
        });

        it('setSelectedFurniLiveState accepts a functional updater', () =>
        {
            const initial = { positionX: 1, positionY: 2, altitude: 3, rotation: 4, state: 5 };
            useWiredCreatorToolsUiStore.getState().setSelectedFurniLiveState(initial);

            useWiredCreatorToolsUiStore.getState().setSelectedFurniLiveState(prev => (prev ? { ...prev, state: prev.state + 1 } : null));

            expect(useWiredCreatorToolsUiStore.getState().selectedFurniLiveState).toEqual({ ...initial, state: 6 });
        });

        it('setSelectedUser + setSelectedUserLiveState write the user selection / live state', () =>
        {
            useWiredCreatorToolsUiStore.getState().setSelectedUser(userSelection);
            useWiredCreatorToolsUiStore.getState().setSelectedUserLiveState({ positionX: 5, positionY: 6, altitude: 0, direction: 2 });

            expect(useWiredCreatorToolsUiStore.getState().selectedUser).toEqual(userSelection);
            expect(useWiredCreatorToolsUiStore.getState().selectedUserLiveState).toEqual({ positionX: 5, positionY: 6, altitude: 0, direction: 2 });
        });

        it('setSelectedUserActionVersion bumps the monotonic counter via functional updater', () =>
        {
            useWiredCreatorToolsUiStore.getState().setSelectedUserActionVersion(prev => prev + 1);
            useWiredCreatorToolsUiStore.getState().setSelectedUserActionVersion(prev => prev + 1);
            useWiredCreatorToolsUiStore.getState().setSelectedUserActionVersion(prev => prev + 1);

            expect(useWiredCreatorToolsUiStore.getState().selectedUserActionVersion).toBe(3);
        });

        it('the selection persists across the panel close/reopen lifecycle', () =>
        {
            useWiredCreatorToolsUiStore.getState().setSelectedFurni(furniSelection);
            useWiredCreatorToolsUiStore.getState().setIsVisible(false);
            useWiredCreatorToolsUiStore.getState().setIsVisible(true);

            expect(useWiredCreatorToolsUiStore.getState().selectedFurni).toEqual(furniSelection);
        });
    });
});
