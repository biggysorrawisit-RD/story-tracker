# Story Tracker Screenshot + Drive Edition

เวอร์ชันนี้ปรับตามข้อมูลที่คุณให้มาแล้ว

## ผูกกับ Google Sheet นี้
- Sheet ID: `16O2RbsLlDIQFqFiPGEctfuPy-Ke9Lz-ayHqjOIHUEjo`

## เก็บภาพลง Drive โฟลเดอร์นี้
- Folder ID: `1bTq3bEORC82W6DUGvmgXd7NgP54QbaCm`

## ระบบทำอะไรได้
- อัปโหลดภาพหน้าจอ
- เก็บภาพลง Google Drive
- บันทึกลิงก์รูปลง Google Sheet
- เก็บรายชื่อคนดูพร้อมภาพในรายการเดียวกัน
- Sync รายการค้าง
- Export JSON
- Dashboard และ Top viewers

## ข้อจำกัดที่ตั้งใจไว้
เวอร์ชันนี้ยังไม่ OCR ภาพอัตโนมัติในตัวแอป
เพื่อหลีกเลี่ยงชื่อผิด/ตกหล่นจำนวนมาก
จึงใช้ workflow ที่แม่นกว่า:
1. อัปโหลดภาพ
2. คุณพิมพ์หรือวางรายชื่อที่อ่านได้
3. ระบบเก็บภาพ + ข้อมูลพร้อมกัน

## วิธีติดตั้ง backend
1. เปิดโปรเจกต์ Apps Script ใหม่
2. วางไฟล์ `google_apps_script/Code.gs`
3. รันฟังก์ชัน `setupScreenshotEdition`
4. Deploy เป็น Web App
5. ใช้ URL แบบ `/exec`

## วิธีติดตั้ง frontend
แนะนำให้อัปโหลดโฟลเดอร์ `frontend` ไปที่ GitHub Pages, Netlify หรือ Vercel
แล้วเปิด `index.html`

## หมายเหตุ
ถ้า Drive ขององค์กรไม่อนุญาตแชร์แบบ Anyone with link
ไฟล์จะยังถูกอัปโหลดได้ แต่ผู้ใช้คนอื่นอาจเปิดลิงก์ไม่ได้
