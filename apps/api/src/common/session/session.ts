import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { Request } from 'express'
import type { Tenant, User, UserRole } from '@workspace/db'

/**
 * The tenant-scoped identity a request acts as, which `AuthGuard` attaches
 * after it resolves the session. Every route reads its context from here and
 * nowhere else — a client has no say in which tenant it acts on.
 */
export interface Session {
  user: Omit<User, 'password' | 'refreshTokenHash'>
  tenant: Tenant
  role: UserRole
}

/** The request the guard has enriched. */
export type AuthenticatedRequest = Request & { session: Session }

/** The metadata key the `Public` decorator writes and the guard reads. */
const PUBLIC_KEY = 'is-public'

/**
 * Marks a route or controller as reachable without a session: the guard
 * accepts the request before it reads any cookie. The auth routes use this —
 * a request cannot present a session it is in the middle of creating.
 */
export function Public(): MethodDecorator & ClassDecorator {
  return (
    target: object,
    _propertyKey?: string | symbol,
    descriptor?: PropertyDescriptor
  ) => {
    Reflect.defineMetadata(PUBLIC_KEY, true, descriptor?.value ?? target)
  }
}

/** Whether a handler or its controller was marked `@Public()`. */
export function isPublic(handler: object, controller: object): boolean {
  return (
    Reflect.getMetadata(PUBLIC_KEY, handler) === true ||
    Reflect.getMetadata(PUBLIC_KEY, controller) === true
  )
}

/** The metadata key the `Roles` decorator writes and the guard reads. */
export const ROLES_KEY = 'accepted-roles'

/**
 * The roles a route accepts. A route without it accepts any signed-in user;
 * the guard rejects a role outside the list with 403.
 *
 * Applied to a single handler or to a whole controller's prototype.
 */
export function Roles(
  ...roles: readonly UserRole[]
): ((
  target: object,
  _propertyKey: string | symbol,
  descriptor: PropertyDescriptor
) => void) &
  ((target: object) => void) {
  return (
    target: object,
    _propertyKey?: string | symbol,
    descriptor?: PropertyDescriptor
  ) => {
    Reflect.defineMetadata(ROLES_KEY, roles, descriptor?.value ?? target)
  }
}

/**
 * The session parameter decorators. The guard runs before every handler and
 * rejects a request it could not enrich, so a parameter these decorators bind
 * is always present by the time the handler runs — their type is `Session`,
 * not `Session | undefined`.
 */
export const CurrentUser = createParamDecorator(
  (_: unknown, context: ExecutionContext) => session(context).user
)

/** The tenant the session acts on, from the database, never from the client. */
export const CurrentTenant = createParamDecorator(
  (_: unknown, context: ExecutionContext) => session(context).tenant
)

/** The whole session, for a route that needs user and tenant together. */
export const CurrentSession = createParamDecorator(
  (_: unknown, context: ExecutionContext) => session(context)
)

/** Reads the session the guard attached to the request. */
function session(context: ExecutionContext): Session {
  const request = context.switchToHttp().getRequest<AuthenticatedRequest>()

  return request.session
}
