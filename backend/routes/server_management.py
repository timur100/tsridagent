from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from routes.portal_auth import verify_token
import paramiko
import os
from pymongo import MongoClient
from io import StringIO

router = APIRouter(prefix="/api/portal/servers", tags=["server-management"])

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
DB_NAME = os.environ.get('DB_NAME', 'tsrid_db')
client = MongoClient(MONGO_URL)
db = client[DB_NAME]


class ServerConfig(BaseModel):
    name: str
    host: str
    port: int = 22
    username: str
    password: Optional[str] = None
    ssh_key: Optional[str] = None
    description: Optional[str] = None


class CommandRequest(BaseModel):
    server_id: str
    command: str


class ServerUpdate(BaseModel):
    name: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = None
    username: Optional[str] = None
    password: Optional[str] = None
    ssh_key: Optional[str] = None
    description: Optional[str] = None


def get_ssh_client(server_config: dict) -> paramiko.SSHClient:
    """Create and return an SSH client connection"""
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        if server_config.get('ssh_key'):
            # Use SSH key
            key_file = StringIO(server_config['ssh_key'])
            pkey = paramiko.RSAKey.from_private_key(key_file)
            ssh.connect(
                hostname=server_config['host'],
                port=server_config.get('port', 22),
                username=server_config['username'],
                pkey=pkey,
                timeout=10
            )
        else:
            # Use password
            ssh.connect(
                hostname=server_config['host'],
                port=server_config.get('port', 22),
                username=server_config['username'],
                password=server_config.get('password'),
                timeout=10
            )
        return ssh
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SSH connection failed: {str(e)}")


@router.get("")
async def get_servers(token_data: dict = Depends(verify_token)):
    """Get all configured servers"""
    try:
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        servers = list(db.servers.find({}, {'password': 0, 'ssh_key': 0}))
        for server in servers:
            server['id'] = str(server.pop('_id'))
        
        return {"success": True, "data": {"servers": servers}}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
async def add_server(config: ServerConfig, token_data: dict = Depends(verify_token)):
    """Add a new server configuration"""
    try:
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Check if server already exists
        existing = db.servers.find_one({"host": config.host})
        if existing:
            raise HTTPException(status_code=400, detail="Server with this host already exists")
        
        server_doc = {
            "name": config.name,
            "host": config.host,
            "port": config.port,
            "username": config.username,
            "password": config.password,
            "ssh_key": config.ssh_key,
            "description": config.description,
            "status": "unknown",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        result = db.servers.insert_one(server_doc)
        
        return {
            "success": True,
            "message": "Server added successfully",
            "data": {"server_id": str(result.inserted_id)}
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/test-connection")
async def test_connection(config: ServerConfig, token_data: dict = Depends(verify_token)):
    """Test SSH connection to a server"""
    try:
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        try:
            if config.ssh_key:
                key_file = StringIO(config.ssh_key)
                pkey = paramiko.RSAKey.from_private_key(key_file)
                ssh.connect(
                    hostname=config.host,
                    port=config.port,
                    username=config.username,
                    pkey=pkey,
                    timeout=10
                )
            else:
                ssh.connect(
                    hostname=config.host,
                    port=config.port,
                    username=config.username,
                    password=config.password,
                    timeout=10
                )
            
            # Get system info
            stdin, stdout, stderr = ssh.exec_command("uname -a && uptime && df -h / | tail -1")
            output = stdout.read().decode().strip()
            
            ssh.close()
            
            return {
                "success": True,
                "message": "Connection successful",
                "data": {
                    "status": "connected",
                    "system_info": output
                }
            }
        except paramiko.AuthenticationException:
            return {
                "success": False,
                "message": "Authentication failed - check username/password",
                "data": {"status": "auth_failed"}
            }
        except paramiko.SSHException as e:
            return {
                "success": False,
                "message": f"SSH error: {str(e)}",
                "data": {"status": "ssh_error"}
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Connection failed: {str(e)}",
                "data": {"status": "error"}
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/execute")
async def execute_command(request: CommandRequest, token_data: dict = Depends(verify_token)):
    """Execute a command on a server"""
    try:
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Get server config
        from bson import ObjectId
        server = db.servers.find_one({"_id": ObjectId(request.server_id)})
        if not server:
            raise HTTPException(status_code=404, detail="Server not found")
        
        ssh = get_ssh_client(server)
        
        try:
            stdin, stdout, stderr = ssh.exec_command(request.command, timeout=60)
            output = stdout.read().decode()
            error = stderr.read().decode()
            exit_code = stdout.channel.recv_exit_status()
            
            ssh.close()
            
            return {
                "success": True,
                "data": {
                    "output": output,
                    "error": error,
                    "exit_code": exit_code
                }
            }
        except Exception as e:
            ssh.close()
            raise HTTPException(status_code=500, detail=f"Command execution failed: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{server_id}/status")
async def get_server_status(server_id: str, token_data: dict = Depends(verify_token)):
    """Get detailed status of a server"""
    try:
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        from bson import ObjectId
        server = db.servers.find_one({"_id": ObjectId(server_id)})
        if not server:
            raise HTTPException(status_code=404, detail="Server not found")
        
        try:
            ssh = get_ssh_client(server)
            
            # Get system information
            commands = {
                "hostname": "hostname",
                "uptime": "uptime -p",
                "os": "cat /etc/os-release | grep PRETTY_NAME | cut -d'\"' -f2",
                "cpu_usage": "top -bn1 | grep 'Cpu(s)' | awk '{print $2}'",
                "memory": "free -h | grep Mem | awk '{print $3\"/\"$2}'",
                "disk": "df -h / | tail -1 | awk '{print $3\"/\"$2\" (\"$5\")\"}'",
                "docker_containers": "docker ps --format '{{.Names}}' 2>/dev/null | wc -l || echo 0",
                "load": "cat /proc/loadavg | awk '{print $1, $2, $3}'"
            }
            
            status = {}
            for key, cmd in commands.items():
                stdin, stdout, stderr = ssh.exec_command(cmd)
                status[key] = stdout.read().decode().strip()
            
            ssh.close()
            
            # Update server status in DB
            db.servers.update_one(
                {"_id": ObjectId(server_id)},
                {"$set": {"status": "online", "last_check": datetime.now(timezone.utc).isoformat()}}
            )
            
            return {
                "success": True,
                "data": {
                    "status": "online",
                    "info": status
                }
            }
        except Exception as e:
            # Update server status to offline
            db.servers.update_one(
                {"_id": ObjectId(server_id)},
                {"$set": {"status": "offline", "last_check": datetime.now(timezone.utc).isoformat()}}
            )
            return {
                "success": False,
                "data": {
                    "status": "offline",
                    "error": str(e)
                }
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{server_id}")
async def delete_server(server_id: str, token_data: dict = Depends(verify_token)):
    """Delete a server configuration"""
    try:
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        from bson import ObjectId
        result = db.servers.delete_one({"_id": ObjectId(server_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Server not found")
        
        return {"success": True, "message": "Server deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{server_id}/docker")
async def get_docker_status(server_id: str, token_data: dict = Depends(verify_token)):
    """Get Docker container status on a server"""
    try:
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        from bson import ObjectId
        server = db.servers.find_one({"_id": ObjectId(server_id)})
        if not server:
            raise HTTPException(status_code=404, detail="Server not found")
        
        ssh = get_ssh_client(server)
        
        # Get Docker containers
        stdin, stdout, stderr = ssh.exec_command(
            "docker ps -a --format '{{.ID}}|{{.Names}}|{{.Status}}|{{.Ports}}|{{.Image}}'"
        )
        output = stdout.read().decode().strip()
        
        containers = []
        if output:
            for line in output.split('\n'):
                parts = line.split('|')
                if len(parts) >= 5:
                    containers.append({
                        "id": parts[0],
                        "name": parts[1],
                        "status": parts[2],
                        "ports": parts[3],
                        "image": parts[4]
                    })
        
        ssh.close()
        
        return {
            "success": True,
            "data": {"containers": containers}
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
