console.log("ADMIN JS LOADED");

let ALL_APPOINTMENTS = [];

// ===========================
// LOAD APPOINTMENTS
// ===========================
async function loadAppointments() {

    try {

        const res = await fetch("http://127.0.0.1:8000/appointments");

        if (!res.ok) {
            console.error("API error");
            return;
        }

        const data = await res.json();

        ALL_APPOINTMENTS = data;

        updateCounters(data);
        renderTable(data);

    } catch (err) {

        console.error("Load error:", err);

    }
}

// ===========================
// MOBILE MENU
// ===========================
function toggleMenu() {

    document
        .getElementById("navMenu")
        .classList
        .toggle("show");

}

// ===========================
// SUCCESS POPUP (BOOKING)
// ===========================
function showSuccessPopup() {

    const popup = document.getElementById("successPopup");

    popup.classList.add("show");

    if (popup.hideTimer) {
        clearTimeout(popup.hideTimer);
    }

    popup.hideTimer = setTimeout(() => {
        popup.classList.remove("show");
    }, 10000);
}

// ===========================
// GENERIC POPUP (USED IN ADMIN)
// ===========================
function showPopup(message) {

    const popup = document.getElementById("successPopup");

    if (!popup) return;

    const title = popup.querySelector("h2");
    const text = popup.querySelector("p");

    if (title) title.innerText = "Notification";
    if (text) text.innerText = message;

    popup.classList.add("show");

    if (popup.hideTimer) {
        clearTimeout(popup.hideTimer);
    }

    popup.hideTimer = setTimeout(() => {
        popup.classList.remove("show");
    }, 3000);
}

// ===========================
// COUNTERS
// ===========================
function updateCounters(data) {

    document.getElementById("totalBookings").innerText = data.length;

    document.getElementById("pendingCount").innerText =
        data.filter(a => (a.status || "Pending") === "Pending").length;

    document.getElementById("doneCount").innerText =
        data.filter(a => a.status === "Done").length;
}

// ===========================
// RENDER TABLE
// ===========================
function renderTable(data) {

    const table = document.getElementById("appointmentTable");

    if (!table) return;

    table.innerHTML = data.map(item => {

        const status = item.status || "Pending";

        return `
        <tr>

            <td>${item.id}</td>

            <td>${item.name}</td>

            <td>${item.phone}</td>

            <td>${item.service}</td>

            <td>${item.date}</td>

            <td>${item.time}</td>

            <!-- WHATSAPP -->
            <td>
                <a class="whatsapp-btn"
                   target="_blank"
                   href="https://wa.me/91${item.phone}?text=${encodeURIComponent(
`APPOINTMENT CONFIRMATION

Dear ${item.name},

Your appointment has been successfully scheduled at JS Beauty Parlour & Academy.

Service Details:
Service : ${item.service}
Date    : ${item.date}
Time    : ${item.time}

Please arrive 10 minutes early for smooth service.

We look forward to serving you.

Regards,
JS Beauty Parlour & Academy`
                   )}">
                   WhatsApp
                </a>
            </td>

            <!-- DELETE -->
            <td>
                <button onclick="deleteAppointment(${item.id})">
                    Delete
                </button>
            </td>

            <!-- STATUS -->
            <td>
                <button onclick="toggleStatus(${item.id})"
                    style="
                        padding:6px 10px;
                        border:none;
                        border-radius:6px;
                        cursor:pointer;
                        background:${status === 'Done' ? '#2ecc71' : '#f39c12'};
                        color:white;
                    ">
                    ${status}
                </button>
            </td>

        </tr>
        `;
    }).join("");
}

// ===========================
// TOGGLE STATUS
// ===========================
window.toggleStatus = async function (id) {

    const item = ALL_APPOINTMENTS.find(a => a.id === id);

    if (!item) return;

    const wasPending = (item.status || "Pending") === "Pending";

    try {

        const res = await fetch(
            `http://127.0.0.1:8000/appointment/${id}/toggle-status`,
            { method: "PUT" }
        );

        if (!res.ok) {
            alert("Failed to update status");
            return;
        }

        const updated = await res.json();

        await loadAppointments();

        showPopup(`Appointment for ${item.name} marked as ${updated.status}`);

        if (wasPending && updated.status === "Done") {

            const msg =
`APPOINTMENT COMPLETED

Dear ${item.name},

We are pleased to inform you that your appointment has been successfully completed at JS Beauty Parlour & Academy.

Service Summary:
Service : ${item.service}
Date    : ${item.date}
Time    : ${item.time}

We hope you had a great experience.

Thank you for choosing JS Beauty Parlour & Academy.`;

            const phone = item.phone.replace(/\D/g, "");

            const url = `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`;

            window.open(url, "_blank", "noopener,noreferrer");
        }

    } catch (err) {
        console.error("Toggle error:", err);
    }
};

// ===========================
// DELETE
// ===========================
window.deleteAppointment = async function (id) {

    try {

        const res = await fetch(
            `http://127.0.0.1:8000/appointment/${id}`,
            { method: "DELETE" }
        );

        if (!res.ok) return;

        loadAppointments();

        showPopup("Appointment deleted successfully");

    } catch (err) {

        console.error(err);

    }
};

// ===========================
// FILTERS
// ===========================
window.applyFilters = function () {

    const name =
        document.getElementById("filterName")?.value.toLowerCase() || "";

    const service =
        document.getElementById("filterService")?.value.toLowerCase() || "";

    const date =
        document.getElementById("filterDate")?.value || "";

    const filtered = ALL_APPOINTMENTS.filter(item =>
        item.name.toLowerCase().includes(name) &&
        item.service.toLowerCase().includes(service) &&
        (date === "" || item.date === date)
    );

    updateCounters(filtered);
    renderTable(filtered);
};

// ===========================
// RESET FILTERS
// ===========================
window.resetFilters = function () {

    document.getElementById("filterName").value = "";
    document.getElementById("filterService").value = "";
    document.getElementById("filterDate").value = "";

    updateCounters(ALL_APPOINTMENTS);
    renderTable(ALL_APPOINTMENTS);
};

// ===========================
// INITIAL LOAD
// ===========================
window.addEventListener("DOMContentLoaded", loadAppointments);