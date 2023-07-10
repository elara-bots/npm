export class Response {
    private raw: object;
    private resOptions: object;
    public body: Buffer | string;
    public headers: Record<string, unknown>;
    public statusCode: number;
    public constructor(
        res: {
            headers: Record<string, unknown>;
            statusCode: number;
        },
        resOptions: object
    ) {
        this.raw = res;
        this.resOptions = resOptions;
        this.body = Buffer.alloc(0);
        this.headers = res.headers;
        this.statusCode = res.statusCode;
    }

    _addChunk(chunk: Uint8Array) {
        this.body = Buffer.concat([this.body as Buffer, chunk]);
    }

    json<T extends object>(): T | null {
        return this.statusCode === 204 ? null : JSON.parse(this.body as string);
    }

    text() {
        return this.body.toString();
    }
}
