import os
import xgboost as xgb
import joblib
import numpy as np
import pandas as pd
import shap
import logging

logger = logging.getLogger(__name__)

# Resolve base paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
MODELS_DIR = os.path.join(BASE_DIR, "models")

class MLEngine:
    def __init__(self):
        self.susceptibility_model_path = os.path.join(MODELS_DIR, "landslide_susceptibility_model.json")
        self.trigger_model_path = os.path.join(MODELS_DIR, "landslide_trigger_model.json")
        self.calibrator_path = os.path.join(MODELS_DIR, "landslide_meta_calibrator.joblib")
        self.metadata_path = os.path.join(MODELS_DIR, "landslide_ews_metadata.joblib")
        
        self.susceptibility_model = None
        self.trigger_model = None
        self.calibrator = None
        self.metadata = None
        self.explainer = None
        
        self.load_models()
        self.init_explainer()

    def load_models(self):
        try:
            logger.info("Loading Landslide EWS models...")
            # Load metadata
            if os.path.exists(self.metadata_path):
                self.metadata = joblib.load(self.metadata_path)
            else:
                raise FileNotFoundError(f"Metadata file not found at {self.metadata_path}")
                
            # Load XGBoost susceptibility model
            if os.path.exists(self.susceptibility_model_path):
                self.susceptibility_model = xgb.Booster()
                self.susceptibility_model.load_model(self.susceptibility_model_path)
            else:
                raise FileNotFoundError(f"Susceptibility model not found at {self.susceptibility_model_path}")
                
            # Load XGBoost trigger model
            if os.path.exists(self.trigger_model_path):
                self.trigger_model = xgb.Booster()
                self.trigger_model.load_model(self.trigger_model_path)
            else:
                raise FileNotFoundError(f"Trigger model not found at {self.trigger_model_path}")
                
            # Load Logistic Regression meta calibrator
            if os.path.exists(self.calibrator_path):
                self.calibrator = joblib.load(self.calibrator_path)
            else:
                raise FileNotFoundError(f"Calibrator not found at {self.calibrator_path}")
                
            logger.info("All models loaded successfully.")
        except Exception as e:
            logger.error(f"Error loading models: {str(e)}")
            raise e

    def init_explainer(self):
        try:
            logger.info("Initializing SHAP explainer...")
            dataset_path = os.path.join(BASE_DIR, "two_tier_landslide_ews_dataset.csv")
            
            # Use background dataset if available to calibrate SHAP values
            if os.path.exists(dataset_path) and self.metadata:
                df = pd.read_csv(dataset_path)
                dynamic_feats = self.metadata["dynamic_features"]
                X_background = df[dynamic_feats]
                # Sample 100 records for background representation
                background_sample = X_background.sample(min(100, len(X_background)), random_state=42)
                self.explainer = shap.TreeExplainer(self.trigger_model, data=background_sample)
            else:
                self.explainer = shap.TreeExplainer(self.trigger_model)
                
            logger.info("SHAP explainer initialized successfully.")
        except Exception as e:
            logger.warning(f"Failed to initialize SHAP TreeExplainer: {str(e)}. Fallback to basic explainer.")
            # Fallback to simple tree explainer without background data
            try:
                self.explainer = shap.TreeExplainer(self.trigger_model)
            except Exception as ex:
                logger.error(f"Fallback SHAP explainer also failed: {str(ex)}")
                self.explainer = None

    def logit(self, p):
        # Clip probability to avoid divide-by-zero or log(0)
        p = np.clip(p, 1e-15, 1 - 1e-15)
        return np.log(p / (1 - p))

    def predict_risk(self, static_features: dict, dynamic_features: dict):
        """
        Computes 24h hazard failure probability using two-tier modeling & meta-calibration.
        Returns:
            dict containing susceptibility_prob, trigger_prob, fused_prob, risk_score, and alert_level.
        """
        if not self.susceptibility_model or not self.trigger_model or not self.calibrator or not self.metadata:
            raise RuntimeError("Models are not fully initialized.")

        # Ensure correct feature ordering
        s_ordered = [static_features[feat] for feat in self.metadata["susceptibility_features"]]
        t_ordered = [dynamic_features[feat] for feat in self.metadata["dynamic_features"]]

        # Predict susceptibility S(x)
        s_dmat = xgb.DMatrix(pd.DataFrame([s_ordered], columns=self.metadata["susceptibility_features"]))
        s_prob = float(self.susceptibility_model.predict(s_dmat)[0])

        # Predict trigger T(x,t)
        t_dmat = xgb.DMatrix(pd.DataFrame([t_ordered], columns=self.metadata["dynamic_features"]))
        t_prob = float(self.trigger_model.predict(t_dmat)[0])

        # Logit transformation
        logit_S = self.logit(s_prob)
        logit_T = self.logit(t_prob)

        # Meta-calibration
        cal_input = pd.DataFrame({"logit_S": [logit_S], "logit_T": [logit_T]})
        fused_prob = float(self.calibrator.predict_proba(cal_input)[0, 1])

        # Map to 1-10 Risk Scale
        risk_score = self.map_probability_to_risk(fused_prob)
        alert_level, alert_color = self.get_alert_metadata(risk_score)

        return {
            "susceptibility_prob": s_prob,
            "trigger_prob": t_prob,
            "fused_prob": fused_prob,
            "risk_score": risk_score,
            "alert_level": alert_level,
            "alert_color": alert_color
        }

    def map_probability_to_risk(self, prob: float) -> int:
        """
        Maps the 0-1 probability range to a 1-10 integer risk scale.
        Ensures alignment with Orange Alert (P >= 0.65 / Risk >= 7)
        and Red Alert (P >= 0.85 / Risk >= 9).
        """
        if prob < 0.1:
            risk = max(1, int(round(prob * 10)))
        elif prob < 0.35:
            # Map [0.1, 0.35) -> [2, 3]
            risk = 2 + int((prob - 0.1) / 0.25 * 2)
        elif prob < 0.65:
            # Map [0.35, 0.65) -> [4, 6]
            risk = 4 + int((prob - 0.35) / 0.3 * 3)
        elif prob < 0.85:
            # Map [0.65, 0.85) -> [7, 8]
            risk = 7 + int((prob - 0.65) / 0.2 * 2)
        else:
            # Map [0.85, 1.0] -> [9, 10]
            risk = 9 + int((prob - 0.85) / 0.15 * 2)
        return int(max(1, min(10, risk)))

    def get_alert_metadata(self, risk_score: int):
        """
        Maps risk score to color and level.
        1-3: Low (Green Baseline)
        4-6: Moderate (Yellow Advisory)
        7-8: High (Orange Alert)
        9-10: Critical (Red Alert)
        """
        if risk_score <= 3:
            return "LOW (GREEN BASELINE)", "green"
        elif risk_score <= 6:
            return "MODERATE (YELLOW ADVISORY)", "yellow"
        elif risk_score <= 8:
            return "HIGH (ORANGE ALERT)", "orange"
        else:
            return "CRITICAL (RED ALERT)", "red"

    def explain_trigger(self, dynamic_features: dict) -> dict:
        """
        Computes SHAP feature importance for the trigger model.
        Returns a dict of feature names and their corresponding SHAP values.
        """
        if not self.explainer or not self.metadata:
            return {feat: 0.0 for feat in self.metadata.get("dynamic_features", [])}

        try:
            t_ordered = [dynamic_features[feat] for feat in self.metadata["dynamic_features"]]
            df_single = pd.DataFrame([t_ordered], columns=self.metadata["dynamic_features"])
            
            # Predict SHAP values
            shap_output = self.explainer(df_single)
            vals = shap_output.values[0]
            
            # Handle multi-class shap output formatting (XGBoost can sometimes return 3D array for binary models)
            if len(vals.shape) > 1:
                vals = vals[:, 1]
                
            explanation = {feat: float(val) for feat, val in zip(self.metadata["dynamic_features"], vals)}
            return explanation
        except Exception as e:
            logger.error(f"Error computing SHAP values: {str(e)}")
            # Fallback to feature importance scaling
            return {feat: 0.0 for feat in self.metadata["dynamic_features"]}

# Global Singleton MLEngine Instance
ml_engine = MLEngine()
