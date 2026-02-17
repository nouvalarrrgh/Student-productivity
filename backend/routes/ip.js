// routes/ip.js - REVISI FINAL DENGAN IPS dan IPK
const router = require('express').Router();
const db = require('../db');
const verifyToken = require('../middleware/verifyToken');

// ⭐ Helper untuk konversi Nilai Akhir (0-100) ke Nilai Huruf dan Nilai IP (4.00, 3.00, dst.)
function NA_to_Grade_IP(finalScore) {
    finalScore = parseFloat(finalScore.toFixed(2));
    
    if (finalScore >= 85) return { grade: 'A', ip_value: 4.00, predicate: 'Istimewa (Cumlaude) 🔥' };
    if (finalScore >= 70) return { grade: 'B', ip_value: 3.00, predicate: 'Baik' };
    if (finalScore >= 55) return { grade: 'C', ip_value: 2.00, predicate: 'Cukup' };
    if (finalScore > 0) return { grade: 'D', ip_value: 1.00, predicate: 'Kurang' };
    
    return { grade: 'E', ip_value: 0.00, predicate: 'Sangat Kurang' };
}

// ⭐ Helper untuk menghitung IP Semester (IPS) dan IP Kumulatif (IPK)
function calculateSemesterAndCumulativeIP(allCourses) {
    // 1. Grouping courses by semester
    const semesters = allCourses.reduce((acc, course) => {
        const semesterId = course.semester_number;
        acc[semesterId] = acc[semesterId] || { 
            semester_number: semesterId, 
            total_sks: 0, 
            total_mutu: 0, 
            courses: [] 
        };
        
        // Hitung Nilai Mutu (SKS * IP Mata Kuliah)
        const ipValue = parseFloat(course.ip);
        const mutu = course.sks * ipValue;

        acc[semesterId].total_sks += course.sks;
        acc[semesterId].total_mutu += mutu;
        acc[semesterId].courses.push(course);
        return acc;
    }, {});

    const semesterList = Object.values(semesters).sort((a, b) => a.semester_number - b.semester_number);

    // 2. Calculate IPS and IPK
    let totalSKS_KUMULATIF = 0;
    let totalMUTU_KUMULATIF = 0;

    semesterList.forEach(sem => {
        // Calculate IPS
        sem.ips = sem.total_sks > 0 ? parseFloat((sem.total_mutu / sem.total_sks).toFixed(2)) : 0.00;
        
        // Accumulate for IPK
        totalSKS_KUMULATIF += sem.total_sks;
        totalMUTU_KUMULATIF += sem.total_mutu;
        
        // Calculate IPK
        sem.ipk = totalSKS_KUMULATIF > 0 ? parseFloat((totalMUTU_KUMULATIF / totalSKS_KUMULATIF).toFixed(2)) : 0.00;
        
        // Determine Predicate for Final IPK
        const finalGrading = NA_to_Grade_IP((sem.ipk / 4.0) * 100); 
        sem.final_predicate = finalGrading.predicate;
    });

    const finalIPK = semesterList.length > 0 ? semesterList[semesterList.length - 1].ipk : 0.00;
    const finalPredicate = NA_to_Grade_IP((finalIPK / 4.0) * 100).predicate;

    return { 
        semester_history: semesterList,
        final_ipk: finalIPK,
        final_predicate: finalPredicate
    };
}


// =====================================================================
// POST /api/ip/calculate → Hitung dan simpan Nilai Akhir & IP
// =====================================================================
router.post('/calculate', verifyToken, async (req, res) => {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN'); // Start Transaction

        const { course_name, sks, assessments, semester_number } = req.body; // ⭐ Ambil semester_number
        const userId = req.user.id;

        if (!course_name || !sks || !assessments || assessments.length === 0 || !semester_number) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Data mata kuliah, aspek penilaian, dan semester wajib diisi.' });
        }

        // 1. Validasi Total Bobot
        const totalWeight = assessments.reduce((sum, a) => sum + (Number(a.weight) || 0), 0);
        if (Math.abs(totalWeight - 100) > 0.01) { 
            await client.query('ROLLBACK');
            return res.status(400).json({ message: `Total bobot penilaian harus 100% (Saat ini: ${totalWeight.toFixed(2)}%)` });
        }
        
        // 2. Hitung Nilai Akhir (NA) dan Konversi ke Grade/IP
        let finalScore = 0;
        assessments.forEach(a => {
            finalScore += (Number(a.score) || 0) * ((Number(a.weight) || 0) / 100);
        });
        
        finalScore = parseFloat(finalScore.toFixed(2));
        const grading = NA_to_Grade_IP(finalScore);
        
        // 3. Pastikan Semester ada atau buat baru
        let semesterQ = await client.query(
            `SELECT id FROM ip_semesters WHERE user_id = $1 AND semester_number = $2`,
            [userId, semester_number]
        );
        let semesterId;
        if (semesterQ.rows.length === 0) {
            semesterQ = await client.query(
                `INSERT INTO ip_semesters (user_id, semester_number) VALUES ($1, $2) RETURNING id`,
                [userId, semester_number]
            );
        }
        semesterId = semesterQ.rows[0].id;


        // 4. Simpan Mata Kuliah (Course)
        const courseQ = await client.query(
            `INSERT INTO ip_courses (user_id, semester_id, course_name, sks) 
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [userId, semesterId, course_name, sks]
        );
        const courseId = courseQ.rows[0].id;
        
        // 5. Simpan Aspek Penilaian (Assessments)
        for (const a of assessments) {
            await client.query(
                `INSERT INTO ip_assessments (course_id, name, score, weight) VALUES ($1, $2, $3, $4)`,
                [courseId, a.name, a.score, a.weight]
            );
        }

        await client.query('COMMIT'); // Commit Transaction

        res.json({
            final_score: finalScore,
            ip: grading.ip_value.toFixed(2),
            grade: grading.grade,
            predicate: grading.predicate,
            course_id: courseId
        });

    } catch (err) {
        await client.query('ROLLBACK'); // Rollback jika ada error
        console.error('IP CALCULATION ERROR:', err);
        res.status(500).json({ message: 'Server error saat memproses perhitungan.' });
    } finally {
        client.release();
    }
});

// =====================================================================
// GET /api/ip/history → Ambil riwayat perhitungan dan IPS/IPK
// =====================================================================
router.get('/history', verifyToken, async (req, res) => {
    try {
        // 1. Ambil Mata Kuliah
        const allCoursesQ = await db.query(
            `SELECT c.id, c.course_name, c.sks, c.created_at, s.semester_number
             FROM ip_courses c
             JOIN ip_semesters s ON c.semester_id = s.id
             WHERE c.user_id = $1
             ORDER BY s.semester_number ASC, c.created_at ASC`,
            [req.user.id]
        );
        
        const allCourses = allCoursesQ.rows;
        
        if (allCourses.length === 0) {
            return res.json({ history: [], summary: { final_ipk: 0.00, final_predicate: 'N/A' } });
        }
        
        const courseIds = allCourses.map(c => c.id);

        // 2. Ambil semua penilaian terkait
        const assessmentsQ = await db.query(
            `SELECT course_id, name, score, weight 
             FROM ip_assessments 
             WHERE course_id = ANY($1::int[])`,
            [courseIds]
        );
        
        const assessmentsByCourse = assessmentsQ.rows.reduce((acc, a) => {
            acc[a.course_id] = acc[a.course_id] || [];
            acc[a.course_id].push(a);
            return acc;
        }, {});

        // 3. Gabungkan data, hitung NA, Grade, dan IP per mata kuliah
        const calculatedCourses = allCourses.map(course => {
            const assessments = assessmentsByCourse[course.id] || [];
            let finalScore = 0;
            
            assessments.forEach(a => {
                finalScore += a.score * (a.weight / 100);
            });
            
            finalScore = parseFloat(finalScore.toFixed(2));
            const grading = NA_to_Grade_IP(finalScore);

            return {
                ...course,
                final_score: finalScore,
                ip: grading.ip_value.toFixed(2), // Ini adalah nilai IP Mata Kuliah (bukan IPS)
                grade: grading.grade,
                predicate: grading.predicate,
                assessments: assessments
            };
        });

        // 4. Hitung IPS dan IPK
        const summary = calculateSemesterAndCumulativeIP(calculatedCourses);

        res.json({ history: calculatedCourses, summary });

    } catch (err) {
        console.error('IP History Fetch Error:', err);
        res.status(500).json({ message: 'Gagal memuat riwayat IP, IPS, dan IPK.' });
    }
});


module.exports = router;