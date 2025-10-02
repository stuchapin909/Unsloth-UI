#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Setup script for Slothbuckler
Installs all dependencies
"""

import subprocess
import sys
import os
from pathlib import Path

# Fix Windows console encoding
if sys.platform == 'win32':
    os.system('chcp 65001 > nul')

def print_banner():
    try:
        print("""
    ╔═══════════════════════════════════════╗
    ║                                       ║
    ║        Slothbuckler Setup Script      ║
    ║                                       ║
    ╚═══════════════════════════════════════╝
    """)
    except UnicodeEncodeError:
        print("\n    === Slothbuckler Setup Script ===\n")

def install_backend_deps():
    """Install backend Python dependencies"""
    print("\n[*] Installing backend dependencies...")
    backend_dir = Path(__file__).parent / "backend"
    requirements_file = backend_dir / "requirements.txt"

    result = subprocess.run(
        [sys.executable, "-m", "pip", "install", "-r", str(requirements_file)],
        capture_output=True,
        text=True
    )

    if result.returncode == 0:
        print("[OK] Backend dependencies installed successfully")
        return True
    else:
        print("[ERROR] Failed to install backend dependencies")
        print(result.stderr)
        return False

def install_frontend_deps():
    """Install frontend Node dependencies"""
    print("\n[*] Installing frontend dependencies...")
    frontend_dir = Path(__file__).parent / "frontend"

    try:
        result = subprocess.run(
            ["npm", "install"],
            cwd=frontend_dir,
            capture_output=True,
            text=True
        )

        if result.returncode == 0:
            print("[OK] Frontend dependencies installed successfully")
            return True
        else:
            print("[ERROR] Failed to install frontend dependencies")
            print(result.stderr)
            return False
    except FileNotFoundError:
        print("[ERROR] npm not found. Please install Node.js from https://nodejs.org/")
        return False

def main():
    print_banner()

    print("This script will install all dependencies for Slothbuckler.\n")

    # Install backend
    if not install_backend_deps():
        print("\n[WARNING] Backend setup failed. Please install dependencies manually:")
        print("   cd backend && pip install -r requirements.txt")

    # Install frontend
    if not install_frontend_deps():
        print("\n[WARNING] Frontend setup failed. Please install dependencies manually:")
        print("   cd frontend && npm install")

    print("\n" + "="*50)
    print("[SUCCESS] Setup complete!")
    print("="*50)
    print("\nNext steps:")
    print("1. Make sure Docker Desktop is running")
    print("2. Run: python start.py")
    print("3. Open http://localhost:5173 in your browser")
    print("\n[TIP] Read README.md for detailed usage instructions")
    print("="*50 + "\n")

if __name__ == "__main__":
    main()
