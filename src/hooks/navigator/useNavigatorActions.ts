import { useBetween } from 'use-between';
import { useNavigatorStore } from './useNavigatorStore';

export const useNavigatorActions = () =>
{
    const { sendSearch, reloadCurrentSearch } = useBetween(useNavigatorStore);
    return { sendSearch, reloadCurrentSearch };
};
