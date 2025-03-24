from rest_framework import serializers
from .models import BuildComment
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

class BuildCommentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = BuildComment
        fields = ['id', 'user', 'user_id', 'build', 'content', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at'] 