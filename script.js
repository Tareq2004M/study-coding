// بنك المسائل البرمجية وقوالب الحلول لكل لغة
const challenges = [
    { id: "hello", title: "مرحبا بالعالم", desc: "اكتب برنامجاً يطبع بدقة الجملة التالية: Hello World", expected: "Hello World\n", points: 10 },
    { id: "even", title: "الأعداد الزوجية", desc: "اطبع الأعداد الزوجية من 1 إلى 6 بحيث يكون كل رقم في سطر منفصل (2 ثم 4 ثم 6).", expected: "2\n4\n6\n", points: 20 }
];

const codeTemplates = {
    python: `print("اكتب كود الحل هنا")`,
    java: `public class Main {\n    public static void main(String[] args) {\n        // اكتب كود الحل هنا\n    }\n}`,
    c: `#include <stdio.h>\n\nint main() {\n    // اكتب كود الحل هنا\n    return 0;\n}`
};

let currentChallenge = null;
let editor;

// 1. إدارة بيانات المستخدم محلياً (بدون سيرفر وبدون مشاكل)
function initUser() {
    let username = localStorage.getItem('guest_username');
    let points = parseInt(localStorage.getItem('guest_points')) || 0;

    if (!username) {
        // إظهار شاشة الدخول أول مرة فقط
        document.getElementById('auth-overlay').classList.remove('opacity-0', 'pointer-events-none');
    } else {
        document.getElementById('auth-overlay').style.display = 'none';
        document.getElementById('user-display-name').innerText = username;
        document.getElementById('user-points').innerText = `⭐ ${points}`;
        loadLeaderboard(username, points);
    }
}

document.getElementById('guest-enter-btn').onclick = () => {
    const randomId = Math.floor(1000 + Math.random() * 9000);
    const username = `💡 Guest_${randomId}`;
    localStorage.setItem('guest_username', username);
    localStorage.setItem('guest_points', 0);
    
    document.getElementById('auth-overlay').classList.add('opacity-0', 'pointer-events-none');
    setTimeout(() => document.getElementById('auth-overlay').style.display = 'none', 300);
    
    initUser();
};

// 2. تحديث لوحة الصدارة المحاكية لتشجيع الطلاب
function loadLeaderboard(currentName, currentPoints) {
    // أسماء وهمية لطلاب منافسين لخلق جو تحدي حقيقي
    let competitors = [
        { name: "⚡ أحمد_المبرمج", points: 25 },
        { name: "🚀 سارة_كود", points: 15 },
        { name: "💻 مبرمج_المستقبل", points: 5 },
        { name: currentName, points: currentPoints }
    ];

    // ترتيب الطلاب حسب النقاط من الأعلى للأقل
    competitors.sort((a, b) => b.points - a.points);

    const listElement = document.getElementById('leaderboard-list');
    listElement.innerHTML = "";
    
    competitors.forEach((student, index) => {
        const li = document.createElement('li');
        const isMe = student.name === currentName;
        li.className = `flex justify-between p-2 rounded text-xs ${isMe ? 'bg-emerald-500/20 border border-emerald-500/40 font-bold' : 'bg-gray-900/40'}`;
        li.innerHTML = `<span>#${index + 1} ${student.name} ${isMe ? '(أنت)' : ''}</span> <span class="text-amber-400">${student.points} نقطة</span>`;
        listElement.appendChild(li);
    });
}

// 3. بناء قائمة التحديات في الواجهة
const challengesList = document.getElementById('challenges-list');
challenges.forEach(ch => {
    const btn = document.createElement('button');
    btn.className = "bg-gray-900 hover:bg-gray-750 text-right p-2.5 rounded border border-gray-800 text-xs flex justify-between items-center transition w-full";
    btn.innerHTML = `<span>${ch.title}</span> <span class="text-amber-400 font-mono">+${ch.points}</span>`;
    btn.onclick = () => {
        currentChallenge = ch;
        const descDiv = document.getElementById('challenge-desc');
        descDiv.classList.remove('hidden');
        descDiv.innerText = ch.desc;
    };
    challengesList.appendChild(btn);
});

// 4. تشغيل محرر الأكواد Monaco ذي الواجهة الجذابة
require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.39.0/min/vs' } });
require(['vs/editor/editor.main'], function() {
    editor = monaco.editor.create(document.getElementById('editor-container'), {
        value: codeTemplates.python,
        language: 'python',
        theme: 'vs-dark',
        fontSize: 14,
        automaticLayout: true
    });
});

// تغيير قالب الكود عند تغيير اللغة المحددة
document.getElementById('language-select').onchange = (e) => {
    const lang = e.target.value;
    if (editor) {
        editor.setValue(codeTemplates[lang]);
        monaco.editor.setModelLanguage(editor.getModel(), lang);
    }
};

// 5. فحص الحل الذكي وحفظ النقاط محلياً فوراً
document.getElementById('submit-btn').onclick = async () => {
    if (!currentChallenge) return alert("الرجاء اختيار مسألة من القائمة أولاً!");
    const outputBox = document.getElementById('output');
    outputBox.innerText = "جاري تشغيل الكود وفحصه... 🧪";

    try {
        const response = await fetch('https://emkc.org/api/v2/piston/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                language: document.getElementById('language-select').value,
                version: "*",
                files: [{ content: editor.getValue() }]
            })
        });
        const data = await response.json();
        const studentOutput = data.run.output || "";

        // فحص ومطابقة المخرجات بشكل صحيح
        if (studentOutput.trim().replace(/\r/g, "") === currentChallenge.expected.trim().replace(/\r/g, "")) {
            outputBox.innerText = `✅ ممتاز! الحل صحيح ومطابق تماماً.\n\nمخرجات كودك:\n${studentOutput}`;
            
            // إضافة نقاط الطالب محلياً
            let currentPoints = parseInt(localStorage.getItem('guest_points')) || 0;
            currentPoints += currentChallenge.points;
            localStorage.setItem('guest_points', currentPoints);
            
            // تحديث الواجهة فوراً
            const username = localStorage.getItem('guest_username');
            document.getElementById('user-points').innerText = `⭐ ${currentPoints}`;
            loadLeaderboard(username, currentPoints);
        } else {
            outputBox.innerText = `❌ المخرجات غير متطابقة، حاول مرة أخرى.\n\nالمخرجات المتوقعة:\n${currentChallenge.expected}\n\nمخرجات كودك:\n${studentOutput || "[لا توجد مخرجات نصية - تحقق من وجود أمر الطباعة]"}`;
        }
    } catch (err) {
        outputBox.innerText = "حدث خطأ في الاتصال بسيرفر الفحص.";
    }
};

// تشغيل النظام عند فتح الصفحة
initUser();
