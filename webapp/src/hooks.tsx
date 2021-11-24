import {ContextArgs, SlashCommandWillBePostedResponse, Store} from './types/plugin_registry';
import {Post} from 'mattermost-redux/types/posts';

import {customPropName, customURLAction} from './constants'
import {Client4} from 'mattermost-redux/client';

export type SlashCommandTableData = {
    [xyCoord: string]: string;
}

export default class Hooks {
    constructor(private store: Store) {}

    slashCommandWillBePostedHook = async (message: string, contextArgs: ContextArgs): SlashCommandWillBePostedResponse => {
        const slashPrefix = '/make-table';

        if (!message.startsWith(slashPrefix)) {
            return {message, args: contextArgs};
        }

        const post = {
            message: `| Left-Aligned  | Center Aligned  | Right Aligned |
            | :------------ |:---------------:| -----:|
            | :rocket: | this text       |  $100 |
            | :smile: | is              |   $10 |
            | :+1: | centered        |    $1 |`,
            channel_id: contextArgs.channel_id,
            root_id: contextArgs.root_id,
            props: {
                [customPropName]: JSON.stringify({
                    '0 0': `/echo I'm a Rocket!`,
                    '0 1': `/echo I'm a Smile!`,
                    '0 2': `/echo I'm a Thumbs Up!`,
                }),
            } as any,
        } as Post;

        Client4.createPost(post);

        return {};
    }

    /**
        * Register a hook that will be called before a message is formatted into Markdown.
        * Accepts a function that receives the unmodified post and the message (potentially
        * already modified by other hooks) as arguments. This function must return a string
        * message that will be formatted.
        * Returns a unique identifier.
    */
    messageWillFormatHook = (post: Post, message: string): string => {
        if (!post.props?.[customPropName]) {
            return message;
        }

        const tableDataProp: string = post.props[customPropName];

        try {
            return this.renderTableWithLinks(tableDataProp, post, message)
        } catch (e) {
            console.error('Error formatting custom table', e)
            return message;
        }

    }

    renderTableWithLinks = (tableDataProp: string, post: Post, message: string): string => {
        const tableData = JSON.parse(tableDataProp);
        const [header, spacing, ...rows] = message.split('\n');

        for (const coord of Object.keys(tableData)) {
            const [xStr, yStr] = coord.split(' ');

            const x = parseInt(xStr);
            const y = parseInt(yStr);

            const columns = rows[y].split('|');
            const cellText = columns[x + 1];

            const cellURL = `${customPropName}://${customURLAction}?postID=${post.id}&x=${x}&y=${y}`;
            const link = `[${cellText}](${cellURL})`;

            columns[x + 1] = link;

            rows[y] = columns.join('|')
        }

        const rowsStr = rows.join('\n');
        return [header, spacing, rowsStr].join('\n');
    }
}
