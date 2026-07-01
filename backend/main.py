from urllib.parse import quote

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from database import SessionLocal, engine
from models import Base, Appointment

app = FastAPI()

# CORS (dev only — lock this down to your real domain before going live)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

ADMIN_USER = "sister"
ADMIN_PASS = "1234"

WHATSAPP_BASE = "https://wa.me/"


class Booking(BaseModel):
    name: str
    phone: str
    service: str
    date: str
    time: str


def clean_phone(phone: str) -> str:
    """Strip spaces/dashes/+ so it works in a wa.me link."""
    digits = "".join(ch for ch in phone if ch.isdigit())
    # if a 10-digit Indian number was entered without country code, add 91
    if len(digits) == 10:
        digits = "91" + digits
    return digits


def whatsapp_link(phone: str, message: str) -> str:
    return f"{WHATSAPP_BASE}{clean_phone(phone)}?text={quote(message)}"


@app.get("/")
def home():
    return {"message": "API Running"}


@app.post("/login")
def login(data: dict):
    if data["username"] == ADMIN_USER and data["password"] == ADMIN_PASS:
        return {"role": "admin"}
    raise HTTPException(status_code=401, detail="Invalid credentials")


@app.post("/book")
def book(data: Booking):
    db = SessionLocal()
    try:
        appointment = Appointment(**data.dict())
        appointment.status = "Pending"

        db.add(appointment)
        db.commit()
        db.refresh(appointment)

        return {
            "message": "Appointment booked successfully",
            "appointment_id": appointment.id,
        }
    finally:
        db.close()


@app.get("/appointments")
def get_appointments():
    db = SessionLocal()
    try:
        data = db.query(Appointment).order_by(Appointment.id.desc()).all()
        return [
            {
                "id": a.id,
                "name": a.name,
                "phone": a.phone,
                "service": a.service,
                "date": a.date,
                "time": a.time,
                "status": a.status,
            }
            for a in data
        ]
    finally:
        db.close()


@app.delete("/appointment/{id}")
def delete_appointment(id: int):
    db = SessionLocal()
    try:
        item = db.query(Appointment).filter(Appointment.id == id).first()
        if not item:
            raise HTTPException(status_code=404, detail="Not found")
        db.delete(item)
        db.commit()
        return {"message": "Deleted"}
    finally:
        db.close()


@app.put("/appointment/{id}/confirm")
def confirm_appointment(id: int):
    """Owner taps 'Confirm via WhatsApp'. Status -> Confirmed, returns a
    wa.me link pre-filled with a confirmation message for the client."""
    db = SessionLocal()
    try:
        item = db.query(Appointment).filter(Appointment.id == id).first()
        if not item:
            raise HTTPException(status_code=404, detail="Not found")

        item.status = "Confirmed"
        db.commit()
        db.refresh(item)

        HEART = "\U0001F496"   # 💖
        CHECK = "\u2705"       # ✅

        message = (
            f"Hi {item.name}! {HEART} This is JS Beauty Parlour & Academy.\n"
            f"Your appointment for {item.service} on {item.date} at {item.time} "
            f"is CONFIRMED {CHECK}.\n"
            f"Please arrive 10 minutes early. See you soon!"
        )

        return {
            "message": "Status updated",
            "status": item.status,
            "whatsapp_link": whatsapp_link(item.phone, message),
        }
    finally:
        db.close()


@app.put("/appointment/{id}/complete")
def complete_appointment(id: int):
    """Owner taps 'Mark Done & Notify'. Status -> Done, returns a wa.me
    link pre-filled with a thank-you message for the client."""
    db = SessionLocal()
    try:
        item = db.query(Appointment).filter(Appointment.id == id).first()
        if not item:
            raise HTTPException(status_code=404, detail="Not found")

        item.status = "Done"
        db.commit()
        db.refresh(item)

        SPARKLE = "\u2728"     # ✨
        HEART = "\U0001F496"   # 💖
        DASH = "\u2014"        # —

        message = (
            f"Hi {item.name}! {SPARKLE} Thank you for visiting JS Beauty Parlour & Academy.\n"
            f"We hope you loved your {item.service} today!\n"
            f"We'd love to see you again {DASH} follow us on Instagram for offers and book your next visit anytime. {HEART}"
        )

        return {
            "message": "Status updated",
            "status": item.status,
            "whatsapp_link": whatsapp_link(item.phone, message),
        }
    finally:
        db.close()


@app.put("/appointment/{id}/reset")
def reset_appointment(id: int):
    """Move a Confirmed/Done appointment back to Pending, if needed."""
    db = SessionLocal()
    try:
        item = db.query(Appointment).filter(Appointment.id == id).first()
        if not item:
            raise HTTPException(status_code=404, detail="Not found")
        item.status = "Pending"
        db.commit()
        db.refresh(item)
        return {"message": "Status updated", "status": item.status}
    finally:
        db.close()


@app.get("/appointments/stats")
def get_stats():
    db = SessionLocal()
    try:
        all_items = db.query(Appointment).all()
        return {
            "total": len(all_items),
            "pending": sum(1 for a in all_items if a.status == "Pending"),
            "confirmed": sum(1 for a in all_items if a.status == "Confirmed"),
            "done": sum(1 for a in all_items if a.status == "Done"),
        }
    finally:
        db.close()