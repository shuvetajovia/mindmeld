import sys
import os
import unittest
from fastapi.testclient import TestClient

# Adjust path to import from backend
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.app.main import app
from backend.app.db.session import engine, Base, SessionLocal
from backend.app.models.spatial import RoadSegment
from backend.app.models.report import FieldCrowdsourceReport

class TestLandslideEWS(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Create all tables in test database file
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)
        
    def test_01_root_connection(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("ONLINE", response.json()["status"])

    def test_02_predict_endpoint(self):
        static_feats = {
            "slope": 20.0, "elevation": 1500.0, "aspect_sin": 0.1,
            "aspect_cos": 0.9, "curvature": 0.02, "dist_to_road_km": 0.1
        }
        dynamic_feats = {
            "rain_24h_obs": 120.0, "rain_48h_prior": 100.0, "rain_72h_prior": 80.0,
            "rain_7d_prior": 300.0, "api_7d": 150.0, "r24_seasonal_anom": 45.0,
            "api_seasonal_anom": 50.0
        }
        
        response = self.client.post(
            "/api/v1/forecast/predict",
            json={"static_features": static_feats, "dynamic_features": dynamic_feats}
        )
        self.assertEqual(response.status_code, 200)
        res_json = response.json()
        self.assertIn("risk_score", res_json)
        self.assertIn("alert_level", res_json)
        self.assertGreaterEqual(res_json["risk_score"], 1)
        self.assertLessEqual(res_json["risk_score"], 10)

    def test_03_explain_endpoint(self):
        dynamic_feats = {
            "rain_24h_obs": 120.0, "rain_48h_prior": 100.0, "rain_72h_prior": 80.0,
            "rain_7d_prior": 300.0, "api_7d": 150.0, "r24_seasonal_anom": 45.0,
            "api_seasonal_anom": 50.0
        }
        
        response = self.client.post(
            "/api/v1/forecast/explain",
            json=dynamic_feats
        )
        self.assertEqual(response.status_code, 200)
        res_json = response.json()
        self.assertIn("shap_values", res_json)
        self.assertIn("rain_24h_obs", res_json["shap_values"])

    def test_04_routing_standard(self):
        # Compute route from Guwahati to Kohima
        response = self.client.post(
            "/api/v1/routing/route",
            json={"origin": "Guwahati", "destination": "Kohima", "alpha": 0.5}
        )
        self.assertEqual(response.status_code, 200)
        res_json = response.json()
        self.assertEqual(res_json["origin"], "Guwahati")
        self.assertEqual(res_json["destination"], "Kohima")
        self.assertGreater(res_json["total_distance_km"], 0.0)
        self.assertFalse(res_json["alternative_available"])

    def test_05_crowdsource_and_detour_loop(self):
        # 1. Verify that Guwahati - Shillong - Aizawl route works normally
        response_route1 = self.client.post(
            "/api/v1/routing/route",
            json={"origin": "Guwahati", "destination": "Aizawl", "alpha": 0.5}
        )
        self.assertEqual(response_route1.status_code, 200)
        dist1 = response_route1.json()["total_distance_km"]

        # 2. Submit a citizen landslide report on the Shillong - Aizawl road section
        # Shillong coord is approx 25.5788, 91.8931. Aizawl is 23.7307, 92.7173.
        # Let's submit report near Shillong (within 5km of NH-44 segment)
        response_report = self.client.post(
            "/api/v1/reports/submit",
            data={
                "reporter_name": "Test Marshal",
                "phone": "+919999988888",
                "latitude": 25.5780,
                "longitude": 91.8930,
                "description": "Massive landslide blocking NH-44 near Shillong",
                "severity": "CRITICAL"
            }
        )
        self.assertEqual(response_report.status_code, 200)
        report_id = response_report.json()["report_id"]

        # 3. Verify that routing is still standard because the report is NOT yet verified
        response_route2 = self.client.post(
            "/api/v1/routing/route",
            json={"origin": "Guwahati", "destination": "Aizawl", "alpha": 0.5}
        )
        self.assertEqual(response_route2.json()["total_distance_km"], dist1)

        # 4. Verify the report by District Admin (sets verified = True)
        response_verify = self.client.post(
            f"/api/v1/reports/{report_id}/verify",
            params={"verified": True}
        )
        self.assertEqual(response_verify.status_code, 200)

        # 5. Compute route from Guwahati to Aizawl again
        # The routing engine should now see the verified blockage on Shillong - Aizawl,
        # flag the edge as impassable, and enforce a detour!
        response_route3 = self.client.post(
            "/api/v1/routing/route",
            json={"origin": "Guwahati", "destination": "Aizawl", "alpha": 0.5}
        )
        self.assertEqual(response_route3.status_code, 200)
        res_route3 = response_route3.json()
        
        # Should set the alternative route triggers
        self.assertEqual(res_route3["status"], "BLOCKED")
        self.assertTrue(res_route3["alternative_available"])
        
        print("Success: Verified blockage correctly triggered alternative detour route!")

if __name__ == "__main__":
    unittest.main()
