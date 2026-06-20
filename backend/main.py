from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from database import SessionLocal, engine
from models import Base, Appointment

app = FastAPI()

# CORS (dev only)
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


class Booking(BaseModel):
    name: str
    phone: str
    service: str
    date: str
    time: str


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
            "appointment_id": appointment.id
        }
    finally:
        db.close()


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


@app.put("/appointment/{id}/toggle-status")
def toggle_status(id: int):
    db = SessionLocal()
    try:
        item = db.query(Appointment).filter(Appointment.id == id).first()

        if not item:
            raise HTTPException(status_code=404, detail="Not found")

        item.status = "Done" if item.status == "Pending" else "Pending"

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
            "done": sum(1 for a in all_items if a.status == "Done")
        }
    finally:
        db.close()