import os
import sys
import uvicorn

def get_port() -> int:
    port_env = os.getenv("PORT", "8000")
    try:
        return int(port_env)
    except (ValueError, TypeError):
        # In case a literal '$PORT' or invalid string was passed as environment variable
        print(f"[STARTUP WARNING]: Invalid PORT environment variable value '{port_env}'. Defaulting to 8000.")
        return 8000

if __name__ == "__main__":
    port = get_port()
    host = os.getenv("HOST", "0.0.0.0")
    print(f"[STARTUP INFO]: Starting Payent FastAPI Backend via Uvicorn on {host}:{port}...")
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        log_level="info",
        proxy_headers=True,
        forwarded_allow_ips="*"
    )
