# one.origin 1origin.dev

ONEORIGIN: UI ใหม่จาก Base44 + ซอร์สระบบ GitHub → Build → Preview → Logs ที่พัฒนาไว้บน AWS

รีโปนี้ใช้หน้าตาของ [Figma Make App](https://figma-make-app-60e9828e.base44.app) เป็นตัวหลัก เพื่อพัฒนาต่อโดยไม่ต้องเริ่มระบบใหม่

## เริ่มพัฒนา

ใช้ Node.js 22.12+ หรือ 24:

```bash
npm ci --legacy-peer-deps
cp .env.example .env.local
npm run dev
```

สำหรับข้อมูล/ล็อกอิน Base44 ให้ใช้ CLI ที่ล็อกอินแล้วกับแอปเดิม:

```bash
base44 login
base44 link
base44 dev
```

เลือกแอป `6ae19df388768a7d60e9828e` อย่าสร้างแอปทับตัวเดิม ดู setup ของ Base44 ใน [docs/BASE44_ORIGINAL.md](docs/BASE44_ORIGINAL.md)

## โค้ดอยู่ตรงไหน

| โฟลเดอร์ | หน้าที่ |
|---|---|
| `src/` | UI Base44 เดิม: React 19 + TanStack Start, ธีมและหน้าเดิมคงไว้ |
| `src/routes/hosting.jsx` | หน้า Hosting ใหม่ในธีมเดิม: GitHub source, Preview Build, Logs |
| `src/lib/origin/` | ตัวเชื่อม AWS API และ Cognito PKCE แบบ JavaScript |
| `backend/` | Lambda สำหรับ GitHub App, Preview, control plane, dispatcher และ tests |
| `infra/aws/` / `infrastructure/` | CloudFormation ของระบบเดิม ไม่ได้รัน Deploy อัตโนมัติ |
| `scripts/` | สร้างไฟล์ infrastructure ให้ตรงกับ backend |
| `legacy/nuxt/` | ซอร์ส UI Nuxt เดิม รวมตัวแก้ Cognito callback เก็บเป็น reference |
| `base44/entities/` | schema ของข้อมูลใน Base44 ไม่รวมข้อมูลผู้ใช้หรือฐานข้อมูลจริง |
| `docs/MIGRATION.md` | สถานะจริง จุดเชื่อมต่อ และงานที่ต้องทำก่อนสลับเว็บ |

## สถานะของการย้าย

- ส่งออก UI จาก Base44 แล้ว โดยเก็บหน้าเดิม สไตล์ และโลโก้เดิม
- ย้าย backend/infrastructure/tests และซอร์ส Nuxt ที่ใช้งานเดิมเข้ามาแล้ว
- หน้า Hosting และ adapter สำหรับ API จริงพร้อมให้พัฒนาต่อ
- **ยังไม่ได้สลับเว็บจริงหรือย้ายข้อมูลในฐานข้อมูล**: AWS และ Base44 เดิมยังอยู่ที่เดิม
- ปิดการเรียก AWS จากโดเมนใหม่ไว้ด้วย `VITE_ORIGIN_ENABLED=false` จนกว่าจะตั้ง CORS และ Cognito callback สำหรับโดเมนใหม่ ดู docs/MIGRATION.md
- บัญชี Base44 กับ Cognito operator เป็นคนละระบบ ไม่ใช้ token แทนกัน
- Preview worker เดิมยังสร้างเฉพาะ `examplessdk-lgtm/1origin` ที่ `ui/nuxt` แบบ Static ไม่ได้รองรับ TanStack SSR ของรีโปใหม่นี้
- หน้า Agent และ early-access form ที่มากับ UI มีส่วน demo อยู่เดิม ยังไม่ได้ต่อโมเดล AI หรือระบบรับอีเมลจริง การย้ายโค้ดไม่ทำให้ส่วนนี้กลายเป็นบริการจริงโดยอัตโนมัติ

## ตรวจและ Build

```bash
npm run lint
npm test
PYTHONPATH=backend python -m unittest discover -s backend/tests -v
npm run build
```

Build นี้เป็น **TanStack Start SSR/Cloudflare Worker** (`dist/client` + `dist/server`) ไม่ใช่ Nuxt Static และไม่ควรนำเพียง `dist/client` ไปใส่ S3 แล้วถือว่าระบบครบ

ไม่รวม Secret, private key, access token, `.env` จริง, ข้อมูลบัญชี หรือ build cache ในรีโป
