from backend.models.permissions import PermissionLevel

class SecurityManager:
    def requires_confirmation(self, permission: PermissionLevel) -> bool:
        return permission == PermissionLevel.DANGEROUS

    def sanitize_command(self, command: str) -> str:
        return command.strip()
