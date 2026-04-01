import { describe, it, expect, vi } from 'vitest';
import { fetchBCVRates, fetchBCVRate } from '../../src/lib/bcv';

vi.mock('https', () => ({
    default: {
        get: vi.fn((url, options, callback) => {
            const mockHtml = `
        <div id="dolar">
          <strong> 36,50 </strong>
        </div>
        <div id="euro">
          <strong> 39,20 </strong>
        </div>
      `;
            const res = {
                statusCode: 200,
                on: (event: string, cb: any) => {
                    if (event === 'data') cb(Buffer.from(mockHtml));
                    if (event === 'end') cb();
                }
            };
            callback(res);
            return {
                on: vi.fn(),
                destroy: vi.fn(),
            };
        })
    }
}));

describe('BCV Utilities', () => {
    it('debe parsear las tasas USD y EUR correctamente desde el HTML', async () => {
        const rates = await fetchBCVRates();
        expect(rates.usd).toEqual({ rate: 36.5, source: 'bcv_official' });
        expect(rates.eur).toEqual({ rate: 39.2, source: 'bcv_official' });
    });

    it('fetchBCVRate debe retornar solo la tasa USD por retrocompatibilidad', async () => {
        const usdRate = await fetchBCVRate();
        expect(usdRate?.rate).toBe(36.5);
    });
});
