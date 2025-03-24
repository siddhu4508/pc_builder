from typing import List, Dict, Any
from decimal import Decimal
from django.core.cache import cache
from django.conf import settings
from django.db.models import Q
from .models import Component, PCBuild, BuildComponent
from .exceptions import CompatibilityError

class PCBuilderService:
    REQUIRED_COMPONENTS = ['CPU', 'Motherboard', 'RAM', 'PSU', 'Case']
    COMPONENT_CATEGORIES = {
        'CPU': ['CPU'],
        'Motherboard': ['Motherboard'],
        'RAM': ['RAM'],
        'GPU': ['GPU'],
        'Storage': ['Storage'],
        'PSU': ['PSU'],
        'Case': ['Case'],
        'Cooling': ['Cooling']
    }

    @staticmethod
    def get_component_cache_key(component_id: int) -> str:
        """Generate cache key for component"""
        return f"component_{component_id}"

    @staticmethod
    def get_compatible_components_cache_key(component_ids: List[int]) -> str:
        return f'compatible_components_{"_".join(map(str, sorted(component_ids)))}'

    @classmethod
    def get_component(cls, component_id: int) -> Component:
        """Get component from cache or database"""
        cache_key = cls.get_component_cache_key(component_id)
        component = cache.get(cache_key)
        
        if component is None:
            component = Component.objects.get(id=component_id)
            cache.set(cache_key, component, timeout=3600)  # Cache for 1 hour
        
        return component

    @classmethod
    def get_compatible_components(cls, component_ids: List[int]) -> List[Component]:
        cache_key = cls.get_compatible_components_cache_key(component_ids)
        compatible_components = cache.get(cache_key)
        
        if compatible_components is None:
            selected_components = [cls.get_component(cid) for cid in component_ids]
            all_components = Component.objects.exclude(id__in=component_ids)
            
            compatible_components = [
                component for component in all_components
                if cls.check_compatibility(selected_components, component)
            ]
            
            cache.set(cache_key, compatible_components, timeout=3600)
        
        return compatible_components

    @classmethod
    def check_compatibility(cls, selected_components: List[Component], new_component: Component) -> bool:
        """
        Check if a new component is compatible with the selected components.
        Returns True if compatible, raises CompatibilityError if not.
        """
        try:
            # Get components by category for easier access
            components_by_category = {
                category: next((c for c in selected_components if c.category == category), None)
                for category in cls.COMPONENT_CATEGORIES.keys()
            }

            # CPU and Motherboard compatibility
            if new_component.category == 'CPU' and components_by_category['Motherboard']:
                if new_component.specifications.get('socket') != components_by_category['Motherboard'].specifications.get('socket'):
                    raise CompatibilityError("CPU socket is not compatible with the motherboard")

            if new_component.category == 'Motherboard' and components_by_category['CPU']:
                if new_component.specifications.get('socket') != components_by_category['CPU'].specifications.get('socket'):
                    raise CompatibilityError("Motherboard socket is not compatible with the CPU")

            # RAM compatibility
            if new_component.category == 'RAM' and components_by_category['Motherboard']:
                motherboard = components_by_category['Motherboard']
                if new_component.specifications.get('ram_type') != motherboard.specifications.get('ram_type'):
                    raise CompatibilityError("RAM type is not compatible with the motherboard")
                
                if new_component.specifications.get('generation') != motherboard.specifications.get('generation'):
                    raise CompatibilityError("RAM generation is not compatible with the motherboard")
                
                # Check RAM speed compatibility
                ram_speed = new_component.specifications.get('speed', 0)
                max_speed = motherboard.specifications.get('max_ram_speed', 0)
                if ram_speed > max_speed:
                    raise CompatibilityError(f"RAM speed ({ram_speed}MHz) exceeds motherboard's maximum supported speed ({max_speed}MHz)")

                # Check RAM slots
                current_ram_count = sum(1 for c in selected_components if c.category == 'RAM')
                if current_ram_count >= motherboard.specifications.get('ram_slots', 0):
                    raise CompatibilityError("No more RAM slots available on the motherboard")

            # GPU compatibility
            if new_component.category == 'GPU':
                # Check case compatibility
                if components_by_category['Case']:
                    case = components_by_category['Case']
                    gpu_length = new_component.specifications.get('length', 0)
                    max_gpu_length = case.specifications.get('max_gpu_length', 0)
                    if gpu_length > max_gpu_length:
                        raise CompatibilityError(f"GPU length ({gpu_length}mm) exceeds case's maximum supported length ({max_gpu_length}mm)")

                # Check PSU compatibility
                if components_by_category['PSU']:
                    psu = components_by_category['PSU']
                    gpu_tdp = new_component.specifications.get('tdp', 0)
                    psu_wattage = psu.specifications.get('wattage', 0)
                    if gpu_tdp > psu_wattage * 0.8:  # 80% of PSU wattage for safety
                        raise CompatibilityError(f"GPU TDP ({gpu_tdp}W) exceeds recommended PSU wattage")

            # Storage compatibility
            if new_component.category == 'Storage' and components_by_category['Motherboard']:
                motherboard = components_by_category['Motherboard']
                storage_type = new_component.specifications.get('type', '')
                
                if storage_type == 'NVMe':
                    nvme_slots = motherboard.specifications.get('nvme_slots', 0)
                    current_nvme_count = sum(1 for c in selected_components if c.category == 'Storage' and c.specifications.get('type') == 'NVMe')
                    if current_nvme_count >= nvme_slots:
                        raise CompatibilityError("No more NVMe slots available on the motherboard")
                elif storage_type == 'SATA':
                    sata_ports = motherboard.specifications.get('sata_ports', 0)
                    current_sata_count = sum(1 for c in selected_components if c.category == 'Storage' and c.specifications.get('type') == 'SATA')
                    if current_sata_count >= sata_ports:
                        raise CompatibilityError("No more SATA ports available on the motherboard")

            # Cooling compatibility
            if new_component.category == 'Cooling':
                # Check CPU socket compatibility
                if components_by_category['CPU']:
                    cpu = components_by_category['CPU']
                    if new_component.specifications.get('socket') != cpu.specifications.get('socket'):
                        raise CompatibilityError("Cooler socket is not compatible with the CPU")

                # Check case compatibility
                if components_by_category['Case']:
                    case = components_by_category['Case']
                    cooler_height = new_component.specifications.get('height', 0)
                    max_cooler_height = case.specifications.get('max_cooler_height', 0)
                    if cooler_height > max_cooler_height:
                        raise CompatibilityError(f"Cooler height ({cooler_height}mm) exceeds case's maximum supported height ({max_cooler_height}mm)")

            # Case compatibility
            if new_component.category == 'Case' and components_by_category['Motherboard']:
                motherboard = components_by_category['Motherboard']
                case_form_factors = new_component.specifications.get('form_factors', [])
                if motherboard.specifications.get('form_factor') not in case_form_factors:
                    raise CompatibilityError("Motherboard form factor is not compatible with the case")

            # PSU compatibility
            if new_component.category == 'PSU':
                # Check form factor compatibility with case
                if components_by_category['Case']:
                    case = components_by_category['Case']
                    psu_form_factor = new_component.specifications.get('form_factor', '')
                    case_psu_form_factors = case.specifications.get('psu_form_factors', [])
                    if psu_form_factor not in case_psu_form_factors:
                        raise CompatibilityError("PSU form factor is not compatible with the case")

                # Check total power requirements
                total_tdp = sum(
                    c.specifications.get('tdp', 0)
                    for c in selected_components
                    if c.category in ['CPU', 'GPU']
                )
                psu_wattage = new_component.specifications.get('wattage', 0)
                if total_tdp > psu_wattage * 0.8:  # 80% of PSU wattage for safety
                    raise CompatibilityError(f"Total component TDP ({total_tdp}W) exceeds recommended PSU wattage")

            return True

        except CompatibilityError:
            raise
        except Exception as e:
            raise CompatibilityError(f"Error checking compatibility: {str(e)}")

    @classmethod
    def validate_build(cls, components_data: List[Dict[str, Any]]) -> List[Component]:
        """
        Validate the build components and check compatibility.
        Returns the list of validated components.
        """
        if not components_data:
            raise ValueError("No components provided")

        # Get all components
        components = []
        for item in components_data:
            component = cls.get_component(item['component_id'])
            components.append(component)

        # Check for required components
        selected_categories = {c.category for c in components}
        missing_categories = set(cls.REQUIRED_COMPONENTS) - selected_categories
        if missing_categories:
            raise ValueError(f"Missing required components: {', '.join(missing_categories)}")

        # Check compatibility between all components
        for i, component in enumerate(components):
            other_components = components[:i] + components[i + 1:]
            cls.check_compatibility(other_components, component)

        return components

    @classmethod
    def calculate_total_price(cls, components: List[Component]) -> Decimal:
        """Calculate the total price of the build"""
        return sum(component.price for component in components)

    @classmethod
    def create_build(cls, user_id: int, title: str, description: str, components_data: List[Dict[str, Any]], is_public: bool = True) -> PCBuild:
        """
        Create a new PC build with validated components.
        Returns the created build.
        """
        components = cls.validate_build(components_data)
        
        # Calculate total price
        total_price = cls.calculate_total_price(components)
        
        # Create the build
        build = PCBuild.objects.create(
            user_id=user_id,
            title=title,
            description=description,
            total_price=total_price,
            is_public=is_public
        )
        
        # Add components to the build
        for item in components_data:
            component = next(c for c in components if c.id == item['component_id'])
            BuildComponent.objects.create(
                build=build,
                component=component,
                quantity=item.get('quantity', 1),
                price_at_time=component.price
            )
        
        return build

    @classmethod
    def update_build(cls, build_id: int, title: str, description: str, components_data: List[Dict[str, Any]], is_public: bool = None) -> PCBuild:
        """Update an existing PC build."""
        build = PCBuild.objects.get(id=build_id)
        components = cls.validate_build(components_data)
        total_price = cls.calculate_total_price(components)

        build.title = title
        build.description = description
        if is_public is not None:
            build.is_public = is_public
        build.total_price = total_price
        build.save()

        # Update components
        build.components.clear()
        for item in components_data:
            component = next(c for c in components if c.id == item['component_id'])
            BuildComponent.objects.create(
                build=build,
                component=component,
                quantity=item.get('quantity', 1),
                price_at_time=component.price
            )

        return build

    @classmethod
    def get_build(cls, build_id: int) -> PCBuild:
        """Get a PC build by ID."""
        return PCBuild.objects.get(id=build_id)

    @classmethod
    def get_user_builds(cls, user_id: int) -> List[PCBuild]:
        """Get all builds for a user."""
        return PCBuild.objects.filter(user_id=user_id)

    @classmethod
    def get_public_builds(cls) -> List[PCBuild]:
        """Get all public builds."""
        return PCBuild.objects.filter(is_public=True)

    @classmethod
    def delete_build(cls, build_id: int) -> None:
        """Delete a PC build."""
        PCBuild.objects.get(id=build_id).delete() 