from django.urls import path, include
from rest_framework.routers import DefaultRouter
from backend.pc_builder.views import PCBuildViewSet
from .views import BuildCommentViewSet

router = DefaultRouter()
router.register(r'builds', PCBuildViewSet, basename='build')
router.register(r'comments', BuildCommentViewSet, basename='comment')

urlpatterns = [
    path('', include(router.urls)),
] 