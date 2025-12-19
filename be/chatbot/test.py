#!/usr/bin/env python
"""
Chatbot Debug Test Client
Test trực tiếp các hàm trong hệ thống (giống views.py), log chi tiết mỗi bước
Kết quả phải giống y hệt khi gọi qua API
Chạy: python chatbot/test.py
"""

import os
import sys
import django
from pathlib import Path

# Setup Django
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')

try:
    django.setup()
except RuntimeError:
    pass

# ===== IMPORTS (Giống views.py) =====
from chatbot.services.intent_detector import get_intent_detector
from chatbot.services.slot_extractor import extract_all_slots
from chatbot.services.query_handler import QueryHandler
from chatbot.services.faq_handler import FAQHandler
from chatbot.services.vit5_generator import get_vit5_generator
from chatbot.services.question_validator import get_question_validator  # 🆕
from datetime import datetime
import torch
from sentence_transformers import util

# ===== COLORS =====
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'


def log_section(title):
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'=' * 80}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{title}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'=' * 80}{Colors.ENDC}\n")


def log_success(msg):
    print(f"{Colors.OKGREEN}✅ {msg}{Colors.ENDC}")


def log_warning(msg):
    print(f"{Colors.WARNING}⚠️  {msg}{Colors.ENDC}")


def log_error(msg):
    print(f"{Colors.FAIL}❌ {msg}{Colors.ENDC}")


def get_top_n_matches(intent_detector, question_text, n=2):
    """Lấy top N intent & FAQ matches"""
    user_embedding = intent_detector.model.encode(question_text, convert_to_tensor=True)
    
    top_intents = []
    top_faqs = []
    
    if intent_detector.intent_templates and intent_detector.intent_embeddings is not None:
        similarities = util.cos_sim(user_embedding, intent_detector.intent_embeddings)[0]
        top_indices = torch.topk(similarities, min(n, len(similarities))).indices
        
        for idx in top_indices:
            idx = idx.item()
            score = similarities[idx].item()
            template = intent_detector.intent_templates[idx]
            top_intents.append({
                'intent': template['intent'],
                'template_question': template['template_question'],
                'confidence': score,
            })
    
    if intent_detector.faq_data and intent_detector.faq_embeddings is not None:
        similarities = util.cos_sim(user_embedding, intent_detector.faq_embeddings)[0]
        top_indices = torch.topk(similarities, min(n, len(similarities))).indices
        
        for idx in top_indices:
            idx = idx.item()
            score = similarities[idx].item()
            faq = intent_detector.faq_data[idx]
            top_faqs.append({
                'id': faq['id'],
                'question': faq['question'],
                'answer': faq['answer'][:80] + '...' if len(faq['answer']) > 80 else faq['answer'],
                'confidence': score
            })
    
    return top_intents, top_faqs


def test_question(question_text):
    """Test 1 câu hỏi (Giống logic trong views.py)"""
    
    log_section(f"TESTING: {question_text}")
    print(f"{Colors.BOLD}{Colors.OKBLUE}Input:{Colors.ENDC} {question_text}\n")
    
    try:
        # ===== 🆕 0. QUESTION VALIDATION =====
        log_section("0. QUESTION VALIDATION")
        
        validator = get_question_validator()
        validation_result = validator.validate(question_text)
        
        validation_type = validation_result['type']
        is_valid = validation_result['is_valid']
        skip_sbert = validation_result['skip_sbert']
        
        print(f"{Colors.OKGREEN}Validation Type:{Colors.ENDC} {validation_type}")
        print(f"{Colors.OKGREEN}Is Valid:{Colors.ENDC} {is_valid}")
        print(f"{Colors.OKGREEN}Skip SBERT:{Colors.ENDC} {skip_sbert}")
        
        if not is_valid:
            print(f"\n{Colors.FAIL}Invalid Question - Message:{Colors.ENDC} {validation_result['message']}")
            return
        
        if validation_type == 'GREETING':
            log_success("Greeting detected - đi trực tiếp vào ViT5 (input = question)")
            
            # ===== 4. ViT5 GENERATION (cho greeting) =====
            log_section("4. ViT5 GENERATION")
            
            raw_answer = question_text
            final_answer = raw_answer
            
            try:
                vit5 = get_vit5_generator()
                final_answer = vit5.generate(raw_answer, max_length=128)
                
                if not final_answer or len(final_answer.strip()) < 5:
                    final_answer = "Cảm ơn bạn! Bạn muốn tìm hiểu gì về nhà hàng?"
                    log_warning("ViT5 output quá ngắn, fallback to default")
                else:
                    log_success("ViT5 generated successfully")
            
            except Exception as e:
                log_warning(f"ViT5 Failed: {e} - fallback to default")
                final_answer = "Cảm ơn bạn! Bạn muốn tìm hiểu gì về nhà hàng?"
            
            # ===== 5. FINAL RESPONSE =====
            log_section("5. FINAL RESPONSE")
            
            print(f"{Colors.BOLD}{Colors.OKGREEN}QUESTION:{Colors.ENDC}")
            print(f"  {question_text}\n")
            
            print(f"{Colors.BOLD}{Colors.OKGREEN}ANSWER (FINAL):{Colors.ENDC}")
            print(f"  {final_answer}\n")
            
            if raw_answer != final_answer:
                print(f"{Colors.BOLD}{Colors.OKBLUE}ANSWER (RAW - Before ViT5):{Colors.ENDC}")
                print(f"  {raw_answer}\n")
            
            print(f"{Colors.BOLD}{Colors.OKGREEN}METADATA:{Colors.ENDC}")
            print(f"  Intent: GREETING | Type: GREETING")
            print(f"  Skip SBERT: True (no intent detection)")
            print(f"  Confidence: 1.0")
            print(f"  Timestamp: {datetime.now().isoformat()}\n")
            return
        
        # ===== 1. INTENT DETECTION =====
        log_section("1. INTENT DETECTION")
        
        intent_detector = get_intent_detector()
        intent_result = intent_detector.detect(question_text)
        
        # Log top 2 matches
        top_intents, top_faqs = get_top_n_matches(intent_detector, question_text, n=2)
        
        if top_intents:
            print(f"{Colors.OKGREEN}Intent Template Matches:{Colors.ENDC}")
            for i, match in enumerate(top_intents[:2]):
                print(f"  Top {i+1}: {match['intent']} (score: {Colors.BOLD}{match['confidence']:.4f}{Colors.ENDC})")
                print(f"    Template: {match['template_question']}")
        
        if top_faqs:
            print(f"\n{Colors.OKCYAN}FAQ Matches:{Colors.ENDC}")
            for i, match in enumerate(top_faqs[:2]):
                print(f"  Top {i+1} [ID: {match['id']}]: {Colors.BOLD}{match['confidence']:.4f}{Colors.ENDC}")
                print(f"    Q: {match['question']}")
        
        result_type = intent_result.get('type', 'UNKNOWN')
        intent_name = intent_result.get('intent', 'UNKNOWN')
        log_success(f"Detected: {intent_name} | Type: {result_type}")
        
    except Exception as e:
        log_error(f"Validation/Intent Detection Failed: {e}")
        import traceback
        traceback.print_exc()
        return
    
    # ===== 2. SLOT EXTRACTION (nếu DB_QUERY) =====
    slots = {}
    if result_type == 'DB_QUERY':
        log_section("2. SLOT EXTRACTION")
        try:
            slots = extract_all_slots(question_text, None)
            
            if slots.get('restaurant'):
                res = slots['restaurant'].get('restaurant', {})
                print(f"{Colors.OKGREEN}Restaurant:{Colors.ENDC} {res.get('name', 'N/A')} (ID: {res.get('id')}, score: {slots['restaurant'].get('score', 0):.1f})")
            
            if slots.get('dish') and slots['dish'].get('dish'):
                dish = slots['dish']['dish']
                print(f"{Colors.OKGREEN}Dish:{Colors.ENDC} {dish.get('name', 'N/A')} ({dish.get('price')}đ, score: {slots['dish'].get('score', 0):.1f})")
            
            if slots.get('location') and slots['location'].get('type'):
                loc = slots['location']
                print(f"{Colors.OKGREEN}Location:{Colors.ENDC} {loc.get(loc['type']) or 'N/A'} (type: {loc.get('type')}, confidence: {loc.get('confidence', 0):.1f})")
        
        except Exception as e:
            log_error(f"Slot Extraction Failed: {e}")
    
    # ===== 3. HANDLE (Giống views.py) =====
    log_section("3. HANDLING")
    
    raw_answer = None
    skip_vit5 = False  # 🆕
    try:
        if result_type == 'FAQ':
            faq_handler = FAQHandler()
            result = faq_handler.handle(intent_result)
            raw_answer = result.get('answer', 'N/A')
        
        elif result_type == 'DB_QUERY':
            query_handler = QueryHandler()
            result = query_handler.handle(intent_result, slots, question_text)
            raw_answer = result.get('answer', 'N/A')
            skip_vit5 = result.get('skip_vit5', False)  # 🆕 Check flag
        
        elif result_type == 'UNKNOWN':
            raw_answer = intent_result.get('message', 'Xin lỗi, tôi chưa hiểu câu hỏi của bạn.')
        
        else:
            raw_answer = 'Xin lỗi, có lỗi xảy ra.'
        
        log_success(f"Raw Answer: {raw_answer}")
        if skip_vit5:
            log_success("skip_vit5 = True (sẽ bỏ qua ViT5)")
    
    except Exception as e:
        log_error(f"Handler Failed: {e}")
        import traceback
        traceback.print_exc()
        raw_answer = "Đã xảy ra lỗi khi xử lý câu hỏi"
    
    # ===== 4. ViT5 GENERATION =====
    log_section("4. ViT5 GENERATION")
    
    final_answer = raw_answer
    if skip_vit5:
        print(f"{Colors.WARNING}⊘ Bỏ qua ViT5 (skip_vit5 = True){Colors.ENDC}\n")
    else:
        try:
            vit5 = get_vit5_generator()
            final_answer = vit5.generate(raw_answer, max_length=128)
            
            if not final_answer or len(final_answer) < 10:
                final_answer = raw_answer
                log_warning("ViT5 output quá ngắn, fallback to raw")
            else:
                log_success("ViT5 generated successfully")
        
        except Exception as e:
            log_warning(f"ViT5 Failed: {e}")
            final_answer = raw_answer
    
    # ===== 5. FINAL RESPONSE =====
    log_section("5. FINAL RESPONSE")
    
    print(f"{Colors.BOLD}{Colors.OKGREEN}QUESTION:{Colors.ENDC}")
    print(f"  {question_text}\n")
    
    print(f"{Colors.BOLD}{Colors.OKGREEN}ANSWER (FINAL):{Colors.ENDC}")
    print(f"  {final_answer}\n")
    
    if raw_answer != final_answer:
        print(f"{Colors.BOLD}{Colors.OKBLUE}ANSWER (RAW - Before ViT5):{Colors.ENDC}")
        print(f"  {raw_answer}\n")
    
    print(f"{Colors.BOLD}{Colors.OKGREEN}METADATA:{Colors.ENDC}")
    print(f"  Intent: {intent_name} | Type: {result_type}")
    print(f"  Skip ViT5: {skip_vit5}")
    print(f"  Confidence: {intent_result.get('confidence', 0.0):.4f}")
    print(f"  Timestamp: {datetime.now().isoformat()}\n")


def main():
    print(f"\n{Colors.BOLD}{Colors.HEADER}")
    print("╔" + "=" * 78 + "╗")
    print("║" + " CHATBOT DEBUG TEST (Interactive) ".center(78) + "║")
    print("║" + " Gọi trực tiếp các hàm - Kết quả giống API ".center(78) + "║")
    print("║" + " [Bao gồm: QuestionValidator, skip_vit5, format liệt kê] ".center(78) + "║")
    print("╚" + "=" * 78 + "╝")
    print(f"{Colors.ENDC}\n")
    
    print(f"{Colors.OKGREEN}Test Cases (Gợi ý):{Colors.ENDC}\n")
    print(f"  {Colors.OKCYAN}Greeting:{Colors.ENDC} hello, alo, cảm ơn, tạm biệt")
    print(f"  {Colors.OKCYAN}Nonsense:{Colors.ENDC} asdfgh, 12345, qwerty")
    print(f"  {Colors.OKCYAN}Valid Question:{Colors.ENDC} các nhà hàng ở quận 1, nhà hàng korean có những món gì")
    print(f"\n{Colors.OKGREEN}Nhập câu hỏi (exit/help):{Colors.ENDC}\n")
    
    while True:
        try:
            question = input(f"{Colors.BOLD}{Colors.OKBLUE}>>> Câu hỏi:{Colors.ENDC} ").strip()
            
            if not question:
                log_warning("Vui lòng nhập câu hỏi")
                continue
            
            if question.lower() == 'exit':
                log_success("Bye! 👋")
                break
            
            if question.lower() == 'help':
                print("\nGõ câu hỏi để test, 'exit' để thoát")
                print("Test cases: greeting (hello, cảm ơn, ...), nonsense (asdfgh, qwerty, ...)\n")
                continue
            
            test_question(question)
            
        except KeyboardInterrupt:
            print(f"\n{Colors.WARNING}Thoát (Ctrl+C){Colors.ENDC}")
            break
        except Exception as e:
            log_error(f"Error: {e}")


if __name__ == '__main__':
    main()
