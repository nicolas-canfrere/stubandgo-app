import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../test/server';
import { api } from './client';
import { ApiProblem, unwrap } from './problem';

const problem = (code: string, status: number, extra: object = {}) =>
  HttpResponse.json(
    {
      type: `/problems/${code}`,
      title: 'x',
      status,
      detail: `detail ${code}`,
      instance: '/i',
      ...extra,
    },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );

const caught = async (call: Promise<unknown>): Promise<ApiProblem> => {
  try {
    await call;
  } catch (error) {
    if (error instanceof ApiProblem) return error;
    throw error;
  }
  throw new Error('expected ApiProblem');
};

const orders = () => api.GET('/api/orders/{orderId}', { params: { path: { orderId: 'x' } } });

describe('unwrap', () => {
  it('returns the data on success', async () => {
    server.use(http.get('*/api/orders/x', () => HttpResponse.json({ id: 'x' })));
    await expect(unwrap(orders())).resolves.toEqual({ id: 'x' });
  });

  it('throws an ApiProblem with code and status on a 409', async () => {
    server.use(http.get('*/api/orders/x', () => problem('sold_out', 409)));
    const error = await caught(unwrap(orders()));
    expect(error.code).toBe('sold_out');
    expect(error.status).toBe(409);
    expect(error.detail).toBe('detail sold_out');
    expect(error.violations).toEqual([]);
    expect(error.orderStatus).toBeNull();
  });

  it('keeps the order status of a 402', async () => {
    server.use(
      http.get('*/api/orders/x', () => problem('payment_declined', 402, { orderStatus: 'failed' })),
    );
    expect((await caught(unwrap(orders()))).orderStatus).toBe('failed');
  });

  it('keeps the violations of a 422', async () => {
    const violations = [{ propertyPath: 'lines[0].quantity', message: 'Bad.' }];
    server.use(http.get('*/api/orders/x', () => problem('validation_failed', 422, { violations })));
    expect((await caught(unwrap(orders()))).violations).toEqual(violations);
  });

  it('falls back to unexpected_error when the body is not problem+json', async () => {
    server.use(
      http.get('*/api/orders/x', () => new HttpResponse('<html>boom</html>', { status: 500 })),
    );
    const error = await caught(unwrap(orders()));
    expect(error.code).toBe('unexpected_error');
    expect(error.status).toBe(500);
  });

  it('maps a rejected fetch to api_unreachable', async () => {
    server.use(http.get('*/api/orders/x', () => HttpResponse.error()));
    const error = await caught(unwrap(orders()));
    expect(error.code).toBe('api_unreachable');
    expect(error.status).toBe(0);
  });
});
