# Deployment Guide: VLSI Hierarchical Visualizer

This application is a **Client-Side Single Page Application (SPA)** built with React, Vite, and Cytoscape.js. It runs almost entirely in the user's browser, processing data locally.

## 1. How to Deploy (Network)

Since this is a static web application, it can be deployed on any standard internal web server. You have two primary options:

### Option A: Docker (Recommended)
We have provided a `Dockerfile` in the root directory. This encapsulates the build process and uses Nginx to serve the application.

**Steps:**
1.  **Build the Image:**
    ```bash
    docker build -t vlsi-visualizer .
    ```
2.  **Run the Container:**
    ```bash
    docker run -d -p 80:80 --name visualizer vlsi-visualizer
    ```
3.  **Access:** The app will be available at `http://<server-ip>:80`.

### Option B: Manual Static Hosting
If you prefer to host files on an existing Nginx/Apache server or internal S3-compatible bucket:

**Steps:**
1.  **Build from Source:**
    ```bash
    npm install
    npm run build
    ```
    This will generate a `dist/` folder containing `index.html`, `assets/`, etc.
2.  **Deploy:**
    Copy the contents of the `dist/` folder to your web server's root directory (e.g., `/var/www/html/`).
3.  **Config Note:**
    Ensure your web server is configured to serve `index.html` for any unknown routes (SPA fallback), although this app is primarily single-route.

---

## 2. System Requirements

### **Server-Side (Hosting)**
The requirements for the server are **extremely minimal** because it only serves static files. No computation happens on the server.
*   **CPU:** 0.5 vCPU or less (Minimal)
*   **RAM:** 128MB - 512MB (Enough for Nginx/Docker overhead)
*   **Storage:** < 50MB (Artifacts are very small)

### **Client-Side (User's Machine)**
This is where the workload exists. The application parses large CSVs and calculates complex graph layouts **in the browser**.
*   **Browser:** Modern Chrome, Edge, or Firefox (needed for latest JS features).
*   **RAM:** 8GB recommended (Large CSVs >100MB may spike browser memory usage).
*   **CPU:** Modern multi-core processor (The layout algorithms like fCoSE are CPU-intensive during the initial render).

## 3. Data Privacy & Security
*   **Local Processing:** All CSV data uploaded by the user is processed **locally in the browser memory**.
*   **No Data Transfer:** The file **never** leaves the user's machine; it is not sent to the hosting server.
*   **Implication:** This makes the application highly secure for sensitive internal VLSI data, as no database or backend API is required to store the design files.
