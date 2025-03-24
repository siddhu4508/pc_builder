from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from backend.pc_builder.models import Component, PCBuild, BuildComponent

class BuildComment(models.Model):
    build = models.ForeignKey(PCBuild, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.TextField(_('content'))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Comment by {self.user.username} on {self.build.title}" 