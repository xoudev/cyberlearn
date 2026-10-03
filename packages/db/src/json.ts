import { Prisma } from "@prisma/client";

/**
 * Writes SQL NULL into a nullable Json column. The client refuses a plain null
 * there (it could mean the JSON value null), and the Prisma namespace is only
 * re-exported as a type from this package.
 */
export const JSON_NULL_IN_DB = Prisma.DbNull;
