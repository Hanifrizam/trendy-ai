require('dotenv').config(); // Tambahkan ini di baris paling atas
const googleTrends = require('google-trends-api');
const { createClient } = require('@supabase/supabase-js');

// Sekarang kita panggil dari file .env, bukan diketik manual
const supabaseUrl = process.env.SUPABASE_URL; 
const supabaseKey = process.env.SUPABASE_KEY; 
const geminiApiKey = process.env.GEMINI_API_KEY; 

const supabaseClient = createClient(supabaseUrl, supabaseKey);

// ==========================================
// 2. FUNGSI UTAMA ROBOT SCRAPER
// ==========================================
async function jalankanRobot() {
    console.log("🤖 [Memulai] Robot Scraper sedang bangun...\n");
    let topTren = [];

    try {
        // A. Coba tarik data dari Google Trends
        console.log("🌍 Mencoba menarik tren hari ini dari Google Trends Indonesia...");
        const trendsData = await googleTrends.dailyTrends({ geo: 'ID' });
        
        // Cek apakah Google mengirimkan halaman error (HTML) alih-alih data
        if (trendsData.trim().startsWith('<')) {
            throw new Error("Sistem Anti-Bot Google aktif memblokir permintaan.");
        }

        const parsedData = JSON.parse(trendsData);
        const daftarTren = parsedData.default.trendingSearchesDays[0].trendingSearches;
        
        // Ambil 2 teratas
        topTren = [daftarTren[0].title.query, daftarTren[1].title.query];
        console.log("✅ Berhasil menembus Google Trends!");

    } catch (error) {
        // B. SISTEM FALLBACK (RENCANA CADANGAN JIKA DIBLOKIR)
        console.log(`⚠️ Peringatan: ${error.message}`);
        console.log("🔄 Mengaktifkan Rencana Cadangan: Memakai data tren simulasi...");
        // Robot menggunakan topik simulasi yang relevan dengan UMKM untuk tetap bekerja
        topTren = ["Roti Bakar Lumer Viral", "Kopi Susu Gula Aren Literan"];
    }

    // C. Proses Topik yang didapat ke AI dan Supabase
    for (let i = 0; i < topTren.length; i++) {
        const topik = topTren[i];
        console.log(`\n🔥 [Topik ${i + 1}] Memproses: ${topik}`);

        try {
            console.log("🧠 Meminta Gemini AI meracik strategi pemasaran...");
            const prompt = `Kamu adalah Pakar Digital Marketing. Sedang viral tren: "${topik}". Klienmu adalah UMKM F&B. Berikan strategi dengan format:\n🔥 Hook Konten: [Tulis hook]\n🎬 Ide Eksekusi: [Cara eksekusi]\n🎯 Call to Action: [Kalimat CTA]`;

            const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });

            const aiData = await aiResponse.json();
            
            if (!aiResponse.ok) throw new Error(aiData.error?.message || 'Gagal terhubung ke Gemini');

            let aiSuggestion = aiData.candidates[0].content.parts[0].text.replace(/\*\*/g, '');

            console.log("💾 Menyimpan wawasan ke Supabase...");
            const { error: dbError } = await supabaseClient.from('trends_data').insert([
                { platform: 'Robot Otomatis', trending_topic: topik, ai_suggestion: aiSuggestion }
            ]);

            if (dbError) throw dbError;
            console.log("✅ Sukses disimpan ke database!");

        } catch (processError) {
            console.error(`❌ Gagal memproses topik "${topik}":`, processError.message);
        }
    }

    console.log("\n🎉 [Selesai] Semua tugas robot hari ini rampung!");
}   

// Jalankan Robot
jalankanRobot();