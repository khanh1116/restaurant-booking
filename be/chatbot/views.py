# chatbot/views.py
"""
Chatbot Views - API endpoints
UPDATED: Thêm QuestionValidator & skip_vit5 flag
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone

from chatbot.services.intent_detector import get_intent_detector
from chatbot.services.slot_extractor import extract_all_slots
from chatbot.services.query_handler import QueryHandler
from chatbot.services.faq_handler import FAQHandler
from chatbot.services.vit5_generator import get_vit5_generator
from chatbot.services.question_validator import get_question_validator  # 🆕
from chatbot.models import ChatLog

@api_view(['POST'])
@permission_classes([AllowAny])  # Hoặc [IsAuthenticated] nếu cần login
def chatbot_ask(request):
    """
    API endpoint cho chatbot
    
    POST /api/chatbot/ask/
    Body: {
        "question": "Nhà hàng ABC còn chỗ không?",
        "context": {  // Optional
            "restaurant_id": 5,
            "user_id": 123
        },
        "use_vit5": true  // Optional - default true
    }
    
    Response: {
        "answer": "Vẫn còn 3 chỗ trống ạ!",
        "raw_answer": "Nhà hàng ABC còn 3 chỗ...",  // Before ViT5
        "type": "DB_QUERY" | "FAQ" | "UNKNOWN",
        "confidence": 0.85,
        "debug": {...}  // Optional (nếu có ?debug=1)
    }
    """
    # Get question
    question = request.data.get('question', '').strip()
    context = request.data.get('context', {})
    use_vit5 = request.data.get('use_vit5', True)  # Mặc định dùng ViT5
    
    if not question:
        return Response({
            'error': 'Question is required',
            'answer': 'Bạn muốn hỏi gì ạ?'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Debug mode
    debug_mode = request.GET.get('debug', '0') == '1'
    
    try:
        # ==================== 🆕 0. QUESTION VALIDATION ====================
        validator = get_question_validator()
        validation_result = validator.validate(question)
        
        if not validation_result['is_valid']:
            # Câu không hợp lệ (nonsense, gibberish, ...)
            return Response({
                'answer': validation_result['message'],
                'type': 'INVALID',
                'confidence': 0.0
            }, status=status.HTTP_200_OK)  # Status 200 vì vẫn là response hợp lệ
        
        # 🆕 GREETING SPECIAL HANDLING - Đi trực tiếp vào ViT5
        if validation_result['type'] == 'GREETING':
            raw_answer = question  # Input = question (hello, alo, ...)
            final_answer = raw_answer
            
            if use_vit5:
                try:
                    vit5 = get_vit5_generator()
                    final_answer = vit5.generate(raw_answer, max_length=128)
                    
                    # Nếu ViT5 fail hoặc output quá ngắn -> fallback
                    if not final_answer or len(final_answer.strip()) < 5:
                        final_answer = "Cảm ơn bạn! Bạn muốn tìm hiểu gì về nhà hàng?"
                
                except Exception as vit5_error:
                    # ViT5 fail -> fallback to default
                    print(f"⚠️ ViT5 generation failed for greeting: {vit5_error}")
                    final_answer = "Cảm ơn bạn! Bạn muốn tìm hiểu gì về nhà hàng?"
            else:
                # Không dùng ViT5 -> trả về default
                final_answer = "Cảm ơn bạn! Bạn muốn tìm hiểu gì về nhà hàng?"
            
            # Log greeting
            try:
                ChatLog.objects.create(
                    user=request.user if request.user.is_authenticated else None,
                    session_id=context.get('session_id'),
                    question=question,
                    answer=final_answer,
                    intent='GREETING',
                    confidence=1.0,
                    type='GREETING'
                )
            except Exception as log_error:
                print(f"⚠️ Failed to log chat: {log_error}")
            
            response_data = {
                'answer': final_answer,
                'type': 'GREETING',
                'confidence': 1.0
            }
            
            if debug_mode:
                response_data['debug'] = {
                    'question': question,
                    'validation_type': 'GREETING',
                    'raw_answer': raw_answer,
                    'final_answer': final_answer,
                    'vit5_used': use_vit5
                }
            
            if raw_answer != final_answer:
                response_data['raw_answer'] = raw_answer
            
            return Response(response_data, status=status.HTTP_200_OK)
        
        # ==================== PIPELINE ====================
        
        # 1. Intent Detection
        intent_detector = get_intent_detector()
        intent_result = intent_detector.detect(question)
        
        # 2. Slot Extraction
        conn = None  # Mock connection (không dùng pymysql)
        slots = extract_all_slots(question, conn)
        
        # 🆕 Lưu raw text để query_handler có thể extract lại
        slots['_raw_text'] = question
        
        # Merge context vào slots (nếu có)
        if context:
            for key, value in context.items():
                if key not in slots or slots[key] is None:
                    slots[key] = value
        
        # 3. Handle based on type
        if intent_result['type'] == 'FAQ':
            faq_handler = FAQHandler()
            result = faq_handler.handle(intent_result)
        
        elif intent_result['type'] == 'DB_QUERY':
            query_handler = QueryHandler()
            result = query_handler.handle(
                intent_result, 
                slots, 
                user_text=question  # 🆕 Pass raw text
            )
        
        elif intent_result['type'] == 'UNKNOWN':
            result = {
                'answer': intent_result.get('message', 'Xin lỗi, tôi chưa hiểu câu hỏi của bạn.'),
                'type': 'UNKNOWN',
                'confidence': intent_result.get('confidence', 0.0),
                'answer': 'Xin lỗi, có lỗi xảy ra.',
                'type': 'ERROR'
            }
        
        # Get raw answer (trước khi qua ViT5)
        raw_answer = result.get('answer', 'Xin lỗi, tôi không có câu trả lời.')
        skip_vit5 = result.get('skip_vit5', False)  # 🆕 Check flag
        
        # ==================== 4. ViT5 GENERATION ====================
        
        final_answer = raw_answer
        
        if use_vit5 and not skip_vit5:  # 🆕 Bỏ qua ViT5 nếu skip_vit5 = True
            try:
                vit5 = get_vit5_generator()
                final_answer = vit5.generate(raw_answer, max_length=128)
                
                # Nếu ViT5 trả về empty hoặc quá ngắn -> fallback
                if not final_answer or len(final_answer) < 10:
                    final_answer = raw_answer
                    
            except Exception as vit5_error:
                # ViT5 fail -> fallback to raw answer
                print(f"⚠️ ViT5 generation failed: {vit5_error}")
                final_answer = raw_answer
        

        # ==================== 🆕 LOG CHATLOG ====================
        try:
            ChatLog.objects.create(
                user=request.user if request.user.is_authenticated else None,
                session_id=context.get('session_id'),  # Nếu frontend gửi lên
                question=question,
                answer=final_answer,
                intent=intent_result.get('intent'),
                confidence=intent_result.get('confidence', 0.0),
                type=result.get('type', 'UNKNOWN')
            )
        except Exception as log_error:
            print(f"⚠️ Failed to log chat: {log_error}")
            # Không fail chatbot nếu logging fail
        

        # ==================== BUILD RESPONSE ====================
        
        response_data = {
            'answer': final_answer,
            'type': result.get('type'),
            'confidence': intent_result.get('confidence', 0.0)
        }
        
        # Add debug info
        if debug_mode:
            response_data['debug'] = {
                'question': question,
                'intent_result': intent_result,
                'extracted_slots': slots,
                'result': result,
                'raw_answer': raw_answer,
                'vit5_used': use_vit5,
                'final_answer': final_answer
            }
        
        # Add raw answer nếu khác final
        if raw_answer != final_answer:
            response_data['raw_answer'] = raw_answer
        
        return Response(response_data, status=status.HTTP_200_OK)
    
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        
        print(f"❌ Chatbot error: {e}")
        print(error_trace)
        
        return Response({
            'error': str(e),
            'answer': 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau.',
            'type': 'ERROR',
            'trace': error_trace if debug_mode else None
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def chatbot_health(request):
    """
    Health check endpoint
    GET /api/chatbot/health/
    """
    try:
        intent_detector = get_intent_detector()
        
        # Check ViT5
        vit5_status = 'not_loaded'
        try:
            vit5 = get_vit5_generator()
            vit5_status = 'loaded' if vit5.model else 'failed'
        except:
            vit5_status = 'error'
        
        return Response({
            'status': 'healthy',
            'model_loaded': intent_detector.model is not None,
            'faq_count': len(intent_detector.faq_data),
            'intent_count': len(intent_detector.intent_templates),
            'vit5_status': vit5_status,
            'timestamp': timezone.now().isoformat()
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': timezone.now().isoformat()
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def chatbot_test(request):
    """
    Test endpoint - Batch test multiple questions
    
    POST /api/chatbot/test/
    Body: {
        "questions": [
            "Nhà hàng ABC còn chỗ không?",
            "Menu có món gì?",
            ...
        ],
        "use_vit5": true  // Optional
    }
    
    Response: {
        "results": [
            {
                "question": "...", 
                "answer": "...", 
                "raw_answer": "...",
                "type": "...", 
                "confidence": ...
            },
            ...
        ]
    }
    """
    questions = request.data.get('questions', [])
    use_vit5 = request.data.get('use_vit5', True)
    
    if not questions or not isinstance(questions, list):
        return Response({
            'error': 'questions must be a list'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    results = []
    
    # Initialize services
    intent_detector = get_intent_detector()
    query_handler = QueryHandler()
    faq_handler = FAQHandler()
    conn = None  # Mock connection
    
    if use_vit5:
        try:
            vit5 = get_vit5_generator()
        except:
            vit5 = None
    else:
        vit5 = None
    
    # Process questions
    for question in questions:
        try:
            # Process question
            intent_result = intent_detector.detect(question)
            slots = extract_all_slots(question, conn)
            slots['_raw_text'] = question
            
            if intent_result['type'] == 'FAQ':
                result = faq_handler.handle(intent_result)
            elif intent_result['type'] == 'DB_QUERY':
                result = query_handler.handle(intent_result, slots, user_text=question)
            else:
                result = {
                    'answer': intent_result.get('message', 'Không hiểu câu hỏi'),
                    'type': 'UNKNOWN'
                }
            
            raw_answer = result.get('answer', '')
            final_answer = raw_answer
            
            # Apply ViT5 if available
            if vit5:
                try:
                    final_answer = vit5.generate(raw_answer)
                    if not final_answer or len(final_answer) < 10:
                        final_answer = raw_answer
                except:
                    final_answer = raw_answer
            
            results.append({
                'question': question,
                'answer': final_answer,
                'raw_answer': raw_answer if raw_answer != final_answer else None,
                'type': result.get('type'),
                'confidence': intent_result.get('confidence', 0.0),
                'intent': intent_result.get('intent'),
                'slots': {k: v for k, v in slots.items() if k != '_raw_text'}
            })
        
        except Exception as e:
            results.append({
                'question': question,
                'error': str(e),
                'type': 'ERROR'
            })
    
    return Response({
        'total': len(questions),
        'vit5_enabled': use_vit5,
        'results': results
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def chatbot_vit5_test(request):
    """
    🆕 Test ViT5 paraphrasing
    
    POST /api/chatbot/vit5-test/
    Body: {
        "text": "Nhà hàng ABC mở cửa từ 10:00-22:00 ạ."
    }
    
    Response: {
        "original": "...",
        "paraphrased": "...",
        "model_status": "..."
    }
    """
    text = request.data.get('text', '').strip()
    
    if not text:
        return Response({
            'error': 'Text is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        vit5 = get_vit5_generator()
        
        if not vit5.model:
            return Response({
                'error': 'ViT5 model not loaded',
                'original': text,
                'model_status': 'not_loaded'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        paraphrased = vit5.generate(text)
        
        return Response({
            'original': text,
            'paraphrased': paraphrased,
            'model_status': 'loaded',
            'model_path': vit5.model_path
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        import traceback
        return Response({
            'error': str(e),
            'trace': traceback.format_exc(),
            'original': text
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)