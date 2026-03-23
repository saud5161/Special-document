const fs = require('fs');
const path = require('path');
const { app } = require('electron'); // استدعاء أداة التطبيق من إلكترون

const SUPABASE_URL = "https://dkrtiuelioyshbjoocqm.supabase.co";
const SUPABASE_KEY = "sb_publishable_ts5SGrWhODsG6EH5dUt9Wg_KUvsf-CF";

// تحديد المسارات الآمنة القابلة للكتابة بعد التثبيت
const userDataPath = app.getPath('userData');
const officersPath = path.join(userDataPath, 'officers.json');
const namePath = path.join(userDataPath, 'name.json');

async function syncAllWithSupabase() {
    try {
        console.log("🔄 جاري مزامنة الضباط والأفراد من Supabase...");
        const headers = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` };

        // 1. مزامنة الضباط
        const officersRes = await fetch(`${SUPABASE_URL}/rest/v1/officers?select=name,rank`, { headers });
        if (officersRes.ok) {
            const officersData = await officersRes.json();
            // الحفظ في المسار الآمن
            fs.writeFileSync(officersPath, JSON.stringify(officersData, null, 2), 'utf8');
        }

        // 2. مزامنة الأفراد
        const individualsRes = await fetch(`${SUPABASE_URL}/rest/v1/individuals?select=name,rank,national_id,shift,hall`, { headers });
        if (individualsRes.ok) {
            const flatIndividuals = await individualsRes.json();
            const nestedIndividuals = {};
            
            flatIndividuals.forEach(ind => {
                const shift = ind.shift || "عام";
                const hall = ind.hall || "عام";
                
                if (!nestedIndividuals[shift]) nestedIndividuals[shift] = {};
                if (!nestedIndividuals[shift][hall]) nestedIndividuals[shift][hall] = [];
                
                nestedIndividuals[shift][hall].push({
                    name: ind.name,
                    rank: ind.rank,
                    id: ind.national_id || ""
                });
            });

            // الحفظ في المسار الآمن
            fs.writeFileSync(namePath, JSON.stringify(nestedIndividuals, null, 2), 'utf8');
        }
    } catch (error) {
        console.error("❌ خطأ أثناء المزامنة:", error.message);
    }
}

module.exports = syncAllWithSupabase;