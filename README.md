# Fixed Project Calendar

A working version of your GitHub Pages calendar.

### How to use
1. Create a repo named **Project-Calendar** on GitHub.
2. Upload these files (or push via Git).
3. Enable **Settings → Pages → Deploy from branch**.
4. Add/edit YAML or JSON files in the `tasks/` folder.
5. The workflow will rebuild the public calendar automatically.

To test locally:
```bash
npm install
npm run build
```
Then open `index.html`.
