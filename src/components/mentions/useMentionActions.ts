import { CreateLinkEvent, MarkMentionsReadComposer } from '@nitrots/nitro-renderer';
import { useMemo } from 'react';
import { IMentionEntry, SendMessageComposer } from '../../api';
import { markRead, removeMention } from '../../hooks/mentions/mentionsStore';

export interface MentionActions
{
    /** Row click: mark the mention as read (no navigation). */
    open: (mention: IMentionEntry) => void;
    /** Explicit "go to room" action: mark read, then jump to the origin room. */
    goto: (mention: IMentionEntry) => void;
    /** Remove from the list (client-side). Marks read on the server so it does
     *  not reappear as unread after a relog. A true server-side delete packet
     *  is a follow-up. */
    remove: (mention: IMentionEntry) => void;
}

const markReadOnServer = (mention: IMentionEntry): void =>
{
    if(mention.read) return;
    markRead(mention.mentionId);
    SendMessageComposer(new MarkMentionsReadComposer(1, mention.mentionId));
};

// Shared action handlers used by both MentionsView and the chat-history
// "Menzioni" tab so behaviour can't diverge.
export const useMentionActions = (): MentionActions => useMemo(() => ({
    open: (mention) => markReadOnServer(mention),
    goto: (mention) =>
    {
        markReadOnServer(mention);
        if(mention.roomId > 0) CreateLinkEvent(`navigator/goto/${ mention.roomId }`);
    },
    remove: (mention) =>
    {
        if(!mention.read) SendMessageComposer(new MarkMentionsReadComposer(1, mention.mentionId));
        removeMention(mention.mentionId);
    }
}), []);
