from rest_framework import serializers
from .models import Component, PCBuild, BuildComponent, InventoryAlert, Reorder, StockHistory, App

class ComponentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Component
        fields = '__all__'

class BuildComponentSerializer(serializers.ModelSerializer):
    component = ComponentSerializer(read_only=True)

    class Meta:
        model = BuildComponent
        fields = '__all__'

class PCBuildSerializer(serializers.ModelSerializer):
    components = BuildComponentSerializer(source='buildcomponent_set', many=True, read_only=True)

    class Meta:
        model = PCBuild
        fields = '__all__'

class InventoryAlertSerializer(serializers.ModelSerializer):
    component_name = serializers.CharField(source='component.name', read_only=True)

    class Meta:
        model = InventoryAlert
        fields = '__all__'

class ReorderSerializer(serializers.ModelSerializer):
    component_name = serializers.CharField(source='component.name', read_only=True)

    class Meta:
        model = Reorder
        fields = '__all__'

class StockHistorySerializer(serializers.ModelSerializer):
    component_name = serializers.CharField(source='component.name', read_only=True)

    class Meta:
        model = StockHistory
        fields = '__all__'

class AppSerializer(serializers.ModelSerializer):
    class Meta:
        model = App
        fields = ['id', 'name', 'description', 'version', 'category', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at'] 