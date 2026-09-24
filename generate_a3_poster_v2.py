# -*- coding: utf-8 -*-
"""
================================================================================
MINDMELD  —  A3 CONFERENCE INFOGRAPHIC POSTER  (matplotlib edition)
================================================================================
Generates a premium A3-landscape poster at 150 Dpi → PNG + PDF.
    420 mm × 297 mm  @  150 dpi  =  2480 × 1754 pixels

USAGE:
    pip install matplotlib pillow
    python generate_a3_poster_v2.py

OUTPUTS:
    MINDMELD_A3_Poster.png  (3.7 MB, print-ready)
    MINDMELD_A3_Poster.pdf  (vector text on raster art)
================================================================================
"""

import os, sys, textwrap
os.environ.setdefault("MPLBACKEND", "Agg")
import warnings
warnings.filterwarnings("ignore")

try:
    import matplotlib
    import matplotlib.pyplot as plt
    import matplotlib.patches as mpatches
    import matplotlib.patheffects as pe
    from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Rectangle
    from matplotlib.gridspec import GridSpec
    from matplotlib.colors import LinearSegmentedColormap
    import numpy as np
except ImportError:
    print("[ERROR] pip install matplotlib numpy")
    sys.exit(1)

try:
    from PIL import Image
    PIL_OK = True
except ImportError:
    PIL_OK = False
    print("[WARN] Pillow not installed — figures will show placeholders")

# ============================================================
# CONFIG
# ============================================================
DPI     = 150
W_MM, H_MM = 420, 297
W_IN = W_MM / 25.4
H_IN = H_MM / 25.4

# Hex colours (all as 0-1 tuples for matplotlib)
def hx(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16)/255 for i in (0, 2, 4))

BG_DARK   = hx("0F172A")
BG_PANEL  = hx("1E293B")
BG_PANEL2 = hx("0E3A5C")
BG_MID    = hx("162336")
ACCENT1   = hx("0284C7")   # sky-blue
ACCENT2   = hx("0D9488")   # teal
ACCENT3   = hx("7C3AED")   # violet
GOLD      = hx("F59E0B")
RED       = hx("EF4444")
GREEN     = hx("22C55E")
WHITE     = hx("FFFFFF")
LIGHT     = hx("CBD5E1")
MUTED     = hx("94A3B8")

# ============================================================
# HELPERS
# ============================================================

def panel(ax, x, y, w, h, fc=None, ec=None, lw=0.8,
          radius=0.003, zorder=2):
    fc = fc or BG_PANEL
    ec = ec or BG_PANEL2
    p = FancyBboxPatch((x, y), w, h,
                       boxstyle=f"round,pad=0,rounding_size={radius}",
                       facecolor=fc, edgecolor=ec, linewidth=lw,
                       transform=ax.transAxes, zorder=zorder, clip_on=False)
    ax.add_patch(p)
    return p


def label(ax, x, y, text, size=9, color=WHITE, weight="normal",
          style="normal", ha="left", va="bottom", zorder=5,
          wrap_width=None, **kw):
    if wrap_width:
        text = "\n".join(textwrap.wrap(text, wrap_width))
    return ax.text(x, y, text, fontsize=size, color=color, fontweight=weight,
                   fontstyle=style, ha=ha, va=va, transform=ax.transAxes,
                   zorder=zorder, **kw)


def divider(ax, y, color=ACCENT1, lw=0.8, zorder=4):
    ax.axhline(y=y, color=color, linewidth=lw,
               transform=ax.transAxes, zorder=zorder)


def embed_fig(ax_host, path, x, y, w, h):
    """Embed a pre-saved PNG into the axes (axes-fraction coords)."""
    if not PIL_OK or not os.path.isfile(path):
        # placeholder
        sub = ax_host.inset_axes([x, y, w, h])
        sub.set_facecolor(BG_PANEL)
        sub.set_xticks([]); sub.set_yticks([])
        for s in sub.spines.values(): s.set_color(ACCENT1)
        sub.text(0.5, 0.5, os.path.basename(path),
                 color=MUTED, ha="center", va="center",
                 fontsize=7, transform=sub.transAxes)
        return sub
    img = np.array(Image.open(path).convert("RGBA"))
    sub = ax_host.inset_axes([x, y, w, h])
    sub.imshow(img, aspect="auto", interpolation="lanczos")
    sub.set_xticks([]); sub.set_yticks([])
    for s in sub.spines.values(): s.set_visible(False)
    return sub


def metric_card(ax, x, y, w, h, label_text, value, unit="",
                color=ACCENT1, bg=BG_PANEL, border=None):
    border = border or color
    p = FancyBboxPatch((x, y), w, h,
                       boxstyle="round,pad=0,rounding_size=0.004",
                       facecolor=bg, edgecolor=border, linewidth=1.0,
                       transform=ax.transAxes, zorder=3, clip_on=False)
    ax.add_patch(p)
    # top colour accent strip
    strip = FancyBboxPatch((x, y+h-h*0.18), w, h*0.18,
                           boxstyle="round,pad=0,rounding_size=0.003",
                           facecolor=color, edgecolor="none",
                           transform=ax.transAxes, zorder=4, clip_on=False)
    ax.add_patch(strip)
    cx = x + w/2
    ax.text(cx, y+h*0.55, value, fontsize=13.5, fontweight="bold",
            color=color, ha="center", va="center",
            transform=ax.transAxes, zorder=5)
    if unit:
        ax.text(cx, y+h*0.25, unit, fontsize=5.5, color=MUTED,
                ha="center", va="center", transform=ax.transAxes, zorder=5)
    ax.text(cx, y+h*0.88, label_text, fontsize=5.2, color=WHITE,
            ha="center", va="center", transform=ax.transAxes,
            fontweight="bold", zorder=6)


def tier_box(ax, x, y, w, h, title, body, color=ACCENT1):
    # main box
    p = FancyBboxPatch((x, y), w, h,
                       boxstyle="round,pad=0,rounding_size=0.003",
                       facecolor=BG_PANEL, edgecolor=color, linewidth=1.4,
                       transform=ax.transAxes, zorder=3, clip_on=False)
    ax.add_patch(p)
    # left colour stripe
    stripe = Rectangle((x, y), w*0.015, h,
                        facecolor=color, edgecolor="none",
                        transform=ax.transAxes, zorder=4, clip_on=False)
    ax.add_patch(stripe)
    ax.text(x+w*0.025, y+h*0.78, title, fontsize=7.0, fontweight="bold",
            color=color, va="center", transform=ax.transAxes, zorder=5)
    for i, line in enumerate(body):
        ax.text(x+w*0.025, y+h*0.52 - i*h*0.20, line,
                fontsize=5.8, color=LIGHT, va="center",
                transform=ax.transAxes, zorder=5, family="monospace")


# ============================================================
# BUILD POSTER
# ============================================================

def build():
    fig = plt.figure(figsize=(W_IN, H_IN), facecolor=BG_DARK, dpi=DPI)
    ax = fig.add_axes([0, 0, 1, 1], facecolor=BG_DARK)
    ax.set_xlim(0, 1); ax.set_ylim(0, 1)
    ax.set_xticks([]); ax.set_yticks([])
    for sp in ax.spines.values(): sp.set_visible(False)

    # --- accent top bar ---
    bar = Rectangle((0, 0.972), 1, 0.028,
                    facecolor=ACCENT1, edgecolor="none",
                    transform=ax.transAxes, zorder=10)
    ax.add_patch(bar)

    # --- header band ---
    header = Rectangle((0, 0.862), 1, 0.110,
                        facecolor=BG_PANEL2, edgecolor="none",
                        transform=ax.transAxes, zorder=2)
    ax.add_patch(header)

    # left accent stripe in header
    ax.add_patch(Rectangle((0, 0.862), 0.008, 0.110,
                            facecolor=ACCENT1, edgecolor="none",
                            transform=ax.transAxes, zorder=3))

    # main title
    ax.text(0.013, 0.944,
            "AI-Driven Two-Tier Landslide Early Warning &",
            fontsize=19, fontweight="bold", color=WHITE,
            va="center", transform=ax.transAxes, zorder=6)
    ax.text(0.013, 0.920,
            "Disaster Resilience Grid for North-East India (NER)",
            fontsize=19, fontweight="bold", color=WHITE,
            va="center", transform=ax.transAxes, zorder=6)

    # subtitle tag-line
    ax.text(0.013, 0.899,
            "XGBoost Two-Tier Stacking  •  Meta-Calibrator Fusion  •  "
            "Real-Time IoT Telemetry  •  InSAR Ground Deformation  •  "
            "Dijkstra Routing  •  OASIS CAP v1.2",
            fontsize=7.8, color=ACCENT1, style="italic",
            va="center", transform=ax.transAxes, zorder=6)

    # author line
    ax.text(0.013, 0.875,
            "Dr. R. Rajmohan   |   Disaster Management Research Group, "
            "SRM Institute of Science & Technology   |   "
            "20–30°N, 88–98°E   |   NH-10, NH-27, NH-29, NH-44",
            fontsize=6.8, color=LIGHT, va="center",
            transform=ax.transAxes, zorder=6)

    # domain pills (right side of header)
    domains = [("Artificial Intelligence", ACCENT1),
               ("Geotechnical Eng.", BG_PANEL),
               ("Satellite Remote Sensing", BG_PANEL),
               ("Disaster Risk Reduction", BG_PANEL)]
    for i, (d, fc) in enumerate(domains):
        px = 0.640 + i*0.090
        p = FancyBboxPatch((px, 0.880), 0.088, 0.036,
                           boxstyle="round,pad=0,rounding_size=0.003",
                           facecolor=fc, edgecolor=ACCENT1, linewidth=0.7,
                           transform=ax.transAxes, zorder=5)
        ax.add_patch(p)
        ax.text(px+0.044, 0.898, d, fontsize=5.2,
                color=WHITE, fontweight="bold" if i==0 else "normal",
                ha="center", va="center", transform=ax.transAxes, zorder=6)

    # ============================================================
    # LAYOUT — three columns
    # M = 0.012 margin, COL = 0.313 wide, GAP = 0.008
    # ============================================================
    M    = 0.012
    GAP  = 0.008
    CW   = (1 - 2*M - 2*GAP) / 3
    C1   = M
    C2   = M + CW + GAP
    C3   = M + 2*(CW + GAP)
    TOP  = 0.854          # content starts below header
    BOT  = 0.028          # above footer
    CH   = TOP - BOT      # total content height

    def cy(frac):          # fraction of content column height from bottom
        return BOT + frac * CH

    # ============================================================
    # COLUMN 1
    # ============================================================
    y = TOP

    # --- Section: Context ---
    SH = 0.022   # section header height
    panel(ax, C1, y-SH, CW, SH, fc=BG_PANEL2)
    ax.text(C1+0.005, y-SH*0.45, "① Study Context", fontsize=7.5,
            color=WHITE, fontweight="bold", va="center",
            transform=ax.transAxes, zorder=5)
    y -= SH + 0.005

    BODY_H = 0.082
    panel(ax, C1, y-BODY_H, CW, BODY_H, fc=BG_PANEL)
    context = (
        "North-East India records >200 fatalities per monsoon season "
        "from landslides across 8 national highways. Existing "
        "rainfall-threshold systems lack spatial specificity and "
        "probabilistic calibration.\n\n"
        "MINDMELD decouples static terrain susceptibility S(x) "
        "from dynamic hydro-geotechnical triggers T(x,t) using "
        "a novel two-tier XGBoost stacking architecture fused by "
        "a meta-calibrator, yielding calibrated P_fused ∈[0,1] "
        "mapped to 4 NDMA operational alert tiers."
    )
    ax.text(C1+0.006, y-0.008, context,
            fontsize=6.2, color=LIGHT, va="top", wrap=False,
            transform=ax.transAxes, zorder=5,
            multialignment="left",
            linespacing=1.55)
    y -= BODY_H + 0.006

    # --- 4-stat pills ---
    PW = (CW - 0.003*3) / 4
    PH = 0.048
    pills = [("Bounding Box", "20°N–30°N\n88°E–98°E", ACCENT1),
             ("NE States",    "8 States\nAssam +7",    ACCENT2),
             ("Dataset",      "1,152\nevents",          ACCENT3),
             ("IoT Nodes",    "40-Node\nGrid",          GOLD)]
    for i, (lbl, val, col) in enumerate(pills):
        px = C1 + i*(PW+0.003)
        p = FancyBboxPatch((px, y-PH), PW, PH,
                           boxstyle="round,pad=0,rounding_size=0.003",
                           facecolor=BG_PANEL, edgecolor=col, linewidth=1.0,
                           transform=ax.transAxes, zorder=3, clip_on=False)
        ax.add_patch(p)
        # top stripe
        ax.add_patch(FancyBboxPatch((px, y-PH*0.25), PW, PH*0.25,
                                    boxstyle="round,pad=0,rounding_size=0.002",
                                    facecolor=col, edgecolor="none",
                                    transform=ax.transAxes, zorder=4, clip_on=False))
        ax.text(px+PW/2, y-PH*0.62, val, fontsize=7.0, fontweight="bold",
                color=col, ha="center", va="center",
                transform=ax.transAxes, zorder=5, linespacing=1.4)
        ax.text(px+PW/2, y-PH*0.12, lbl, fontsize=5.0, color=WHITE,
                ha="center", va="center", fontweight="bold",
                transform=ax.transAxes, zorder=6)
    y -= PH + 0.010

    # --- Architecture diagram ---
    panel(ax, C1, y-SH, CW, SH, fc=hx("0E2F4D"))
    ax.text(C1+0.005, y-SH*0.45, "② Two-Tier XGBoost Stacking Architecture",
            fontsize=7.5, color=WHITE, fontweight="bold", va="center",
            transform=ax.transAxes, zorder=5)
    y -= SH + 0.004

    TIER_H = 0.072
    tiers_data = [
        ("TIER 1  —  Static Susceptibility  S(x)", ACCENT1,
         ["Inputs: slope, elevation, aspect_sin, aspect_cos,",
          "         curvature, dist_to_road_km",
          "n_est=180  max_depth=6  η=0.30  λ=1.0  seed=42",
          "Output: P_susc∈[0,1]   ζ₁ = ln[P/(1–P)]"]),
        ("TIER 2  —  Dynamic Trigger  T(x,t)", ACCENT2,
         ["Inputs: rain_24h, rain_48h_prior, rain_72h,",
          "         rain_7d, API_7d, r24_anom, api_anom",
          "n_est=100  max_depth=6  η=0.30  base_score=0.26",
          "Output: P_trig∈[0,1]   ζ₂ = ln[P/(1–P)]"]),
        ("META-CALIBRATOR  —  LR Fusion Engine", ACCENT3,
         ["Z = [ζ₁, ζ₂]ᵀ    L2-LR  C=1.0  lbfgs",
          "P_fused = σ(w₀ + w₁ζ₁ + w₂ζ₂)   θ = 0.35",
          "R_k = f(P_fused) → NDMA Alert Tier",
          "{GREEN | YELLOW | ORANGE | RED}"]),
    ]
    for ti, (title, col, lines) in enumerate(tiers_data):
        ty = y - ti*(TIER_H + 0.018)
        # box
        p = FancyBboxPatch((C1, ty-TIER_H), CW, TIER_H,
                           boxstyle="round,pad=0,rounding_size=0.003",
                           facecolor=BG_PANEL, edgecolor=col, linewidth=1.3,
                           transform=ax.transAxes, zorder=3, clip_on=False)
        ax.add_patch(p)
        # left stripe
        ax.add_patch(Rectangle((C1, ty-TIER_H), CW*0.012, TIER_H,
                                facecolor=col, edgecolor="none",
                                transform=ax.transAxes, zorder=4, clip_on=False))
        ax.text(C1+CW*0.020, ty-TIER_H*0.18, title,
                fontsize=6.8, fontweight="bold", color=col, va="center",
                transform=ax.transAxes, zorder=5)
        for li, line in enumerate(lines):
            ax.text(C1+CW*0.020, ty-TIER_H*0.38 - li*TIER_H*0.165,
                    line, fontsize=5.6, color=LIGHT, va="center",
                    transform=ax.transAxes, zorder=5, family="monospace")
        # arrow to next
        if ti < 2:
            ax.annotate("", xy=(C1+CW/2, ty-TIER_H-0.014),
                        xytext=(C1+CW/2, ty-TIER_H-0.001),
                        arrowprops=dict(arrowstyle="-|>", color=GOLD,
                                        lw=1.8, mutation_scale=10),
                        xycoords="axes fraction", textcoords="axes fraction",
                        zorder=6)
    y -= 3*TIER_H + 2*0.018 + 0.012

    # --- Geotechnical formulas ---
    panel(ax, C1, y-SH, CW, SH, fc=hx("143D2E"))
    ax.text(C1+0.005, y-SH*0.45, "③ Geotechnical Physics — Infinite Slope FS",
            fontsize=7.5, color=WHITE, fontweight="bold", va="center",
            transform=ax.transAxes, zorder=5)
    y -= SH + 0.003

    geo_formulas = [
        ("Terzaghi Effective Stress",
         "σ′ = (γₛ·z − γ_w·h_w)·cos²β"),
        ("Mohr-Coulomb Shear Strength",
         "τ_f = c′ + σ′·tan φ′"),
        ("Infinite Slope FS",
         "FS = [c′ + (γₛz−γ_w h_w)cos²β·tanφ′] / [γₛ·z·sinβ·cosβ]"),
        ("Critical Rainfall  h_w*",
         "h_w* = z − [c′/(γ_w cos²β tanφ′)] + [z tanβ/tanφ′]"),
        ("Richards PDE",
         "∂θ/∂t = ∂/∂z[K(h)(∂h/∂z+1)] − S(z,t)"),
        ("API Decay",
         "API_t = Σ P_{t-k}·exp(−k/τ)   [τ=7 days]"),
        ("Seasonal Anomaly",
         "Anom_t = (P_t − μ_clim(doy)) / σ_clim(doy)"),
    ]
    FH = 0.032
    for fi, (fname, feq) in enumerate(geo_formulas):
        fy_ = y - fi*FH
        bgc = BG_PANEL if fi%2==0 else BG_MID
        ax.add_patch(Rectangle((C1, fy_-FH+0.001), CW, FH-0.001,
                                facecolor=bgc, edgecolor=hx("0D9488"),
                                linewidth=0.3,
                                transform=ax.transAxes, zorder=3, clip_on=False))
        ax.text(C1+0.005, fy_-FH*0.30, fname,
                fontsize=5.4, color=ACCENT2, fontweight="bold", va="center",
                transform=ax.transAxes, zorder=5)
        ax.text(C1+0.005, fy_-FH*0.72, feq,
                fontsize=6.0, color=LIGHT, va="center", style="italic",
                transform=ax.transAxes, zorder=5)
    y -= len(geo_formulas)*FH + 0.012

    # Figure: SHAP
    panel(ax, C1, y-SH, CW, SH, fc=hx("1A1E4D"))
    ax.text(C1+0.005, y-SH*0.45, "⑩ TreeSHAP Attribution & Risk Mapping",
            fontsize=7.5, color=WHITE, fontweight="bold", va="center",
            transform=ax.transAxes, zorder=5)
    y -= SH + 0.003
    FIG_H = (y - BOT - 0.025) / 2
    embed_fig(ax, "05_global_shap_importance.png",
              C1, y-FIG_H, CW, FIG_H-0.004)
    ax.text(C1+CW/2, y-FIG_H+0.003,
            "Fig 6 · Global TreeSHAP  —  rain_48h_prior  34.70%",
            fontsize=5.4, color=MUTED, ha="center", va="bottom",
            transform=ax.transAxes, zorder=5, style="italic")
    y -= FIG_H + 0.003
    embed_fig(ax, "08_calibrated_risk_mapping.png",
              C1, BOT+0.010, CW, y-BOT-0.014)
    ax.text(C1+CW/2, BOT+0.006,
            "Fig 7 · P_fused → R_k (1–10) → NDMA {Green|Yellow|Orange|Red}",
            fontsize=5.4, color=MUTED, ha="center", va="bottom",
            transform=ax.transAxes, zorder=5, style="italic")

    # ============================================================
    # COLUMN 2
    # ============================================================
    y2 = TOP

    # --- BIG Metric Dashboard ---
    panel(ax, C2, y2-SH, CW, SH, fc=BG_PANEL2)
    ax.text(C2+0.005, y2-SH*0.45,
            "④ Performance Metrics Dashboard",
            fontsize=7.5, color=WHITE, fontweight="bold", va="center",
            transform=ax.transAxes, zorder=5)
    y2 -= SH + 0.004

    metric_schemes = [
        ("TEST PARTITION  (N = 52)",   ACCENT1,
         [("Accuracy",   "94.23%", GREEN),
          ("Precision",  "85.71%", ACCENT1),
          ("POD/Recall", "92.31%", ACCENT2),
          ("ROC-AUC",    "0.9803", ACCENT3),
          ("PR-AUC",     "0.9208", GOLD),
          ("Brier",      "0.0410", MUTED)]),
        ("SPATIAL BLOCK OOF  (N = 346)", ACCENT2,
         [("Accuracy",   "85.84%", GREEN),
          ("Precision",  "75.95%", ACCENT1),
          ("POD/Recall", "66.67%", ACCENT2),
          ("ROC-AUC",    "0.8816", ACCENT3),
          ("PR-AUC",     "0.8177", GOLD),
          ("Brier",      "0.0991", MUTED)]),
        ("LOYO TEMPORAL  (N = 346, 2007–2019)", GOLD,
         [("Accuracy",   "71.10%", GREEN),
          ("Precision",  "41.67%", ACCENT1),
          ("POD/Recall", "27.78%", ACCENT2),
          ("ROC-AUC",    "0.5925", ACCENT3),
          ("PR-AUC",     "0.3870", GOLD),
          ("Brier",      "0.2176", MUTED)]),
    ]
    SCHEME_H = 0.088
    PW2 = (CW - 0.002*5) / 6
    PH2 = 0.052
    s_bgs = [BG_PANEL, BG_MID, BG_PANEL]
    for si, (slbl, scol, smet) in enumerate(metric_schemes):
        sy = y2 - si*(SCHEME_H + 0.006)
        # scheme label
        ax.add_patch(Rectangle((C2, sy-0.018), CW, 0.018,
                                facecolor=s_bgs[si], edgecolor=scol,
                                linewidth=0.5,
                                transform=ax.transAxes, zorder=3, clip_on=False))
        ax.text(C2+0.005, sy-0.009, slbl,
                fontsize=6.5, color=GOLD, fontweight="bold", va="center",
                transform=ax.transAxes, zorder=5)
        # pills
        for pi, (plbl, pval, pcol) in enumerate(smet):
            px2 = C2 + pi*(PW2+0.002)
            p = FancyBboxPatch((px2, sy-0.018-PH2), PW2, PH2,
                               boxstyle="round,pad=0,rounding_size=0.003",
                               facecolor=s_bgs[si], edgecolor=pcol,
                               linewidth=0.7,
                               transform=ax.transAxes, zorder=3, clip_on=False)
            ax.add_patch(p)
            ax.text(px2+PW2/2, sy-0.018-PH2*0.38, pval,
                    fontsize=9.5, fontweight="bold", color=pcol,
                    ha="center", va="center", transform=ax.transAxes, zorder=5)
            ax.text(px2+PW2/2, sy-0.018-PH2*0.78, plbl,
                    fontsize=5.0, color=MUTED, ha="center", va="center",
                    transform=ax.transAxes, zorder=5)
    y2 -= 3*SCHEME_H + 2*0.006 + 0.006

    # --- Confusion Matrix ---
    panel(ax, C2, y2-SH, CW, SH, fc=hx("0E2F4D"))
    ax.text(C2+0.005, y2-SH*0.45,
            "⑤ Confusion Matrix — Test Partition  (θ = 0.35)",
            fontsize=7.5, color=WHITE, fontweight="bold", va="center",
            transform=ax.transAxes, zorder=5)
    y2 -= SH + 0.005

    # draw inline confusion matrix
    CM_W = CW*0.38
    CM_H = 0.080
    CM_X = C2 + (CW - CM_W)/2
    CM_Y = y2 - CM_H
    cm_vals = [["", "Pred 0", "Pred 1"],
               ["Act 0", "37", "2"],
               ["Act 1", "1", "12"]]
    cm_fills = [[BG_PANEL2, BG_PANEL, BG_PANEL],
                [BG_PANEL, hx("14532D"), hx("7F1D1D")],
                [BG_PANEL, hx("7F1D1D"), hx("14532D")]]
    cm_cols  = [[GOLD, LIGHT, LIGHT],
                [LIGHT, GREEN, RED],
                [LIGHT, RED,   GREEN]]
    cw2 = CM_W/3; ch2 = CM_H/3
    for ri in range(3):
        for ci in range(3):
            ax.add_patch(Rectangle((CM_X+ci*cw2, CM_Y+CM_H-(ri+1)*ch2),
                                   cw2, ch2,
                                   facecolor=cm_fills[ri][ci],
                                   edgecolor=ACCENT1, linewidth=0.4,
                                   transform=ax.transAxes, zorder=3, clip_on=False))
            fs = 9.0 if (ri>0 and ci>0) else 5.5
            fw = "bold" if (ri>0 and ci>0) else "normal"
            ax.text(CM_X+(ci+0.5)*cw2, CM_Y+CM_H-(ri+0.5)*ch2,
                    cm_vals[ri][ci], fontsize=fs, fontweight=fw,
                    color=cm_cols[ri][ci], ha="center", va="center",
                    transform=ax.transAxes, zorder=5)

    # TP/TN/FP/FN badges
    badges = [("TP=12",GREEN),("TN=37",ACCENT2),("FP=2",RED),("FN=1",GOLD)]
    BW = CW/4 - 0.003
    for bi, (bt, bc) in enumerate(badges):
        bx = C2 + bi*(BW+0.003)
        ax.add_patch(FancyBboxPatch((bx, CM_Y-0.022), BW, 0.020,
                                    boxstyle="round,pad=0,rounding_size=0.002",
                                    facecolor=BG_PANEL, edgecolor=bc,
                                    linewidth=0.8,
                                    transform=ax.transAxes, zorder=3, clip_on=False))
        ax.text(bx+BW/2, CM_Y-0.012, bt, fontsize=7.5, fontweight="bold",
                color=bc, ha="center", va="center",
                transform=ax.transAxes, zorder=5)
    y2 = CM_Y - 0.028

    # --- Figure: Confusion Matrix image ---
    panel(ax, C2, y2-SH, CW, SH, fc=BG_MID)
    ax.text(C2+0.005, y2-SH*0.45, "Fig 1 · Confusion Matrix Heatmap",
            fontsize=6.5, color=LIGHT, va="center",
            transform=ax.transAxes, zorder=5)
    y2 -= SH + 0.003
    FIG2H = (y2 - BOT - 0.028) / 2
    embed_fig(ax, "01_confusion_matrix.png", C2, y2-FIG2H, CW, FIG2H-0.004)
    ax.text(C2+CW/2, y2-FIG2H+0.003,
            "Fig 1 · Confusion Matrix  |  Test N=52  |  θ=0.35",
            fontsize=5.4, color=MUTED, ha="center", va="bottom",
            transform=ax.transAxes, zorder=5, style="italic")
    y2 -= FIG2H + 0.005

    # --- Figure: ROC ---
    embed_fig(ax, "02_roc_curve.png", C2, BOT+0.010, CW, y2-BOT-0.014)
    ax.text(C2+CW/2, BOT+0.006,
            "Fig 2 · ROC Curve  |  AUC = 0.9803",
            fontsize=5.4, color=MUTED, ha="center", va="bottom",
            transform=ax.transAxes, zorder=5, style="italic")

    # ============================================================
    # COLUMN 3
    # ============================================================
    y3 = TOP

    # --- SHAP bar chart inline ---
    panel(ax, C3, y3-SH, CW, SH, fc=hx("1A1E4D"))
    ax.text(C3+0.005, y3-SH*0.45,
            "⑥ Global TreeSHAP Feature Attribution (Trigger Model)",
            fontsize=7.5, color=WHITE, fontweight="bold", va="center",
            transform=ax.transAxes, zorder=5)
    y3 -= SH + 0.005

    shap_data = [
        ("rain_48h_prior",    1.8878, 34.70),
        ("r24_seasonal_anom", 0.8781, 16.14),
        ("rain_24h_obs",      0.7105, 13.06),
        ("rain_7d_prior",     0.6528, 12.00),
        ("api_seasonal_anom", 0.5773, 10.61),
        ("rain_72h_prior",    0.4913,  9.03),
        ("api_7d",            0.2419,  4.45),
    ]
    max_s = shap_data[0][1]
    BAR_POOL = CW * 0.52
    BAR_H    = 0.028
    BAR_GAP  = 0.008
    BX_START = C3 + CW*0.33

    for bi2, (feat, sv, pct) in enumerate(shap_data):
        by = y3 - bi2*(BAR_H+BAR_GAP)
        bar_frac = (sv/max_s)*BAR_POOL
        # label
        ax.text(BX_START - 0.005, by-BAR_H/2, feat,
                fontsize=6.3, color=LIGHT, ha="right", va="center",
                transform=ax.transAxes, zorder=5, family="monospace")
        # bar bg
        ax.add_patch(Rectangle((BX_START, by-BAR_H+0.003), BAR_POOL, BAR_H-0.004,
                                facecolor=BG_MID, edgecolor="none",
                                transform=ax.transAxes, zorder=3, clip_on=False))
        # bar fill (gradient coloring by rank)
        bar_colors = [ACCENT1, ACCENT1, ACCENT2, ACCENT2, ACCENT2, ACCENT2, MUTED]
        ax.add_patch(FancyBboxPatch((BX_START, by-BAR_H+0.003), bar_frac, BAR_H-0.004,
                                    boxstyle="round,pad=0,rounding_size=0.001",
                                    facecolor=bar_colors[bi2], edgecolor="none",
                                    transform=ax.transAxes, zorder=4, clip_on=False))
        # value label
        ax.text(BX_START+bar_frac+0.005, by-BAR_H/2,
                f"{sv:.4f}  ({pct:.1f}%)",
                fontsize=5.8, color=GOLD, va="center",
                transform=ax.transAxes, zorder=5)
    y3 -= len(shap_data)*(BAR_H+BAR_GAP) + 0.014

    # --- PR + Calibration figures (side by side) ---
    panel(ax, C3, y3-SH, CW, SH, fc=hx("1A1E4D"))
    ax.text(C3+0.005, y3-SH*0.45,
            "⑦ Precision-Recall & Calibration Curves",
            fontsize=7.5, color=WHITE, fontweight="bold", va="center",
            transform=ax.transAxes, zorder=5)
    y3 -= SH + 0.003
    PAIR_H = 0.155
    HALF = (CW - 0.006) / 2
    embed_fig(ax, "03_precision_recall_curve.png",
              C3, y3-PAIR_H, HALF, PAIR_H-0.004)
    embed_fig(ax, "04_calibration_reliability_curve.png",
              C3+HALF+0.006, y3-PAIR_H, HALF, PAIR_H-0.004)
    ax.text(C3+HALF/2, y3-PAIR_H+0.003,
            "Fig 3 · PR-AUC = 0.9208",
            fontsize=5.4, color=MUTED, ha="center", va="bottom",
            transform=ax.transAxes, style="italic", zorder=5)
    ax.text(C3+HALF+0.006+HALF/2, y3-PAIR_H+0.003,
            "Fig 4 · Brier = 0.0410",
            fontsize=5.4, color=MUTED, ha="center", va="bottom",
            transform=ax.transAxes, style="italic", zorder=5)
    y3 -= PAIR_H + 0.012

    # --- LOYO Table ---
    panel(ax, C3, y3-SH, CW, SH, fc=hx("0E3A2F"))
    ax.text(C3+0.005, y3-SH*0.45,
            "⑧ Leave-One-Year-Out Temporal Validation (2007–2019)",
            fontsize=7.5, color=WHITE, fontweight="bold", va="center",
            transform=ax.transAxes, zorder=5)
    y3 -= SH + 0.004

    loyo = [
        ("Year","N","Acc%","Prec%","POD%","FAR%","AUC"),
        ("2007","12","66.67","0.00","0.00","100.0","0.222"),
        ("2013","4","75.00","0.00","0.00","0.00","1.000"),
        ("2014","21","52.38","0.00","0.00","100.0","0.378"),
        ("2016","20","75.00","0.00","0.00","0.00","0.400"),
        ("2018","277","64.62","23.53","16.90","76.47","0.564"),
        ("2019","12","66.67","33.33","33.33","66.67","0.296"),
        ("MEAN","346","71.10","41.67","27.78","58.33","0.593"),
    ]
    nc = 7
    cws3 = [CW*0.135, CW*0.085] + [CW*(1-0.135-0.085)/(nc-2)]*(nc-2)
    RH = 0.024
    for ri, row in enumerate(loyo):
        ry3 = y3 - ri*RH
        ishdr = (ri==0); istot=(ri==7); is18=(ri==5)
        for ci, cell in enumerate(row):
            cx3 = C3 + sum(cws3[:ci])
            if ishdr:
                fc3=ACCENT1; tc3=WHITE; fs3=6.2; fw3="bold"
            elif istot:
                fc3=BG_PANEL2; tc3=GOLD; fs3=6.2; fw3="bold"
            elif is18:
                fc3=hx("1C1C00"); tc3=GOLD; fs3=5.8; fw3="normal"
            elif ri%2==0:
                fc3=BG_PANEL; tc3=LIGHT; fs3=5.8; fw3="normal"
            else:
                fc3=BG_MID; tc3=LIGHT; fs3=5.8; fw3="normal"
            ax.add_patch(Rectangle((cx3, ry3-RH), cws3[ci], RH-0.001,
                                   facecolor=fc3, edgecolor=BG_DARK,
                                   linewidth=0.3,
                                   transform=ax.transAxes, zorder=3, clip_on=False))
            ax.text(cx3+cws3[ci]/2, ry3-RH/2, cell,
                    fontsize=fs3, color=tc3, fontweight=fw3,
                    ha="center", va="center",
                    transform=ax.transAxes, zorder=5)
    y3 -= len(loyo)*RH + 0.010

    # --- LOYO figure ---
    FHLOYO = 0.120
    embed_fig(ax, "06_loyo_temporal_validation.png", C3, y3-FHLOYO, CW, FHLOYO-0.004)
    ax.text(C3+CW/2, y3-FHLOYO+0.003,
            "Fig 5 · LOYO Multi-Year Accuracy  |  Mean = 71.10%",
            fontsize=5.4, color=MUTED, ha="center", va="bottom",
            transform=ax.transAxes, style="italic", zorder=5)
    y3 -= FHLOYO + 0.012

    # --- System components 2x2 grid ---
    panel(ax, C3, y3-SH, CW, SH, fc=hx("1A0E3D"))
    ax.text(C3+0.005, y3-SH*0.45,
            "⑨ Real-Time System Components",
            fontsize=7.5, color=WHITE, fontweight="bold", va="center",
            transform=ax.transAxes, zorder=5)
    y3 -= SH + 0.005

    comp_data = [
        ("Sentinel-1A InSAR",
         "C-Band SAR · LOS ~1–3mm\nInterferogramme unwrapping",
         ACCENT1),
        ("40-Node IoT Grid",
         "Piezometers + MEMS IPI\nAsyncIO FastAPI @ 5-min",
         ACCENT2),
        ("Dijkstra EV-Router",
         "NX multigraph G=(V,E,W)\nC_risk = 100P² + 10P + 1",
         ACCENT3),
        ("CAP v1.2 Alert Engine",
         "OASIS XML/JSON + Haversine\n8-language SMS broadcast",
         GOLD),
    ]
    COMP_W = (CW - 0.006)/2
    COMP_H = min(0.065, (y3-BOT-0.020)/2 - 0.008)
    for ci3, (ct, cd, cc) in enumerate(comp_data):
        cx3c = C3 + (ci3%2)*(COMP_W+0.006)
        cy3c = y3 - (ci3//2)*(COMP_H+0.008) - COMP_H
        p = FancyBboxPatch((cx3c, cy3c), COMP_W, COMP_H,
                           boxstyle="round,pad=0,rounding_size=0.003",
                           facecolor=BG_PANEL, edgecolor=cc, linewidth=0.9,
                           transform=ax.transAxes, zorder=3, clip_on=False)
        ax.add_patch(p)
        ax.add_patch(Rectangle((cx3c, cy3c+COMP_H*0.75), COMP_W, COMP_H*0.25,
                                facecolor=cc, edgecolor="none",
                                transform=ax.transAxes, zorder=4, clip_on=False))
        ax.text(cx3c+COMP_W/2, cy3c+COMP_H*0.875, ct,
                fontsize=6.2, fontweight="bold", color=WHITE,
                ha="center", va="center", transform=ax.transAxes, zorder=5)
        for li2, line in enumerate(cd.split("\n")):
            ax.text(cx3c+COMP_W/2, cy3c+COMP_H*0.52 - li2*COMP_H*0.26,
                    line, fontsize=5.8, color=LIGHT,
                    ha="center", va="center", transform=ax.transAxes, zorder=5)

    # ============================================================
    # COLUMN DIVIDERS
    # ============================================================
    for xd in [C2-GAP/2, C3-GAP/2]:
        ax.add_patch(Rectangle((xd, BOT), 0.001, TOP-BOT,
                               facecolor=hx("1E3A5C"), edgecolor="none",
                               transform=ax.transAxes, zorder=2))

    # ============================================================
    # FOOTER
    # ============================================================
    ax.add_patch(Rectangle((0, 0), 1, BOT+0.005,
                            facecolor=BG_PANEL2, edgecolor="none",
                            transform=ax.transAxes, zorder=2))
    ax.add_patch(Rectangle((0, BOT+0.005), 1, 0.002,
                            facecolor=ACCENT1, edgecolor="none",
                            transform=ax.transAxes, zorder=3))
    ax.text(0.012, BOT*0.5,
            "AI-Driven Two-Tier Landslide EWS  |  Dr. R. Rajmohan  |  "
            "SRM Institute of Science & Technology",
            fontsize=5.8, color=LIGHT, va="center",
            transform=ax.transAxes, zorder=5)
    ax.text(0.988, BOT*0.5,
            "N = 1,152 events · 2007–2019  |  Python 3.14 · XGBoost · "
            "scikit-learn · FastAPI · NetworkX  |  © 2026",
            fontsize=5.8, color=MUTED, va="center", ha="right",
            transform=ax.transAxes, zorder=5)

    # ============================================================
    # SAVE
    # ============================================================
    png_out = "MINDMELD_A3_Poster.png"
    pdf_out = "MINDMELD_A3_Poster.pdf"

    fig.savefig(png_out, dpi=DPI, bbox_inches="tight",
                facecolor=BG_DARK, pad_inches=0)
    print(f"  PNG saved: {os.path.abspath(png_out)}")

    fig.savefig(pdf_out, dpi=DPI, bbox_inches="tight",
                facecolor=BG_DARK, pad_inches=0, format="pdf")
    print(f"  PDF saved: {os.path.abspath(pdf_out)}")

    plt.close(fig)
    print("\nDone! Open MINDMELD_A3_Poster.pdf in any PDF viewer to inspect.")
    print("Print at A3 size with 'Fit to Page' off and 100% scale.\n")


if __name__ == "__main__":
    build()
