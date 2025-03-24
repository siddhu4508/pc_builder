from rest_framework import viewsets, status, permissions, pagination, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Count, Sum, Q, F, ExpressionWrapper, DateField
from django.utils import timezone
from datetime import timedelta
from django.conf import settings
from .models import PCBuild, Component, InventoryAlert, Reorder, StockHistory, BuildComponent, App
from .serializers import (
    PCBuildSerializer, ComponentSerializer, InventoryAlertSerializer,
    ReorderSerializer, StockHistorySerializer, AppSerializer
)
from .services import PCBuilderService
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from django.db import models
from .permissions import IsAdminUser
from .user_views import UserViewSet
import pandas as pd
from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle
import xlsxwriter
import uuid

class AdminDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    @extend_schema(
        description="Get dashboard statistics for admin panel",
        responses={200: OpenApiTypes.OBJECT}
    )
    def get(self, request):
        # Get total components and value
        total_components = Component.objects.count()
        total_value = Component.objects.aggregate(total=Sum('price'))['total'] or 0

        # Get components by category
        components_by_category = Component.objects.values('category').annotate(count=Count('id'))
        components_by_category = {item['category']: item['count'] for item in components_by_category}

        # Get low stock components (less than 5)
        low_stock_components = Component.objects.filter(stock__lt=5).count()

        # Get recent additions (last 7 days)
        recent_additions = Component.objects.filter(
            created_at__gte=timezone.now() - timedelta(days=7)
        ).order_by('-created_at')[:5]

        return Response({
            'total_components': total_components,
            'total_value': total_value,
            'components_by_category': components_by_category,
            'low_stock_components': low_stock_components,
            'recent_additions': ComponentSerializer(recent_additions, many=True).data
        })

class ComponentViewSet(viewsets.ModelViewSet):
    queryset = Component.objects.all()
    serializer_class = ComponentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsAdminUser()]
        return super().get_permissions()

    @extend_schema(
        description="Check component compatibility with selected components",
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiTypes.OBJECT}
    )
    @action(detail=True, methods=['post'])
    def check_compatibility(self, request, pk=None):
        component_ids = request.data.get('component_ids', [])
        try:
            selected_components = [Component.objects.get(id=cid) for cid in component_ids]
            new_component = self.get_object()
            PCBuilderService.check_compatibility(selected_components, new_component)
            return Response({'compatible': True})
        except Exception as e:
            return Response({'compatible': False, 'error': str(e)})

    @extend_schema(
        description="Get components by category",
        parameters=[
            OpenApiParameter(name='category', type=OpenApiTypes.STR, location=OpenApiParameter.QUERY)
        ],
        responses={200: ComponentSerializer(many=True)}
    )
    @action(detail=False, methods=['get'])
    def by_category(self, request):
        category = request.query_params.get('category')
        if not category:
            return Response({'error': 'Category parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        components = self.queryset.filter(category=category)
        serializer = self.get_serializer(components, many=True)
        return Response(serializer.data)

    @extend_schema(
        description="Get low stock components",
        responses={200: ComponentSerializer(many=True)}
    )
    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        components = self.queryset.filter(stock__lt=5)
        serializer = self.get_serializer(components, many=True)
        return Response(serializer.data)

    @extend_schema(
        description="Get recent additions",
        responses={200: ComponentSerializer(many=True)}
    )
    @action(detail=False, methods=['get'])
    def recent(self, request):
        components = self.queryset.order_by('-created_at')[:10]
        serializer = self.get_serializer(components, many=True)
        return Response(serializer.data)

class PCBuildViewSet(viewsets.ModelViewSet):
    queryset = PCBuild.objects.all()
    serializer_class = PCBuildSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff:
            return PCBuild.objects.all()
        return PCBuild.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @extend_schema(
        description="Create a new PC build",
        request=PCBuildSerializer,
        responses={201: PCBuildSerializer}
    )
    def create(self, request, *args, **kwargs):
        try:
            build = PCBuilderService.create_build(
                user_id=request.user.id,
                title=request.data.get('title'),
                description=request.data.get('description'),
                components_data=request.data.get('components', []),
                is_public=request.data.get('is_public', True)
            )
            serializer = self.get_serializer(build)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        description="Validate components without saving",
        request=PCBuildSerializer,
        responses={200: OpenApiTypes.OBJECT}
    )
    @action(detail=True, methods=['post'])
    def validate_components(self, request, pk=None):
        try:
            components = PCBuilderService.validate_build(request.data.get('components', []))
            return Response({'valid': True})
        except Exception as e:
            return Response({'valid': False, 'error': str(e)})

    @action(detail=True, methods=['post'])
    def share(self, request, pk=None):
        build = self.get_object()
        if not build.is_public:
            build.is_public = True
            build.save()
        
        share_token = str(uuid.uuid4())
        build.share_token = share_token
        build.save()
        
        share_url = f"{settings.FRONTEND_URL}/builds/shared/{share_token}"
        return Response({'share_url': share_url})

    @action(detail=True, methods=['post'])
    def unshare(self, request, pk=None):
        build = self.get_object()
        build.is_public = False
        build.share_token = None
        build.save()
        return Response({'status': 'build unshared'})

    @action(detail=False, methods=['get'])
    def stats(self, request):
        total_builds = PCBuild.objects.count()
        total_value = PCBuild.objects.aggregate(total=Sum('total_price'))['total'] or 0
        recent_builds = PCBuild.objects.filter(
            created_at__gte=timezone.now() - timedelta(days=30)
        ).count()
        public_builds = PCBuild.objects.filter(is_public=True).count()

        return Response({
            'total_builds': total_builds,
            'total_value': total_value,
            'recent_builds': recent_builds,
            'public_builds': public_builds
        })

    @action(detail=False, methods=['get'])
    def popular(self, request):
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)
        
        popular_builds = PCBuild.objects.filter(
            created_at__gte=start_date,
            is_public=True
        ).annotate(
            view_count=Count('views')
        ).order_by('-view_count')[:10]

        serializer = self.get_serializer(popular_builds, many=True)
        return Response(serializer.data)

class InventoryManagementView(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def list(self, request):
        """Get inventory management dashboard data"""
        alerts = InventoryAlert.objects.select_related('component').all()
        reorder_points = Component.objects.filter(
            Q(stock__lte=models.F('reorder_point')) | Q(stock=0)
        ).values('id', 'name', 'stock', 'reorder_point', 'reorder_quantity')

        return Response({
            'alerts': InventoryAlertSerializer(alerts, many=True).data,
            'reorder_points': reorder_points
        })

    @action(detail=False, methods=['post'])
    def reorder(self, request):
        """Place a reorder for a component"""
        component_id = request.data.get('component_id')
        quantity = request.data.get('quantity')

        if not component_id or not quantity:
            return Response(
                {'error': 'Component ID and quantity are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            component = Component.objects.get(id=component_id)
            reorder = Reorder.objects.create(
                component=component,
                quantity=quantity,
                status='pending'
            )
            return Response(ReorderSerializer(reorder).data)
        except Component.DoesNotExist:
            return Response(
                {'error': 'Component not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'])
    def stock_history(self, request):
        """Get stock history for a component"""
        component_id = request.query_params.get('component_id')
        if not component_id:
            return Response(
                {'error': 'Component ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            history = StockHistory.objects.filter(component_id=component_id)
            return Response(StockHistorySerializer(history, many=True).data)
        except Component.DoesNotExist:
            return Response(
                {'error': 'Component not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['post'])
    def update_stock(self, request):
        """Update stock levels for a component"""
        component_id = request.data.get('component_id')
        quantity = request.data.get('quantity')
        action = request.data.get('action')  # 'add' or 'remove'

        if not all([component_id, quantity, action]):
            return Response(
                {'error': 'Component ID, quantity, and action are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            component = Component.objects.get(id=component_id)
            if action == 'add':
                component.stock += quantity
            elif action == 'remove':
                if component.stock < quantity:
                    return Response(
                        {'error': 'Insufficient stock'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                component.stock -= quantity
            else:
                return Response(
                    {'error': 'Invalid action'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            component.save()
            StockHistory.objects.create(
                component=component,
                quantity=quantity,
                action=action
            )
            return Response(ComponentSerializer(component).data)
        except Component.DoesNotExist:
            return Response(
                {'error': 'Component not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'])
    def reorder_status(self, request):
        """Get status of reorders"""
        status_filter = request.query_params.get('status')
        reorders = Reorder.objects.select_related('component').all()
        
        if status_filter:
            reorders = reorders.filter(status=status_filter)
            
        return Response(ReorderSerializer(reorders, many=True).data)

    @action(detail=False, methods=['post'])
    def update_reorder_status(self, request):
        """Update status of a reorder"""
        reorder_id = request.data.get('reorder_id')
        new_status = request.data.get('status')

        if not all([reorder_id, new_status]):
            return Response(
                {'error': 'Reorder ID and status are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            reorder = Reorder.objects.get(id=reorder_id)
            reorder.status = new_status
            reorder.save()
            return Response(ReorderSerializer(reorder).data)
        except Reorder.DoesNotExist:
            return Response(
                {'error': 'Reorder not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'])
    def inventory_report(self, request):
        """Generate inventory report"""
        format_type = request.query_params.get('format', 'pdf')
        
        if format_type == 'pdf':
            return self._generate_pdf_report()
        elif format_type == 'excel':
            return self._generate_excel_report()
        else:
            return Response(
                {'error': 'Invalid format type'},
                status=status.HTTP_400_BAD_REQUEST
            )

    def _generate_pdf_report(self):
        """Generate PDF inventory report"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        elements = []

        # Get data
        components = Component.objects.all()
        data = [['Name', 'Category', 'Stock', 'Price', 'Value']]
        
        for component in components:
            data.append([
                component.name,
                component.category,
                str(component.stock),
                f"${component.price:.2f}",
                f"${(component.stock * component.price):.2f}"
            ])

        # Create table
        table = Table(data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 14),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))

        elements.append(table)
        doc.build(elements)

        buffer.seek(0)
        return Response(buffer, content_type='application/pdf')

    def _generate_excel_report(self):
        """Generate Excel inventory report"""
        buffer = BytesIO()
        workbook = xlsxwriter.Workbook(buffer)
        worksheet = workbook.add_worksheet()

        # Add headers
        headers = ['Name', 'Category', 'Stock', 'Price', 'Value']
        for col, header in enumerate(headers):
            worksheet.write(0, col, header)

        # Add data
        components = Component.objects.all()
        for row, component in enumerate(components, start=1):
            worksheet.write(row, 0, component.name)
            worksheet.write(row, 1, component.category)
            worksheet.write(row, 2, component.stock)
            worksheet.write(row, 3, component.price)
            worksheet.write(row, 4, component.stock * component.price)

        workbook.close()
        buffer.seek(0)
        return Response(buffer, content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

class AnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get(self, request):
        """Get analytics dashboard data"""
        range_param = request.query_params.get('range', 'month')
        
        # Calculate date range
        end_date = timezone.now()
        if range_param == 'week':
            start_date = end_date - timedelta(days=7)
        elif range_param == 'month':
            start_date = end_date - timedelta(days=30)
        else:  # year
            start_date = end_date - timedelta(days=365)

        # Get sales data
        sales_data = PCBuild.objects.filter(
            created_at__range=(start_date, end_date)
        ).annotate(
            date=ExpressionWrapper(
                F('created_at__date'),
                output_field=DateField()
            )
        ).values('date').annotate(
            total_sales=Sum('total_price'),
            total_orders=Count('id')
        ).order_by('date')

        # Get top selling components
        top_components = BuildComponent.objects.filter(
            build__created_at__range=(start_date, end_date)
        ).values(
            'component__id',
            'component__name'
        ).annotate(
            total_sales=Sum(F('quantity') * F('component__price')),
            quantity_sold=Sum('quantity')
        ).order_by('-total_sales')[:10]

        return Response({
            'sales_data': list(sales_data),
            'top_components': list(top_components)
        })

    @action(detail=False, methods=['get'])
    def export(self, request):
        """Export analytics data in PDF or Excel format"""
        format_type = request.query_params.get('format', 'pdf')
        
        # Get data for export
        sales_data = self.get_sales_data()
        inventory_data = self.get_inventory_data()
        component_data = self.get_component_data()

        if format_type == 'pdf':
            return self.export_pdf(sales_data, inventory_data, component_data)
        else:
            return self.export_excel(sales_data, inventory_data, component_data)

    def get_sales_data(self):
        """Get sales data for export"""
        end_date = timezone.now()
        start_date = end_date - timedelta(days=30)
        
        return PCBuild.objects.filter(
            created_at__range=(start_date, end_date)
        ).annotate(
            date=ExpressionWrapper(
                F('created_at__date'),
                output_field=DateField()
            )
        ).values('date').annotate(
            total_sales=Sum('total_price'),
            total_orders=Count('id')
        ).order_by('date')

    def get_inventory_data(self):
        """Get inventory data for export"""
        return Component.objects.values('category').annotate(
            count=Count('id'),
            total_value=Sum(F('price') * F('stock'))
        )

    def get_component_data(self):
        """Get component data for export"""
        return Component.objects.values(
            'name', 'category', 'price', 'stock',
            'reorder_point', 'reorder_quantity'
        )

    def export_pdf(self, sales_data, inventory_data, component_data):
        """Export data as PDF"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        elements = []

        # Sales data table
        sales_table_data = [['Date', 'Total Sales', 'Orders']]
        for sale in sales_data:
            sales_table_data.append([
                sale['date'].strftime('%Y-%m-%d'),
                f"₹{sale['total_sales']:,.2f}",
                sale['total_orders']
            ])

        sales_table = Table(sales_table_data)
        sales_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 14),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 12),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        elements.append(sales_table)

        # Add more tables for inventory and component data
        # ... (similar table creation code)

        doc.build(elements)
        buffer.seek(0)
        return Response(
            buffer.getvalue(),
            content_type='application/pdf',
            headers={'Content-Disposition': 'attachment; filename="analytics-report.pdf"'}
        )

    def export_excel(self, sales_data, inventory_data, component_data):
        """Export data as Excel"""
        buffer = BytesIO()
        workbook = xlsxwriter.Workbook(buffer)
        
        # Sales sheet
        sales_sheet = workbook.add_worksheet('Sales')
        sales_sheet.write(0, 0, 'Date')
        sales_sheet.write(0, 1, 'Total Sales')
        sales_sheet.write(0, 2, 'Orders')
        
        for i, sale in enumerate(sales_data, 1):
            sales_sheet.write(i, 0, sale['date'].strftime('%Y-%m-%d'))
            sales_sheet.write(i, 1, sale['total_sales'])
            sales_sheet.write(i, 2, sale['total_orders'])

        # Inventory sheet
        inventory_sheet = workbook.add_worksheet('Inventory')
        inventory_sheet.write(0, 0, 'Category')
        inventory_sheet.write(0, 1, 'Count')
        inventory_sheet.write(0, 2, 'Total Value')
        
        for i, item in enumerate(inventory_data, 1):
            inventory_sheet.write(i, 0, item['category'])
            inventory_sheet.write(i, 1, item['count'])
            inventory_sheet.write(i, 2, item['total_value'])

        # Components sheet
        components_sheet = workbook.add_worksheet('Components')
        components_sheet.write(0, 0, 'Name')
        components_sheet.write(0, 1, 'Category')
        components_sheet.write(0, 2, 'Price')
        components_sheet.write(0, 3, 'Stock')
        components_sheet.write(0, 4, 'Reorder Point')
        components_sheet.write(0, 5, 'Reorder Quantity')
        
        for i, component in enumerate(component_data, 1):
            components_sheet.write(i, 0, component['name'])
            components_sheet.write(i, 1, component['category'])
            components_sheet.write(i, 2, component['price'])
            components_sheet.write(i, 3, component['stock'])
            components_sheet.write(i, 4, component['reorder_point'])
            components_sheet.write(i, 5, component['reorder_quantity'])

        workbook.close()
        buffer.seek(0)
        return Response(
            buffer.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            headers={'Content-Disposition': 'attachment; filename="analytics-report.xlsx"'}
        )

class AppViewSet(viewsets.ModelViewSet):
    queryset = App.objects.all()
    serializer_class = AppSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]

    @action(detail=False, methods=['get'])
    def categories(self, request):
        categories = App.objects.values_list('category', flat=True).distinct()
        return Response(list(categories))

    @action(detail=False, methods=['get'])
    def active(self, request):
        apps = self.get_queryset().filter(is_active=True)
        serializer = self.get_serializer(apps, many=True)
        return Response(serializer.data) 