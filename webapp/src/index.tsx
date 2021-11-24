import {Store, Action} from 'redux';

import {GlobalState} from 'mattermost-redux/types/store';

import {getPost} from 'mattermost-redux/selectors/entities/posts';
import {getChannel} from 'mattermost-redux/selectors/entities/channels';
import {Client4} from 'mattermost-redux/client';
import {Registry} from 'types/plugin_registry';

import manifest from './manifest';

import Hooks, {SlashCommandTableData} from './hooks';
import {customPropName, customURLAction} from './constants'
import {parseQueryString} from './utils';

type CommandArgs = {
    channel_id: string;
    team_id?: string;
    root_id?: string;
}

export default class Plugin {
    registry!: Registry;
    store!: Store<GlobalState, Action<Record<string, unknown>>>;

    public async initialize(registry: Registry, store: Store<GlobalState, Action<Record<string, unknown>>>) {
        // @see https://developers.mattermost.com/extend/plugins/webapp/reference/

        this.registry = registry;
        this.store = store;

        const hooks = new Hooks(store);
        registry.registerMessageWillFormatHook(hooks.messageWillFormatHook);
        registry.registerSlashCommandWillBePostedHook(hooks.slashCommandWillBePostedHook);

        window.addEventListener('click', this.anchorClickHandler);
    }

    uninitialize() {
        window.removeEventListener('click', this.anchorClickHandler);
    }

    anchorClickHandler = (e: MouseEvent) => {
        const href = getHref(e.target as HTMLElement, 5);
        if (!href) {
            return;
        }

        const prefix = `${customPropName}://`;
        if (!href.startsWith(prefix)) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        const link = href.substring(prefix.length);
        const [name, query] = link.split('?');

        if (name === customURLAction) {
            const {postID, x, y} = parseQueryString(query);
            const post = getPost(this.store.getState(), postID);
            const channel = getChannel(this.store.getState(), post.channel_id);

            const tableDataProp: string = post.props[customPropName];
            const tableData: SlashCommandTableData = JSON.parse(tableDataProp);

            const coord = `${x} ${y}`;
            const slashCommand = tableData[coord];

            (Client4.executeCommand as unknown as (command: string, commandArgs: CommandArgs) => void)(slashCommand, {
                channel_id: post.channel_id,
                team_id: channel.team_id,
                root_id: post.root_id || post.id,
            });
        }
    }
}

const getHref = (target: HTMLElement, limit: number) => {
    let element: HTMLElement = target;
    for (let i=0; i < limit; i++) {
        const anchor = element as HTMLAnchorElement;
        if (anchor.href) {
            return anchor.href;
        }

        if (!element.parentElement) {
            return '';
        }
        element = element.parentElement;
    }

    return '';
}

declare global {
    interface Window {
        registerPlugin(id: string, plugin: Plugin): void
    }
}

window.registerPlugin(manifest.id, new Plugin());
