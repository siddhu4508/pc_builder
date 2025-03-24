from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    ComponentViewSet, AdminDashboardView,
    InventoryManagementView, AnalyticsView, AppViewSet
)
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'components', ComponentViewSet)
router.register(r'admin/apps', AppViewSet, basename='admin-apps')
router.register(r'admin/inventory', InventoryManagementView, basename='inventory')

urlpatterns = [
    path('api/', include(router.urls)),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/admin/dashboard/', AdminDashboardView.as_view(), name='admin_dashboard'),
    path('api/admin/analytics/', AnalyticsView.as_view(), name='analytics'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) 