import type { FastifyReply } from 'fastify';

/** Throw from a handler to send `{ status, error }` with the given status code. */
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const notFound = (what: string) => new HttpError(404, `${what} not found`);

/** Sends the standard success envelope. `data` is always an array. */
export function ok<T>(reply: FastifyReply, data: T[], status = 200) {
  return reply.code(status).send({ status, data });
}
