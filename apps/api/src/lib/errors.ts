import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';
import { HttpError } from './http';

/** Postgres SQLSTATE codes we translate into HTTP errors. */
const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';

/** Drizzle wraps driver errors, so the Postgres code may be on the error or its cause. */
export function pgErrorCode(err: unknown): string | undefined {
  for (let e: unknown = err; e && typeof e === 'object'; e = (e as { cause?: unknown }).cause) {
    const code = (e as { code?: unknown }).code;
    if (typeof code === 'string' && /^\d{5}$/.test(code)) return code;
  }
  return undefined;
}

export const isUniqueViolation = (err: unknown) => pgErrorCode(err) === PG_UNIQUE_VIOLATION;
export const isForeignKeyViolation = (err: unknown) =>
  pgErrorCode(err) === PG_FOREIGN_KEY_VIOLATION;

function send(reply: FastifyReply, status: number, error: string) {
  return reply.code(status).send({ status, error });
}

export function errorHandler(err: FastifyError, req: FastifyRequest, reply: FastifyReply) {
  if (hasZodFastifySchemaValidationErrors(err)) {
    const details = err.validation
      .map((v) => `${err.validationContext}${v.instancePath.replaceAll('/', '.')}: ${v.message}`)
      .join('; ');
    return send(reply, 400, details);
  }
  if (err instanceof HttpError) return send(reply, err.status, err.message);
  if (isUniqueViolation(err)) return send(reply, 409, 'Resource already exists');
  if (isForeignKeyViolation(err))
    return send(reply, 409, 'Resource is referenced by other records');
  if (err.statusCode && err.statusCode < 500) return send(reply, err.statusCode, err.message);

  req.log.error(err);
  return send(reply, 500, 'Internal server error');
}
