"""
SafeT ML Pipeline — Model Evaluation
======================================
Comprehensive evaluation of the trained model on the held-out test set.

Generates:
    - Classification metrics (Accuracy, Precision, Recall, F1, ROC-AUC)
    - Confusion matrix
    - Per-class metrics
    - Probability calibration analysis
    - Feature importance ranking
    - Evaluation report (JSON)

Why each metric matters for safety:
    - Precision: Low false positives → don't unnecessarily scare users
    - Recall: Low false negatives → don't miss real dangers (CRITICAL for safety)
    - F1-Score: Balances precision and recall
    - ROC-AUC: Overall discriminative ability across all thresholds
    - For a safety app, RECALL for "High" risk is the most important metric
"""

import sys
import json
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime

from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report
)
from sklearn.preprocessing import label_binarize
import joblib

sys.path.insert(0, str(Path(__file__).parent))

from config import (
    MODEL_PATH, SCALER_PATH, LABEL_ENCODER_PATH, EVALUATION_REPORT_PATH,
    FEATURE_NAMES, METADATA_PATH
)
from preprocessing import preprocess_pipeline


def load_model():
    """Load trained model, scaler, and label encoder."""
    model = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    le = joblib.load(LABEL_ENCODER_PATH)
    return model, scaler, le


def evaluate_on_test_set():
    """Run full evaluation on held-out test set."""
    print("=" * 70)
    print("SafeT ML — Model Evaluation on Test Set")
    print("=" * 70)
    
    # Load model
    print("\n📦 Loading model...")
    model, scaler, le = load_model()
    print(f"  Model type: {type(model).__name__}")
    
    # Preprocess data (reuses same split with same random seed)
    splits = preprocess_pipeline()
    
    X_test_scaled = splits["X_test_scaled"]
    y_test = splits["y_level_test"]
    
    print(f"\n📊 Test set: {len(y_test)} samples")
    print(f"   Class distribution: {dict(zip(*np.unique(y_test, return_counts=True)))}")
    
    # Predictions
    y_pred = model.predict(X_test_scaled)
    y_proba = model.predict_proba(X_test_scaled) if hasattr(model, "predict_proba") else None
    
    # ─── Classification Metrics ──────────────────────────────────────────────
    print("\n" + "─" * 70)
    print("📈 Test Set Metrics")
    print("─" * 70)
    
    accuracy = accuracy_score(y_test, y_pred)
    precision_w = precision_score(y_test, y_pred, average="weighted", zero_division=0)
    recall_w = recall_score(y_test, y_pred, average="weighted", zero_division=0)
    f1_w = f1_score(y_test, y_pred, average="weighted", zero_division=0)
    
    precision_macro = precision_score(y_test, y_pred, average="macro", zero_division=0)
    recall_macro = recall_score(y_test, y_pred, average="macro", zero_division=0)
    f1_macro = f1_score(y_test, y_pred, average="macro", zero_division=0)
    
    print(f"\n  Accuracy:           {accuracy:.4f}")
    print(f"  Precision (weighted): {precision_w:.4f}")
    print(f"  Recall (weighted):    {recall_w:.4f}")
    print(f"  F1-Score (weighted):  {f1_w:.4f}")
    print(f"  Precision (macro):    {precision_macro:.4f}")
    print(f"  Recall (macro):       {recall_macro:.4f}")
    print(f"  F1-Score (macro):     {f1_macro:.4f}")
    
    # ROC-AUC
    roc_auc = None
    if y_proba is not None:
        try:
            classes = model.classes_
            y_test_bin = label_binarize(y_test, classes=classes)
            if y_test_bin.shape[1] == 1:
                roc_auc = roc_auc_score(y_test_bin, y_proba[:, 1])
            else:
                roc_auc = roc_auc_score(y_test_bin, y_proba, multi_class="ovr", average="weighted")
            print(f"  ROC-AUC (weighted):   {roc_auc:.4f}")
        except Exception as e:
            print(f"  ROC-AUC: computation failed ({e})")
    
    # ─── Per-Class Metrics ───────────────────────────────────────────────────
    print(f"\n  Per-Class Classification Report:")
    report_str = classification_report(y_test, y_pred, zero_division=0)
    print(report_str)
    
    report_dict = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
    
    # ─── Confusion Matrix ────────────────────────────────────────────────────
    classes = sorted(np.unique(np.concatenate([y_test, y_pred])))
    cm = confusion_matrix(y_test, y_pred, labels=classes)
    
    print(f"\n  Confusion Matrix:")
    print(f"  {'':>12}", end="")
    for c in classes:
        print(f"  {c:>8}", end="")
    print()
    for i, c in enumerate(classes):
        print(f"  {c:>12}", end="")
        for j in range(len(classes)):
            print(f"  {cm[i][j]:>8}", end="")
        print()
    
    # ─── Safety-Critical Analysis ────────────────────────────────────────────
    print(f"\n" + "─" * 70)
    print("🔒 Safety-Critical Analysis")
    print("─" * 70)
    
    # How often do we miss High-risk areas? (False Negatives for High)
    if "High" in classes:
        high_idx = list(classes).index("High")
        high_total = cm[high_idx].sum()
        high_correct = cm[high_idx][high_idx]
        high_recall = high_correct / max(1, high_total)
        high_missed = high_total - high_correct
        
        print(f"\n  High-Risk Detection:")
        print(f"    Total High-risk samples:  {high_total}")
        print(f"    Correctly identified:     {high_correct} ({high_recall*100:.1f}%)")
        print(f"    Missed (FALSE NEGATIVES): {high_missed}")
        print(f"    → For a safety app, missing high-risk areas is the WORST error.")
        print(f"    → Recall for 'High' class: {high_recall:.4f}")
        
        if high_recall < 0.8:
            print(f"    ⚠ WARNING: High-risk recall is below 80%. Consider adjusting class weights.")
        else:
            print(f"    ✅ High-risk recall is good (≥80%).")
    
    # ─── Feature Importance ──────────────────────────────────────────────────
    feature_importance = {}
    if hasattr(model, "feature_importances_"):
        importances = model.feature_importances_
        indices = np.argsort(importances)[::-1]
        
        print(f"\n  Feature Importance (top 10):")
        for rank, idx in enumerate(indices[:10]):
            print(f"    {rank+1}. {FEATURE_NAMES[idx]:30s} {importances[idx]:.4f}")
            feature_importance[FEATURE_NAMES[idx]] = round(float(importances[idx]), 4)
    
    # ─── Probability Calibration ─────────────────────────────────────────────
    if y_proba is not None:
        print(f"\n  Probability Distribution (predicted):")
        for i, cls in enumerate(model.classes_):
            probs = y_proba[:, i]
            print(f"    {cls}: mean={probs.mean():.3f}, std={probs.std():.3f}, "
                  f"min={probs.min():.3f}, max={probs.max():.3f}")
    
    # ─── Save Evaluation Report ──────────────────────────────────────────────
    report = {
        "evaluation_date": datetime.now().isoformat(),
        "test_samples": len(y_test),
        "metrics": {
            "accuracy": round(accuracy, 4),
            "precision_weighted": round(precision_w, 4),
            "recall_weighted": round(recall_w, 4),
            "f1_weighted": round(f1_w, 4),
            "precision_macro": round(precision_macro, 4),
            "recall_macro": round(recall_macro, 4),
            "f1_macro": round(f1_macro, 4),
            "roc_auc_weighted": round(roc_auc, 4) if roc_auc else None,
        },
        "per_class_report": {k: v for k, v in report_dict.items() if isinstance(v, dict)},
        "confusion_matrix": {
            "labels": list(classes),
            "matrix": cm.tolist(),
        },
        "feature_importance": feature_importance,
        "safety_analysis": {
            "high_risk_recall": round(high_recall, 4) if "High" in classes else None,
            "high_risk_missed": int(high_missed) if "High" in classes else None,
        },
        "explanation": {
            "why_f1": "F1-score balances precision (don't cry wolf) and recall (don't miss dangers). For safety, recall of High-risk class is critical.",
            "why_roc_auc": "ROC-AUC measures overall discriminative ability across all probability thresholds.",
            "why_not_accuracy_only": "Accuracy can be misleading with imbalanced classes. A model predicting all 'Low' would have high accuracy but be useless for safety.",
        },
    }
    
    def convert(obj):
        if isinstance(obj, (np.integer,)):
            return int(obj)
        if isinstance(obj, (np.floating,)):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return obj
    
    report_clean = json.loads(json.dumps(report, default=convert))
    
    with open(EVALUATION_REPORT_PATH, "w") as f:
        json.dump(report_clean, f, indent=2)
    
    print(f"\n✅ Evaluation report saved to {EVALUATION_REPORT_PATH}")
    
    return report


if __name__ == "__main__":
    evaluate_on_test_set()
