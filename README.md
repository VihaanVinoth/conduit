# Conduit | Secure P2P Intercom

Conduit is a native JavaScript, real-time audio and video intercom application built with an Express backend, Socket.io signaling infrastructure, and browser WebRTC APIs. It features a security gate defense layer that requires users to pass a One-Time Password (OTP) emailed directly to an administrator/user before establishing data stream nodes.

---

## 🚀 Features

* **Native WebRTC Integration:** Direct, high-speed peer-to-peer streaming with no third-party data middleware.
* **Security Gateway Protection:** Blocks unauthorized entry via a 6-digit random verification code system powered by `nodemailer`.
* **Dynamic Privacy Toggles:** Live microphone muting and video channel killing capabilities while maintaining robust audio fallback.
* **Encrypted Connections:** Handled securely over a local HTTPS layout using custom SSL certificates.
* **Environment Secret Layering:** Complete separation of system keys from the source code via `dotenv`.

---

## 📁 Repository Structure

```
├── server.js               # Node.js backend & signaling pipeline
├── .env                    # Hidden environment variables configuration
├── localhost+2.pem         # Local SSL certificate file
├── localhost+2-key.pem     # Local SSL private key file
├── package.json            # Node project dependency manifests
└── public/                 # Static web directory hosted by Express
    ├── index.html          # Core application visual document layout
    ├── css/
    │   └── style.css       # Layout designs and adaptive button rules
    └── js/
        └── main.js         # WebRTC mesh logic and socket handlers
```

# 🛠️ Installation & First-Time Setup Guide
Follow this walkthrough from scratch to replicate the exact development environment.

## 1. Install Node.js
Ensure you have **Node.js** installed on your system.
- **Windows/macOS:** Download the LTS installer from [nodejs.org](https://nodejs.org).
- **Linux (Ubuntu/Debian):** Run `sudo apt install nodejs npm` in your terminal.
- Verify installation by running:
```
node -v
npm -v
```

## 2. Initialize your workspace
If you are setting this up in a fresh folder, open your terminal inside your project root directory and initialize the project config file:

```npm init -y```

## 3. Install all project dependencies
Run the installation script to retrieve all required packages (`express` for hosting, `socket.io` for network signaling, `nodemailer` for email dispatching, and `dotenv` for securing credentials):
```
npm install express socket.io nodemailer dotenv
```

## 4. Configure Environment Variables via `dotenv`
Create a file named exactly `.env` in your project root folder. Populating this file allows `dotenv` to load your credentials into the application engine securely:
```
PORT=3000
SMTP_USER=your_personal_email@gmail.com
SMTP_PASS=your_16_character_app_password
RECEIVER_EMAIL=target_receiver_email@domain.com
```

> [!NOTE]
> If you plan on pushing this project to GitHub, create a file named `.gitignore` in your root folder and write `.env` inside it. This guarantees your private keys are never exposed publicly.

<br>

> [!TIP]  
> **Gmail SMTP Passwords** <br> If using a personal Gmail account, `SMTP_PASS` cannot be your standard account password. Go to your **Google Account -> Security -> 2-Step Verification -> App Passwords** to generate a dedicated 16-character application token.

<br>

## 5. Generate Local SSL Certificates (Mandatory for WebRTC)
WebRTC requires a secure context (`https://`) to request microphone and camera permissions.

The easiest way to generate local certificates is using `mkcert`:
1. Install `mkcert` via your package manager (e.g., `choco install mkcert` on Windows, `brew install mkcert` on macOS, or `sudo apt install mkcert` on Linux).
2. Run the local setup configuration: 
```mkcert -install```
3. Generate the specific files used by this project:
```mkcert localhost [IP] ::1```
4. This creates `localhost+2.pem` and `localhost+2-key.pem` files. Move both of them directly into your root directory next to `server.js`.

## 💻 Running Local Deployment
1. Initialize the backend engine out of your terminal panel:

```node server.js```

2. Open your preferred browser layout and navigate to the deployment host:

```https://localhost:3000```

> [!WARNING] **Handle Browser Certificate**: 
> Since the certificate is self-generated for local testing, your browser may flag it. Simply click **"Advanced"** and select **"Proceed to localhost (unsafe)"** to bypass the warning.

<br>

2. Input your station location name, click **"Request Security Token"**, check your designated receiver email inbox for the verification token, enter it into the gateway field, and establish your communication stream.