import { createNitroStore } from '../../state/createNitroStore';
import { createEmptyMonitorSnapshot } from './WiredCreatorTools.helpers';
import { InspectionElementType, InspectionFurniLiveState, InspectionFurniSelection, InspectionUserLiveState, InspectionUserSelection, MonitorSnapshot, VariablesElementType, WiredToolsTab } from './WiredCreatorTools.types';

type MonitorSeverityFilter = 'ALL' | 'ERROR' | 'WARNING';
type Updater<T> = T | ((prev: T) => T);

const apply = <T>(prev: T, next: Updater<T>): T =>
    ((typeof next === 'function') ? (next as (p: T) => T)(prev) : next);

interface WiredCreatorToolsUiState
{
    isVisible: boolean;
    activeTab: WiredToolsTab;
    inspectionType: InspectionElementType;
    variablesType: VariablesElementType;

    isMonitorHistoryOpen: boolean;
    isMonitorInfoOpen: boolean;
    isInspectionGiveOpen: boolean;
    isVariableManageOpen: boolean;
    isManagedGiveOpen: boolean;

    monitorHistorySeverityFilter: MonitorSeverityFilter;
    monitorHistoryTypeFilter: string;

    variableManageTypeFilter: string;
    variableManageSort: string;
    variableManagePage: number;

    /**
     * Latest snapshot pushed by the server through `WiredMonitorDataEvent`.
     * Held in the store (rather than `useState`) so it survives remount
     * — e.g. closing and reopening the panel between two server pushes
     * keeps the last-known stats visible instead of flashing back to the
     * empty snapshot.
     */
    monitorSnapshot: MonitorSnapshot;

    /**
     * Inspection selection. The room-event listeners
     * (`useObjectSelectedEvent` and the per-kind `useMessageEvent`
     * handlers) still live in `WiredCreatorToolsView` — they need React
     * lifecycle to subscribe/unsubscribe correctly — but the resulting
     * state lives here so a closed/reopened panel keeps the last
     * inspected target.
     *
     * `*ActionVersion` is a monotonic counter the user-action handlers
     * bump to force the live-state recomputation effect to re-run even
     * when neither `selectedUser` nor `roomIndex` changed identity.
     */
    selectedFurni: InspectionFurniSelection | null;
    selectedFurniLiveState: InspectionFurniLiveState | null;
    selectedUser: InspectionUserSelection | null;
    selectedUserLiveState: InspectionUserLiveState | null;
    selectedUserActionVersion: number;

    setIsVisible: (next: Updater<boolean>) => void;
    setActiveTab: (next: WiredToolsTab) => void;
    setInspectionType: (next: InspectionElementType) => void;
    setVariablesType: (next: VariablesElementType) => void;

    setIsMonitorHistoryOpen: (next: boolean) => void;
    setIsMonitorInfoOpen: (next: boolean) => void;
    setIsInspectionGiveOpen: (next: Updater<boolean>) => void;
    setIsVariableManageOpen: (next: boolean) => void;
    setIsManagedGiveOpen: (next: Updater<boolean>) => void;

    setMonitorHistorySeverityFilter: (next: MonitorSeverityFilter) => void;
    setMonitorHistoryTypeFilter: (next: string) => void;

    setVariableManageTypeFilter: (next: string) => void;
    setVariableManageSort: (next: string) => void;
    setVariableManagePage: (next: Updater<number>) => void;

    setMonitorSnapshot: (next: MonitorSnapshot) => void;
    resetMonitorSnapshot: () => void;

    setSelectedFurni: (next: InspectionFurniSelection | null) => void;
    setSelectedFurniLiveState: (next: Updater<InspectionFurniLiveState | null>) => void;
    setSelectedUser: (next: InspectionUserSelection | null) => void;
    setSelectedUserLiveState: (next: Updater<InspectionUserLiveState | null>) => void;
    setSelectedUserActionVersion: (next: Updater<number>) => void;
}

export const useWiredCreatorToolsUiStore = createNitroStore<WiredCreatorToolsUiState>()((set) => ({
    isVisible: false,
    activeTab: 'monitor',
    inspectionType: 'furni',
    variablesType: 'furni',

    isMonitorHistoryOpen: false,
    isMonitorInfoOpen: false,
    isInspectionGiveOpen: false,
    isVariableManageOpen: false,
    isManagedGiveOpen: false,

    monitorHistorySeverityFilter: 'ALL',
    monitorHistoryTypeFilter: 'ALL',

    variableManageTypeFilter: 'ALL',
    variableManageSort: 'highest_value',
    variableManagePage: 1,

    monitorSnapshot: createEmptyMonitorSnapshot(),

    selectedFurni: null,
    selectedFurniLiveState: null,
    selectedUser: null,
    selectedUserLiveState: null,
    selectedUserActionVersion: 0,

    setIsVisible: (next) => set(state => ({ isVisible: apply(state.isVisible, next) })),
    setActiveTab: (next) => set({ activeTab: next }),
    setInspectionType: (next) => set({ inspectionType: next }),
    setVariablesType: (next) => set({ variablesType: next }),

    setIsMonitorHistoryOpen: (next) => set({ isMonitorHistoryOpen: next }),
    setIsMonitorInfoOpen: (next) => set({ isMonitorInfoOpen: next }),
    setIsInspectionGiveOpen: (next) => set(state => ({ isInspectionGiveOpen: apply(state.isInspectionGiveOpen, next) })),
    setIsVariableManageOpen: (next) => set({ isVariableManageOpen: next }),
    setIsManagedGiveOpen: (next) => set(state => ({ isManagedGiveOpen: apply(state.isManagedGiveOpen, next) })),

    setMonitorHistorySeverityFilter: (next) => set({ monitorHistorySeverityFilter: next }),
    setMonitorHistoryTypeFilter: (next) => set({ monitorHistoryTypeFilter: next }),

    setVariableManageTypeFilter: (next) => set({ variableManageTypeFilter: next }),
    setVariableManageSort: (next) => set({ variableManageSort: next }),
    setVariableManagePage: (next) => set(state => ({ variableManagePage: apply(state.variableManagePage, next) })),

    setMonitorSnapshot: (next) => set({ monitorSnapshot: next }),
    resetMonitorSnapshot: () => set({ monitorSnapshot: createEmptyMonitorSnapshot() }),

    setSelectedFurni: (next) => set({ selectedFurni: next }),
    setSelectedFurniLiveState: (next) => set(state => ({ selectedFurniLiveState: apply(state.selectedFurniLiveState, next) })),
    setSelectedUser: (next) => set({ selectedUser: next }),
    setSelectedUserLiveState: (next) => set(state => ({ selectedUserLiveState: apply(state.selectedUserLiveState, next) })),
    setSelectedUserActionVersion: (next) => set(state => ({ selectedUserActionVersion: apply(state.selectedUserActionVersion, next) }))
}));
