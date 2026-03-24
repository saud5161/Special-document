const fs = require('fs');
const path = require('path');

const SUPABASE_URL = "https://dkrtiuelioyshbjoocqm.supabase.co";
const SUPABASE_KEY = "sb_publishable_ts5SGrWhODsG6EH5dUt9Wg_KUvsf-CF";

async function syncAllWithSupabase() {
    try {
        console.log("🔄 جاري مزامنة الضباط والأفراد من Supabase...");
        const headers = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` };

        // 1. مزامنة وتحديث ملف الضباط (officers.json)
        const officersRes = await fetch(`${SUPABASE_URL}/rest/v1/officers?select=name,rank`, { headers });
        if (officersRes.ok) {
            const officersData = await officersRes.json();
            fs.writeFileSync(path.join(__dirname, 'officers.json'), JSON.stringify(officersData, null, 2), 'utf8');
            console.log("✅ تم تحديث officers.json");
        }

        // 2. مزامنة وتحديث ملف الأفراد (name.json) مع إعادة بناء الهيكلة
        const individualsRes = await fetch(`${SUPABASE_URL}/rest/v1/individuals?select=name,rank,national_id,shift,hall`, { headers });
        if (individualsRes.ok) {
            const flatIndividuals = await individualsRes.json();
            const nestedIndividuals = {}; // الهيكل المطلوب: { "ا": { "1": [ {name, rank, id} ] } }
            
            flatIndividuals.forEach(ind => {
                const shift = ind.shift || "عام";
                const hall = ind.hall || "عام";
                
                if (!nestedIndividuals[shift]) nestedIndividuals[shift] = {};
                if (!nestedIndividuals[shift][hall]) nestedIndividuals[shift][hall] = [];
                
                nestedIndividuals[shift][hall].push({
                    name: ind.name,
                    rank: ind.rank,
                    id: ind.national_id || "" // نستخدم id ليطابق كودك الحالي
                });
            });

            fs.writeFileSync(path.join(__dirname, 'name.json'), JSON.stringify(nestedIndividuals, null, 2), 'utf8');
            console.log("✅ تم تحديث name.json بنجاح!");
        }
    } catch (error) {
        console.error("❌ خطأ أثناء المزامنة:", error.message);
    }
}

module.exports = syncAllWithSupabase;