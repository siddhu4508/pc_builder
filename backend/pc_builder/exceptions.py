class CompatibilityError(Exception):
    """Raised when there's a compatibility issue between components"""
    pass

class StockError(Exception):
    """Raised when there's an issue with component stock"""
    pass

class BuildError(Exception):
    """Raised when there's an issue with PC build"""
    pass

class ValidationError(Exception):
    """Raised when there's a validation error"""
    pass

class AuthenticationError(Exception):
    """Raised when there's an authentication error"""
    pass

class PermissionError(Exception):
    """Raised when there's a permission error"""
    pass 