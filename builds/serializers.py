from rest_framework import serializers
from backend.pc_builder.models import PCBuild, Component, BuildComponent
from users.serializers import UserSerializer

class ComponentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Component
        fields = ('id', 'name', 'category', 'price', 'stock')

class BuildComponentSerializer(serializers.ModelSerializer):
    component = ComponentSerializer(read_only=True)
    
    class Meta:
        model = BuildComponent
        fields = ('component', 'quantity', 'price_at_time')

class BuildSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    components = BuildComponentSerializer(source='buildcomponent_set', many=True, read_only=True)
    
    class Meta:
        model = PCBuild
        fields = ('id', 'title', 'description', 'components', 'total_price', 
                 'is_public', 'created_at', 'updated_at', 'user', 'share_token', 'views')
        read_only_fields = ('id', 'created_at', 'updated_at', 'user', 'share_token', 'views') 