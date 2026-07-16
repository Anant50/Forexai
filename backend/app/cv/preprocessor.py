"""
Stage 1: OpenCV Preprocessor
Prepares raw chart images for downstream YOLO and ViT inference.

Operations:
  - Resize to standardized model input dimensions
  - Color space normalisation (BGR → RGB)
  - CLAHE contrast enhancement
  - Gaussian denoising
  - Canny edge detection
  - Hough Line Transform for trendline extraction
  - Grayscale + adaptive thresholding for candle body isolation
"""

import logging
from typing import Dict, Any, List, Tuple, Optional

import numpy as np

logger = logging.getLogger("cv.preprocessor")

# Lazy import so the module loads even when opencv is not yet installed
try:
    import cv2
    _CV2_AVAILABLE = True
except ImportError:
    _CV2_AVAILABLE = False
    logger.warning("opencv-python-headless not installed. Preprocessor will return stub data.")


class ImagePreprocessor:
    """
    Wraps all OpenCV preprocessing steps into a single synchronous call.
    In production, call these inside asyncio.run_in_executor to avoid blocking
    FastAPI's event loop.
    """

    # Target dimensions for YOLO inference
    YOLO_SIZE = (640, 640)
    # Target dimensions for ViT inference
    VIT_SIZE = (224, 224)

    @classmethod
    def load_image(cls, image_bytes: bytes) -> Optional[np.ndarray]:
        """Decode raw bytes into a BGR NumPy array."""
        if not _CV2_AVAILABLE:
            return np.zeros((640, 640, 3), dtype=np.uint8)
        arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Could not decode image bytes — unsupported format or corrupted data.")
        return img

    @classmethod
    def resize_for_yolo(cls, img: np.ndarray) -> np.ndarray:
        """Resize image to 640×640 for YOLOv8 input."""
        if not _CV2_AVAILABLE:
            return img
        return cv2.resize(img, cls.YOLO_SIZE, interpolation=cv2.INTER_LINEAR)

    @classmethod
    def resize_for_vit(cls, img: np.ndarray) -> np.ndarray:
        """Resize image to 224×224 for Vision Transformer input."""
        if not _CV2_AVAILABLE:
            return img
        return cv2.resize(img, cls.VIT_SIZE, interpolation=cv2.INTER_LINEAR)

    @classmethod
    def enhance_contrast(cls, img: np.ndarray) -> np.ndarray:
        """Apply CLAHE (Contrast Limited Adaptive Histogram Equalization) per channel."""
        if not _CV2_AVAILABLE:
            return img
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l_ch, a_ch, b_ch = cv2.split(lab)
        l_ch = clahe.apply(l_ch)
        lab = cv2.merge((l_ch, a_ch, b_ch))
        return cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)

    @classmethod
    def denoise(cls, img: np.ndarray) -> np.ndarray:
        """Gaussian blur to suppress high-frequency noise."""
        if not _CV2_AVAILABLE:
            return img
        return cv2.GaussianBlur(img, (3, 3), 0)

    @classmethod
    def to_rgb(cls, img: np.ndarray) -> np.ndarray:
        """Convert BGR (OpenCV default) to RGB (model expected format)."""
        if not _CV2_AVAILABLE:
            return img
        return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    @classmethod
    def extract_edges(cls, img: np.ndarray) -> np.ndarray:
        """Canny edge detection on grayscale image."""
        if not _CV2_AVAILABLE:
            return np.zeros(img.shape[:2], dtype=np.uint8)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, threshold1=50, threshold2=150)
        return edges

    @classmethod
    def detect_hough_lines(
        cls, edges: np.ndarray, original_shape: Tuple[int, int]
    ) -> List[Dict[str, Any]]:
        """
        Probabilistic Hough Line Transform.
        Returns list of trendline dicts with start, end, angle, and direction.
        """
        if not _CV2_AVAILABLE:
            return []

        h, w = original_shape[:2]
        lines = cv2.HoughLinesP(
            edges,
            rho=1,
            theta=np.pi / 180,
            threshold=80,
            minLineLength=max(60, w // 10),
            maxLineGap=25,
        )
        results: List[Dict[str, Any]] = []
        if lines is None:
            return results

        for line in lines:
            x1, y1, x2, y2 = line[0]
            # Normalise coordinates to [0, 1] relative to image dimensions
            nx1, ny1 = x1 / w, y1 / h
            nx2, ny2 = x2 / w, y2 / h
            dx, dy = x2 - x1, y2 - y1
            angle = float(np.degrees(np.arctan2(dy, dx)))
            length = float(np.sqrt(dx ** 2 + dy ** 2))

            if abs(angle) < 5:
                direction = "horizontal"
            elif angle > 5:
                direction = "ascending"
            else:
                direction = "descending"

            results.append({
                "start": [round(nx1, 4), round(ny1, 4)],
                "end": [round(nx2, 4), round(ny2, 4)],
                "angle_degrees": round(angle, 2),
                "length_px": round(length, 1),
                "direction": direction,
            })

        # Filter to longest / most distinctive lines (top 10)
        results.sort(key=lambda r: r["length_px"], reverse=True)
        return results[:10]

    @classmethod
    def full_preprocess(cls, image_bytes: bytes) -> Dict[str, Any]:
        """
        Master preprocessing entry-point.
        Returns a dict containing all processed arrays and extracted structural data.
        """
        if not _CV2_AVAILABLE:
            # Return correctly-sized stubs when OpenCV is not installed
            return {
                "yolo_array": np.zeros((640, 640, 3), dtype=np.uint8),
                "vit_array": np.zeros((224, 224, 3), dtype=np.uint8),
                "edges": np.zeros((64, 64), dtype=np.uint8),
                "hough_trendlines": [],
                "original_shape": (64, 64, 3),
            }

        img_bgr = cls.load_image(image_bytes)
        original_shape = img_bgr.shape

        enhanced = cls.enhance_contrast(img_bgr)
        denoised = cls.denoise(enhanced)
        edges = cls.extract_edges(denoised)
        hough_lines = cls.detect_hough_lines(edges, original_shape)

        yolo_input = cls.resize_for_yolo(denoised)
        rgb_for_yolo = cls.to_rgb(yolo_input)

        vit_input = cls.resize_for_vit(denoised)
        rgb_for_vit = cls.to_rgb(vit_input)

        logger.debug(
            "Preprocessing complete. Original=%s YOLO=%s ViT=%s Hough lines=%d",
            original_shape[:2], cls.YOLO_SIZE, cls.VIT_SIZE, len(hough_lines),
        )

        return {
            "yolo_array": rgb_for_yolo,           # (640, 640, 3) uint8 RGB
            "vit_array": rgb_for_vit,             # (224, 224, 3) uint8 RGB
            "edges": edges,                        # (H, W) uint8 grayscale
            "hough_trendlines": hough_lines,       # list[dict]
            "original_shape": original_shape,      # (H, W, C)
        }

