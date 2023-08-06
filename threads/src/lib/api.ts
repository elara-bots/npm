import { ThreadsAPI } from "threads-api";
import { isNew } from "./utils";
import { is } from "@elara-services/utils";

let deviceID: string | undefined;
let tAPI: ThreadsAPI | undefined;

export function getAPI() {
    tAPI ??= new ThreadsAPI({ deviceID });
    deviceID ??= tAPI.deviceID;
    return tAPI;
}

export async function fetchUser(id: string) {
    return (
        (await getAPI()
            .getUserProfile(id)
            .catch(() => null)) ?? null
    );
}

export async function bulkFetchUsersIdsByName(search: string[]) {
    const users = [];
    for await (const user of search) {
        const res = await fetchUserIdByName(user);
        users.push({
            name: user,
            id: is.string(res) ? res : null,
            found: is.string(res) ? true : false,
        });
    }
    return users;
}

export async function fetchUserIdByName(name: string) {
    return (
        (await getAPI()
            .getUserIDfromUsername(name)
            .catch(() => null)) ?? null
    );
}

export async function fetchUserPosts(
    id: string,
    returnOnlyNew = false,
    timeout: number
) {
    const api = getAPI();
    const posts = await api.getUserProfileThreads(id).catch(() => null);
    if (!is.array(posts)) {
        return null;
    }
    const replies = await api.getUserProfileReplies(id).catch(() => null);
    if (is.array(replies)) {
        for (const reply of replies) {
            posts.push(reply);
        }
    }
    const list = posts.flatMap((c) => c.thread_items);
    if (!list.length) {
        return null;
    }
    if (returnOnlyNew) {
        const l = list.filter((c) => isNew(c, timeout));
        if (!l.length) {
            return null;
        }
        return l;
    }
    return list;
}
