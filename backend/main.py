from fastapi import FastAPI, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from urllib.parse import quote

from database import SessionLocal, engine
from models import Base, Appointment

app = FastAPI()

# ========================
# CORS
# ========================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

# ========================
# ADMIN LOGIN
# ========================
ADMIN_USER = "sister"
ADMIN_PASS = "1234"

# ========================
# MODEL
# ========================
class Booking(BaseModel):
    name: str
    phone: str
    service: str
    date: str
    time: str


# ========================
# HOME
# ========================
@app.get("/")
def home():
    return {"message": "API Running"}

# ========================
# LOGIN
# ========================
@app.post("/login")
def login(username: str = Form(...), password: str = Form(...)):
    if username == ADMIN_USER and password == ADMIN_PASS:
        return {"role": "admin"}

    raise HTTPException(status_code=401, detail="Invalid credentials")

# ========================
# BOOK APPOINTMENT (CONFIRMATION MESSAGE)
# ========================
@app.post("/book")
def book(data: Booking):
    db = SessionLocal()
    try:
        appointment = Appointment(**data.dict())
        appointment.status = "Pending"

        db.add(appointment)
        db.commit()
        db.refresh(appointment)

        # CLEAN PHONE
        phone = ''.join(filter(str.isdigit, appointment.phone))

        # CONFIRMATION MESSAGE (NO EMOJIS)
        message = (
            "APPOINTMENT CONFIRMED\n\n"
            f"Name: {appointment.name}\n"
            f"Service: {appointment.service}\n"
            f"Date: {appointment.date}\n"
            f"Time: {appointment.time}\n\n"
            "Your appointment has been successfully booked at JS Beauty Parlour & Academy.\n"
            "Please arrive on time.\n\n"
            "Thank you for choosing our service."
        )

        whatsapp_url = f"https://wa.me/91{phone}?text={quote(message)}"

        return {
            "message": "Saved",
            "whatsapp": whatsapp_url
        }

    finally:
        db.close()

# ========================
# GET APPOINTMENTS
# ========================
@app.get("/appointments")
def get_appointments():
    db = SessionLocal()
    try:
        data = db.query(Appointment).all()

        return [
            {
                "id": a.id,
                "name": a.name,
                "phone": a.phone,
                "service": a.service,
                "date": a.date,
                "time": a.time,
                "status": a.status
            }
            for a in data
        ]

    finally:
        db.close()

# ========================
# DELETE APPOINTMENT
# ========================
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

# ========================
# TOGGLE STATUS + COMPLETION WHATSAPP
# ========================
@app.put("/appointment/{id}/toggle-status")
def toggle_status(id: int):
    db = SessionLocal()
    try:
        item = db.query(Appointment).filter(Appointment.id == id).first()

        if not item:
            raise HTTPException(status_code=404, detail="Not found")

        was_pending = item.status == "Pending"

        # TOGGLE
        item.status = "Done" if item.status == "Pending" else "Pending"

        db.commit()
        db.refresh(item)

        whatsapp_url = None

        # ONLY ON Pending → Done
        if was_pending and item.status == "Done":

            phone = ''.join(filter(str.isdigit, item.phone))

            message = (
                "APPOINTMENT COMPLETED\n\n"
                f"Name: {item.name}\n"
                f"Service: {item.service}\n"
                f"Date: {item.date}\n"
                f"Time: {item.time}\n\n"
                "Your appointment has been completed at JS Beauty Parlour & Academy.\n"
                "Thank you for visiting us.\n"
                "Please visit again."
            )

            whatsapp_url = f"https://wa.me/91{phone}?text={quote(message)}"

        return {
            "message": "Status updated",
            "status": item.status,
            "whatsapp": whatsapp_url
        }

    finally:
        db.close()

# ========================
# STATS
# ========================
@app.get("/appointments/stats")
def get_stats():
    db = SessionLocal()
    try:
        all_items = db.query(Appointment).all()

        return {
            "total": len(all_items),
            "pending": len([a for a in all_items if a.status == "Pending"]),
            "done": len([a for a in all_items if a.status == "Done"])
        }

    finally:
        db.close()