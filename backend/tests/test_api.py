"""Integration tests for FastAPI endpoints."""
import io
import pytest
from fastapi.testclient import TestClient
import pandas as pd
from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_calculator_sample_size_endpoint():
    payload = {
        "metric_type": "proportion",
        "baseline_value": 0.05,
        "mde_relative": 0.10,
        "alpha": 0.05,
        "power": 0.80,
        "daily_traffic_per_group": 5000
    }
    response = client.post("/api/v1/calculator/sample-size", json=payload)
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["sample_size_per_group"] > 25000
    assert len(data["power_curve"]) > 5
    assert data["estimated_days"] is not None


def test_calculator_mde_endpoint():
    payload = {
        "metric_type": "continuous",
        "sample_size_per_group": 5000,
        "baseline_value": 100.0,
        "baseline_std": 30.0,
        "alpha": 0.05,
        "power": 0.80
    }
    response = client.post("/api/v1/calculator/mde", json=payload)
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["absolute_mde"] > 0
    assert data["relative_mde"] > 0


def test_simulate_ab_test_continuous_endpoint():
    payload = {
        "sample_size_per_group": 1000,
        "metric_type": "continuous",
        "baseline_value": 100.0,
        "baseline_std": 30.0,
        "true_effect_relative": 0.10,
        "skewness": 1.0,
        "zero_inflation_rate": 0.10,
        "outliers_rate": 0.01,
        "alpha": 0.05
    }
    response = client.post("/api/v1/simulate/ab-test", json=payload)
    assert response.status_code == 200
    data = response.json()["data"]
    assert "welch_ttest" in data["tests"]
    assert "mann_whitney" in data["tests"]
    assert "business_verdict" in data


def test_simulate_ab_test_proportion_endpoint():
    payload = {
        "sample_size_per_group": 2000,
        "metric_type": "proportion",
        "baseline_value": 0.05,
        "baseline_std": 0.2,
        "true_effect_relative": 0.20,
        "skewness": 0.0,
        "zero_inflation_rate": 0.0,
        "outliers_rate": 0.0,
        "alpha": 0.05
    }
    response = client.post("/api/v1/simulate/ab-test", json=payload)
    assert response.status_code == 200
    data = response.json()["data"]
    assert "proportions_ztest" in data["tests"]
    assert "business_verdict" in data


def test_simulate_aa_test_endpoint():
    payload = {
        "sample_size_per_group": 500,
        "iterations": 200,
        "metric_type": "continuous",
        "distribution_params": {
            "proportion_p": 0.05,
            "continuous_mean": 100.0,
            "continuous_std": 35.0,
            "skewness": 1.0,
            "zero_inflation_rate": 0.10,
            "outliers_rate": 0.0
        },
        "alpha": 0.05,
        "test_method": "welch_ttest"
    }
    response = client.post("/api/v1/simulate/aa-test", json=payload)
    assert response.status_code == 200
    data = response.json()["data"]
    assert "empirical_fpr" in data
    assert len(data["p_value_histogram"]) == 20


def test_custom_data_upload_continuous_endpoint():
    df = pd.DataFrame({
        "user_id": range(100),
        "group": ["A"] * 50 + ["B"] * 50,
        "value": [10.0 + i * 0.1 for i in range(50)] + [15.0 + i * 0.1 for i in range(50)]
    })
    csv_bytes = df.to_csv(index=False).encode("utf-8")

    files = {"file": ("test_cont.csv", io.BytesIO(csv_bytes), "text/csv")}
    data = {
        "group_col": "group",
        "metric_col": "value",
        "user_id_col": "user_id",
        "alpha": "0.05"
    }

    response = client.post("/api/v1/analyze/custom-data", files=files, data=data)
    assert response.status_code == 200
    res_json = response.json()["data"]
    assert res_json["metric_type"] == "continuous"
    assert "welch_ttest" in res_json["tests"]
    assert "mann_whitney" in res_json["tests"]
    assert res_json["tests"]["welch_ttest"]["is_significant"] is True


def test_custom_data_upload_binary_endpoint():
    df = pd.DataFrame({
        "user_id": range(100),
        "group": ["control"] * 50 + ["treatment"] * 50,
        "value": [0] * 40 + [1] * 10 + [0] * 25 + [1] * 25
    })
    csv_bytes = df.to_csv(index=False).encode("utf-8")

    files = {"file": ("test_bin.csv", io.BytesIO(csv_bytes), "text/csv")}
    data = {
        "group_col": "group",
        "metric_col": "value",
        "alpha": "0.05"
    }

    response = client.post("/api/v1/analyze/custom-data", files=files, data=data)
    assert response.status_code == 200
    res_json = response.json()["data"]
    assert res_json["metric_type"] == "proportion"
    assert "proportions_ztest" in res_json["tests"]
