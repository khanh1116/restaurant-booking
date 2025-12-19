# chatbot/services/faq_handler.py
"""
FAQ Handler - Xử lý FAQ questions
"""


class FAQHandler:
    """
    Handle FAQ intents
    Trả về answer có sẵn từ knowledge base
    """
    
    def handle(self, intent_result):
        """
        Handle FAQ question
        
        Args:
            intent_result: dict từ IntentDetector (type='FAQ')
        
        Returns:
            {
                'answer': str,
                'type': 'FAQ',
                'category': str
            }
        """
        # Lấy answer có sẵn từ intent_result
        answer = intent_result.get('answer', 'Xin lỗi, tôi không có câu trả lời cho câu hỏi này.')
        category = intent_result.get('category', 'GENERAL')
        
        return {
            'answer': answer,
            'type': 'FAQ',
            'category': category
        }














 

# # Return FAQ answer
# # chatbot/services/faq_handler.py

# """
# FAQ Handler - Xử lý câu hỏi FAQ (trả answer trực tiếp)
# """


# class FAQHandler:
#     """
#     Handle FAQ questions
#     Đơn giản: trả answer từ CSV
#     """
    
#     def handle(self, intent_result):
#         """
#         Handle FAQ question
        
#         Args:
#             intent_result: dict từ IntentDetector
        
#         Returns:
#             {
#                 'answer': str,
#                 'type': 'FAQ',
#                 'confidence': float
#             }
#         """
#         answer = intent_result.get('answer', 'Xin lỗi, tôi không có câu trả lời.')
        
#         return {
#             'answer': answer,
#             'type': 'FAQ',
#             'confidence': intent_result.get('confidence', 0.0),
#             'category': intent_result.get('category')
#         }