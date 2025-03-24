from rest_framework import viewsets, permissions
from backend.pc_builder.models import PCBuild
from .serializers import BuildSerializer
from users.permissions import IsOwnerOrAdmin

class BuildViewSet(viewsets.ModelViewSet):
    queryset = PCBuild.objects.all()
    serializer_class = BuildSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]

    def get_queryset(self):
        if self.request.user.is_staff:
            return PCBuild.objects.all()
        return PCBuild.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user) 