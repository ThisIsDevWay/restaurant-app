/**
 * Minimal mock of `next/server` for Vitest.
 * next-auth@5-beta imports this without the .js extension, which fails in jsdom.
 */

export class NextRequest {
    url: string;
    method: string;
    headers: Headers;
    constructor(url: string, init?: RequestInit) {
        this.url = url;
        this.method = (init?.method ?? "GET").toUpperCase();
        this.headers = new Headers(init?.headers as HeadersInit);
    }
    async json() { return {}; }
    async text() { return ""; }
}

export class NextResponse {
    static json(body: unknown, init?: ResponseInit) {
        return new Response(JSON.stringify(body), {
            ...init,
            headers: { "Content-Type": "application/json", ...init?.headers },
        });
    }
    static redirect(url: string | URL, status = 302) {
        return new Response(null, { status, headers: { Location: String(url) } });
    }
    static next() {
        return new Response(null, { status: 200 });
    }
}

export const cookies = () => ({
    get: (_name: string) => undefined,
    set: () => { },
    delete: () => { },
});

export const headers = () => new Headers();
