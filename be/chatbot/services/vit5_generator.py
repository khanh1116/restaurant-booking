# chatbot/services/vit5_generator.py
"""
ViT5 Generator - Paraphrase câu trả lời thành tự nhiên
Tất cả câu trả lời đều qua ViT5 trước khi trả user (nếu model load OK)
"""

import os
import traceback
import torch
from django.conf import settings

try:
    from transformers import T5ForConditionalGeneration, T5Tokenizer
except Exception as e:
    # Lỗi import transformers (hiếm khi gặp)
    print("❌ [ViT5] Error importing transformers:", e)
    T5ForConditionalGeneration = None
    T5Tokenizer = None


def _vit5_debug(msg: str):
    """Helper in debug log cho ViT5"""
    print(f"[ViT5 DEBUG] {msg}")


class ViT5Generator:
    """
    Generate câu trả lời tự nhiên từ template
    Sử dụng ViT5 fine-tuned để paraphrase
    """

    def __init__(self):
        # Đường dẫn model fine-tune (folder chứa config.json, pytorch_model.bin, tokenizer.json...)
        self.model_path = os.path.join(
            settings.BASE_DIR,
            "chatbot",
            "ml_models",
            # "vit5-finetuned-final",
            "vit5-finetuned-finalv2",
        )

        # Trạng thái nội bộ
        self.model = None
        self.tokenizer = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        self._load_model()

    # ==================== LOAD MODEL ====================

    def _load_model(self):
        """Load ViT5 (ưu tiên fine-tuned, fallback sang pretrained)"""
        # Reset state trước khi load
        self.model = None
        self.tokenizer = None

        if T5ForConditionalGeneration is None or T5Tokenizer is None:
            print("❌ [ViT5] transformers / T5 classes not available. Skipping load.")
            return

        try:
            # 1) Thử load model đã fine-tune
            if os.path.exists(self.model_path):
                self._load_from_path(self.model_path, is_finetuned=True)
                return

            # 2) Nếu không có fine-tune, load pretrained VietAI/vit5-base
            print(f"⚠️ [ViT5] Fine-tuned model not found at {self.model_path}")
            print("📦 [ViT5] Loading pretrained ViT5: VietAI/vit5-base ...")
            self._load_from_path("VietAI/vit5-base", is_finetuned=False)

        except Exception as e:
            # Bắt mọi lỗi load model/tokenizer
            print("❌ [ViT5] Error loading model:", e)
            traceback.print_exc()
            self.model = None
            self.tokenizer = None

    def _load_from_path(self, path: str, is_finetuned: bool):
        """Load tokenizer + model từ 1 path (local dir hoặc pretrained name)"""
        try:
            self.tokenizer = T5Tokenizer.from_pretrained(path)
            self.model = T5ForConditionalGeneration.from_pretrained(path)

            self.model.to(self.device)
            self.model.eval()

            if is_finetuned:
                print(f"✅ [ViT5] Loaded FINE-TUNED model from: {path} (device: {self.device})")
            else:
                print(f"⚠️ [ViT5] Using PRETRAINED model '{path}' (chưa fine-tune) (device: {self.device})")

        except Exception as e:
            print(f"❌ [ViT5] Error in _load_from_path('{path}'):", e)
            # Nếu dính lỗi sentencepiece thì in gợi ý rõ hơn
            if "SentencePiece" in str(e) or "sentencepiece" in str(e):
                print("💡 [ViT5] Hint: Cần cài sentencepiece trong virtualenv hiện tại:")
                print("    pip install sentencepiece")
                print('    # hoặc: pip install "transformers[sentencepiece]"')
            traceback.print_exc()
            self.model = None
            self.tokenizer = None

    # ==================== GENERATE ====================

    def generate(self, text, max_length=128, temperature=0.7, num_beams=4):
        """
        Paraphrase text thành câu tự nhiên

        Args:
            text: Câu cần paraphrase
            max_length: Độ dài max output (default 128)
            temperature: Sampling temperature (default 0.7)
            num_beams: Beam search size (default 4)

        Returns:
            str: Câu đã được paraphrase (hoặc original nếu model chưa load / lỗi)
        """
        if not self.model or not self.tokenizer:
            print("⚠️ [ViT5] Model not loaded, returning original text")
            return text

        # Log input
        print(f"[ViT5] INPUT: {text}")

        try:
            # Prefix cho task paraphrasing
            input_text = f"paraphrase: {text}"

            # Tokenize
            inputs = self.tokenizer(
                input_text,
                return_tensors="pt",
                max_length=512,
                truncation=True,
                padding=True,
            )

            # Move to device
            inputs = {k: v.to(self.device) for k, v in inputs.items()}

            # Generate
            with torch.no_grad():
                outputs = self.model.generate(
                    inputs["input_ids"],
                    max_length=max_length,
                    num_beams=num_beams,
                    temperature=temperature,
                    do_sample=True,
                    top_p=0.9,
                    top_k=50,
                    repetition_penalty=1.2,
                    length_penalty=1.0,
                    early_stopping=True,
                )

            # Decode
            result = self.tokenizer.decode(outputs[0], skip_special_tokens=True).strip()

            # Validation
            if not result or len(result) < 10:
                print(f"⚠️ [ViT5] Output too short: '{result}', using original")
                return text

            # Log output
            print(f"[ViT5] OUTPUT: {result}")
            return result

        except Exception as e:
            print("❌ [ViT5] Generation error:", e)
            traceback.print_exc()
            return text  # Fallback

    def batch_generate(self, texts, max_length=128, temperature=0.7, num_beams=4):
        """
        Batch generate multiple texts

        Args:
            texts: List[str] - danh sách câu cần paraphrase

        Returns:
            List[str] - danh sách câu đã paraphrase (hoặc original nếu lỗi)
        """
        if not self.model or not self.tokenizer:
            print("⚠️ [ViT5] Model not loaded in batch_generate, returning original list")
            return texts

        results = []
        for idx, text in enumerate(texts):
            try:
                result = self.generate(text, max_length, temperature, num_beams)
                results.append(result)
            except Exception as e:
                print(f"❌ [ViT5] Error generating for text[{idx}]: {text[:50]}... - {e}")
                traceback.print_exc()
                results.append(text)  # Fallback

        return results

    # ==================== UTILS ====================

    def reload_model(self):
        """Reload model (useful sau khi fine-tune xong)"""
        print("🔄 [ViT5] Reloading model ...")
        self._load_model()

    def get_model_info(self):
        """Thông tin model phục vụ endpoint /health/"""
        return {
            "model_path": self.model_path,
            "model_loaded": self.model is not None,
            "tokenizer_loaded": self.tokenizer is not None,
            "device": str(self.device),
            "is_fine_tuned": os.path.exists(self.model_path),
        }


# ==================== SINGLETON ====================

_generator_instance = None


def get_vit5_generator():
    """
    Get singleton instance của ViT5Generator
    """
    global _generator_instance
    if _generator_instance is None:
        _generator_instance = ViT5Generator()
    return _generator_instance


def reload_vit5_model():
    """
    Reload ViT5 model (gọi sau khi fine-tune xong)
    """
    global _generator_instance
    if _generator_instance is not None:
        _generator_instance.reload_model()
    else:
        _vit5_debug("reload_vit5_model() called but instance is None → creating new")
        _generator_instance = ViT5Generator()


# ==================== MANUAL TEST ====================

if __name__ == "__main__":
    # Test ViT5 generator khi chạy trực tiếp file này (python vit5_generator.py)
    gen = ViT5Generator()
    info = gen.get_model_info()
    print("\n=== ViT5 MODEL INFO ===")
    for k, v in info.items():
        print(f"- {k}: {v}")
    print("=======================\n")

    samples = [
        "Nhà hàng ABC mở cửa từ 10:00-22:00 ạ.",
        "Địa chỉ nhà hàng ABC là: 123 Nguyễn Huệ, Quận 1, TP.HCM.",
        "Anh/chị có thể liên hệ nhà hàng ABC qua số: 0901234567.",
        "Các khung giờ phục vụ tại nhà hàng ABC vào ngày anh/chị chọn là: 10:00-12:00, 12:00-14:00, 18:00-20:00, 20:00-22:00.",
    ]

    for s in samples:
        print(f"📝 Original : {s}")
        out = gen.generate(s)
        print(f"✨ ViT5 out : {out}")
        print("-" * 80)
