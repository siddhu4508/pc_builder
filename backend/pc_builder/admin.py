from django.contrib import admin
from .models import (
    Category, Component, PriceHistory, PCBuild, BuildComponent,
    InventoryAlert, Reorder, StockHistory, App
)

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'parent', 'created_at')
    list_filter = ('parent', 'created_at')
    search_fields = ('name', 'slug', 'description')
    prepopulated_fields = {'slug': ('name',)}

@admin.register(Component)
class ComponentAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'price', 'stock', 'reorder_point', 'created_at')
    list_filter = ('category', 'created_at')
    search_fields = ('name', 'description')
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ('created_at', 'updated_at')

@admin.register(PriceHistory)
class PriceHistoryAdmin(admin.ModelAdmin):
    list_display = ('component', 'price', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('component__name',)

@admin.register(PCBuild)
class PCBuildAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'total_price', 'is_public', 'created_at')
    list_filter = ('is_public', 'created_at')
    search_fields = ('name', 'description', 'user__username')
    readonly_fields = ('total_price', 'created_at', 'updated_at')

@admin.register(BuildComponent)
class BuildComponentAdmin(admin.ModelAdmin):
    list_display = ('build', 'component', 'quantity')
    list_filter = ('build', 'component')
    search_fields = ('build__name', 'component__name')

@admin.register(InventoryAlert)
class InventoryAlertAdmin(admin.ModelAdmin):
    list_display = ('component', 'current_stock', 'status', 'created_at', 'resolved_at')
    list_filter = ('status', 'created_at', 'resolved_at')
    search_fields = ('component__name',)
    readonly_fields = ('created_at', 'resolved_at')

@admin.register(Reorder)
class ReorderAdmin(admin.ModelAdmin):
    list_display = ('component', 'quantity', 'status', 'created_at', 'updated_at')
    list_filter = ('status', 'created_at')
    search_fields = ('component__name',)
    readonly_fields = ('created_at', 'updated_at')

@admin.register(StockHistory)
class StockHistoryAdmin(admin.ModelAdmin):
    list_display = ('component', 'change_type', 'quantity', 'created_at')
    list_filter = ('change_type', 'created_at')
    search_fields = ('component__name', 'notes')
    readonly_fields = ('created_at',)

@admin.register(App)
class AppAdmin(admin.ModelAdmin):
    list_display = ('name', 'version', 'category', 'is_active', 'created_at')
    list_filter = ('category', 'is_active', 'created_at')
    search_fields = ('name', 'description')
    readonly_fields = ('created_at', 'updated_at') 