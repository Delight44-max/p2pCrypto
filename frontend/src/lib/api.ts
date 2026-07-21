const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

function getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
}

function handleAuthError() {
    if (typeof window === 'undefined') return;

    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/auth/login';
}

export interface ApiResult<T> {
    success: boolean;
    data: T | null;
    offline: boolean;
    status: number;
    message: string;
}

// Shape your Spring Boot backend actually sends on the wire, e.g.
// { "success": true, "message": "Success", "data": [...] }
interface BackendEnvelope<T> {
    success?: boolean;
    message?: string;
    data?: T;
}

async function request<T>(
    path: string,
    options: RequestInit = {}
): Promise<ApiResult<T>> {
    const token = getToken();

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
    };

    try {
        const res = await fetch(`${API_URL}${path}`, {
            ...options,
            headers,
        });

        if (res.status === 401 || res.status === 403) {
            const isPublic =
                path.includes('/api/auth/') ||
                path.includes('/api/prices');

            if (!isPublic && token) {
                handleAuthError();
            }

            return {
                success: false,
                data: null,
                offline: false,
                status: res.status,
                message: 'Unauthorized',
            };
        }

        let json: any = null;

        try {
            const text = await res.text();
            json = text ? JSON.parse(text) : null;
        } catch {
            json = null;
        }

        if (!res.ok) {
            return {
                success: false,
                data: null,
                offline: false,
                status: res.status,
                message: json?.message || res.statusText,
            };
        }

        // FIX: The backend always responds with its own envelope shape
        // { success, message, data }. Previously we set `data: json`,
        // which stored the ENTIRE envelope object as `.data` instead of
        // the actual payload inside it — so anything doing
        // Array.isArray(result.data) or expecting T directly always
        // failed silently (this is why prices/trades showed as empty
        // even though the network call itself succeeded).
        // We unwrap it here, once, so every caller of api.get/post/etc
        // gets the real payload typed as T.
        const envelope = json as BackendEnvelope<T> | null;
        const unwrapped: T | null =
            envelope && typeof envelope === 'object' && 'data' in envelope
                ? (envelope.data as T)
                : (json as T);

        return {
            success: true,
            data: unwrapped,
            offline: false,
            status: res.status,
            message: envelope?.message ?? '',
        };
    } catch (error) {
        console.warn('Backend unavailable. Running in offline mode.', error);

        return {
            success: false,
            data: null,
            offline: true,
            status: 0,
            message: 'Backend unavailable',
        };
    }
}

export const api = {
    get: <T>(path: string) =>
        request<T>(path),

    post: <T>(path: string, body: unknown) =>
        request<T>(path, {
            method: 'POST',
            body: JSON.stringify(body),
        }),

    put: <T>(path: string, body: unknown) =>
        request<T>(path, {
            method: 'PUT',
            body: JSON.stringify(body),
        }),

    patch: <T>(path: string, body?: unknown) =>
        request<T>(path, {
            method: 'PATCH',
            body: body ? JSON.stringify(body) : undefined,
        }),

    delete: <T>(path: string) =>
        request<T>(path, {
            method: 'DELETE',
        }),
};