# Direct Install Bot Dashboard

A minimal, client‑side web dashboard for triggering the `main.yml` GitHub Actions workflow in `vexonGOTY/Direct-Install-Bot`. The workflow generates an iOS install manifest on the `generated` branch and exposes an `itms-services://` link for installing the app on device.

This dashboard is **fully static** and works on **GitHub Pages** — there is no backend.

---

## Features

- **Settings panel**
  - Configure `owner/repo` for the GitHub repository.
  - Configure a GitHub **Personal Access Token (PAT)**.
  - Values are stored in `localStorage` in the browser.
- **App form**
  - App Name, Bundle ID, Version.
  - Optional `folder_name` for multi‑manifest history.
  - IPA upload (to Filebin) **or** direct IPA URL.
  - Toggle to replace the previous manifest (`cleanup_old`).
- **IPA upload**
  - IPA files are uploaded directly from the browser to Filebin using:
    - `POST https://filebin.net/` with `bin` and `filename` headers.
  - The resulting file URL is automatically injected as the workflow `url` input.
- **GitHub workflow trigger**
  - Uses the GitHub REST API:
    - `POST https://api.github.com/repos/{owner}/{repo}/actions/workflows/main.yml/dispatches`
  - Request body:

    ```json
    {
      "ref": "main",
      "inputs": {
        "url": "IPA_LINK",
        "bundleid": "BUNDLE_ID",
        "version": "VERSION",
        "appname": "APP_NAME",
        "cleanup_old": "false",
        "folder_name": "FOLDER"
      }
    }
    ```

- **Install link generation**
  - The UI computes the expected manifest path and link:
    - When **Replace previous manifest** is **on** (`cleanup_old = true`):
      - `generated/manifest.plist`
    - When it is **off** and a folder is provided:
      - `generated/{folder_name}/manifest.plist`
  - Install link format:

    ```text
    itms-services://?action=download-manifest&url=https://raw.githubusercontent.com/{owner}/{repo}/generated/{folder}/manifest.plist
    ```

  - Each generated link shows:
    - **Copy** button (copies the `itms-services://` URL).
    - **Install** button (navigates directly to the URL).
- **Multiple manifests**
  - When `cleanup_old` is **off**, the UI requires a `folder_name`.
  - This allows generating multiple manifests at once (e.g. `beta-1.0.0`, `beta-1.1.0`, etc.).
  - All generated links are kept in a local history list (stored in `localStorage`).
- **UI / UX**
  - Dark, centered, card‑based layout.
  - TailwindCSS via CDN, no build step.
  - Status bar showing phases: idle → upload → dispatch → success/error.
  - Simple toast notifications for success and errors.

---

## File structure

- `index.html` – Main HTML shell with Tailwind and layout.
- `app.js` – Client‑side logic for:
  - Settings persistence in `localStorage`.
  - IPA upload to Filebin.
  - GitHub Actions workflow dispatch.
  - Local install‑link history list.
- `style.css` – Small set of custom styles (status bar, toggles, loader, scrollbars).
- `README.md` – This file.

---

## Running the dashboard

Because it is fully static, you can use it in several ways:

- **GitHub Pages** (recommended)
  1. Push these files to the default branch (e.g. `main`).
  2. Enable GitHub Pages for the repository (root, `main` branch).
  3. Open the GitHub Pages URL and configure settings from the UI.

- **Local static server**
  - Use any simple static server, for example:

    ```bash
    python -m http.server 4173
    ```

  - Then open `http://localhost:4173/`.

Serving the files directly from the filesystem (e.g. `file://`) is **not** recommended due to CORS and clipboard limitations.

---

## GitHub token requirements

The PAT is only used from the browser to call the **workflow dispatch** endpoint.

- For a **classic token**, grant at least:
  - `repo` and `workflow` scopes (or more restrictive if desired).
- For a **fine‑grained token**:
  - Restrict access to your `Direct-Install-Bot` repository.
  - Allow **workflows: Read and write**.

> **Security note**  
> The token is stored in `localStorage` on the device where you use the dashboard.  
> Use a dedicated, low‑scope token and only run this dashboard on devices you trust.

---

## Workflow expectations

The dashboard assumes the workflow at `.github/workflows/main.yml`:

- Is named `"Generate & Publish Manifest"` (name is not required by the API).
- Accepts the following `workflow_dispatch` inputs:
  - `url` (string, required)
  - `bundleid` (string, required)
  - `version` (string, required)
  - `appname` (string, required)
  - `cleanup_old` (boolean, required)
  - `folder_name` (string, optional)
- Commits `manifest.plist` into the `generated` branch at:
  - `generated/manifest.plist` **or**
  - `generated/{folder_name}/manifest.plist`

The GitHub Actions job itself is responsible for transforming a template `manifest.plist` with the provided inputs and pushing it to the `generated` branch.

---

## Notes & limitations

- **CORS**: This dashboard relies on `https://api.github.com` and `https://filebin.net`. If either service changes CORS settings, some operations may stop working from the browser.
- **Auto‑generated folder names**: The workflow’s internal default (timestamp folder when `folder_name` is empty) is **not observable** from the browser. The UI therefore requires a `folder_name` whenever `cleanup_old` is off so that it can compute a deterministic link.
- **No workflow status polling**: The dashboard does not poll GitHub for job completion status. It assumes that a successful dispatch will eventually produce a valid `manifest.plist` at the expected path.

# Direct-Install-Bot
Automates the direct install for flero
