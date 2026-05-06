from abc import ABC, abstractmethod
from backend.models.permissions import PermissionLevel

class Tool(ABC):
    name: str
    description: str
    permission: PermissionLevel = PermissionLevel.SAFE

    @abstractmethod
    def run(self, **kwargs) -> dict:
        pass
