from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from backend.pc_builder.models import PCBuild

class Like(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    build = models.ForeignKey(PCBuild, on_delete=models.CASCADE, related_name='likes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'build']
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} likes {self.build.title}"

class BuildComment(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='social_comments')
    build = models.ForeignKey(PCBuild, on_delete=models.CASCADE, related_name='social_comments')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} commented on {self.build.title}"

class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('like', _('Like')),
        ('comment', _('Comment')),
        ('follow', _('Follow')),
        ('mention', _('Mention')),
    ]

    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_notifications')
    notification_type = models.CharField(_('notification type'), max_length=10, choices=NOTIFICATION_TYPES)
    build = models.ForeignKey(PCBuild, on_delete=models.CASCADE, null=True, blank=True)
    content = models.TextField(_('content'))
    is_read = models.BooleanField(_('is read'), default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.sender.username} {self.get_notification_type_display()} {self.recipient.username}"

class Share(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    build = models.ForeignKey(PCBuild, on_delete=models.CASCADE, related_name='shares')
    platform = models.CharField(_('platform'), max_length=50)  # e.g., 'facebook', 'twitter', etc.
    share_url = models.URLField(_('share URL'), blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} shared {self.build.title} on {self.platform}" 