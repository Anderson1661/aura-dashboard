// CONFIGURACIÓN
const API_URL = '/api';

// EMOJIS POR DEFECTO
const habitEmojis = {
    "Meditar": "🧘‍♀️",
    "Leer": "📖",
    "Ejercicio": "🏃‍♂️",
    "Agua": "💧",
    "Diario": "✍️",
    "default": "✨"
};

// --- SISTEMA DE TOASTS ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? '✅' : '❌';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

// --- FORMATEO DE FECHAS ---
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

// --- CARGAR HÁBITOS ---
let currentMaxStreak = 0; // Variable global para controlar canjes

async function loadHabits() {
    const container = document.getElementById('habits-list');
    container.innerHTML = '<div class="skeleton-card"></div>'.repeat(3);

    try {
        const res = await fetch(`${API_URL}/habits`);
        const json = await res.json();
        
        if (!json.success) throw new Error(json.error);

        container.innerHTML = '';
        if (json.data.length === 0) {
            container.innerHTML = '<div class="empty-state">No hay hábitos aún. ¡Agrega uno arriba!</div>';
            updateProgress(0, 0);
            currentMaxStreak = 0;
            return;
        }

        let completedToday = 0;
        currentMaxStreak = 0;

        json.data.forEach(habit => {
            if (habit.completed_today) completedToday++;
            if (habit.streak > currentMaxStreak) currentMaxStreak = habit.streak;
            
            const emojiKey = Object.keys(habitEmojis).find(key => habit.title.includes(key));
            const emoji = emojiKey ? habitEmojis[emojiKey] : habitEmojis.default;

            const card = document.createElement('div');
            card.className = `habit-card ${habit.completed_today ? 'completed' : ''}`;
            card.innerHTML = `
                <button class="btn-delete" onclick="deleteHabit(${habit.id})" title="Eliminar hábito">✕</button>
                <div class="habit-info">
                    <div class="habit-icon">${emoji}</div>
                    <div class="habit-details">
                        <h3>${habit.title}</h3>
                        <p class="habit-streak">🔥 ${habit.streak} días de racha</p>
                    </div>
                </div>
                ${habit.completed_today 
                    ? `<button class="btn-done"><span>✓</span> Listo</button>`
                    : `<button class="btn-complete" onclick="completeHabit(${habit.id})">Completar</button>`
                }
            `;
            container.appendChild(card);
        });

        updateProgress(completedToday, json.data.length);

    } catch (err) {
        showToast(`Error al cargar hábitos: ${err.message}`, 'error');
        container.innerHTML = '<div class="error-state">Error al conectar con el servidor.</div>';
    }
}

// --- ELIMINAR HÁBITO ---
async function deleteHabit(id) {
    if (!confirm("¿Seguro que quieres eliminar este hábito? Se perderá la racha.")) return;
    
    try {
        const res = await fetch(`${API_URL}/habits/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        
        showToast("Hábito eliminado");
        loadHabits();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// --- ACTUALIZAR PROGRESO ---
function updateProgress(completed, total) {
    const text = document.getElementById('progress-text');
    const percentText = document.getElementById('progress-percentage');
    const fill = document.getElementById('progress-bar-fill');
    
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    text.innerText = `Progreso del día ${completed}/${total}`;
    percentText.innerText = `${percentage}%`;
    fill.style.width = `${percentage}%`;
}

// --- COMPLETAR HÁBITO ---
async function completeHabit(id) {
    try {
        const res = await fetch(`${API_URL}/habits/${id}/complete`, { method: 'PUT' });
        const json = await res.json();

        if (!json.success) throw new Error(json.error);

        showToast(json.message);
        if (json.data.couponGenerated) {
            showToast('¡Has ganado una nueva recompensa! 🎁', 'success');
            loadCoupons();
        }
        loadHabits();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// --- CARGAR CUPONES ---
async function loadCoupons() {
    const container = document.getElementById('coupons-list');
    const badge = document.getElementById('coupons-badge');
    container.innerHTML = '<div class="skeleton-card"></div>'.repeat(2);
    
    try {
        const res = await fetch(`${API_URL}/coupons`);
        const json = await res.json();

        if (!json.success) throw new Error(json.error);

        container.innerHTML = '';
        const unredeemed = json.data.filter(c => !c.is_redeemed).length;
        badge.innerText = `${unredeemed} disponibles`;

        if (json.data.length === 0) {
            container.innerHTML = '<div class="empty-state">Aún no tienes recompensas. ¡Sigue con tus hábitos!</div>';
            return;
        }

        json.data.forEach(coupon => {
            const card = document.createElement('div');
            card.className = `reward-card ${coupon.is_redeemed ? 'redeemed' : ''} ${currentMaxStreak === 0 && !coupon.is_redeemed ? 'locked' : ''}`;
            
            let cleanTitle = coupon.title;
            let description = "¡Te lo mereces por tu esfuerzo!";
            if (coupon.title.startsWith("Premio de Constancia: ")) {
                cleanTitle = "Premio de Constancia";
                description = `Desbloqueado por: ${coupon.title.replace("Premio de Constancia: ", "")}`;
            }

            const canRedeem = currentMaxStreak > 0;

            card.innerHTML = `
                <span class="reward-tag">Recompensa</span>
                <h3 class="reward-title">${cleanTitle}</h3>
                <p class="reward-desc">${description}</p>
                <div class="reward-footer">
                    <div class="reward-meta">
                        🎁 Especial <span class="reward-date">${formatDate(coupon.created_at)}</span>
                    </div>
                    ${coupon.is_redeemed 
                        ? `<span class="badge-peach">Canjeado</span>`
                        : `<button class="btn-redeem" ${!canRedeem ? 'disabled title="Necesitas una racha activa"' : ''} onclick="redeemCoupon(${coupon.id})">
                            ${canRedeem ? 'Canjear' : 'Bloqueado 🔒'}
                           </button>`
                    }
                </div>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        showToast(`Error al cargar cupones: ${err.message}`, 'error');
    }
}

// --- CANJEAR CUPÓN ---
async function redeemCoupon(id) {
    try {
        const res = await fetch(`${API_URL}/coupons/${id}/redeem`, { method: 'PUT' });
        const json = await res.json();

        if (!json.success) throw new Error(json.error);

        showToast(json.message);
        loadCoupons();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// --- GESTIÓN DE MODAL ---
const modal = document.getElementById('habit-modal');
const addBtn = document.getElementById('add-habit-btn');
const cancelBtn = document.getElementById('cancel-modal');
const saveBtn = document.getElementById('save-habit');
const input = document.getElementById('habit-title-input');

addBtn.onclick = () => {
    modal.classList.add('show');
    input.focus();
};
cancelBtn.onclick = () => modal.classList.remove('show');

saveBtn.onclick = async () => {
    const title = input.value.trim();
    if (!title) {
        showToast("Escribe un título para el hábito", "error");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/habits`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title })
        });
        const json = await res.json();

        if (!json.success) throw new Error(json.error);

        showToast(json.message);
        input.value = '';
        modal.classList.remove('show');
        loadHabits();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

// --- BOTÓN SOS ---
document.getElementById('sos-btn').onclick = () => {
    showToast("Te amo mucho. Siempre estoy aquí para ti. ❤️", "success");
};

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    loadHabits();
    loadCoupons();
});
