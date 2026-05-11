import { usePollActions } from './usePollActions';
import { usePollSubscriptions } from './usePollSubscriptions';

/**
 * @deprecated Prefer `usePollSubscriptions` (mount once, top-level) and
 * `usePollActions` (anywhere a component dispatches a vote/accept/reject).
 * This shim preserves the old `{ startPoll, rejectPoll, answerPoll }`
 * shape for existing consumers, but each call also re-mounts the three
 * subscription listeners — which is wrong if the hook is called from
 * multiple places.
 */
export const usePollWidget = () =>
{
    usePollSubscriptions();

    return usePollActions();
};
