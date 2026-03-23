// File: api/gemini.js
// Ini adalah server backend kamu yang berjalan di Vercel

export default async function handler(req, res) {
    // Hanya izinkan request tipe POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prompt, model } = req.body;
    
    // KUNCI RAHASIA DIAMBIL DARI ENVIRONMENT VERCEL (TIDAK TEREKSPOS)
    const apiKey = process.env.GEMINI_API_KEY; 

    if (!apiKey) {
        return res.status(500).json({ error: 'API Key tidak ditemukan di server' });
    }

    try {
        // Hubungi server Google Gemini SECARA TERTUTUP dari server backend
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();
        
        // Teruskan error dari Google (misal: kuota habis) ke frontend
        if (data.error) {
            return res.status(400).json({ error: data.error.message });
        }

        // Kembalikan jawaban AI ke index.html
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Server gagal menghubungi Gemini API' });
    }
}