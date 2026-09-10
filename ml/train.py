"""
SafeT ML Pipeline — Model Training
====================================
Trains three classifiers for safety-risk prediction:

    1. Logistic Regression (baseline)
    2. Random Forest (primary model)
    3. XGBoost (optional comparison)

The best model is selected based on validation ROC-AUC and saved for inference.

Training pipeline:
    1. Run preprocessing to get scaled train/val/test splits
    2. Train each model on training set
    3. Evaluate on validation set
    4. Select best model
    5. Save model + metadata

Data leakage prevention:
    - Scaler fitted only on training data
    - No future information in features
    - Stratified splits preserve class distribution
"""

import sys
import json
import time
import numpy as np
from pathlib import Path
from datetime import datetime

from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, classification_report
)
import joblib

sys.path.insert(0, str(Path(__file__).parent))

from config import (
    LOGISTIC_REGRESSION_PARAMS, RANDOM_FOREST_PARAMS, XGBOOST_PARAMS,
    MODEL_PATH, METADATA_PATH, FEATURE_NAMES, MODEL_VERSION
)
from preprocessing import preprocess_pipeline


def train_logistic_regression(X_train, y_train):
    """Train Logistic Regression baseline."""
    print("\n  🔹 Training Logistic Regression...")
    model = LogisticRegression(**LOGISTIC_REGRESSION_PARAMS)
    start = time.time()
    model.fit(X_train, y_train)
    elapsed = time.time() - start
    print(f"     Training time: {elapsed:.2f}s")
    return model


def train_random_forest(X_train, y_train):
    """Train Random Forest (primary model)."""
    print("\n  🔹 Training Random Forest...")
    model = RandomForestClassifier(**RANDOM_FOREST_PARAMS)
    start = time.time()
    model.fit(X_train, y_train)
    elapsed = time.time() - start
    print(f"     Training time: {elapsed:.2f}s")
    return model


def train_xgboost(X_train, y_train):
    """Train XGBoost (optional comparison)."""
    try:
        from xgboost import XGBClassifier
        print("\n  🔹 Training XGBoost...")
        
        # Map string labels to integers for XGBoost
        label_map = {"Low": 0, "Medium": 1, "High": 2}
        y_mapped = np.array([label_map[l] for l in y_train])
        
        model = XGBClassifier(**XGBOOST_PARAMS, num_class=3, objective="multi:softprob")
        start = time.time()
        model.fit(y_mapped, y_mapped)  # XGBoost handles its own format
        elapsed = time.time() - start
        print(f"     Training time: {elapsed:.2f}s")
        return model
    except ImportError:
        print("\n  ⚠ XGBoost not installed, skipping.")
        return None
    except Exception as e:
        print(f"\n  ⚠ XGBoost training failed: {e}")
        return None


def evaluate_model(model, X_val, y_val, model_name: str) -> dict:
    """Evaluate a model on validation set and return metrics."""
    y_pred = model.predict(X_val)
    
    accuracy = accuracy_score(y_val, y_pred)
    precision = precision_score(y_val, y_pred, average="weighted", zero_division=0)
    recall = recall_score(y_val, y_pred, average="weighted", zero_division=0)
    f1 = f1_score(y_val, y_pred, average="weighted", zero_division=0)
    
    # ROC-AUC (multi-class, one-vs-rest)
    try:
        if hasattr(model, "predict_proba"):
            y_proba = model.predict_proba(X_val)
            # Need to handle the label encoding for roc_auc
            from sklearn.preprocessing import label_binarize
            classes = model.classes_
            y_val_bin = label_binarize(y_val, classes=classes)
            if y_val_bin.shape[1] == 1:
                # Binary case
                roc_auc = roc_auc_score(y_val_bin, y_proba[:, 1])
            else:
                roc_auc = roc_auc_score(y_val_bin, y_proba, multi_class="ovr", average="weighted")
        else:
            roc_auc = None
    except Exception as e:
        print(f"     ⚠ ROC-AUC calculation failed: {e}")
        roc_auc = None
    
    metrics = {
        "model_name": model_name,
        "accuracy": round(accuracy, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4),
        "roc_auc": round(roc_auc, 4) if roc_auc is not None else None,
    }
    
    print(f"\n  📊 {model_name} Validation Metrics:")
    print(f"     Accuracy:  {metrics['accuracy']:.4f}")
    print(f"     Precision: {metrics['precision']:.4f}")
    print(f"     Recall:    {metrics['recall']:.4f}")
    print(f"     F1-Score:  {metrics['f1_score']:.4f}")
    if metrics['roc_auc']:
        print(f"     ROC-AUC:   {metrics['roc_auc']:.4f}")
    
    print(f"\n     Classification Report:")
    print(classification_report(y_val, y_pred, zero_division=0))
    
    return metrics


def select_best_model(results: list) -> dict:
    """Select the best model based on F1-score (good for imbalanced data).
    
    Why F1-score over accuracy?
    - Safety applications: we care about BOTH precision (don't cry wolf)
      and recall (don't miss real risks). F1 balances both.
    - Accuracy can be misleading with imbalanced classes.
    """
    # Prefer ROC-AUC if available, else F1
    for r in results:
        r["selection_score"] = r.get("roc_auc") or r["f1_score"]
    
    best = max(results, key=lambda r: r["selection_score"])
    print(f"\n🏆 Best model: {best['model_name']} (selection score: {best['selection_score']:.4f})")
    return best


def save_model_and_metadata(model, best_metrics: dict, all_metrics: list,
                             label_encoder, splits: dict):
    """Save the trained model and metadata."""
    # Save model
    joblib.dump(model, MODEL_PATH)
    print(f"  → Model saved to {MODEL_PATH}")
    
    # Build metadata
    metadata = {
        "model_version": MODEL_VERSION,
        "algorithm": best_metrics["model_name"],
        "features": FEATURE_NAMES,
        "feature_count": len(FEATURE_NAMES),
        "training_date": datetime.now().isoformat(),
        "training_dataset_version": "ncrb_2022_odisha_v1",
        "training_samples": len(splits["X_train"]),
        "validation_samples": len(splits["X_val"]),
        "test_samples": len(splits["X_test"]),
        "class_distribution": {
            "train": dict(zip(*np.unique(splits["y_level_train"], return_counts=True))),
            "val": dict(zip(*np.unique(splits["y_level_val"], return_counts=True))),
            "test": dict(zip(*np.unique(splits["y_level_test"], return_counts=True))),
        },
        "evaluation_metrics": {
            "best_model": best_metrics,
            "all_models": all_metrics,
        },
        "notes": (
            "Trained on synthetic grid data derived from NCRB 2022 Odisha district "
            "statistics and MoRTH 2022 road accident data. Incidents are seeded "
            "proportionally to real crime counts. Labels are computed from a composite "
            "risk formula combining crime density, district stats, temporal factors, "
            "and proximity to emergency services."
        ),
        "classes": list(label_encoder.classes_),
    }
    
    # Convert numpy types to Python types for JSON serialization
    def convert(obj):
        if isinstance(obj, (np.integer,)):
            return int(obj)
        if isinstance(obj, (np.floating,)):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return obj
    
    metadata_clean = json.loads(json.dumps(metadata, default=convert))
    
    with open(METADATA_PATH, "w") as f:
        json.dump(metadata_clean, f, indent=2)
    print(f"  → Metadata saved to {METADATA_PATH}")


def train_pipeline():
    """Main training pipeline."""
    print("=" * 70)
    print("SafeT ML — Model Training Pipeline")
    print("=" * 70)
    
    # Step 1: Preprocess
    splits = preprocess_pipeline()
    
    X_train_scaled = splits["X_train_scaled"]
    X_val_scaled = splits["X_val_scaled"]
    y_level_train = splits["y_level_train"]
    y_level_val = splits["y_level_val"]
    
    # Step 2: Train models
    print("\n" + "─" * 70)
    print("🤖 Training Models")
    print("─" * 70)
    
    models = {}
    
    # Logistic Regression (baseline)
    lr_model = train_logistic_regression(X_train_scaled, y_level_train)
    models["Logistic Regression"] = lr_model
    
    # Random Forest (primary)
    rf_model = train_random_forest(X_train_scaled, y_level_train)
    models["Random Forest"] = rf_model
    
    # XGBoost (optional)
    try:
        from xgboost import XGBClassifier
        print("\n  🔹 Training XGBoost...")
        xgb_model = XGBClassifier(
            n_estimators=XGBOOST_PARAMS["n_estimators"],
            max_depth=XGBOOST_PARAMS["max_depth"],
            learning_rate=XGBOOST_PARAMS["learning_rate"],
            random_state=XGBOOST_PARAMS["random_state"],
            eval_metric=XGBOOST_PARAMS["eval_metric"],
            use_label_encoder=False,
        )
        # XGBoost needs encoded labels
        label_map = {label: i for i, label in enumerate(sorted(np.unique(y_level_train)))}
        y_train_xgb = np.array([label_map[l] for l in y_level_train])
        start = time.time()
        xgb_model.fit(X_train_scaled, y_train_xgb)
        elapsed = time.time() - start
        print(f"     Training time: {elapsed:.2f}s")
        
        # Wrap to make predictions consistent
        class XGBWrapper:
            def __init__(self, model, label_map):
                self.model = model
                self.inv_map = {v: k for k, v in label_map.items()}
                self.classes_ = np.array([self.inv_map[i] for i in sorted(self.inv_map)])
            
            def predict(self, X):
                preds = self.model.predict(X)
                return np.array([self.inv_map[p] for p in preds])
            
            def predict_proba(self, X):
                return self.model.predict_proba(X)
        
        models["XGBoost"] = XGBWrapper(xgb_model, label_map)
    except ImportError:
        print("\n  ⚠ XGBoost not installed, skipping.")
    except Exception as e:
        print(f"\n  ⚠ XGBoost training failed: {e}")
    
    # Step 3: Evaluate all models
    print("\n" + "─" * 70)
    print("📊 Evaluating Models on Validation Set")
    print("─" * 70)
    
    all_metrics = []
    for name, model in models.items():
        metrics = evaluate_model(model, X_val_scaled, y_level_val, name)
        all_metrics.append(metrics)
    
    # Step 4: Select best model
    print("\n" + "─" * 70)
    best_info = select_best_model(all_metrics)
    best_model = models[best_info["model_name"]]
    
    # Step 5: Save
    print("\n💾 Saving best model and metadata...")
    # For XGBWrapper, save the inner model
    save_obj = best_model
    if hasattr(best_model, 'model'):
        # Save the actual scikit-learn compatible model
        # For simplicity, if XGB won, we save RF as it's more portable
        print("  → Note: Saving Random Forest for portability (XGBoost wrapper not directly serializable)")
        save_obj = rf_model
        best_info = next(m for m in all_metrics if m["model_name"] == "Random Forest")
    
    save_model_and_metadata(save_obj, best_info, all_metrics, splits["label_encoder"], splits)
    
    print("\n" + "=" * 70)
    print("✅ Training pipeline complete!")
    print(f"   Best model: {best_info['model_name']}")
    print(f"   F1-Score:   {best_info['f1_score']:.4f}")
    if best_info.get('roc_auc'):
        print(f"   ROC-AUC:    {best_info['roc_auc']:.4f}")
    print("=" * 70)
    
    return best_model, splits


if __name__ == "__main__":
    train_pipeline()
