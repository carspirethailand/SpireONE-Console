# SpireONE Control — Private Admin Dashboard

Dashboard ส่วนตัวสำหรับควบคุมเว็บ SpireONE ทั้งหมด (แยก deploy เป็นเว็บของตัวเองได้เลย — folder นี้คือทั้งเว็บ)

```
spireone-admin/
├── index.html          ← หน้า dashboard
├── css/admin.css
├── js/admin.js
└── README.md
```

## ⚡ ติดตั้งครั้งแรก (สำคัญมาก — ทำตามลำดับ)

### 1. Deploy Security Rules (นี่คือหัวใจของความปลอดภัย)

ไปที่ [Firebase Console](https://console.firebase.google.com/) → โปรเจกต์ `sp1p-82396` →
**Realtime Database → Rules** → ลบของเดิม แล้ว paste เนื้อหาจากไฟล์ `database.rules.json`
(อยู่ที่ root ของ repo SpireONE-Beta) → กด **Publish**

> ทำไมถึง secure: rules ทำงานบน **server ของ Google** ไม่ใช่ในเบราว์เซอร์
> ต่อให้ใครเปิด DevTools แก้ JavaScript, ปลอมยศตัวเอง, หรือยิง API ตรง —
> ทุก read/write จะโดนเช็คกับ rules ก่อนเสมอ ข้อมูลคนอื่นอ่านไม่ได้ เขียนข้ามสิทธิ์ไม่ได้

### 2. ตั้งตัวเองเป็น Owner (ทำครั้งเดียว)

1. เปิด dashboard → ล็อกอินด้วย Google → จะเจอหน้า "ไม่มีสิทธิ์" พร้อม **UID** ของคุณ → copy ไว้
2. Firebase Console → **Realtime Database → Data** → สร้าง path:
   ```
   roles/
     <UID ของคุณ>: "owner"
   ```
3. รีเฟรช dashboard → เข้าได้เลย

หลังจากนี้ให้ยศคนอื่นผ่านหน้า "ผู้ใช้ & ยศ" ใน dashboard ได้เลย ไม่ต้องเข้า console อีก

## 🎖 ระบบยศ 4 ระดับ

| ยศ | สิทธิ์ |
|---|---|
| **Owner** | ทุกอย่าง + ตั้ง/ถอด Admin ได้ (owner ด้วยกันแตะกันไม่ได้ ต้องแก้ใน console) |
| **Admin** | จัดการผู้ใช้ (ให้ยศได้ถึง moderator), แบน, เนื้อหา, ตั้งค่าเว็บ, ดู audit log |
| **Moderator** | จัดการเนื้อหา (Billboard/นิตยสาร) เท่านั้น |
| **User** | ผู้ใช้ทั่วไปของ SpireONE |

## 🎛 ควบคุม SpireONE ได้แบบ realtime

ทุกอย่างที่กดใน dashboard มีผลกับเว็บหลักทันที (ไม่ต้อง refresh):

- **Billboard / นิตยสาร** — แก้เนื้อหาหน้าแรกและหน้านิตยสารสด
- **เปิด/ปิด features** — ซ่อนเมนูวินิจฉัย/นิตยสาร/Garage/ช็อป
- **Maintenance mode** — ปิดเว็บชั่วคราว (ทีมงานยังเข้าได้)
- **Broadcast** — แถบประกาศบนสุดของเว็บ
- **แบนผู้ใช้** — โดนเตะออกทันทีที่ล็อกอิน และ rules บล็อกการเขียนข้อมูลทั้งหมด
- **Audit log** — ทุกการกระทำถูกบันทึก แบบ append-only (แก้/ลบไม่ได้)

## 🚀 Deploy

เว็บ static ล้วน — โยนขึ้น Cloudflare Pages / Netlify / GitHub Pages ได้เลย
แนะนำใช้ subdomain แยก เช่น `admin.spireone.xxx` และไม่ต้องลิงก์จากเว็บหลัก

## 🔒 สรุปเรื่องความปลอดภัย

- ยศเก็บใน `roles/{uid}` — client เขียนเองไม่ได้ (rules อนุญาตเฉพาะ owner/admin)
- รายชื่อ admin **ไม่อยู่ในโค้ดอีกต่อไป** — inspect ดูได้แค่ UI เปล่าๆ
- ข้อมูลผู้ใช้ `users/{uid}` อ่านได้เฉพาะเจ้าของ + ทีมงาน
- คนโดนแบนเขียนอะไรไม่ได้เลยแม้แต่ข้อมูลตัวเอง
- Firebase apiKey ในโค้ดไม่ใช่ความลับ (เป็น public identifier) — สิ่งที่กันข้อมูลคือ rules
- แนะนำเพิ่ม: Firebase Console → Authentication → Settings → **Authorized domains** — ลบ domain ที่ไม่ใช้ออก ให้เหลือแค่ domain จริงของคุณ
