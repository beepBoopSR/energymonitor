# beepBoop

## Vibecoding Rules
- Always check/use `.gitignore`
- Only work in `app/`, `api/`, or `site/` folders — make minimal, targeted changes
- Follow structure defined in `CLAUDE.md`

---

## App

> Next.js + shadcn/ui  
> Docs: [Next.js](https://nextjs.org/docs) · [shadcn/ui](https://ui.shadcn.com/docs)

Already initialized with:
```bash
npx shadcn@latest init --preset bp96 --template next
cd app
npx shadcn@latest add sidebar-07
```

Running:
```bash
npm run dev --prefix app
```

### Adding components

```bash
npx shadcn@latest add button
```

Components are placed in the `components/` directory. Browse available components at [ui.shadcn.com/docs/components](https://ui.shadcn.com/docs/components).

### Using components

```tsx
import { Button } from "@/components/ui/button";
```

---

## API

> Node.js + Express  
> Docs: [Node.js](https://nodejs.org/en/docs) · [Express](https://expressjs.com/en/5x/api.html)

Already initialized with:
```bash
npm init -y
npm install express
```

### Basic server example

```js
const express = require("express");
const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Hello from beepBoop API" });
});

app.listen(3001, () => console.log("API running on port 3001"));
```

---

## Site

> Next.js  
> Docs: [Next.js](https://nextjs.org/docs)

Already initialized with:
```bash
npx create-next-app@latest site
```

### Useful Next.js references

| Topic | Link |
|---|---|
| App Router | [nextjs.org/docs/app](https://nextjs.org/docs/app) |
| Routing | [nextjs.org/docs/app/building-your-application/routing](https://nextjs.org/docs/app/building-your-application/routing) |
| Data Fetching | [nextjs.org/docs/app/building-your-application/data-fetching](https://nextjs.org/docs/app/building-your-application/data-fetching) |
| API Routes | [nextjs.org/docs/app/building-your-application/routing/route-handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers) |
| Deployment | [nextjs.org/docs/app/building-your-application/deploying](https://nextjs.org/docs/app/building-your-application/deploying) |
