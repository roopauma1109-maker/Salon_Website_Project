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
            console.error("API error:", res.status);
            return;
        }

        const data = await res.json();

        if (!Array.isArray(data)) {
            console.error("Invalid API response:", data);
            return;
        }

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
    document.getElementById("navMenu")?.classList.toggle("show");
}

// ===========================
// POPUP
// ===========================
function showPopup(message) {

    const popup = document.getElementById("successPopup");
    if (!popup) return;

    const text = popup.querySelector("p");
    if (text) text.innerText = message;

    popup.classList.add("show");

    clearTimeout(popup.hideTimer);

    popup.hideTimer = setTimeout(() => {
        popup.classList.remove("show");
    }, 3000);
}

// ===========================
// COUNTERS
// ===========================
function updateCounters(data) {

    const total = document.getElementById("totalBookings");
    const pending = document.getElementById("pendingCount");
    const done = document.getElementById("doneCount");

    if (!total || !pending || !done) return;

    total.innerText = data.length;

    pending.innerText = data.filter(a => (a.status || "Pending") === "Pending").length;

    done.innerText = data.filter(a => a.status === "Done").length;
}

// ===========================
// RENDER TABLE (FIXED)
// ===========================
function renderTable(data) {

    const tbody = document.getElementById("appointmentTableBody");
    if (!tbody) {
        console.error("appointmentTableBody not found");
        return;
    }

    tbody.innerHTML = data.map(item => {

        const status = item.status || "Pending";

        return `
        <tr>

            <td>${item.id}</td>
            <td>${item.name || "-"}</td>
            <td>${item.phone || "-"}</td>
            <td>${item.service || "-"}</td>
            <td>${item.date || "-"}</td>
            <td>${item.time || "-"}</td>

            <td>
                <button onclick="deleteAppointment(${item.id})">
                    Delete
                </button>
            </td>

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

        showPopup(`Status updated to ${updated.status}`);

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

        if (!res.ok) {
            alert("Delete failed");
            return;
        }

        await loadAppointments();

        showPopup("Appointment deleted successfully");

    } catch (err) {
        console.error("Delete error:", err);
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
        (item.name || "").toLowerCase().includes(name) &&
        (item.service || "").toLowerCase().includes(service) &&
        (date === "" || item.date === date)
    );

    updateCounters(filtered);
    renderTable(filtered);
};

// ===========================
// RESET FILTERS
// ===========================
window.resetFilters = function () {

    const name = document.getElementById("filterName");
    const service = document.getElementById("filterService");
    const date = document.getElementById("filterDate");

    if (name) name.value = "";
    if (service) service.value = "";
    if (date) date.value = "";

    updateCounters(ALL_APPOINTMENTS);
    renderTable(ALL_APPOINTMENTS);
};

// ===========================
// INIT
// ===========================
window.addEventListener("DOMContentLoaded", loadAppointments);