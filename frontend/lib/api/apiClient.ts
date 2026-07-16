const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

class ApiClient {
  private getAccessToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("access_token");
  }

  private getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("refresh_token");
  }

  private setTokens(access: string, refresh: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem("access_token", access);
    localStorage.setItem("refresh_token", refresh);
  }

  private clearTokens(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  }

  private async refreshSession(): Promise<boolean> {
    const refresh = this.getRefreshToken();
    if (!refresh) return false;

    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh }),
      });

      if (!res.ok) {
        this.clearTokens();
        return false;
      }

      const data = await res.json();
      this.setTokens(data.access_token, data.refresh_token);
      return true;
    } catch {
      return false;
    }
  }

  public async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    let url = `${BASE_URL}${endpoint}`;
    
    // Add Query Parameters
    if (options.params) {
      const query = new URLSearchParams(
        Object.entries(options.params).map(([key, val]) => [key, String(val)])
      ).toString();
      url += `?${query}`;
    }

    const headers = new Headers(options.headers || {});
    if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }

    const token = this.getAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const fetchConfig: RequestInit = {
      ...options,
      headers,
    };

    let response = await fetch(url, fetchConfig);

    // Auto-refresh token if 401 unauthorized
    if (response.status === 401 && this.getRefreshToken()) {
      const refreshed = await this.refreshSession();
      if (refreshed) {
        // Retry request with fresh token
        const newAccessToken = this.getAccessToken();
        if (newAccessToken) {
          headers.set("Authorization", `Bearer ${newAccessToken}`);
        }
        response = await fetch(url, fetchConfig);
      } else {
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: "Request failed" }));
      throw new Error(errorData.detail || "Request failed");
    }

    return response.json() as Promise<T>;
  }

  public get<T>(endpoint: string, params?: Record<string, string | number | boolean>, options: Omit<RequestOptions, "method" | "params"> = {}) {
    return this.request<T>(endpoint, { method: "GET", params, ...options });
  }

  public post<T>(endpoint: string, body?: any, options: Omit<RequestOptions, "method"> = {}) {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
      ...options,
    });
  }

  public put<T>(endpoint: string, body?: any, options: Omit<RequestOptions, "method"> = {}) {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
      ...options,
    });
  }

  public delete<T>(endpoint: string, options: Omit<RequestOptions, "method"> = {}) {
    return this.request<T>(endpoint, { method: "DELETE", ...options });
  }
}

export const api = new ApiClient();
