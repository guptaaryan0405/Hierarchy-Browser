# Development Workflow

This document explains how to work on the Hierarchy Visualizer, add features, and fix bugs.

## 1. Prerequisites
- **Node.js** (v18 or higher)
- **Git**

## 2. Setup (First Time Only)
```bash
# Clone the repo (if you haven't already)
git clone <your-repo-url>
cd vlsi-visualizer

# Install dependencies
npm install
```

## 3. Daily Development Cycle (Adding Features/Fixing Bugs)

### Step A: Start Local Dev Server
This starts a live server. Changes you save in your code (`src/`) are instantly reflected in the browser.
```bash
npm run dev
```
- Open the URL shown (usually `http://localhost:5173`).
- Make changes to `src/App.jsx`, `src/components/...`, etc.
- Verify they work in the browser.

### Step B: Building for Production
When you are happy with your changes, you must **build** the optimized application. This creates the `dist` folder.
```bash
npm run build
```
*Note: This overwrites the `dist` folder completely.*

### Step C: Verification (Optional but Recommended)
Test the production build locally before deploying.
```bash
# macOS
./dist/Run_App.command

# Windows
./dist/Run_App.bat
```

## 4. Deployment
Once verified:
1.  **Zip** the `dist` folder.
2.  **SCP** it to your server (see `DEPLOYMENT.md`).

## 5. Directory Structure
- `src/`: All source code (React components, logic).
- `public/`: Static files (images, launcher scripts). **Files here are copied to `dist` automatically.**
- `dist/`: The final built output (do not edit files here directly).
