export type Response<S = boolean> = { status: S; message: string };

export type QueueResponse =
    | {
          status: true;
          count: number;
          links: string[];
      }
    | Response<false>;

export type CountResponse = {
    status: true;
    count: number;
};

export type DelResponse = {
    status: true;
    removed: string[];
};
