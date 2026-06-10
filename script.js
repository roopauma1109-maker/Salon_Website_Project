console.log("ADMIN JS LOADED");

const API_BASE = "https://salon-website-project.onrender.com";

let ALL_APPOINTMENTS = [];

// ===========================
// LOAD APPOINTMENTS
// ===========================
async function loadAppointments() {

    try {

        const res = await fetch(`${API_BASE}/appointments`);

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
    document.getElementById("navMenu").classList.toggle("show");
}

// ===========================
// POPUP
// ===========================
function showPopup(message) {

    const popup = document.getElementById("successPopup");
    if (!popup) return;

    const title = popup.querySelector("h2");
    const text = popup.querySelector("p");

    if (title) title.innerText = "Notification";
    if (text) text.innerText = message;

    popup.classList.add("show");

    if (popup.hideTimer) clearTimeout(popup.hideTimer);

    popup.hideTimer = setTimeout(() => {
        popup.classList.remove("show");
    }, 3000);
}

// ===========================
// COUNTERS
// ===========================
function updateCounters(data) {

    const safe = (s) => (s ?? "Pending");

    document.getElementById("totalBookings").innerText = data.length;

    document.getElementById("pendingCount").innerText =
        data.filter(a => safe(a.status) === "Pending").length;

    document.getElementById("doneCount").innerText =
        data.filter(a => safe(a.status) === "Done").length;
}

// ===========================
// RENDER TABLE
// ===========================
function renderTable(data) {

    const table = document.getElementById("appointmentTable");
    if (!table) return;

    table.innerHTML = data.map(item => {

        const status = (item.status ?? "Pending");

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

Your appointment has been scheduled at JS Beauty Parlour & Academy.

Service : ${item.service}
Date    : ${item.date}
Time    : ${item.time}

Please arrive 10 minutes early.

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

    try {

        const res = await fetch(
            `${API_BASE}/appointment/${id}/toggle-status`,
            { method: "PUT" }
        );

        if (!res.ok) {
            alert("Failed to update status");
            return;
        }

        const updated = await res.json();

        await loadAppointments();

        showPopup(`Appointment for ${item.name} marked as ${updated.status}`);

        // If backend sends WhatsApp link
        if (updated.whatsapp) {
            window.open(updated.whatsapp, "_blank", "noopener,noreferrer");
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
            `${API_BASE}/appointment/${id}`,
            { method: "DELETE" }
        );

        if (!res.ok) return;

        await loadAppointments();
        showPopup("Appointment deleted successfully");

    } catch (err) {
        console.error(err);
    }
};

// ===========================
// FILTERS
// ===========================
window.applyFilters = function () {

    const name = document.getElementById("filterName")?.value.toLowerCase() || "";
    const service = document.getElementById("filterService")?.value.toLowerCase() || "";
    const date = document.getElementById("filterDate")?.value || "";

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