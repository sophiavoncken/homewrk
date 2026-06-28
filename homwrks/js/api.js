const HomewrksAPI = {
    async request(path, options = {}) {
        const response = await fetch(path, {
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            },
            ...options
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.error || "Something went wrong.");
        }
        return data;
    },

    me() {
        return this.request("/api/me");
    },

    register(payload) {
        return this.request("/api/register", {
            method: "POST",
            body: JSON.stringify(payload)
        });
    },

    login(payload) {
        return this.request("/api/login", {
            method: "POST",
            body: JSON.stringify(payload)
        });
    },

    logout() {
        return this.request("/api/logout", { method: "POST" });
    },

    progress(activityKey) {
        const query = activityKey ? `?activity_key=${encodeURIComponent(activityKey)}` : "";
        return this.request(`/api/progress${query}`);
    },

    saveProgress(payload) {
        return this.request("/api/progress", {
            method: "POST",
            body: JSON.stringify(payload)
        });
    }
};
