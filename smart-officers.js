// ========================================================
// السكربت الموحد: المزامنة الفورية للضباط والأفراد وتحديث الهوية
// (تمت إضافة نظام التخزين المحلي لتجاوز حماية الملفات بعد التثبيت)
// ========================================================

const SUPABASE_URL = "https://dkrtiuelioyshbjoocqm.supabase.co";
const SUPABASE_KEY = "sb_publishable_ts5SGrWhODsG6EH5dUt9Wg_KUvsf-CF";

let liveOfficersList = [];
let liveIndividualsList = [];

// 1. عند فتح الصفحة، نعطي الأولوية للذاكرة المحلية للعمل بدون إنترنت
document.addEventListener('DOMContentLoaded', async () => {
    loadFromLocalStorage(); // تحميل البيانات المحفوظة محلياً أولاً

    if (navigator.onLine) {
        await fetchLiveOfficers();
        await fetchLiveIndividuals();
        processOfflineQueue();
    }
});

// === تحميل البيانات من ذاكرة المتصفح (تتجاوز مشكلة ملف app.asar المحمي) ===
function loadFromLocalStorage() {
    const savedOff = localStorage.getItem('local_officers_db');
    if (savedOff) {
        liveOfficersList = JSON.parse(savedOff);
        updateOfficersUI();
    }
    
    const savedInd = localStorage.getItem('local_individuals_db');
    if (savedInd) {
        liveIndividualsList = JSON.parse(savedInd);
    }
}

// تحديث قائمة الضباط في الواجهة (Datalist)
function updateOfficersUI() {
    const namesDL = document.getElementById('names');
    if (namesDL) {
        namesDL.innerHTML = ""; // تفريغ القائمة القديمة
        liveOfficersList.forEach(o => {
            const option = document.createElement("option"); 
            option.value = o.name; 
            namesDL.appendChild(option);
        });
    }
}

// === دوال جلب البيانات من السحابة ===
async function fetchLiveOfficers() {
    if (!navigator.onLine) return;
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/officers?select=name,rank`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        if (res.ok) {
            liveOfficersList = await res.json();
            // تحديث الذاكرة المحلية فوراً
            localStorage.setItem('local_officers_db', JSON.stringify(liveOfficersList));
            updateOfficersUI();
        }
    } catch (e) { console.error("فشل جلب الضباط:", e); }
}

async function fetchLiveIndividuals() {
    if (!navigator.onLine) return;
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/individuals?select=name,rank,national_id,shift,hall`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        if (res.ok) {
            liveIndividualsList = await res.json();
            // تحديث الذاكرة المحلية فوراً
            localStorage.setItem('local_individuals_db', JSON.stringify(liveIndividualsList));
        }
    } catch (e) { console.error("فشل جلب الأفراد:", e); }
}

// === مراقبة جميع حقول الأسماء (الضباط والأفراد) ===
const inputGroups = [
    // حقول الضباط
    { type: 'officer', name: 'officer-name', rank: 'officer-rank' },
    { type: 'officer', name: 'commander-name', rank: 'commander-rank' },
    { type: 'officer', name: 'ListOfficerName', rank: 'ListOfficerRank' },
    { type: 'officer', name: 'AdminOfficerName', rank: 'AdminOfficerRank' },
    // حقول الأفراد
    { type: 'individual', name: 'IndividualName', rank: 'IndividualRank', idField: 'IndividualID' },
    { type: 'individual', name: 'IndividualName2', rank: 'IndividualRank2', idField: 'IndividualID2' },
    { type: 'individual', name: 'IndividualName3', rank: 'IndividualRank3', idField: 'IndividualID3' }
];

inputGroups.forEach(group => {
    const nameInput = document.getElementById(group.name);
    const rankInput = document.getElementById(group.rank);
    const idInput = group.idField ? document.getElementById(group.idField) : null;
    
    if (nameInput && rankInput) {
        
        // التعبئة التلقائية السريعة
        nameInput.addEventListener('change', () => {
            const val = nameInput.value.trim();
            if (group.type === 'officer') {
                const found = liveOfficersList.find(o => o.name === val);
                if (found) rankInput.value = found.rank;
            } else if (group.type === 'individual') {
                const found = liveIndividualsList.find(i => i.name === val);
                if (found) {
                    rankInput.value = found.rank;
                    if (idInput && found.national_id) idInput.value = found.national_id;
                }
            }
        });

        // دالة الفحص (تشتغل عند الخروج من حقل الرتبة أو رقم الهوية)
        const handleBlur = () => {
            const nameVal = nameInput.value.trim();
            const rankVal = rankInput.value.trim();
            const idVal = idInput ? idInput.value.trim() : "";

            if (!nameVal || !rankVal) return;

            if (group.type === 'officer') {
                // فحص وإضافة الضباط
                if (!liveOfficersList.some(o => o.name === nameVal)) {
                    liveOfficersList.push({ name: nameVal, rank: rankVal });
                    
                    // 💡 السحر هنا: حفظ الاسم فوراً في الذاكرة ليعمل البرنامج بدون إنترنت وبعد التثبيت!
                    localStorage.setItem('local_officers_db', JSON.stringify(liveOfficersList));
                    updateOfficersUI(); // تحديث الواجهة مباشرة
                    
                    processInsert('officers', { name: nameVal, rank: rankVal });
                    console.log(`✨ إضافة ضابط جديد: ${nameVal}`);
                }
            } else {
                // فحص وإضافة الأفراد
                const existing = liveIndividualsList.find(i => i.name === nameVal);
                const shiftVal = document.getElementById('shift-number')?.value.trim() || 'عام';
                const hallVal = document.getElementById('hall-number')?.value.trim() || 'عام';

                if (!existing) {
                    // فرد جديد تماماً
                    liveIndividualsList.push({ name: nameVal, rank: rankVal, national_id: idVal, shift: shiftVal, hall: hallVal });
                    localStorage.setItem('local_individuals_db', JSON.stringify(liveIndividualsList));
                    
                    processInsert('individuals', { name: nameVal, rank: rankVal, national_id: idVal, shift: shiftVal, hall: hallVal });
                    console.log(`✨ إضافة فرد جديد: ${nameVal}`);
                } 
                else if (idVal && !existing.national_id) {
                    // فرد موجود ولكن تم إدخال هويته للتو (تحديث)
                    existing.national_id = idVal;
                    localStorage.setItem('local_individuals_db', JSON.stringify(liveIndividualsList));
                    
                    processUpdateId(nameVal, idVal);
                }
            }
        };

        rankInput.addEventListener('blur', handleBlur);
        if (idInput) idInput.addEventListener('blur', handleBlur);
    }
});

// === دوال الإرسال والتحديث لقاعدة البيانات ===

// 1. إضافة جديدة (ضابط أو فرد)
async function processInsert(tableName, dataObj) {
    if (navigator.onLine) {
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json', 'Prefer': 'resolution=ignore-duplicates'
                },
                body: JSON.stringify(dataObj)
            });
            if (!response.ok) saveToOfflineQueue('INSERT', tableName, dataObj);
        } catch (e) { saveToOfflineQueue('INSERT', tableName, dataObj); }
    } else {
        saveToOfflineQueue('INSERT', tableName, dataObj);
    }
}

// 2. تحديث رقم الهوية فقط (للفرد الموجود)
async function processUpdateId(name, newId) {
    console.log(`🔄 تحديث رقم هوية الفرد (${name}) إلى (${newId})...`);
    if (navigator.onLine) {
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/individuals?name=eq.${encodeURIComponent(name)}`, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ national_id: newId })
            });
            if (!response.ok) saveToOfflineQueue('UPDATE_ID', 'individuals', { name: name, national_id: newId });
        } catch (e) { saveToOfflineQueue('UPDATE_ID', 'individuals', { name: name, national_id: newId }); }
    } else {
        saveToOfflineQueue('UPDATE_ID', 'individuals', { name: name, national_id: newId });
    }
}

// === التخزين المؤقت (Offline Queue) ===
function saveToOfflineQueue(actionType, tableName, dataObj) {
    let queue = JSON.parse(localStorage.getItem('smart_offline_queue') || '[]');
    // التأكد من عدم التكرار لنفس الاسم والجدول
    if (!queue.find(q => q.data.name === dataObj.name && q.table === tableName && q.action === actionType)) {
        queue.push({ action: actionType, table: tableName, data: dataObj });
        localStorage.setItem('smart_offline_queue', JSON.stringify(queue));
    }
}

// رفع الطابور عند عودة الإنترنت
async function processOfflineQueue() {
    if (!navigator.onLine) return;
    
    let queue = JSON.parse(localStorage.getItem('smart_offline_queue') || '[]');
    if (queue.length === 0) return;

    let remaining = [];
    
    for (let item of queue) {
        let success = false;
        try {
            if (item.action === 'INSERT') {
                const res = await fetch(`${SUPABASE_URL}/rest/v1/${item.table}`, {
                    method: 'POST',
                    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=ignore-duplicates' },
                    body: JSON.stringify(item.data)
                });
                success = res.ok;
            } else if (item.action === 'UPDATE_ID') {
                const res = await fetch(`${SUPABASE_URL}/rest/v1/${item.table}?name=eq.${encodeURIComponent(item.data.name)}`, {
                    method: 'PATCH',
                    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ national_id: item.data.national_id })
                });
                success = res.ok;
            }
        } catch(e) {}

        if (!success) remaining.push(item);
    }
    
    localStorage.setItem('smart_offline_queue', JSON.stringify(remaining));
    if (remaining.length < queue.length) {
        console.log("✅ تم مزامنة البيانات المخزنة من وضع عدم الاتصال.");
    }
}

window.addEventListener('online', processOfflineQueue);