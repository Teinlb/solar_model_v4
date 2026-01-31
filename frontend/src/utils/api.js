// API communication utilities
export const API_BASE = "";

export async function fetchAPI(endpoint, options = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
        ...options,
    });

    if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
}

export const api = {
    simulate: (data) =>
        fetchAPI("/api/simulate", {
            method: "POST",
            body: JSON.stringify(data),
        }),

    sweep: (data) =>
        fetchAPI("/api/sweep", {
            method: "POST",
            body: JSON.stringify(data),
        }),
};
