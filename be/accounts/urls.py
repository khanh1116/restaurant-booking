# ==================== accounts/urls.py ====================
from django.urls import path
from .views import (
    CustomerRegisterView,
    PartnerRegisterView,
    LoginView,
    ProfileView,
    LogoutView
)

app_name = 'accounts'

urlpatterns = [
    path('register/customer/', CustomerRegisterView.as_view(), name='customer-register'),
    path('register/partner/', PartnerRegisterView.as_view(), name='partner-register'),
    path('login/', LoginView.as_view(), name='login'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('logout/', LogoutView.as_view(), name='logout'),
]