import {Post} from 'mattermost-redux/types/posts';

export type ContextArgs = {channel_id: string, root_id?: string};
export type SlashCommandWillBePostedResponse = Promise<{} | {message: string, args: ContextArgs}>;

export interface Registry {
    registerMessageWillFormatHook: (hook: (post: Post, message: string) => string) => void;
    registerSlashCommandWillBePostedHook: (callback: (message: string, contextArgs: ContextArgs) => SlashCommandWillBePostedResponse) => string;
}
