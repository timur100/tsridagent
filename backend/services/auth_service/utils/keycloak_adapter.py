"""Keycloak Compatibility Layer

This module provides Keycloak-compatible data structures and utilities
to make future migration to Keycloak seamless.
"""

from typing import Dict, List, Any, Optional
from datetime import datetime, timezone

class KeycloakRealm:
    """Keycloak Realm representation"""
    
    @staticmethod
    def create_realm(name: str, display_name: str, enabled: bool = True) -> Dict[str, Any]:
        """Create a Keycloak-compatible realm structure"""
        return {
            "realm": name,
            "displayName": display_name,
            "enabled": enabled,
            "sslRequired": "external",
            "registrationAllowed": False,
            "loginWithEmailAllowed": True,
            "duplicateEmailsAllowed": False,
            "resetPasswordAllowed": True,
            "editUsernameAllowed": False,
            "bruteForceProtected": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }

class KeycloakUser:
    """Keycloak User representation"""
    
    @staticmethod
    def to_keycloak_format(user: Dict[str, Any]) -> Dict[str, Any]:
        """Convert internal user to Keycloak format"""
        return {
            "id": user.get("user_id"),
            "username": user.get("username"),
            "email": user.get("email"),
            "emailVerified": user.get("email_verified", False),
            "enabled": user.get("enabled", True),
            "firstName": user.get("first_name"),
            "lastName": user.get("last_name"),
            "attributes": user.get("attributes", {}),
            "realmRoles": user.get("roles", []),
            "createdTimestamp": user.get("created_at"),
            "requiredActions": user.get("required_actions", [])
        }
    
    @staticmethod
    def from_keycloak_format(keycloak_user: Dict[str, Any]) -> Dict[str, Any]:
        """Convert Keycloak user to internal format"""
        return {
            "user_id": keycloak_user.get("id"),
            "username": keycloak_user.get("username"),
            "email": keycloak_user.get("email"),
            "email_verified": keycloak_user.get("emailVerified", False),
            "enabled": keycloak_user.get("enabled", True),
            "first_name": keycloak_user.get("firstName"),
            "last_name": keycloak_user.get("lastName"),
            "attributes": keycloak_user.get("attributes", {}),
            "roles": keycloak_user.get("realmRoles", []),
            "created_at": keycloak_user.get("createdTimestamp")
        }

class KeycloakClient:
    """Keycloak Client representation"""
    
    @staticmethod
    def create_client(client_id: str, name: str, secret: str) -> Dict[str, Any]:
        """Create a Keycloak-compatible client structure"""
        return {
            "clientId": client_id,
            "name": name,
            "secret": secret,
            "enabled": True,
            "publicClient": False,
            "serviceAccountsEnabled": True,
            "directAccessGrantsEnabled": True,
            "standardFlowEnabled": True,
            "implicitFlowEnabled": False,
            "redirectUris": ["*"],
            "webOrigins": ["*"],
            "protocol": "openid-connect",
            "created_at": datetime.now(timezone.utc).isoformat()
        }

class KeycloakToken:
    """Keycloak Token representation"""
    
    @staticmethod
    def create_token_response(access_token: str, refresh_token: str, 
                             expires_in: int = 900) -> Dict[str, Any]:
        """Create Keycloak-compatible token response"""
        return {
            "access_token": access_token,
            "expires_in": expires_in,
            "refresh_expires_in": 1800,
            "refresh_token": refresh_token,
            "token_type": "Bearer",
            "not-before-policy": 0,
            "session_state": None,
            "scope": "profile email"
        }
