import { PossiblePromise } from "@elara-services/basic-utils";
import { VercelRequest, VercelResponse } from "@vercel/node";
import { Db, MongoClient } from "mongodb";
import { query } from "./utils";

export type StrOptions = Partial<{
    required: boolean,
    message: string;
    default: string;
}>

export type CustomHeader = {
    match: string; // This will search the hostname (i.e: youtube.com, music.youtube.com, etc)
    headers: Record<string, string>; // This will be the headers added to the request.
}

export interface CreateRun {
    req: VercelRequest;
    res: VercelResponse,
    client: MongoClient;
    db: Db;
    query: ReturnType<typeof query>
    error: (msg: string, extra?: object) => PossiblePromise<VercelResponse>;
}