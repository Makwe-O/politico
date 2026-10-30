import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';
import { HttpError } from './http';

/** Postgres SQLSTATE codes we translate into HTTP errors. */
const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';
/** What Postgres raises instead of 23503 when deleting a row an `ON DELETE RESTRICT` FK points at. */
const PG_RESTRICT_VIOLATION = '23001';
/** e.g. an id above the int4 max: valid for the Zod `Id` schema, rejected by Postgres. */
const PG_NUMERIC_OUT_OF_RANGE = '22003';

interface PgErrorInfo {
  code: string;
  constraint?: string;
}

/** Drizzle wraps driver errors, so the Postgres error may be the error itself or in its cause chain. */
function findPgError(err: unknown): PgErrorInfo | undefined {
  for (let e: unknown = err; e && typeof e === 'object'; e = (e as { cause?: unknown }).cause) {
    const { code, constraint } = e as { code?: unknown; constraint?: unknown };
    if (typeof code === 'string' && /^\d{5}$/.test(code)) {
      return { code, constraint: typeof constraint === 'string' ? constraint : undefined };
    }
  }
  return undefined;
}

export const pgErrorCode = (err: unknown) => findPgError(err)?.code;
/** Name of the violated constraint, e.g. `candidates_office_user_uq`. */
export const pgConstraint = (err: unknown) => findPgError(err)?.constraint;

export const isUniqueViolation = (err: unknown) => pgErrorCode(err) === PG_UNIQUE_VIOLATION;
/** A missing referenced row on insert/update, or a delete blocked by a RESTRICT foreign key. */
export const isForeignKeyViolation = (err: unknown) => {
  const code = pgErrorCode(err);
  return code === PG_FOREIGN_KEY_VIOLATION || code === PG_RESTRICT_VIOLATION;
};

function send(reply: FastifyReply, status: number, error: string) {
  return reply.code(status).send({ status, error });
}

export function errorHandler(err: FastifyError, req: FastifyRequest, reply: FastifyReply) {
  if (hasZodFastifySchemaValidationErrors(err)) {
    const details = err.validation
      .map((v) => {
        // instancePath is "/" for object-level issues (e.g. a refine), "/field" otherwise.
        const path = v.instancePath === '/' ? '' : v.instancePath.replaceAll('/', '.');
        return `${err.validationContext}${path}: ${v.message}`;
      })
      .join('; ');
    return send(reply, 400, details);
  }
  if (err instanceof HttpError) return send(reply, err.status, err.message);
  if (isUniqueViolation(err)) return send(reply, 409, 'Resource already exists');
  if (isForeignKeyViolation(err))
    return send(reply, 409, 'Resource is referenced by other records');
  if (pgErrorCode(err) === PG_NUMERIC_OUT_OF_RANGE) return send(reply, 400, 'Number out of range');
  if (err.statusCode && err.statusCode < 500) return send(reply, err.statusCode, err.message);

  req.log.error(err);
  return send(reply, 500, 'Internal server error');
}
