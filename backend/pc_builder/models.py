from django.db import models
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db.models import Q
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from django.core.validators import MinValueValidator
from decimal import Decimal
import uuid

User = get_user_model()

class Category(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    parent = models.ForeignKey('self', null=True, blank=True, related_name='children', on_delete=models.CASCADE)
    image = models.ImageField(upload_to='categories/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Categories'

    def __str__(self):
        return self.name

class Component(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='components')
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.IntegerField(default=0)
    image = models.ImageField(upload_to='components/')
    specifications = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    reorder_point = models.IntegerField(default=10)
    reorder_quantity = models.IntegerField(default=20)

    def __str__(self):
        return self.name

    def check_stock_level(self):
        """Check stock level and create alerts if necessary"""
        if self.stock <= 0:
            self.create_stock_alert('out_of_stock')
        elif self.stock <= self.reorder_point:
            self.create_stock_alert('low_stock')
        return self.stock

    def create_stock_alert(self, status):
        """Create a stock alert"""
        from .models import InventoryAlert
        alert = InventoryAlert.objects.create(
            component=self,
            current_stock=self.stock,
            status=status
        )
        self.send_stock_alert_email(alert)
        return alert

    def send_stock_alert_email(self, alert):
        """Send email notification for stock alerts"""
        subject = f'Stock Alert: {self.name}'
        message = f'The stock level for {self.name} is {alert.status}. Current stock: {alert.current_stock}'
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [settings.ADMIN_EMAIL],
            fail_silently=False,
        )

class PriceHistory(models.Model):
    component = models.ForeignKey(Component, on_delete=models.CASCADE, related_name='price_history')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Price histories'

    def __str__(self):
        return f'{self.component.name} - {self.price}'

    @classmethod
    def create_price_history(cls, component):
        """Create a price history entry when a component is saved"""
        cls.objects.create(
            component=component,
            price=component.price
        )

    def get_price_change(self):
        """Calculate the percentage change in price"""
        if not self.component.price_history.exists():
            return 0
        first_price = self.component.price_history.first().price
        if first_price == 0:
            return 0
        return ((self.price - first_price) / first_price) * 100

class PCBuild(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField()
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    components = models.ManyToManyField(Component, through='BuildComponent')
    total_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_public = models.BooleanField(default=False)
    share_token = models.UUIDField(null=True, blank=True, unique=True)
    views = models.ManyToManyField(User, related_name='viewed_builds', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} by {self.user.username}"

    def calculate_total_price(self):
        total = Decimal('0')
        for build_component in self.buildcomponent_set.all():
            total += build_component.component.price * build_component.quantity
        return total

    def save(self, *args, **kwargs):
        self.total_price = self.calculate_total_price()
        super().save(*args, **kwargs)

    def generate_share_token(self):
        if not self.share_token:
            self.share_token = uuid.uuid4()
            self.save()
        return self.share_token

class BuildComponent(models.Model):
    build = models.ForeignKey(PCBuild, on_delete=models.CASCADE)
    component = models.ForeignKey(Component, on_delete=models.CASCADE)
    quantity = models.IntegerField(default=1, validators=[MinValueValidator(1)])

    class Meta:
        unique_together = ('build', 'component')

    def __str__(self):
        return f"{self.quantity}x {self.component.name} in {self.build.name}"

class InventoryAlert(models.Model):
    STATUS_CHOICES = [
        ('low_stock', 'Low Stock'),
        ('out_of_stock', 'Out of Stock'),
    ]

    component = models.ForeignKey(Component, on_delete=models.CASCADE)
    current_stock = models.IntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.get_status_display()} alert for {self.component.name}"

class Reorder(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('ordered', 'Ordered'),
        ('received', 'Received'),
        ('cancelled', 'Cancelled'),
    ]

    component = models.ForeignKey(Component, on_delete=models.CASCADE)
    quantity = models.IntegerField(validators=[MinValueValidator(1)])
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Reorder {self.quantity}x {self.component.name}"

    def save(self, *args, **kwargs):
        if self.status == 'received':
            self.component.stock += self.quantity
            self.component.save()
        super().save(*args, **kwargs)

class StockHistory(models.Model):
    CHANGE_TYPE_CHOICES = [
        ('in', 'Stock In'),
        ('out', 'Stock Out'),
        ('adjustment', 'Adjustment'),
    ]

    component = models.ForeignKey(Component, on_delete=models.CASCADE)
    change_type = models.CharField(max_length=20, choices=CHANGE_TYPE_CHOICES)
    quantity = models.IntegerField()
    reference = models.ForeignKey(Reorder, on_delete=models.SET_NULL, null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_change_type_display()} {self.quantity}x {self.component.name}"

    def save(self, *args, **kwargs):
        if self.change_type == 'in':
            self.component.stock += self.quantity
        elif self.change_type == 'out':
            self.component.stock -= self.quantity
        elif self.change_type == 'adjustment':
            self.component.stock = self.quantity
        self.component.save()
        super().save(*args, **kwargs)

class App(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()
    version = models.CharField(max_length=20)
    category = models.CharField(max_length=50)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} v{self.version}"

    class Meta:
        ordering = ['-created_at'] 