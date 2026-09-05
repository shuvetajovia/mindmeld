import subprocess
import sys
import os
import time
import signal

def main():
    print("======================================================================")
    print("STARTING LANDSLIDE EWS & ROUTING SYSTEM (MindMeld)")
    print("======================================================================")

    # 1. Detect Python 3.11 command
    # Windows py launcher supports -3.11. Try "py -3.11", then "python3.11", then fallback to "python"
    python_cmd = None
    
    # Try 'py -3.11'
    try:
        res = subprocess.run(["py", "-3.11", "--version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if res.returncode == 0:
            python_cmd = ["py", "-3.11"]
            print("Detected Python 3.11 via 'py -3.11'")
    except Exception:
        pass
        
    # Try 'python3.11'
    if not python_cmd:
        try:
            res = subprocess.run(["python3.11", "--version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            if res.returncode == 0:
                python_cmd = ["python3.11"]
                print("Detected Python 3.11 via 'python3.11'")
        except Exception:
            pass

    # Fallback to default 'python'
    if not python_cmd:
        python_cmd = ["python"]
        print("Fallback to default 'python' command")

    # 2. Get environment paths
    base_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.join(base_dir, "frontend")
    
    # 3. Start Backend subprocess
    # Run uvicorn: backend.app.main:app
    backend_args = python_cmd + ["-m", "uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
    print(f"Launching FastAPI Backend: {' '.join(backend_args)}")
    backend_proc = subprocess.Popen(
        backend_args,
        cwd=base_dir,
        env=os.environ.copy()
    )

    # 4. Start Frontend subprocess
    # Run npm run dev in frontend/ folder
    # On Windows, npm is npm.cmd
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    frontend_args = [npm_cmd, "run", "dev", "--", "--host"]
    print(f"Launching Vite React Frontend: {' '.join(frontend_args)} inside {frontend_dir}")
    frontend_proc = subprocess.Popen(
        frontend_args,
        cwd=frontend_dir,
        env=os.environ.copy()
    )

    print("\nSystem running! Access endpoints:")
    print(" - Backend API: http://localhost:8000")
    print(" - API Documentation: http://localhost:8000/docs")
    print(" - Interactive Frontend: http://localhost:5173")
    print("Press Ctrl+C to terminate both servers...\n")

    # Keep script alive and monitor subprocesses
    try:
        while True:
            # Check if backend or frontend terminated
            if backend_proc.poll() is not None:
                print("Backend server terminated unexpectedly. Shutting down system...")
                break
            if frontend_proc.poll() is not None:
                print("Frontend server terminated unexpectedly. Shutting down system...")
                break
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutdown signal received (Ctrl+C). Terminating servers...")
    finally:
        # Clean up both subprocesses
        try:
            print("Terminating frontend...")
            frontend_proc.terminate()
            frontend_proc.wait(timeout=3)
        except Exception:
            try:
                frontend_proc.kill()
            except Exception:
                pass

        try:
            print("Terminating backend...")
            backend_proc.terminate()
            backend_proc.wait(timeout=3)
        except Exception:
            try:
                backend_proc.kill()
            except Exception:
                pass
        
        print("Shutdown complete.")

if __name__ == "__main__":
    main()
