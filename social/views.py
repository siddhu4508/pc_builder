from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import BuildComment
from .serializers import BuildCommentSerializer

class BuildCommentViewSet(viewsets.ModelViewSet):
    queryset = BuildComment.objects.all()
    serializer_class = BuildCommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = BuildComment.objects.all()
        build_id = self.request.query_params.get('build_id', None)
        if build_id is not None:
            queryset = queryset.filter(build_id=build_id)
        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user) 