export const status = {
    success: (message: string): { status: true; message: string } => ({
        status: true,
        message,
    }),
    error: (message: string): { status: false; message: string } => ({
        status: false,
        message,
    }),
    data: <D extends object>(data: D): { status: true; data: D } => ({
        status: true,
        data,
    }),
};

export const get = {
    secs: (secs: number) => secs * 1000,
    mins: (mins: number) => mins * get.secs(60),
    hrs: (hrs: number) => hrs * get.mins(60),
    days: (days: number) => days * get.hrs(24),
};
