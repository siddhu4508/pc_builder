from rest_framework import viewsets, status, permissions, pagination, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from datetime import timedelta
from django.db.models import Count
from .permissions import IsAdminUser

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'is_staff', 'is_active', 'date_joined', 'last_login')
        read_only_fields = ('date_joined', 'last_login')
        extra_kwargs = {
            'password': {'write_only': True}
        }

class StandardResultsSetPagination(pagination.PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    pagination_class = StandardResultsSetPagination

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        if 'password' in data:
            data['password'] = make_password(data['password'])
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        data = request.data.copy()
        if 'password' in data:
            data['password'] = make_password(data['password'])
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        user = self.get_object()
        new_password = request.data.get('new_password')
        if not new_password:
            return Response(
                {'error': 'New password is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        user.password = make_password(new_password)
        user.save()
        return Response({'status': 'password reset successful'})

    @action(detail=False, methods=['get'])
    def stats(self, request):
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        admin_users = User.objects.filter(is_staff=True).count()
        recent_users = User.objects.filter(
            date_joined__gte=timezone.now() - timedelta(days=30)
        ).count()

        return Response({
            'total_users': total_users,
            'active_users': active_users,
            'admin_users': admin_users,
            'recent_users': recent_users
        })

    @action(detail=False, methods=['get'])
    def activity(self, request):
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)
        
        user_activity = User.objects.filter(
            last_login__gte=start_date
        ).values('date_joined').annotate(
            count=Count('id')
        ).order_by('date_joined')

        return Response({
            'user_activity': list(user_activity)
        }) 