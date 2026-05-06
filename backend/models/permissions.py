from enum import Enum

class PermissionLevel(str, Enum):
    SAFE = "SAFE"
    MEDIUM = "MEDIUM"
    DANGEROUS = "DANGEROUS"
