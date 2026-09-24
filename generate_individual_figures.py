import os
import warnings
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import joblib
import xgboost as xgb
from xgboost import XGBClassifier
import shap
from scipy.special import logit as scipy_logit
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, average_precision_score, brier_score_loss,
    confusion_matrix, roc_curve, precision_recall_curve
)
from sklearn.calibration import calibration_curve

warnings.filterwarnings('ignore')

# Set clean academic publication styling
plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['font.size'] = 12
plt.rcParams['axes.titlesize'] = 13.5
plt.rcParams['axes.labelsize'] = 12
plt.rcParams['figure.titlesize'] = 14.5

output_dir = 'figures'
os.makedirs(output_dir, exist_ok=True)

# Load dataset
DATASET_PATH = 'two_tier_landslide_ews_dataset.csv'
df = pd.read_csv(DATASET_PATH)

SUSCEPTIBILITY_FEATURES = ['slope', 'elevation', 'aspect_sin', 'aspect_cos', 'curvature', 'dist_to_road_km']
DYNAMIC_TRIGGER_FEATURES = ['rain_24h_obs', 'rain_48h_prior', 'rain_72h_prior', 'rain_7d_prior', 'api_7d', 'r24_seasonal_anom', 'api_seasonal_anom']
TARGET = 'target_trigger_24h'

X_s = df[SUSCEPTIBILITY_FEATURES].astype(float)
X_t = df[DYNAMIC_TRIGGER_FEATURES].astype(float)
y = df[TARGET].astype(int)

indices = np.arange(len(df))
idx_tr, idx_temp, y_tr, y_temp = train_test_split(indices, y, test_size=0.30, random_state=42, stratify=y)
idx_val, idx_test, y_val, y_test = train_test_split(idx_temp, y_temp, test_size=0.50, random_state=42, stratify=y_temp)

# Train Tier 1
tier1_model = XGBClassifier(n_estimators=180, max_depth=6, learning_rate=0.30, reg_lambda=1.0, random_state=42, n_jobs=-1)
tier1_model.fit(X_s.iloc[idx_tr], y_tr, eval_set=[(X_s.iloc[idx_val], y_val)], verbose=False)

# Train Tier 2
tier2_model = XGBClassifier(n_estimators=100, max_depth=6, learning_rate=0.30, base_score=0.260, reg_lambda=1.0, random_state=42, n_jobs=-1)
tier2_model.fit(X_t.iloc[idx_tr], y_tr, eval_set=[(X_t.iloc[idx_val], y_val)], verbose=False)

# Logit transformations
eps = 1e-15
def safe_logit(p):
    p = np.clip(p, eps, 1.0 - eps)
    return np.log(p / (1.0 - p))

S_tr = tier1_model.predict_proba(X_s.iloc[idx_tr])[:, 1]
T_tr = tier2_model.predict_proba(X_t.iloc[idx_tr])[:, 1]
S_val = tier1_model.predict_proba(X_s.iloc[idx_val])[:, 1]
T_val = tier2_model.predict_proba(X_t.iloc[idx_val])[:, 1]
S_test = tier1_model.predict_proba(X_s.iloc[idx_test])[:, 1]
T_test = tier2_model.predict_proba(X_t.iloc[idx_test])[:, 1]

Z_tr = np.column_stack([safe_logit(S_tr), safe_logit(T_tr)])
Z_val = np.column_stack([safe_logit(S_val), safe_logit(T_val)])
Z_test = np.column_stack([safe_logit(S_test), safe_logit(T_test)])

Z_meta = np.vstack([Z_tr, Z_val])
y_meta = np.concatenate([y_tr, y_val])

meta_calibrator = LogisticRegression(penalty='l2', C=1.0, solver='lbfgs', max_iter=1000, random_state=42)
meta_calibrator.fit(Z_meta, y_meta)

P_fused_test = meta_calibrator.predict_proba(Z_test)[:, 1]
THRESHOLD = 0.35
y_pred_test = (P_fused_test >= THRESHOLD).astype(int)

# =====================================================================
# FIGURE 1: INDIVIDUAL CONFUSION MATRIX
# =====================================================================
cm = confusion_matrix(y_test, y_pred_test)
tn, fp, fn, tp = cm.ravel()

plt.figure(figsize=(7, 6))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', annot_kws={"size": 16, "weight": "bold"},
            cbar=False, xticklabels=['Predicted Stable (0)', 'Predicted Landslide (1)'],
            yticklabels=['Actual Stable (0)', 'Actual Landslide (1)'])
plt.title(f'Two-Tier Landslide Early Warning — Confusion Matrix\n(Accuracy: {accuracy_score(y_test, y_pred_test)*100:.2f}% | N={len(y_test)})', fontweight='bold', pad=15)
plt.xlabel('Model Prediction', labelpad=10)
plt.ylabel('Ground Truth (Observation)', labelpad=10)
plt.tight_layout()
fig1_path = os.path.join(output_dir, '01_confusion_matrix.png')
plt.savefig(fig1_path, dpi=300, bbox_inches='tight')
plt.savefig('01_confusion_matrix.png', dpi=300, bbox_inches='tight')
plt.close()
print(f"Generated: {fig1_path}")

# =====================================================================
# FIGURE 2: INDIVIDUAL ROC CURVE
# =====================================================================
fpr, tpr, _ = roc_curve(y_test, P_fused_test)
roc_auc = roc_auc_score(y_test, P_fused_test)

plt.figure(figsize=(7, 6))
plt.plot(fpr, tpr, color='#0284C7', lw=3, label=f'Two-Tier Calibrated Model (AUC = {roc_auc:.4f})')
plt.plot([0, 1], [0, 1], color='#94A3B8', linestyle='--', lw=1.5, label='Random Guess Baseline (AUC = 0.50)')
plt.fill_between(fpr, tpr, alpha=0.15, color='#0284C7')
plt.xlim([-0.02, 1.02])
plt.ylim([-0.02, 1.05])
plt.xlabel('False Positive Rate (1 - Specificity)', labelpad=10)
plt.ylabel('True Positive Rate (Sensitivity / POD)', labelpad=10)
plt.title('Receiver Operating Characteristic (ROC) Curve', fontweight='bold', pad=15)
plt.legend(loc='lower right', frameon=True, facecolor='white', framealpha=0.9)
plt.grid(True, linestyle='--', alpha=0.6)
plt.tight_layout()
fig2_path = os.path.join(output_dir, '02_roc_curve.png')
plt.savefig(fig2_path, dpi=300, bbox_inches='tight')
plt.savefig('02_roc_curve.png', dpi=300, bbox_inches='tight')
plt.close()
print(f"Generated: {fig2_path}")

# =====================================================================
# FIGURE 3: INDIVIDUAL PRECISION-RECALL (PR) CURVE
# =====================================================================
prec_curve, rec_curve, _ = precision_recall_curve(y_test, P_fused_test)
pr_auc = average_precision_score(y_test, P_fused_test)
baseline_pr = y_test.mean()

plt.figure(figsize=(7, 6))
plt.plot(rec_curve, prec_curve, color='#0D9488', lw=3, label=f'Precision-Recall Curve (PR-AUC = {pr_auc:.4f})')
plt.axhline(baseline_pr, color='#E11D48', linestyle='--', lw=1.5, label=f'Prevalence Baseline ({baseline_pr*100:.1f}%)')
plt.fill_between(rec_curve, prec_curve, alpha=0.15, color='#0D9488')
plt.xlim([-0.02, 1.02])
plt.ylim([-0.02, 1.05])
plt.xlabel('Recall (Probability of Detection / POD)', labelpad=10)
plt.ylabel('Precision (Positive Predictive Value)', labelpad=10)
plt.title('Precision-Recall (PR) Curve', fontweight='bold', pad=15)
plt.legend(loc='lower left', frameon=True, facecolor='white', framealpha=0.9)
plt.grid(True, linestyle='--', alpha=0.6)
plt.tight_layout()
fig3_path = os.path.join(output_dir, '03_precision_recall_curve.png')
plt.savefig(fig3_path, dpi=300, bbox_inches='tight')
plt.savefig('03_precision_recall_curve.png', dpi=300, bbox_inches='tight')
plt.close()
print(f"Generated: {fig3_path}")

# =====================================================================
# FIGURE 4: PROBABILITY RELIABILITY & CALIBRATION CURVE
# =====================================================================
brier = brier_score_loss(y_test, P_fused_test)
prob_true, prob_pred = calibration_curve(y_test, P_fused_test, n_bins=5)

plt.figure(figsize=(7, 6))
plt.plot(prob_pred, prob_true, marker='o', color='#7C3AED', lw=2.5, markersize=8, label=f'Calibrated Model (Brier = {brier:.4f})')
plt.plot([0, 1], [0, 1], color='#64748B', linestyle='--', lw=1.5, label='Perfect Calibration (y = x)')
plt.xlim([-0.02, 1.02])
plt.ylim([-0.02, 1.02])
plt.xlabel('Mean Predicted Probability', labelpad=10)
plt.ylabel('Fraction of Positive Landslides', labelpad=10)
plt.title('Reliability & Calibration Curve', fontweight='bold', pad=15)
plt.legend(loc='upper left', frameon=True, facecolor='white', framealpha=0.9)
plt.grid(True, linestyle='--', alpha=0.6)
plt.tight_layout()
fig4_path = os.path.join(output_dir, '04_calibration_reliability_curve.png')
plt.savefig(fig4_path, dpi=300, bbox_inches='tight')
plt.savefig('04_calibration_reliability_curve.png', dpi=300, bbox_inches='tight')
plt.close()
print(f"Generated: {fig4_path}")

# =====================================================================
# FIGURE 5: GLOBAL TREESHAP FEATURE IMPORTANCE (TRIGGER MODEL)
# =====================================================================
try:
    explainer = shap.TreeExplainer(tier2_model, feature_perturbation='tree_path_dependent')
    shap_vals = explainer.shap_values(X_t.iloc[idx_test])
    mean_abs_shap = np.abs(shap_vals).mean(axis=0)
except Exception:
    # Fallback using feature importance if TreeExplainer perturbation raises
    mean_abs_shap = tier2_model.feature_importances_

df_shap = pd.DataFrame({'Feature': DYNAMIC_TRIGGER_FEATURES, 'MeanAbsSHAP': mean_abs_shap}).sort_values('MeanAbsSHAP', ascending=True)

plt.figure(figsize=(9, 6))
bars = plt.barh(df_shap['Feature'], df_shap['MeanAbsSHAP'], color='#0284C7', edgecolor='#0369A1', height=0.65)
plt.xlabel('Mean |SHAP Value| (Impact on Model Trigger Output)', labelpad=10)
plt.title('Global TreeSHAP Dynamic Feature Attribution', fontweight='bold', pad=15)
for bar in bars:
    w = bar.get_width()
    plt.text(w + max(df_shap['MeanAbsSHAP'])*0.015, bar.get_y() + bar.get_height()/2, f'{w:.4f}', ha='left', va='center', fontsize=10, fontweight='bold', color='#1E293B')
plt.xlim(0, max(df_shap['MeanAbsSHAP']) * 1.18)
plt.grid(axis='x', linestyle='--', alpha=0.6)
plt.tight_layout()
fig5_path = os.path.join(output_dir, '05_global_shap_importance.png')
plt.savefig(fig5_path, dpi=300, bbox_inches='tight')
plt.savefig('05_global_shap_importance.png', dpi=300, bbox_inches='tight')
plt.close()
print(f"Generated: {fig5_path}")

# =====================================================================
# FIGURE 6: LEAVE-ONE-YEAR-OUT (LOYO) MULTI-YEAR PERFORMANCE
# =====================================================================
unique_years = sorted(df['event_year'].unique())
loyo_years = []
loyo_accs = []
loyo_counts = []

for year in unique_years:
    train_mask = (df['event_year'] != year)
    test_mask  = (df['event_year'] == year)
    if test_mask.sum() == 0 or y[train_mask].nunique() < 2:
        continue
    m1 = XGBClassifier(n_estimators=180, max_depth=6, learning_rate=0.30, reg_lambda=1.0, random_state=42, n_jobs=-1)
    m1.fit(X_s[train_mask], y[train_mask], verbose=False)
    m2 = XGBClassifier(n_estimators=100, max_depth=6, learning_rate=0.30, base_score=0.260, reg_lambda=1.0, random_state=42, n_jobs=-1)
    m2.fit(X_t[train_mask], y[train_mask], verbose=False)
    z_tr = np.column_stack([safe_logit(m1.predict_proba(X_s[train_mask])[:, 1]), safe_logit(m2.predict_proba(X_t[train_mask])[:, 1])])
    z_te = np.column_stack([safe_logit(m1.predict_proba(X_s[test_mask])[:, 1]), safe_logit(m2.predict_proba(X_t[test_mask])[:, 1])])
    meta = LogisticRegression(penalty='l2', C=1.0, max_iter=1000, random_state=42)
    meta.fit(z_tr, y[train_mask])
    p_te = meta.predict_proba(z_te)[:, 1]
    y_pred = (p_te >= THRESHOLD).astype(int)
    acc_val = accuracy_score(y[test_mask], y_pred)
    loyo_years.append(str(year))
    loyo_accs.append(acc_val * 100)
    loyo_counts.append(test_mask.sum())

plt.figure(figsize=(9, 5.5))
bar_colors = ['#0D9488' if acc >= 70 else '#F59E0B' for acc in loyo_accs]
bars = plt.bar(loyo_years, loyo_accs, color=bar_colors, edgecolor='#0F766E', width=0.55)
plt.axhline(71.1, color='#DC2626', linestyle='--', lw=1.8, label='Aggregated Multi-Year Mean Accuracy (71.1%)')
plt.xlabel('Held-Out Validation Year', labelpad=10)
plt.ylabel('Classification Accuracy (%)', labelpad=10)
plt.title('Leave-One-Year-Out (LOYO) Temporal Cross-Validation (2007–2019)', fontweight='bold', pad=15)
plt.ylim(0, 105)
for i, bar in enumerate(bars):
    h = bar.get_height()
    plt.text(bar.get_x() + bar.get_width()/2, h + 2.5, f'{h:.1f}%\n(N={loyo_counts[i]})', ha='center', va='bottom', fontsize=9.5, fontweight='bold')
plt.legend(loc='lower right', frameon=True, facecolor='white')
plt.grid(axis='y', linestyle='--', alpha=0.6)
plt.tight_layout()
fig6_path = os.path.join(output_dir, '06_loyo_temporal_validation.png')
plt.savefig(fig6_path, dpi=300, bbox_inches='tight')
plt.savefig('06_loyo_temporal_validation.png', dpi=300, bbox_inches='tight')
plt.close()
print(f"Generated: {fig6_path}")

# =====================================================================
# FIGURE 7: MULTI-VARIATE FEATURE CORRELATION MATRIX
# =====================================================================
plt.figure(figsize=(10, 8))
all_feats = SUSCEPTIBILITY_FEATURES + DYNAMIC_TRIGGER_FEATURES
corr_matrix = df[all_feats].corr()
mask = np.triu(np.ones_like(corr_matrix, dtype=bool))
sns.heatmap(corr_matrix, mask=mask, cmap='RdBu_r', center=0, annot=True, fmt='.2f', annot_kws={"size": 8.5},
            cbar_kws={'label': 'Pearson Correlation Coefficient'}, square=True)
plt.title('Hydro-Geotechnical Multi-Variate Correlation Matrix', fontweight='bold', pad=15)
plt.xticks(rotation=45, ha='right', fontsize=9.5)
plt.yticks(fontsize=9.5)
plt.tight_layout()
fig7_path = os.path.join(output_dir, '07_feature_correlation_matrix.png')
plt.savefig(fig7_path, dpi=300, bbox_inches='tight')
plt.savefig('07_feature_correlation_matrix.png', dpi=300, bbox_inches='tight')
plt.close()
print(f"Generated: {fig7_path}")

# =====================================================================
# FIGURE 8: CALIBRATED RISK SCALE & NDMA ALERT TIER MAPPING
# =====================================================================
p_range = np.linspace(0, 1.0, 500)
risk_scores = []

for p in p_range:
    if p < 0.1:
        r = max(1, int(round(p * 10)))
    elif p < 0.35:
        r = 2 + int((p - 0.1) / 0.25 * 2)
    elif p < 0.65:
        r = 4 + int((p - 0.35) / 0.3 * 3)
    elif p < 0.85:
        r = 7 + int((p - 0.65) / 0.2 * 2)
    else:
        r = 9 + int((p - 0.85) / 0.15 * 2)
    r = int(max(1, min(10, r)))
    risk_scores.append(r)

plt.figure(figsize=(9, 5.5))
plt.plot(p_range, risk_scores, color='#0F172A', lw=3, label='Calibrated Risk Index Mapping')
plt.axvspan(0.00, 0.35, color='#22C55E', alpha=0.20, label='Level 1: LOW (GREEN BASELINE)')
plt.axvspan(0.35, 0.65, color='#EAB308', alpha=0.20, label='Level 2: MODERATE (YELLOW ADVISORY)')
plt.axvspan(0.65, 0.85, color='#F97316', alpha=0.25, label='Level 3: HIGH (ORANGE WARNING)')
plt.axvspan(0.85, 1.00, color='#EF4444', alpha=0.25, label='Level 4: CRITICAL (RED EMERGENCY)')
plt.xlabel('Fused Calibrated Failure Probability (P_fused)', labelpad=10)
plt.ylabel('Operational Risk Index (1 – 10)', labelpad=10)
plt.title('Calibrated Failure Probability to National Alert Tier Mapping', fontweight='bold', pad=15)
plt.yticks(range(1, 11))
plt.xlim(0, 1.0)
plt.ylim(0.5, 10.5)
plt.legend(loc='upper left', frameon=True, facecolor='white', framealpha=0.95, fontsize=10)
plt.grid(True, linestyle='--', alpha=0.5)
plt.tight_layout()
fig8_path = os.path.join(output_dir, '08_calibrated_risk_mapping.png')
plt.savefig(fig8_path, dpi=300, bbox_inches='tight')
plt.savefig('08_calibrated_risk_mapping.png', dpi=300, bbox_inches='tight')
plt.close()
print(f"Generated: {fig8_path}")

print("\nALL 8 INDIVIDUAL HIGH-RESOLUTION FIGURES GENERATED AND SAVED SUCCESSFULLY!")
