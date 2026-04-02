#!/usr/bin/env python3
"""
Evaluate difficulty classifier accuracy against labeled test data.
"""
import json
import sys
from pathlib import Path

def load_annotations(file_path):
    """Load ground truth annotations."""
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def calculate_metrics(predictions, ground_truth):
    """Calculate accuracy, precision, recall for each class."""
    classes = ['easy', 'standard', 'hard']
    metrics = {}

    for cls in classes:
        tp = sum(1 for p, g in zip(predictions, ground_truth) if p == cls and g == cls)
        fp = sum(1 for p, g in zip(predictions, ground_truth) if p == cls and g != cls)
        fn = sum(1 for p, g in zip(predictions, ground_truth) if p != cls and g == cls)

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0

        metrics[cls] = {'precision': precision, 'recall': recall, 'f1': f1}

    accuracy = sum(1 for p, g in zip(predictions, ground_truth) if p == g) / len(predictions)
    return accuracy, metrics

def main():
    if len(sys.argv) < 2:
        print("Usage: python evaluate_classifier.py <annotations.json>")
        sys.exit(1)

    annotations = load_annotations(sys.argv[1])
    predictions = [a['predicted'] for a in annotations]
    ground_truth = [a['actual'] for a in annotations]

    accuracy, metrics = calculate_metrics(predictions, ground_truth)

    print(f"\nClassifier Evaluation Results")
    print(f"{'='*50}")
    print(f"Overall Accuracy: {accuracy*100:.1f}%")
    print(f"\nPer-Class Metrics:")
    for cls, m in metrics.items():
        print(f"  {cls:8s}: P={m['precision']:.2f} R={m['recall']:.2f} F1={m['f1']:.2f}")

if __name__ == '__main__':
    main()
