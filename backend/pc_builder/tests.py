from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from decimal import Decimal
from .models import Component, PCBuild
from .services import PCBuilderService, CompatibilityError

User = get_user_model()

class PCBuilderServiceTests(TestCase):
    def setUp(self):
        # Create test components
        self.cpu = Component.objects.create(
            name="Intel Core i7-12700K",
            category="CPU",
            price=Decimal("35000.00"),
            description="12th Gen Intel Processor",
            image_url="https://example.com/cpu.jpg",
            specifications={
                "socket": "LGA 1700",
                "cores": 12,
                "threads": 20,
                "base_clock": "3.6 GHz",
                "boost_clock": "5.0 GHz",
                "tdp": 125
            }
        )

        self.motherboard = Component.objects.create(
            name="MSI Z690-A WiFi",
            category="Motherboard",
            price=Decimal("25000.00"),
            description="Z690 Motherboard",
            image_url="https://example.com/mb.jpg",
            specifications={
                "socket": "LGA 1700",
                "chipset": "Z690",
                "ram_type": "DDR5",
                "ram_slots": 4,
                "form_factor": "ATX",
                "max_ram_speed": 6000,
                "nvme_slots": 2,
                "sata_ports": 6
            }
        )

        self.ram = Component.objects.create(
            name="Corsair Vengeance 32GB",
            category="RAM",
            price=Decimal("12000.00"),
            description="DDR5 RAM Kit",
            image_url="https://example.com/ram.jpg",
            specifications={
                "ram_type": "DDR5",
                "capacity": "32GB",
                "speed": 5600,
                "generation": "DDR5"
            }
        )

        self.psu = Component.objects.create(
            name="Corsair RM850x",
            category="PSU",
            price=Decimal("15000.00"),
            description="850W Power Supply",
            image_url="https://example.com/psu.jpg",
            specifications={
                "wattage": 850,
                "efficiency": "80+ Gold",
                "modular": "Full",
                "form_factor": "ATX"
            }
        )

        self.case = Component.objects.create(
            name="Lian Li O11 Dynamic",
            category="Case",
            price=Decimal("10000.00"),
            description="ATX Case",
            image_url="https://example.com/case.jpg",
            specifications={
                "form_factors": ["ATX", "Micro-ATX", "Mini-ITX"],
                "max_gpu_length": 420,
                "max_cooler_height": 170,
                "psu_form_factors": ["ATX", "SFX"]
            }
        )

        self.gpu = Component.objects.create(
            name="NVIDIA RTX 3080",
            category="GPU",
            price=Decimal("70000.00"),
            description="High-end Graphics Card",
            image_url="https://example.com/gpu.jpg",
            specifications={
                "length": 320,
                "tdp": 320
            }
        )

        self.storage = Component.objects.create(
            name="Samsung 970 EVO Plus",
            category="Storage",
            price=Decimal("8000.00"),
            description="NVMe SSD",
            image_url="https://example.com/storage.jpg",
            specifications={
                "type": "NVMe",
                "capacity": "1TB",
                "read_speed": "3500 MB/s",
                "write_speed": "3300 MB/s"
            }
        )

        self.cooling = Component.objects.create(
            name="Noctua NH-D15",
            category="Cooling",
            price=Decimal("8000.00"),
            description="CPU Air Cooler",
            image_url="https://example.com/cooling.jpg",
            specifications={
                "socket": "LGA 1700",
                "height": 165,
                "type": "Air"
            }
        )

    def test_cpu_motherboard_compatibility(self):
        """Test CPU and motherboard socket compatibility"""
        # Test compatible components
        self.assertTrue(PCBuilderService.check_compatibility([self.cpu], self.motherboard))
        self.assertTrue(PCBuilderService.check_compatibility([self.motherboard], self.cpu))

        # Test incompatible components
        incompatible_cpu = Component.objects.create(
            name="AMD Ryzen 9 5950X",
            category="CPU",
            price=Decimal("45000.00"),
            description="AMD Processor",
            image_url="https://example.com/amd-cpu.jpg",
            specifications={"socket": "AM4"}
        )

        with self.assertRaises(CompatibilityError):
            PCBuilderService.check_compatibility([incompatible_cpu], self.motherboard)

    def test_ram_compatibility(self):
        """Test RAM compatibility with motherboard"""
        # Test compatible RAM
        self.assertTrue(PCBuilderService.check_compatibility([self.motherboard], self.ram))

        # Test incompatible RAM type
        incompatible_ram = Component.objects.create(
            name="Corsair Vengeance 32GB DDR4",
            category="RAM",
            price=Decimal("10000.00"),
            description="DDR4 RAM Kit",
            image_url="https://example.com/ddr4-ram.jpg",
            specifications={
                "ram_type": "DDR4",
                "capacity": "32GB",
                "speed": 3600,
                "generation": "DDR4"
            }
        )

        with self.assertRaises(CompatibilityError):
            PCBuilderService.check_compatibility([self.motherboard], incompatible_ram)

        # Test RAM speed compatibility
        high_speed_ram = Component.objects.create(
            name="G.Skill Trident Z5",
            category="RAM",
            price=Decimal("15000.00"),
            description="High-speed DDR5 RAM",
            image_url="https://example.com/high-speed-ram.jpg",
            specifications={
                "ram_type": "DDR5",
                "capacity": "32GB",
                "speed": 7000,
                "generation": "DDR5"
            }
        )

        with self.assertRaises(CompatibilityError):
            PCBuilderService.check_compatibility([self.motherboard], high_speed_ram)

    def test_gpu_compatibility(self):
        """Test GPU compatibility with case and PSU"""
        # Test compatible GPU
        self.assertTrue(PCBuilderService.check_compatibility([self.case, self.psu], self.gpu))

        # Test GPU length compatibility
        long_gpu = Component.objects.create(
            name="RTX 4090",
            category="GPU",
            price=Decimal("150000.00"),
            description="Long Graphics Card",
            image_url="https://example.com/long-gpu.jpg",
            specifications={
                "length": 450,
                "tdp": 450
            }
        )

        with self.assertRaises(CompatibilityError):
            PCBuilderService.check_compatibility([self.case], long_gpu)

        # Test GPU power compatibility
        power_hungry_gpu = Component.objects.create(
            name="RTX 3090 Ti",
            category="GPU",
            price=Decimal("120000.00"),
            description="Power-hungry Graphics Card",
            image_url="https://example.com/power-gpu.jpg",
            specifications={
                "length": 320,
                "tdp": 450
            }
        )

        with self.assertRaises(CompatibilityError):
            PCBuilderService.check_compatibility([self.psu], power_hungry_gpu)

    def test_storage_compatibility(self):
        """Test storage compatibility with motherboard"""
        # Test compatible NVMe storage
        self.assertTrue(PCBuilderService.check_compatibility([self.motherboard], self.storage))

        # Test incompatible storage type
        sata_storage = Component.objects.create(
            name="Samsung 870 EVO",
            category="Storage",
            price=Decimal("6000.00"),
            description="SATA SSD",
            image_url="https://example.com/sata-storage.jpg",
            specifications={
                "type": "SATA",
                "capacity": "1TB",
                "read_speed": "560 MB/s",
                "write_speed": "530 MB/s"
            }
        )

        with self.assertRaises(CompatibilityError):
            PCBuilderService.check_compatibility([self.motherboard], sata_storage)

    def test_cooling_compatibility(self):
        """Test cooling compatibility with CPU and case"""
        # Test compatible cooling
        self.assertTrue(PCBuilderService.check_compatibility([self.cpu, self.case], self.cooling))

        # Test incompatible cooler height
        tall_cooler = Component.objects.create(
            name="Be Quiet Dark Rock Pro 4",
            category="Cooling",
            price=Decimal("9000.00"),
            description="Tall CPU Cooler",
            image_url="https://example.com/tall-cooler.jpg",
            specifications={
                "socket": "LGA 1700",
                "height": 180,
                "type": "Air"
            }
        )

        with self.assertRaises(CompatibilityError):
            PCBuilderService.check_compatibility([self.case], tall_cooler)

    def test_case_compatibility(self):
        """Test case compatibility with motherboard and PSU"""
        # Test compatible case
        self.assertTrue(PCBuilderService.check_compatibility([self.motherboard, self.psu], self.case))

        # Test incompatible motherboard form factor
        micro_atx_mb = Component.objects.create(
            name="MSI B660M-A",
            category="Motherboard",
            price=Decimal("15000.00"),
            description="Micro-ATX Motherboard",
            image_url="https://example.com/micro-atx-mb.jpg",
            specifications={
                "socket": "LGA 1700",
                "chipset": "B660",
                "ram_type": "DDR5",
                "ram_slots": 2,
                "form_factor": "Micro-ATX"
            }
        )

        with self.assertRaises(CompatibilityError):
            PCBuilderService.check_compatibility([self.case], micro_atx_mb)

    def test_psu_compatibility(self):
        """Test PSU compatibility with components"""
        # Test compatible PSU
        self.assertTrue(PCBuilderService.check_compatibility([self.cpu, self.gpu], self.psu))

        # Test insufficient PSU wattage
        low_wattage_psu = Component.objects.create(
            name="Corsair CX450",
            category="PSU",
            price=Decimal("5000.00"),
            description="450W Power Supply",
            image_url="https://example.com/low-psu.jpg",
            specifications={
                "wattage": 450,
                "efficiency": "80+ Bronze",
                "modular": "Non-modular",
                "form_factor": "ATX"
            }
        )

        with self.assertRaises(CompatibilityError):
            PCBuilderService.check_compatibility([self.cpu, self.gpu], low_wattage_psu)

    def test_required_components(self):
        """Test validation of required components"""
        # Test missing required components
        with self.assertRaises(ValueError) as context:
            PCBuilderService.validate_build([
                {'component_id': self.cpu.id, 'quantity': 1},
                {'component_id': self.motherboard.id, 'quantity': 1}
            ])
        self.assertIn("Missing required components", str(context.exception))

        # Test complete build
        components_data = [
            {'component_id': self.cpu.id, 'quantity': 1},
            {'component_id': self.motherboard.id, 'quantity': 1},
            {'component_id': self.ram.id, 'quantity': 1},
            {'component_id': self.psu.id, 'quantity': 1},
            {'component_id': self.case.id, 'quantity': 1}
        ]
        components = PCBuilderService.validate_build(components_data)
        self.assertEqual(len(components), 5)

    def test_build_operations(self):
        """Test build creation, update, and deletion"""
        # Create a user
        user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )

        # Test build creation
        components_data = [
            {'component_id': self.cpu.id, 'quantity': 1},
            {'component_id': self.motherboard.id, 'quantity': 1},
            {'component_id': self.ram.id, 'quantity': 1},
            {'component_id': self.psu.id, 'quantity': 1},
            {'component_id': self.case.id, 'quantity': 1}
        ]

        build = PCBuilderService.create_build(
            user_id=user.id,
            title="Test Build",
            description="Test Description",
            components_data=components_data
        )

        self.assertEqual(build.title, "Test Build")
        self.assertEqual(build.description, "Test Description")
        self.assertEqual(build.user_id, user.id)
        self.assertEqual(build.components.count(), 5)

        # Test build update
        updated_build = PCBuilderService.update_build(
            build_id=build.id,
            title="Updated Build",
            description="Updated Description",
            components_data=components_data
        )

        self.assertEqual(updated_build.title, "Updated Build")
        self.assertEqual(updated_build.description, "Updated Description")

        # Test build retrieval
        retrieved_build = PCBuilderService.get_build(build.id)
        self.assertEqual(retrieved_build.id, build.id)

        # Test user builds retrieval
        user_builds = PCBuilderService.get_user_builds(user.id)
        self.assertEqual(len(user_builds), 1)

        # Test build deletion
        PCBuilderService.delete_build(build.id)
        with self.assertRaises(PCBuild.DoesNotExist):
            PCBuilderService.get_build(build.id)

class PCBuilderAPITests(APITestCase):
    def setUp(self):
        # Create test user
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)

        # Create test components
        self.cpu = Component.objects.create(
            name="Intel Core i7-12700K",
            category="CPU",
            price=Decimal("35000.00"),
            description="12th Gen Intel Processor",
            image_url="https://example.com/cpu.jpg",
            specifications={"socket": "LGA 1700"}
        )

        self.motherboard = Component.objects.create(
            name="MSI Z690-A WiFi",
            category="Motherboard",
            price=Decimal("25000.00"),
            description="Z690 Motherboard",
            image_url="https://example.com/mb.jpg",
            specifications={"socket": "LGA 1700"}
        )

    def test_create_build(self):
        """Test creating a new PC build"""
        data = {
            'title': 'Test Build',
            'description': 'Test Description',
            'components': [
                {'component_id': self.cpu.id, 'quantity': 1},
                {'component_id': self.motherboard.id, 'quantity': 1}
            ]
        }

        response = self.client.post('/api/builds/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(PCBuild.objects.count(), 1)
        self.assertEqual(response.data['total_price'], '60000.00')

    def test_create_incompatible_build(self):
        """Test creating a build with incompatible components"""
        incompatible_cpu = Component.objects.create(
            name="AMD Ryzen 9 5950X",
            category="CPU",
            price=Decimal("45000.00"),
            description="AMD Processor",
            image_url="https://example.com/amd-cpu.jpg",
            specifications={"socket": "AM4"}
        )

        data = {
            'title': 'Incompatible Build',
            'description': 'Test Description',
            'components': [
                {'component_id': incompatible_cpu.id, 'quantity': 1},
                {'component_id': self.motherboard.id, 'quantity': 1}
            ]
        }

        response = self.client.post('/api/builds/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_validate_components(self):
        """Test component validation endpoint"""
        # Create a build first
        build = PCBuild.objects.create(
            title='Test Build',
            description='Test Description',
            user=self.user,
            total_price=Decimal('60000.00')
        )

        data = {
            'components': [
                {'component_id': self.cpu.id, 'quantity': 1},
                {'component_id': self.motherboard.id, 'quantity': 1}
            ]
        }

        response = self.client.post(f'/api/builds/{build.id}/validate_components/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_check_component_compatibility(self):
        """Test component compatibility check endpoint"""
        data = {
            'component_ids': [self.cpu.id]
        }

        response = self.client.post(f'/api/components/{self.motherboard.id}/check_compatibility/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK) 