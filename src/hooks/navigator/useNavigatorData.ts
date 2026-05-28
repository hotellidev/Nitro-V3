import { useBetween } from 'use-between';
import { useNavigatorStore } from './useNavigatorStore';

export const useNavigatorData = () =>
{
    const {
        categories, eventCategories, favouriteRoomIds,
        topLevelContext, topLevelContexts,
        searchResult, navigatorSearches, navigatorData
    } = useBetween(useNavigatorStore);

    return {
        categories, eventCategories, favouriteRoomIds,
        topLevelContext, topLevelContexts,
        searchResult, navigatorSearches, navigatorData
    };
};
