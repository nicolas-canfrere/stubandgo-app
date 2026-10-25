import type { components } from './schema';

type Problem = components['schemas']['Problem'];

export type OrderStatus = NonNullable<Problem['orderStatus']>;
export type Violation = NonNullable<Problem['violations']>[number];

export const UNREACHABLE_CODE = 'api_unreachable';
export const UNEXPECTED_CODE = 'unexpected_error';

export class ApiProblem extends Error {
  readonly code: string;
  readonly status: number;
  readonly detail: string;
  readonly violations: Violation[];
  readonly orderStatus: OrderStatus | null;

  constructor(init: {
    code: string;
    status: number;
    detail: string;
    violations?: Violation[];
    orderStatus?: OrderStatus | null;
  }) {
    super(init.detail || init.code);
    this.name = 'ApiProblem';
    this.code = init.code;
    this.status = init.status;
    this.detail = init.detail;
    this.violations = init.violations ?? [];
    this.orderStatus = init.orderStatus ?? null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Builds an ApiProblem from an error body; non problem+json bodies get a generic code. */
function fromBody(body: unknown, status: number): ApiProblem {
  if (isRecord(body) && typeof body.type === 'string') {
    return new ApiProblem({
      code: body.type.split('/').pop() || UNEXPECTED_CODE,
      status,
      detail: typeof body.detail === 'string' ? body.detail : '',
      violations: Array.isArray(body.violations) ? (body.violations as Violation[]) : [],
      orderStatus: typeof body.orderStatus === 'string' ? (body.orderStatus as OrderStatus) : null,
    });
  }

  return new ApiProblem({ code: UNEXPECTED_CODE, status, detail: '' });
}

type Result<D> = { data?: D; error?: unknown; response: Response };

/** Returns the response data, or throws an ApiProblem (including when the API is unreachable). */
export async function unwrap<D>(call: Promise<Result<D>>): Promise<D> {
  let result: Result<D>;
  try {
    result = await call;
  } catch {
    throw new ApiProblem({ code: UNREACHABLE_CODE, status: 0, detail: '' });
  }

  if (result.response.ok) {
    return result.data as D;
  }

  throw fromBody(result.error, result.response.status);
}
