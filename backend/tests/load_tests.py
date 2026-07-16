"""
ForexAI Pro — Load Testing Suite (Locust)
Simulates concurrent traders and API traffic to analyze infrastructure scaling limits.
"""

from locust import HttpUser, task, between

class TraderBehavior(HttpUser):
    # Base user wait times between API requests (simulate real UI navigation delays)
    wait_time = between(1, 5)
    
    def on_start(self):
        """Prepare authentication for the load test."""
        # Generic payload since our endpoints require authentication
        # For a truly effective locust test across hundreds of simulated traders,
        # we dynamically register temporary users to isolate ChromaDB partitions and memory limits.
        
        import uuid
        import string
        import random
        
        random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
        self.email = f"loaduser_{random_suffix}@forexai.pro"
        
        registration = self.client.post("/api/v1/auth/register", json={
            "email": self.email,
            "password": "StrongPassword123!",
            "full_name": f"Locust Trader {random_suffix}"
        })
        
        if registration.status_code == 201:
            login = self.client.post("/api/v1/auth/login", json={
                "email": self.email,
                "password": "StrongPassword123!"
            })
            if login.status_code == 200:
                self.token = login.json()["access_token"]
                self.client.headers.update({"Authorization": f"Bearer {self.token}"})
            else:
                self.token = None
        else:
            self.token = None

    @task(3)
    def fetch_market_data(self):
        if self.token:
            self.client.get("/api/v1/market-data/candles/EUR-USD/1h")
            self.client.get("/api/v1/market-data/indicators/EUR-USD/1h")

    @task(2)
    def fetch_predictions(self):
        if self.token:
            self.client.get("/api/v1/predictions/history")

    @task(1)
    def mass_prediction_generation(self):
        """High resource endpoint simulation."""
        if self.token:
            self.client.post("/api/v1/predictions/analyze", json={
                "pair": "GBP/USD",
                "timeframe": "15m"
            })
