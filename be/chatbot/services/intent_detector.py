# SBERT matching
#  chatbot/services/intent_detector.py
"""
Intent Detector - Detect intent từ user question bằng Vietnamese SBERT
"""
import os
import csv
import torch
from sentence_transformers import SentenceTransformer, util
from django.conf import settings


class IntentDetector:
    """
    Detect intent từ user question
    Sử dụng Vietnamese SBERT để tìm câu hỏi tương tự trong knowledge base
    """
    
    def __init__(self):
        # Paths
        self.model_path = os.path.join(settings.BASE_DIR, 'chatbot/ml_models/vietnamese-sbert-finetuned-finalv2')
        self.faq_path = os.path.join(settings.BASE_DIR, 'chatbot/ml_models/knowledge_base/faq_data.csv')
        self.intent_path = os.path.join(settings.BASE_DIR, 'chatbot/ml_models/knowledge_base/intent_template.csv')
        
        # Load model
        self.model = self._load_model()
        
        # Load knowledge base
        self.faq_data = self._load_faq()
        self.intent_templates = self._load_intent_templates()
        
        # Encode templates (cache)
        self.faq_embeddings = None
        self.intent_embeddings = None
        self._encode_knowledge_base()
        
        # Thresholds
        self.intent_threshold = 0.75  # Ưu tiên intent_template
        self.faq_threshold = 0.60     # FAQ threshold thấp hơn
        self.fallback_threshold = 0.50  # Dưới ngưỡng này → không hiểu
    
    def _load_model(self):
        """Load Vietnamese SBERT model"""
        try:
            # Nếu đã fine-tune → load từ local
            if os.path.exists(self.model_path):
                model = SentenceTransformer(self.model_path)
                print(f"✅ Loaded fine-tuned model from {self.model_path}")
            else:
                # Fallback: load pretrained
                model = SentenceTransformer('keepitreal/vietnamese-sbert')
                print("⚠️ Using pretrained vietnamese-sbert (chưa fine-tune)")
            
            return model
        except Exception as e:
            print(f"❌ Error loading model: {e}")
            # Fallback model
            return SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
    
    def _load_faq(self):
        """Load FAQ data từ CSV"""
        faq_data = []
        
        try:
            with open(self.faq_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    faq_data.append({
                        'id': row['id'],
                        'question': row['question'],
                        'answer': row['answer'],
                        'category': row['category']
                    })
            
            print(f"✅ Loaded {len(faq_data)} FAQ entries")
        except FileNotFoundError:
            print(f"⚠️ FAQ file not found: {self.faq_path}")
        except Exception as e:
            print(f"❌ Error loading FAQ: {e}")
        
        return faq_data
    
    def _load_intent_templates(self):
        """Load intent templates từ CSV (chịu được dòng trống, khoảng trắng, dòng lỗi)"""
        templates = []

        try:
            with open(self.intent_path, 'r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)

                for line_no, row in enumerate(reader, start=2):  # dòng 1 là header
                    # Nếu hoàn toàn không có data -> bỏ qua
                    if not row:
                        continue

                    # Chuẩn hóa key + value: strip khoảng trắng 2 đầu
                    normalized = {}
                    for k, v in row.items():
                        if k is None:
                            continue
                        key = k.strip()
                        value = v.strip() if isinstance(v, str) else ("" if v is None else v)
                        normalized[key] = value

                    # Nếu cả id và template_question đều rỗng -> coi như dòng trống separator
                    if not normalized.get('id') and not normalized.get('template_question'):
                        continue

                    # Thiếu cột quan trọng -> log cảnh báo, bỏ qua dòng này
                    if not normalized.get('id') or not normalized.get('template_question') or not normalized.get('intent'):
                        print(f"⚠️ Skip invalid intent row at line {line_no}: {normalized}")
                        continue

                    slots_raw = normalized.get('slots', '')
                    slots = [s.strip() for s in slots_raw.split(',') if s.strip()]

                    templates.append({
                        'id': normalized['id'],
                        'template_question': normalized['template_question'],
                        'intent': normalized['intent'],
                        'slots': slots,
                        'answer_template': normalized.get('answer_template', '')
                    })

            print(f"✅ Loaded {len(templates)} intent templates")

        except FileNotFoundError:
            print(f"⚠️ Intent template file not found: {self.intent_path}")
        except Exception as e:
            print(f"❌ Error loading intent templates: {e}")

        return templates

    
    def _encode_knowledge_base(self):
        """Encode tất cả questions thành embeddings (cache)"""
        if self.faq_data:
            faq_questions = [item['question'] for item in self.faq_data]
            self.faq_embeddings = self.model.encode(faq_questions, convert_to_tensor=True)
        
        if self.intent_templates:
            intent_questions = [item['template_question'] for item in self.intent_templates]
            self.intent_embeddings = self.model.encode(intent_questions, convert_to_tensor=True)
    
    def detect(self, user_question):
        """
        Detect intent từ user question
        
        Returns:
        {
            'type': 'FAQ' | 'DB_QUERY' | 'UNKNOWN',
            'intent': 'ASK_MENU' | 'CHECK_AVAILABILITY' | None,
            'matched_question': str,
            'answer': str (nếu FAQ),
            'answer_template': str (nếu DB_QUERY),
            'required_slots': list,
            'confidence': float
        }
        """
        # Encode user question
        user_embedding = self.model.encode(user_question, convert_to_tensor=True)
        
        # 1. Kiểm tra intent_template trước (ưu tiên cao hơn)
        intent_result = self._match_intent_template(user_embedding, user_question)
        
        if intent_result and intent_result['confidence'] >= self.intent_threshold:
            return intent_result
        
        # 2. Kiểm tra FAQ
        faq_result = self._match_faq(user_embedding, user_question)
        
        if faq_result and faq_result['confidence'] >= self.faq_threshold:
            # Nếu intent_result có confidence cao hơn FAQ → chọn intent
            if intent_result and intent_result['confidence'] > faq_result['confidence']:
                return intent_result
            return faq_result
        
        # 3. Nếu có intent_result (dù < threshold) → vẫn trả về nếu > fallback
        if intent_result and intent_result['confidence'] >= self.fallback_threshold:
            return intent_result
        
        # 4. Không match gì cả
        return {
            'type': 'UNKNOWN',
            'intent': None,
            'matched_question': None,
            'answer': None,
            'confidence': 0.0,
            'message': 'Xin lỗi, tôi chưa hiểu câu hỏi của bạn. Bạn có thể diễn đạt lại được không?'
        }
    
    def _match_intent_template(self, user_embedding, user_question):
        """Match với intent templates"""
        if not self.intent_templates or self.intent_embeddings is None:
            return None
        
        # Calculate similarities
        similarities = util.cos_sim(user_embedding, self.intent_embeddings)[0]
        
        # Get best match
        best_idx = torch.argmax(similarities).item()
        best_score = similarities[best_idx].item()
        
        matched_template = self.intent_templates[best_idx]
        
        return {
            'type': 'DB_QUERY',
            'intent': matched_template['intent'],
            'matched_question': matched_template['template_question'],
            'answer_template': matched_template['answer_template'],
            'required_slots': matched_template['slots'],
            'confidence': best_score
        }
    
    def _match_faq(self, user_embedding, user_question):
        """Match với FAQ"""
        if not self.faq_data or self.faq_embeddings is None:
            return None
        
        # Calculate similarities
        similarities = util.cos_sim(user_embedding, self.faq_embeddings)[0]
        
        # Get best match
        best_idx = torch.argmax(similarities).item()
        best_score = similarities[best_idx].item()
        
        matched_faq = self.faq_data[best_idx]
        
        return {
            'type': 'FAQ',
            'intent': 'FAQ_' + matched_faq['category'],
            'matched_question': matched_faq['question'],
            'answer': matched_faq['answer'],
            'confidence': best_score,
            'category': matched_faq['category']
        }
    
    def get_intent_info(self, intent_name):
        """Get thông tin về intent (để debug)"""
        for template in self.intent_templates:
            if template['intent'] == intent_name:
                return template
        return None


# ==================== SINGLETON ====================
_detector_instance = None

def get_intent_detector():
    """Get singleton instance"""
    global _detector_instance
    if _detector_instance is None:
        _detector_instance = IntentDetector()
    return _detector_instance