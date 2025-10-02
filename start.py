#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Slothbuckler Launcher
Starts the backend and frontend servers and opens the browser
"""

import subprocess
import webbrowser
import time
import sys
import os
from pathlib import Path

# Fix Windows console encoding
if sys.platform == 'win32':
    os.system('chcp 65001 > nul')

def print_banner():
    try:
        banner = """
    ╔═══════════════════════════════════════╗
    ║                                       ║
    ║          Slothbuckler Launcher        ║
    ║                                       ║
    ╚═══════════════════════════════════════╝
    """
        print(banner)
    except UnicodeEncodeError:
        print("\n    === Slothbuckler Launcher ===\n")

def kill_existing_processes():
    """Kill any existing backend and frontend processes"""
    print("Cleaning up existing processes...")

    # Kill processes on port 8000 (backend)
    try:
        if sys.platform == 'win32':
            # Only kill LISTENING processes, ignore TIME_WAIT
            result = subprocess.run(
                'netstat -ano | findstr ":8000 " | findstr "LISTENING"',
                shell=True,
                capture_output=True,
                text=True
            )
            if result.stdout:
                pids_killed = set()
                # Extract PID from netstat output
                for line in result.stdout.strip().split('\n'):
                    if line.strip():  # Skip empty lines
                        parts = line.split()
                        if len(parts) >= 5:
                            pid = parts[-1]
                            if pid != '0' and pid not in pids_killed:
                                # Kill process tree (parent + all children)
                                subprocess.run(f'taskkill //F //T //PID {pid}', shell=True, capture_output=True)
                                pids_killed.add(pid)
                                print(f"  Killed backend process (PID: {pid})")
        else:
            subprocess.run("lsof -ti:8000 | xargs kill -9", shell=True, capture_output=True)
            print("  Killed backend process")
    except Exception as e:
        pass  # Process might not be running

    # Kill processes on port 5173-5175 (frontend)
    try:
        if sys.platform == 'win32':
            pids_killed = set()
            for port in [5173, 5174, 5175]:
                result = subprocess.run(
                    f'netstat -ano | findstr ":{port} " | findstr "LISTENING"',
                    shell=True,
                    capture_output=True,
                    text=True
                )
                if result.stdout:
                    for line in result.stdout.strip().split('\n'):
                        if line.strip():  # Skip empty lines
                            parts = line.split()
                            if len(parts) >= 5:
                                pid = parts[-1]
                                if pid != '0' and pid not in pids_killed:
                                    # Kill process tree (parent + all children)
                                    subprocess.run(f'taskkill //F //T //PID {pid}', shell=True, capture_output=True)
                                    pids_killed.add(pid)
                                    print(f"  Killed frontend process on port {port} (PID: {pid})")
        else:
            subprocess.run("lsof -ti:5173 | xargs kill -9", shell=True, capture_output=True)
            print("  Killed frontend process")
    except Exception as e:
        pass  # Process might not be running

    # Give processes time to clean up
    print("  Waiting for processes to terminate...")
    time.sleep(2)

    # Verify ports are free - wait up to 15 seconds with aggressive retry
    if sys.platform == 'win32':
        for port in [8000, 5173, 5174, 5175]:
            for attempt in range(5):
                result = subprocess.run(
                    f'netstat -ano | findstr ":{port} " | findstr "LISTENING"',
                    shell=True,
                    capture_output=True,
                    text=True
                )
                if not result.stdout:
                    break

                # If port still in use, try killing again more aggressively
                if result.stdout and attempt < 4:
                    print(f"  Port {port} still in use, force killing... (attempt {attempt + 1}/5)")
                    for line in result.stdout.strip().split('\n'):
                        if line.strip():
                            parts = line.split()
                            if len(parts) >= 5:
                                pid = parts[-1]
                                if pid != '0':
                                    subprocess.run(f'taskkill //F //T //PID {pid}', shell=True, capture_output=True)
                    time.sleep(2)
                else:
                    print(f"  WARNING: Port {port} still in use after retries, continuing anyway...")

    print()

def check_dependencies():
    """Check if required dependencies are installed"""
    print("Checking dependencies...")

    # Check Python packages
    try:
        import fastapi
        import uvicorn
        import docker
        print("[OK] Backend dependencies found")
    except ImportError as e:
        print(f"[ERROR] Missing backend dependency: {e}")
        print("Install with: cd backend && pip install -r requirements.txt")
        return False

    # Check Node.js and npm
    try:
        node_cmd = "node" if sys.platform != "win32" else "node.exe"
        result = subprocess.run([node_cmd, "--version"], capture_output=True, text=True, shell=True if sys.platform == "win32" else False)
        if result.returncode == 0:
            print(f"[OK] Node.js found: {result.stdout.strip()}")
        else:
            raise Exception("Node.js not found")
    except Exception as e:
        print(f"[ERROR] Node.js not found: {e}")
        print("Install Node.js from https://nodejs.org/")
        return False

    return True

def start_backend():
    """Start the FastAPI backend server"""
    print("\nStarting backend server...")
    backend_dir = Path(__file__).parent / "backend"

    backend_process = subprocess.Popen(
        [sys.executable, "main.py"],
        cwd=backend_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )

    # Wait for backend to be ready
    print("Waiting for backend to start...")
    time.sleep(4)

    if backend_process.poll() is None:
        print("[OK] Backend server started on http://localhost:8000")
        return backend_process
    else:
        print("[ERROR] Failed to start backend server")
        stdout, stderr = backend_process.communicate()
        print(f"Error: {stderr}")
        return None

def start_frontend():
    """Start the Vite dev server"""
    print("\nStarting frontend server...")
    frontend_dir = Path(__file__).parent / "frontend"

    # Determine npm command based on OS
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"

    # Check if node_modules exists
    if not (frontend_dir / "node_modules").exists():
        print("Installing frontend dependencies (first time only)...")
        install_process = subprocess.run(
            [npm_cmd, "install"],
            cwd=frontend_dir,
            capture_output=True,
            text=True,
            shell=sys.platform == "win32"
        )
        if install_process.returncode != 0:
            print(f"[ERROR] Failed to install dependencies: {install_process.stderr}")
            return None
        print("[OK] Dependencies installed")

    frontend_process = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=frontend_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        shell=sys.platform == "win32"
    )

    # Wait for frontend to be ready
    print("Waiting for frontend to start...")
    time.sleep(5)

    if frontend_process.poll() is None:
        print("[OK] Frontend server started on http://localhost:5173")
        return frontend_process
    else:
        print("[ERROR] Failed to start frontend server")
        return None

def open_browser():
    """Open the browser to the frontend URL"""
    print("\nOpening browser...")
    time.sleep(2)
    webbrowser.open("http://localhost:5173")

def main():
    print_banner()

    # Kill existing processes first
    kill_existing_processes()

    # Check dependencies
    if not check_dependencies():
        print("\n[ERROR] Dependency check failed. Please install missing dependencies.")
        input("\nPress Enter to exit...")
        return

    backend_process = None
    frontend_process = None

    try:
        # Start backend
        backend_process = start_backend()
        if not backend_process:
            return

        # Start frontend
        frontend_process = start_frontend()
        if not frontend_process:
            return

        # Open browser
        open_browser()

        print("\n" + "="*50)
        print("Slothbuckler is running!")
        print("="*50)
        print("\nURLs:")
        print("   Frontend: http://localhost:5173")
        print("   Backend:  http://localhost:8000")
        print("   API Docs: http://localhost:8000/docs")
        print("\nPress Ctrl+C to stop all servers")
        print("="*50 + "\n")

        # Keep running until user stops
        while True:
            time.sleep(1)

            # Check if processes are still running
            if backend_process.poll() is not None:
                print("[WARNING] Backend server stopped unexpectedly")
                break
            if frontend_process.poll() is not None:
                print("[WARNING] Frontend server stopped unexpectedly")
                break

    except KeyboardInterrupt:
        print("\n\nStopping servers...")

    finally:
        # Cleanup
        if backend_process:
            backend_process.terminate()
            backend_process.wait()
            print("[OK] Backend stopped")

        if frontend_process:
            frontend_process.terminate()
            frontend_process.wait()
            print("[OK] Frontend stopped")

        print("\nGoodbye!")

if __name__ == "__main__":
    main()
