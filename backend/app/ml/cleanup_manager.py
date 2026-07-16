import gc
import sys
import logging

logger = logging.getLogger("ml.cleanup_manager")

class CleanupManager:
    
    @staticmethod
    def release_resources(*objects):
        """
        Dynamically evaporates all referenced object elements, clearing variables 
        and executing python garbage collection to release active CPU heap space.
        """
        logger.info("Evicting on-demand inference objects...")
        
        # Trigger standard python garbage collect
        gc.collect()
        
        # CPU/GPU cleaning if deep learning modules are loaded
        if "torch" in sys.modules:
            try:
                import torch
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
            except Exception as e:
                logger.debug(f"Torch CUDA clear skipped: {e}")
                
        if "tensorflow" in sys.modules:
            try:
                import tensorflow as tf
                # Clear Keras session memory
                tf.keras.backend.clear_session()
            except Exception as e:
                logger.debug(f"TensorFlow clear session skipped: {e}")
                
        logger.info("Resource cleanup completed.")
