import { status } from "./status";
import { log } from "./times";

export type DebugLogger = { 
    name: string,
    enabled: boolean, 
    log?: (...args: unknown[]) => Promise<unknown> | unknown;
};

export const debugs = new Map<string, DebugLogger>();

export const debug = {
    set: (data: DebugLogger) => {
        if (!data.name) {
            return status.error(`No debug name found.`);
        }
        if (debugs.has(data.name)) {
            return status.error(`Debug name (${data.name}) already in use.`);
        }
        debugs.set(data.name, {
            name: data.name,
            enabled: data.enabled ?? true,
            log: data.log,
        });
        return status.success(`Created debug logger for ${data.name}`);
    },

    del: (name: string) => {
        const f = debugs.get(name);
        if (!f) {
            return status.error(`Debug (${name}) not found.`);
        }
        debugs.delete(name);
        return {
            status: true as const,
            message: `Successfully deleted (${name}) debug logger.`,
            data: f,
        };
    },

    toggle: (name: string) => {
        const f = debugs.get(name);
        if (!f) {
            return status.error(`Debug name (${name}) isn't added to the list.`);
        }
        f.enabled = f.enabled ? false : true;
        return status.success(`Debug (${name}) is now ${f.enabled ? "enabled" : "disabled"}!`);
    },

    log: (name: string, ...args: unknown[]) => {
        const f = debugs.get(name);
        if (!f || !f.enabled) {
            return;
        }
        return (f.log || log)(`[${name}]: (DEBUGGER)`, ...args);
    },
};