# Kural Orders

Mobile voice ordering for ARB TRADERS. Customers record one or more batches of groceries, review quantities, confirm their name and generate a numbered PNG for WhatsApp. The interface is in English, spoken prompts are in Tamil and the receipt supports Tamil, English or both.

## Source layout

| Path | Contents |
| --- | --- |
| `ui/` | Customer and owner screens, recording flow, grocery formatting, receipt renderer and printable QR |
| `worker/handler.txt` | Editable server routes for store settings, provider setup and transcription |
| `worker/index.js` | Assembled Worker entry point |
| `scripts/` | Assembly, build and validation commands |
| `.openai/hosting.json` | Existing site's deployment metadata and storage binding |
| `package.json` | Build commands |

## Build on a Mac

With Node.js 22 or later, npm and Bash available, run these commands inside the extracted folder.

```sh
npm run build
npm run validate
```

The build uses Node's built-in modules and produces `dist/server/index.js`. Edit the files in `ui/` and `worker/handler.txt`, then rebuild to refresh the generated Worker.

## Upload to GitHub

Create an empty repository, extract this archive and commit the contents of the extracted folder. On a Mac, open Terminal inside that folder and run the following commands. Replace YOUR-ACCOUNT and YOUR-REPOSITORY with the destination shown by GitHub.

```sh
git init -b main
git add .
git commit -m "Add Kural Orders source"
git remote add origin https://github.com/YOUR-ACCOUNT/YOUR-REPOSITORY.git
git push -u origin main
```

Alternatively, use GitHub's Upload files screen. Include the hidden `.openai/` folder and `.gitignore` file. In Finder, press Command + Shift + period to display them.

## Running a separate deployment

GitHub stores the source. The live app requires a Worker-compatible server for its API routes, an R2-compatible bucket bound as `BUCKET`, and a private `OWNER_CODE` runtime secret. Configure the store name, WhatsApp number and voice provider through `/owner` on that installation. Provider keys and saved store settings are runtime data and are excluded from this export. Keep the owner code stable after connecting providers because it is used for key encryption.

The bundled QR points to the existing Kural Orders address. Replace `ui/qr.svg` and rebuild if you use a new public URL. Uploading this repository does not update the current live site.
