let nodeSchedule;

try {
    nodeSchedule = require("node-schedule");
} catch { };

module.exports = class Tasks extends null {
    static create({ id = "", time = "", shouldCancel = true } = {}, run) {
        if (!nodeSchedule) return `[Tasks:Create:ERROR]: I was unable to locate the 'node-schedule' package!`;
        if (!id || !time || !run) return `[Tasks:Create:ERROR]: You didn't provide a valid ID, Time or Run function`;
        if (nodeSchedule.scheduledJobs[id]) return `[Tasks:Create:ERROR]: Found (${id}) already in the scheduledJobs object.`;
        return nodeSchedule.scheduleJob(id, time, () => {
            run();
            if (shouldCancel) return nodeSchedule.cancelJob(id);
        });
    };

    static delete(id) {
        if (!nodeSchedule) return null;
        return nodeSchedule.cancelJob(id);
    };
};