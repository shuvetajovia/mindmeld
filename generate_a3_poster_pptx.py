# -*- coding: utf-8 -*-
"""
================================================================================
MINDMELD A3 CONFERENCE INFOGRAPHIC POSTER GENERATOR
================================================================================
Generates a professional A3-size (420 x 297 mm) landscape conference poster in
PPTX format using python-pptx, embedding all pre-computed metrics, figures,
and system architecture details.

USAGE:
    pip install python-pptx
    python generate_a3_poster_pptx.py

OUTPUT:
    MINDMELD_A3_Conference_Poster.pptx
================================================================================
"""

import os
import sys

try:
    from pptx import Presentation
    from pptx.util import Pt
    from pptx.dml.color import RGBColor
    from pptx.enum.text import PP_ALIGN
except ImportError:
    print("[ERROR] python-pptx not installed. Run:  pip install python-pptx")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Use raw integers (EMU) throughout -- avoids float/Cm division bugs
# ---------------------------------------------------------------------------
def cm(v):
    """Convert centimetres to EMU (integer)."""
    return int(round(v * 360000))

# ---------------------------------------------------------------------------
# Colour Palette
# ---------------------------------------------------------------------------
C_BG_DARK   = RGBColor(0x0F, 0x17, 0x2A)
C_BG_PANEL  = RGBColor(0x1E, 0x29, 0x3B)
C_BG_PANEL2 = RGBColor(0x0E, 0x3A, 0x5C)
C_ACCENT1   = RGBColor(0x02, 0x84, 0xC7)
C_ACCENT2   = RGBColor(0x0D, 0x94, 0x88)
C_ACCENT3   = RGBColor(0x7C, 0x3A, 0xED)
C_GOLD      = RGBColor(0xF5, 0x9E, 0x0B)
C_RED       = RGBColor(0xEF, 0x44, 0x44)
C_GREEN     = RGBColor(0x22, 0xC5, 0x5E)
C_WHITE     = RGBColor(0xFF, 0xFF, 0xFF)
C_LIGHT     = RGBColor(0xCB, 0xD5, 0xE1)
C_MUTED     = RGBColor(0x94, 0xA3, 0xB8)

# ---------------------------------------------------------------------------
# Layout (all in EMU)
# ---------------------------------------------------------------------------
A3_W     = cm(42.0)
A3_H     = cm(29.7)
MARGIN   = cm(0.55)
COL_GAP  = cm(0.35)
COL_W    = (A3_W - 2*MARGIN - 2*COL_GAP) // 3
COL1_X   = MARGIN
COL2_X   = MARGIN + COL_W + COL_GAP
COL3_X   = MARGIN + 2*(COL_W + COL_GAP)
HEADER_H = cm(3.10)
FOOTER_H = cm(0.85)
CTOP     = MARGIN + HEADER_H + cm(0.30)

# ---------------------------------------------------------------------------
# Drawing Primitives
# ---------------------------------------------------------------------------

def rect(slide, x, y, w, h, fill=None, lc=None, lw=0.0):
    s = slide.shapes.add_shape(1, int(x), int(y), int(max(cm(0.01), w)), int(max(cm(0.01), h)))
    if fill:
        s.fill.solid()
        s.fill.fore_color.rgb = fill
    else:
        s.fill.background()
    if lc and lw > 0:
        s.line.color.rgb = lc
        s.line.width = Pt(lw)
    else:
        s.line.fill.background()
    return s


def txt(slide, x, y, w, h, text, sz=10, bold=False, italic=False,
        color=None, align=PP_ALIGN.LEFT, wrap=True):
    tb = slide.shapes.add_textbox(int(x), int(y), int(max(cm(0.01), w)), int(max(cm(0.01), h)))
    tf = tb.text_frame
    tf.word_wrap = wrap
    p = tf.paragraphs[0]
    p.alignment = align
    r = p.add_run()
    r.text = str(text)
    r.font.size = Pt(sz)
    r.font.bold = bold
    r.font.italic = italic
    if color:
        r.font.color.rgb = color
    return tb


def hdr(slide, x, y, w, h, title, sub=None, bg=None, tc=None, sc=None, ts=9.0, ss=7.0):
    bg = bg or C_BG_PANEL2
    tc = tc or C_WHITE
    sc = sc or C_LIGHT
    rect(slide, x, y, w, h, fill=bg)
    txt(slide, x+cm(0.10), y+cm(0.03), w-cm(0.20), h-cm(0.06),
        title, sz=ts, bold=True, color=tc)
    if sub:
        txt(slide, x+cm(0.10), y+cm(0.38), w-cm(0.20), h-cm(0.40),
            sub, sz=ss, italic=True, color=sc)


def image(slide, path, x, y, w, h):
    if os.path.isfile(path):
        slide.shapes.add_picture(path, int(x), int(y), int(w), int(h))
    else:
        rect(slide, x, y, w, h, fill=C_BG_PANEL, lc=C_ACCENT1, lw=0.8)
        txt(slide, x, y+h//2-cm(0.25), w, cm(0.50),
            "[" + os.path.basename(path) + "]",
            sz=7, color=C_MUTED, align=PP_ALIGN.CENTER)


def pill(slide, x, y, w, h, label, val, vc=None, bg=None):
    bg = bg or C_BG_PANEL
    vc = vc or C_ACCENT1
    rect(slide, x, y, w, h, fill=bg, lc=C_ACCENT1, lw=0.5)
    txt(slide, x, y+cm(0.04), w, cm(0.34),
        label, sz=5.8, color=C_MUTED, align=PP_ALIGN.CENTER)
    txt(slide, x, y+cm(0.35), w, cm(0.55),
        val, sz=9.0, bold=True, color=vc, align=PP_ALIGN.CENTER)


# ===========================================================================
# MAIN POSTER BUILDER
# ===========================================================================

def build_poster():
    prs = Presentation()
    prs.slide_width  = A3_W
    prs.slide_height = A3_H
    slide = prs.slides.add_slide(prs.slide_layouts[6])

    # -----------------------------------------------------------------------
    # BACKGROUND
    # -----------------------------------------------------------------------
    rect(slide, 0, 0, A3_W, A3_H, fill=C_BG_DARK)
    rect(slide, 0, 0, A3_W, cm(0.22), fill=C_ACCENT1)

    # -----------------------------------------------------------------------
    # HEADER
    # -----------------------------------------------------------------------
    rect(slide, 0, cm(0.22), A3_W, HEADER_H-cm(0.22), fill=C_BG_PANEL2)
    rect(slide, 0, cm(0.22), cm(0.45), HEADER_H-cm(0.22), fill=C_ACCENT1)

    tb = slide.shapes.add_textbox(cm(0.70), cm(0.32), A3_W-cm(1.4), cm(1.38))
    tf = tb.text_frame; tf.word_wrap = False
    p = tf.paragraphs[0]; p.alignment = PP_ALIGN.LEFT
    r = p.add_run()
    r.text = ("AI-Driven Two-Tier Landslide Early Warning & Disaster Resilience Grid"
              "  for North-East India (NER)")
    r.font.size = Pt(17.0); r.font.bold = True; r.font.color.rgb = C_WHITE

    txt(slide, cm(0.70), cm(1.62), A3_W-cm(1.4), cm(0.52),
        ("XGBoost Two-Tier Stacking  |  Meta-Calibrator Fusion  |  "
         "Real-Time IoT Telemetry  |  InSAR Ground Deformation  |  "
         "Dijkstra Evacuation Routing  |  OASIS CAP v1.2 Multi-Lingual Alert"),
        sz=7.2, italic=True, color=C_ACCENT1)

    txt(slide, cm(0.70), cm(2.20), int(A3_W*0.62), cm(0.62),
        ("Dr. R. Rajmohan  |  Disaster Management Research Group, "
         "SRM Institute of Science & Technology  |  "
         "Coord: 20-30N, 88-98E  |  NH-10, NH-27, NH-29, NH-44"),
        sz=6.8, color=C_LIGHT)

    domains = ["Artificial Intelligence", "Geotechnical Eng.",
               "Satellite Remote Sensing", "Disaster Risk Reduction"]
    for i, d in enumerate(domains):
        col_d = C_ACCENT1 if i == 0 else C_BG_PANEL
        tag_x = A3_W - cm(8.4) + i*cm(2.08)
        rect(slide, tag_x, cm(2.22), cm(2.00), cm(0.50),
             fill=col_d, lc=C_ACCENT1, lw=0.5)
        txt(slide, tag_x, cm(2.24), cm(2.00), cm(0.46),
            d, sz=5.5, bold=(i==0), color=C_WHITE, align=PP_ALIGN.CENTER)

    # -----------------------------------------------------------------------
    # COLUMN 1
    # -----------------------------------------------------------------------
    c1x = COL1_X
    cy1 = CTOP

    hdr(slide, c1x, cy1, COL_W, cm(0.58),
        "Study Context & Problem Statement", bg=C_BG_PANEL2)
    cy1 += cm(0.62)

    txt(slide, c1x, cy1, COL_W, cm(2.05),
        ("North-East India reports >200 monsoon fatalities annually from landslides "
         "across 8 national highways. Existing threshold systems lack spatial "
         "specificity and probabilistic calibration.\n\n"
         "MINDMELD decouples static terrain susceptibility S(x) from dynamic "
         "hydro-geotechnical triggers T(x,t) via a two-tier XGBoost stacking "
         "architecture with a meta-calibrator fusion engine, producing calibrated "
         "P_fused mapped to 4 NDMA operational alert tiers."),
        sz=7.0, color=C_LIGHT)
    cy1 += cm(2.10)

    stats = [("Bounding Box", "20N-30N\n88E-98E"),
             ("8 NE States",  "Assam+7 states"),
             ("Dataset",      "1152 events\n2007-2019"),
             ("IoT Nodes",    "40-node grid")]
    pw = (COL_W - cm(0.06)*3) // 4
    for i, (lbl, val) in enumerate(stats):
        pill(slide, c1x+i*(pw+cm(0.02)), cy1, pw, cm(0.92),
             lbl, val, vc=C_ACCENT1)
    cy1 += cm(1.00)

    rect(slide, c1x, cy1, COL_W, cm(0.03), fill=C_ACCENT1)
    cy1 += cm(0.10)

    hdr(slide, c1x, cy1, COL_W, cm(0.55),
        "Two-Tier XGBoost Stacking Architecture",
        bg=RGBColor(0x0E, 0x2F, 0x4D))
    cy1 += cm(0.58)

    tiers = [
        ("TIER 1 - Static Susceptibility  S(x)",
         "Inputs: slope, elevation, aspect_sin, aspect_cos, curvature, dist_to_road_km\n"
         "XGBoost: n_est=180, max_depth=6, eta=0.30, lambda=1.0, seed=42\n"
         "Output: P_susc in [0,1]   |   Logit: zeta_1 = ln[P/(1-P)]",
         C_ACCENT1),
        ("TIER 2 - Dynamic Trigger  T(x,t)",
         "Inputs: rain_24h, rain_48h_prior, rain_72h, rain_7d, API_7d,\n"
         "        r24_seasonal_anom, api_seasonal_anom\n"
         "XGBoost: n_est=100, max_depth=6, eta=0.30, base_score=0.26\n"
         "Output: P_trig in [0,1]   |   Logit: zeta_2 = ln[P/(1-P)]",
         C_ACCENT2),
        ("META-CALIBRATOR - LR Fusion Engine",
         "Z = [zeta_1, zeta_2]^T   |   LR: L2 penalty, C=1.0, lbfgs\n"
         "P_fused = sigma(w0 + w1*zeta_1 + w2*zeta_2)   |   Threshold theta=0.35\n"
         "R_k = f(P_fused) -> NDMA {GREEN | YELLOW | ORANGE | RED}",
         C_ACCENT3),
    ]

    bh = cm(1.20)
    for ti, (lbl, desc, col) in enumerate(tiers):
        rect(slide, c1x, cy1, COL_W, bh, fill=C_BG_PANEL, lc=col, lw=1.0)
        rect(slide, c1x, cy1, cm(0.22), bh, fill=col)
        txt(slide, c1x+cm(0.28), cy1+cm(0.04), COL_W-cm(0.36), cm(0.32),
            lbl, sz=7.2, bold=True, color=col)
        txt(slide, c1x+cm(0.28), cy1+cm(0.35), COL_W-cm(0.36), cm(0.82),
            desc, sz=6.2, color=C_LIGHT)
        if ti < len(tiers)-1:
            rect(slide, c1x+COL_W//2-cm(0.06), cy1+bh, cm(0.12), cm(0.18), fill=C_GOLD)
        cy1 += bh + cm(0.22)

    cy1 += cm(0.05)
    hdr(slide, c1x, cy1, COL_W, cm(0.55),
        "Geotechnical Physics - Infinite Slope Factor of Safety",
        bg=RGBColor(0x14, 0x3D, 0x2E))
    cy1 += cm(0.58)

    formulas = [
        ("Terzaghi Effective Stress",
         "sigma_prime = (gamma_s*z - gamma_w*h_w)*cos^2(beta)"),
        ("Mohr-Coulomb Shear Strength",
         "tau_f = c_prime + sigma_prime * tan(phi_prime)"),
        ("Infinite Slope FS",
         "FS = [c_prime + (gamma_s*z - gamma_w*h_w)*cos^2(beta)*tan(phi_prime)]"
         " / [gamma_s*z*sin(beta)*cos(beta)]"),
        ("Critical Rainfall Depth h_w*",
         "h_w* = z - [c_prime/(gamma_w*cos^2(beta)*tan(phi_prime))]"
         " + [z*tan(beta)/tan(phi_prime)]"),
        ("Richards PDE (Transient Seepage)",
         "d(theta)/dt = d/dz[K(h)*(dh/dz + 1)] - S(z,t)"),
        ("Antecedent Precip Index",
         "API_t = SUM[k=0..n] P_(t-k) * exp(-k/tau)   [tau=7-day decay]"),
        ("Seasonal Anomaly",
         "Anom_t = (P_t - mu_clim(doy)) / sigma_clim(doy)"),
    ]

    fh_each = cm(0.70)
    for i, (lbl, eq) in enumerate(formulas):
        ry = cy1 + i*fh_each
        bgc = C_BG_PANEL if i%2==0 else RGBColor(0x16, 0x23, 0x36)
        rect(slide, c1x, ry, COL_W, fh_each-cm(0.02), fill=bgc, lc=C_ACCENT2, lw=0.3)
        txt(slide, c1x+cm(0.08), ry+cm(0.02), COL_W-cm(0.16), cm(0.26),
            lbl, sz=5.6, bold=True, color=C_ACCENT2)
        txt(slide, c1x+cm(0.08), ry+cm(0.27), COL_W-cm(0.16), cm(0.40),
            eq, sz=6.2, italic=True, color=C_LIGHT)
    cy1 += len(formulas)*fh_each + cm(0.15)

    hdr(slide, c1x, cy1, COL_W, cm(0.50),
        "TreeSHAP Global Dynamic Feature Attribution",
        bg=RGBColor(0x1A, 0x1E, 0x4D))
    cy1 += cm(0.53)
    fhg = cm(3.50)
    image(slide, "05_global_shap_importance.png", c1x, cy1, COL_W, fhg)
    txt(slide, c1x, cy1+fhg+cm(0.03), COL_W, cm(0.28),
        "Fig 6. Global TreeSHAP - rain_48h_prior dominates (34.70%)",
        sz=5.8, italic=True, color=C_MUTED, align=PP_ALIGN.CENTER)
    cy1 += fhg + cm(0.35)

    hdr(slide, c1x, cy1, COL_W, cm(0.50),
        "Calibrated Risk to NDMA Alert Tier Mapping",
        bg=RGBColor(0x2D, 0x16, 0x0C))
    cy1 += cm(0.53)
    fhm = cm(3.50)
    image(slide, "08_calibrated_risk_mapping.png", c1x, cy1, COL_W, fhm)
    txt(slide, c1x, cy1+fhm+cm(0.03), COL_W, cm(0.28),
        "Fig 7. P_fused -> R_k (1-10) -> NDMA {Green|Yellow|Orange|Red}  theta=0.35",
        sz=5.8, italic=True, color=C_MUTED, align=PP_ALIGN.CENTER)
    cy1 += fhm + cm(0.35)

    hdr(slide, c1x, cy1, COL_W, cm(0.50),
        "Hydro-Geotechnical Feature Correlation Matrix",
        bg=RGBColor(0x1A, 0x2D, 0x3A))
    cy1 += cm(0.53)
    fhc = cm(3.50)
    image(slide, "07_feature_correlation_matrix.png", c1x, cy1, COL_W, fhc)
    txt(slide, c1x, cy1+fhc+cm(0.03), COL_W, cm(0.28),
        "Fig 8. Pearson Correlation - Static + Dynamic Feature Matrix (13 vars)",
        sz=5.8, italic=True, color=C_MUTED, align=PP_ALIGN.CENTER)

    # -----------------------------------------------------------------------
    # COLUMN 2
    # -----------------------------------------------------------------------
    c2x = COL2_X
    cy2 = CTOP

    hdr(slide, c2x, cy2, COL_W, cm(0.60),
        "Performance Metrics Dashboard",
        sub="Holdout Test  |  Spatial Block OOF  |  LOYO Temporal",
        bg=C_BG_PANEL2, ts=9.0, ss=7.0)
    cy2 += cm(0.65)

    schemes = [
        ("Test Partition  (N=52)",
         [("Accuracy","94.23%",C_GREEN),("Precision","85.71%",C_ACCENT1),
          ("POD/Recall","92.31%",C_ACCENT2),("ROC-AUC","0.9803",C_ACCENT3),
          ("PR-AUC","0.9208",C_GOLD),("Brier","0.0410",C_MUTED)]),
        ("Spatial Block OOF  (N=346)",
         [("Accuracy","85.84%",C_GREEN),("Precision","75.95%",C_ACCENT1),
          ("POD/Recall","66.67%",C_ACCENT2),("ROC-AUC","0.8816",C_ACCENT3),
          ("PR-AUC","0.8177",C_GOLD),("Brier","0.0991",C_MUTED)]),
        ("LOYO Temporal  (N=346, 2007-2019)",
         [("Accuracy","71.10%",C_GREEN),("Precision","41.67%",C_ACCENT1),
          ("POD/Recall","27.78%",C_ACCENT2),("ROC-AUC","0.5925",C_ACCENT3),
          ("PR-AUC","0.3870",C_GOLD),("Brier","0.2176",C_MUTED)]),
    ]
    s_bgs = [C_BG_PANEL, RGBColor(0x0C, 0x25, 0x3A), C_BG_PANEL]

    for si, (slbl, sm) in enumerate(schemes):
        rect(slide, c2x, cy2, COL_W, cm(0.28), fill=s_bgs[si], lc=C_ACCENT1, lw=0.4)
        txt(slide, c2x+cm(0.08), cy2+cm(0.02), COL_W, cm(0.26),
            slbl, sz=6.8, bold=True, color=C_GOLD)
        cy2 += cm(0.30)
        pw2 = (COL_W - cm(0.05)*5) // 6
        for pi, (plbl, pval, pcol) in enumerate(sm):
            pill(slide, c2x+pi*(pw2+cm(0.01)), cy2, pw2, cm(0.88),
                 plbl, pval, vc=pcol, bg=s_bgs[si])
        cy2 += cm(0.92)

    cy2 += cm(0.08)
    hdr(slide, c2x, cy2, COL_W, cm(0.52),
        "Confusion Matrix - Test Partition (theta=0.35, N=52)",
        bg=RGBColor(0x0E, 0x2F, 0x4D))
    cy2 += cm(0.55)

    cm_data  = [["","Pred 0","Pred 1"],["Act 0","37","2"],["Act 1","1","12"]]
    cm_fill  = [[C_BG_PANEL2, C_BG_PANEL,               C_BG_PANEL],
                [C_BG_PANEL,  RGBColor(0x14,0x53,0x2D), RGBColor(0x7F,0x1D,0x1D)],
                [C_BG_PANEL,  RGBColor(0x7F,0x1D,0x1D), RGBColor(0x14,0x53,0x2D)]]
    cm_tc    = [[C_GOLD, C_LIGHT, C_LIGHT],
                [C_LIGHT, C_GREEN, C_RED],
                [C_LIGHT, C_RED,   C_GREEN]]
    cw_ = cm(1.45); ch_ = cm(0.50)
    cmx_ = c2x + (COL_W - 3*cw_)//2
    for ri in range(3):
        for ci in range(3):
            rect(slide, cmx_+ci*cw_, cy2+ri*ch_, cw_, ch_,
                 fill=cm_fill[ri][ci], lc=C_ACCENT1, lw=0.4)
            txt(slide, cmx_+ci*cw_, cy2+ri*ch_, cw_, ch_,
                cm_data[ri][ci],
                sz=8.5 if (ri>0 and ci>0) else 6.5,
                bold=(ri>0 and ci>0),
                color=cm_tc[ri][ci], align=PP_ALIGN.CENTER)
    cy2 += 3*ch_ + cm(0.12)

    legend_items = [("TP=12",C_GREEN),("TN=37",C_ACCENT2),
                    ("FP=2", C_RED), ("FN=1",  C_GOLD)]
    lw3 = (COL_W - cm(0.09)*3)//4
    for li, (lt, lc) in enumerate(legend_items):
        rect(slide, c2x+li*(lw3+cm(0.03)), cy2, lw3, cm(0.36),
             fill=C_BG_PANEL, lc=lc, lw=0.7)
        txt(slide, c2x+li*(lw3+cm(0.03)), cy2, lw3, cm(0.36),
            lt, sz=7.5, bold=True, color=lc, align=PP_ALIGN.CENTER)
    cy2 += cm(0.42)

    cy2 += cm(0.08)
    fhcm_ = cm(4.20)
    image(slide, "01_confusion_matrix.png", c2x, cy2, COL_W, fhcm_)
    txt(slide, c2x, cy2+fhcm_+cm(0.03), COL_W, cm(0.28),
        "Fig 1. Confusion Matrix Heatmap (Test N=52, theta=0.35)",
        sz=5.8, italic=True, color=C_MUTED, align=PP_ALIGN.CENTER)
    cy2 += fhcm_ + cm(0.35)

    fhroc = cm(4.20)
    image(slide, "02_roc_curve.png", c2x, cy2, COL_W, fhroc)
    txt(slide, c2x, cy2+fhroc+cm(0.03), COL_W, cm(0.28),
        "Fig 2. ROC Curve (AUC=0.9803) - Two-Tier Calibrated Model",
        sz=5.8, italic=True, color=C_MUTED, align=PP_ALIGN.CENTER)

    # -----------------------------------------------------------------------
    # COLUMN 3
    # -----------------------------------------------------------------------
    c3x = COL3_X
    cy3 = CTOP

    hdr(slide, c3x, cy3, COL_W, cm(0.60),
        "Global TreeSHAP Dynamic Feature Attribution",
        sub="Trigger Model - Mean |SHAP Value| ranking",
        bg=RGBColor(0x1A, 0x1E, 0x4D))
    cy3 += cm(0.65)

    shap_data = [
        ("rain_48h_prior",    1.8878, 34.70),
        ("r24_seasonal_anom", 0.8781, 16.14),
        ("rain_24h_obs",      0.7105, 13.06),
        ("rain_7d_prior",     0.6528, 12.00),
        ("api_seasonal_anom", 0.5773, 10.61),
        ("rain_72h_prior",    0.4913,  9.03),
        ("api_7d",            0.2419,  4.45),
    ]
    max_shap   = shap_data[0][1]
    bar_pool   = COL_W - cm(3.00)   # EMU available for bars
    bar_height = cm(0.44)
    bar_gap    = cm(0.07)

    for i, (feat, sv, pct) in enumerate(shap_data):
        ry = cy3 + i*(bar_height + bar_gap)
        bar_len = int((sv / max_shap) * bar_pool)
        bar_len = max(cm(0.05), bar_len)
        txt(slide, c3x, ry, cm(2.80), bar_height,
            feat, sz=6.5, color=C_LIGHT, align=PP_ALIGN.RIGHT)
        rect(slide, c3x+cm(2.85), ry+cm(0.05), bar_len, bar_height-cm(0.10), fill=C_ACCENT1)
        txt(slide, c3x+cm(2.85)+bar_len+cm(0.05), ry, cm(1.50), bar_height,
            f"{sv:.4f} ({pct:.1f}%)", sz=6.0, color=C_GOLD)
    cy3 += len(shap_data)*(bar_height+bar_gap) + cm(0.20)

    hdr(slide, c3x, cy3, COL_W, cm(0.52),
        "Precision-Recall & Calibration Reliability Curves",
        bg=RGBColor(0x1A, 0x1E, 0x4D))
    cy3 += cm(0.55)
    fhpr = cm(3.70)
    halfw = (COL_W - cm(0.15))//2
    image(slide, "03_precision_recall_curve.png",   c3x,           cy3, halfw, fhpr)
    image(slide, "04_calibration_reliability_curve.png", c3x+halfw+cm(0.15), cy3, halfw, fhpr)
    txt(slide, c3x, cy3+fhpr+cm(0.03), halfw, cm(0.28),
        "Fig 3. PR Curve (AUC=0.9208)",
        sz=5.8, italic=True, color=C_MUTED, align=PP_ALIGN.CENTER)
    txt(slide, c3x+halfw+cm(0.15), cy3+fhpr+cm(0.03), halfw, cm(0.28),
        "Fig 4. Reliability (Brier=0.0410)",
        sz=5.8, italic=True, color=C_MUTED, align=PP_ALIGN.CENTER)
    cy3 += fhpr + cm(0.38)

    hdr(slide, c3x, cy3, COL_W, cm(0.55),
        "Leave-One-Year-Out Temporal Validation (2007-2019)",
        bg=RGBColor(0x0E, 0x3A, 0x2F))
    cy3 += cm(0.58)

    loyo_rows = [
        ["Year","N","Acc%","Prec%","POD%","FAR%","AUC"],
        ["2007","12","66.67","0.00","0.00","100.0","0.222"],
        ["2013","4","75.00","0.00","0.00","0.00","1.000"],
        ["2014","21","52.38","0.00","0.00","100.0","0.378"],
        ["2016","20","75.00","0.00","0.00","0.00","0.400"],
        ["2018","277","64.62","23.53","16.90","76.47","0.564"],
        ["2019","12","66.67","33.33","33.33","66.67","0.296"],
        ["MEAN","346","71.10","41.67","27.78","58.33","0.593"],
    ]
    nc = len(loyo_rows[0])
    cw_fixed = [cm(0.80), cm(0.60)]
    cw_eq    = (COL_W - cm(0.80) - cm(0.60)) // (nc-2)
    col_ws   = cw_fixed + [cw_eq]*(nc-2)
    rht = cm(0.40)

    for ri, row in enumerate(loyo_rows):
        ry = cy3 + ri*rht
        ishdr = (ri==0); istot = (ri==len(loyo_rows)-1); is18 = (ri==5)
        for ci, cell in enumerate(row):
            cx_c = c3x + sum(col_ws[:ci])
            if ishdr:
                bgc=C_ACCENT1; txc=C_WHITE; fsz=6.5; bld=True
            elif istot:
                bgc=C_BG_PANEL2; txc=C_GOLD; fsz=6.5; bld=True
            elif is18:
                bgc=RGBColor(0x1C,0x1C,0x00); txc=C_GOLD; fsz=6.0; bld=False
            elif ri%2==0:
                bgc=C_BG_PANEL; txc=C_LIGHT; fsz=6.0; bld=False
            else:
                bgc=RGBColor(0x16,0x23,0x36); txc=C_LIGHT; fsz=6.0; bld=False
            rect(slide, cx_c, ry, col_ws[ci], rht,
                 fill=bgc, lc=C_BG_DARK, lw=0.3)
            txt(slide, cx_c, ry, col_ws[ci], rht,
                cell, sz=fsz, bold=bld, color=txc, align=PP_ALIGN.CENTER)
    cy3 += len(loyo_rows)*rht + cm(0.12)

    fhloyo = cm(3.50)
    image(slide, "06_loyo_temporal_validation.png", c3x, cy3, COL_W, fhloyo)
    txt(slide, c3x, cy3+fhloyo+cm(0.03), COL_W, cm(0.28),
        "Fig 5. LOYO Multi-Year Accuracy Bar (Mean=71.10%)",
        sz=5.8, italic=True, color=C_MUTED, align=PP_ALIGN.CENTER)
    cy3 += fhloyo + cm(0.35)

    hdr(slide, c3x, cy3, COL_W, cm(0.52),
        "Real-Time System Components",
        bg=RGBColor(0x1A, 0x0E, 0x3D))
    cy3 += cm(0.55)

    components = [
        ("Sentinel-1A InSAR",
         "C-Band SAR  |  LOS ~1-3 mm\nInterferogramme unwrapping"),
        ("40-Node IoT Grid",
         "Piezometers + MEMS IPI\nAsyncIO FastAPI @ 5-min poll"),
        ("Dijkstra EV-Router",
         "NetworkX multigraph G=(V,E,W)\nC_risk = 100*P^2 + 10*P + 1"),
        ("CAP v1.2 Alerts",
         "OASIS XML/JSON + Haversine\n8-language SMS broadcast engine"),
    ]
    compw = (COL_W - cm(0.12))//2
    comph = cm(1.05)
    for ci2, (ctitle, cdesc) in enumerate(components):
        cx2 = c3x + (ci2%2)*(compw+cm(0.12))
        cy_c = cy3 + (ci2//2)*(comph+cm(0.10))
        ccol = [C_ACCENT1, C_ACCENT2, C_ACCENT3, C_GOLD][ci2]
        rect(slide, cx2, cy_c, compw, comph, fill=C_BG_PANEL, lc=ccol, lw=0.8)
        rect(slide, cx2, cy_c, compw, cm(0.22), fill=ccol)
        txt(slide, cx2, cy_c+cm(0.01), compw, cm(0.22),
            ctitle, sz=6.5, bold=True, color=C_WHITE, align=PP_ALIGN.CENTER)
        txt(slide, cx2+cm(0.08), cy_c+cm(0.24), compw-cm(0.16), comph-cm(0.28),
            cdesc, sz=6.0, color=C_LIGHT)

    # -----------------------------------------------------------------------
    # FOOTER
    # -----------------------------------------------------------------------
    fy = A3_H - FOOTER_H
    rect(slide, 0, fy, A3_W, FOOTER_H, fill=C_BG_PANEL2)
    rect(slide, 0, fy, A3_W, cm(0.06), fill=C_ACCENT1)
    txt(slide, MARGIN, fy+cm(0.12), A3_W//2, FOOTER_H-cm(0.10),
        ("AI-Driven Two-Tier Landslide EWS  |  Dr. R. Rajmohan  "
         "|  SRM Institute of Science & Technology"),
        sz=5.8, color=C_LIGHT)
    txt(slide, A3_W//2, fy+cm(0.12), A3_W//2-MARGIN, FOOTER_H-cm(0.10),
        ("Dataset: N=1,152 events (2007-2019)  "
         "|  Python 3.14 + XGBoost + scikit-learn + FastAPI  |  2026"),
        sz=5.8, color=C_MUTED, align=PP_ALIGN.RIGHT)

    # -----------------------------------------------------------------------
    # SAVE
    # -----------------------------------------------------------------------
    out = "MINDMELD_A3_Conference_Poster.pptx"
    prs.save(out)
    print(f"\nPoster saved: {os.path.abspath(out)}")
    print("Open in PowerPoint -> File -> Print -> A3 paper size")
    print("Or export via:       File -> Export -> Create PDF/XPS\n")


if __name__ == "__main__":
    build_poster()
